import aiohttp, json
from typing import AsyncGenerator, Dict, List
import pandas as pd
import numpy as np

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama3-8b-8192"

ENCODING_OPS = ["label", "onehot", "ordinal", "binary"]
SCALING_OPS  = ["standard", "minmax", "robust", "maxabs"]
SKEW_OPS     = ["log", "sqrt", "boxcox", "yeojohnson"]
BALANCE_OPS  = ["smote", "undersample"]

ALL_PARAMS = {
  "logistic":      {"penalty":["l2","l1","elasticnet","none"],"solver":["newton-cg","lbfgs","liblinear","sag","saga"],"C":1.0,"max_iter":100,"fit_intercept":[True,False],"class_weight":["balanced",None]},
  "random_forest": {"n_estimators":100,"max_depth":10,"criterion":["gini","entropy"],"bootstrap":[True,False],"class_weight":["balanced","balanced_subsample",None]},
  "decision_tree": {"criterion":["gini","entropy"],"max_depth":5,"min_samples_split":2,"class_weight":[None,"balanced"]},
  "knn":           {"n_neighbors":5,"weights":["uniform","distance"],"algorithm":["auto","ball_tree","kd_tree","brute"]},
  "svm":           {"C":1.0,"kernel":["linear","poly","rbf","sigmoid"],"probability":[True,False],"decision_function_shape":["ovo","ovr"]},
  "xgboost":       {"booster":["gbtree","gblinear","dart"],"learning_rate":0.1,"max_depth":6,"n_estimators":100,"eval_metric":"logloss"},
  "lightgbm":      {"boosting_type":["gbdt","dart"],"learning_rate":0.05,"num_leaves":31,"max_depth":7,"n_estimators":100},
  "naive_bayes":   {"var_smoothing":1e-9},
  "linear":        {"fit_intercept":[True,False],"normalize":[True,False]}
}


def build_prompt(page: str, data: pd.DataFrame, steps: Dict, target_column: str, question: str) -> List[Dict]:
    try:
        page_names = {
            "eda":       "Exploratory Data Analysis",
            "clean":     "Data Cleaning",
            "transform": "Data Transformation",
            "train":     "Model Training"
        }
        pg = page_names.get(page, page)

        # Safe fallback for target column
        if not target_column or target_column not in data.columns:
            target_column = data.columns[-1] if len(data.columns) else 'unknown'
        target_col_data = data.get(target_column)

        # Safe class count
        try:
            class_counts = target_col_data.value_counts(dropna=True).to_dict() if target_col_data is not None else {}
        except Exception:
            class_counts = {}

        data_summary = {
            "head": data.head().to_dict(),
            "tail": data.tail().to_dict(),
            "describe": data.describe(include="all").to_dict(),
            "dtypes": data.dtypes.astype(str).to_dict(),
            "missing_values": data.isnull().sum().to_dict(),
            "memory_usage": data.memory_usage(deep=True).to_dict(),
            "unique_values": {col: data[col].nunique(dropna=True) for col in data.columns},
            "shape": {"rows": data.shape[0], "columns": data.shape[1]},
            "sample": data.sample(min(5, len(data))).to_dict(),
            "correlation": data.select_dtypes(include=[np.number]).corr().fillna(0).to_dict(),
            "skewness": data.select_dtypes(include=[np.number]).skew().fillna(0).to_dict(),
            "class_counts": class_counts,
            "numeric_cols": data.select_dtypes(include=[np.number]).columns.tolist(),
            "cat_cols": data.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
        }

        system_msg = {
            "role": "system",
            "content": (
                f"You are an ML-pipeline assistant. The user is currently on the **{pg}** page.\n\n"
                f"**Dataset:** {data_summary['shape']['rows']} rows × {data_summary['shape']['columns']} columns; "
                f"target = '{target_column}' with distribution {data_summary['class_counts']}\n\n"
                f"**Data preview:**\n"
                f" • head: {data_summary['head']}\n"
                f" • tail: {data_summary['tail']}\n"
                f" • describe: {data_summary['describe']}\n"
                f" • dtypes: {data_summary['dtypes']}\n"
                f" • missing values: {data_summary['missing_values']}\n"
                f" • memory usage: {data_summary['memory_usage']}\n"
                f" • unique values: {data_summary['unique_values']}\n"
                f" • sample: {data_summary['sample']}\n\n"
                f"**Data types:**\n"
                f" • numeric: {data_summary['numeric_cols']}\n"
                f" • categorical: {data_summary['cat_cols']}\n\n"
                f"**Data distribution:**\n"
                f" • class counts: {data_summary['class_counts']}\n"
                f" • correlation: {data_summary['correlation']}\n"
                f" • skewness: {data_summary['skewness']}\n\n"
                f"**Cleaning steps:**\n"
                f" Filling Null with only mean, median, or mode.\n\n"
                f"**Shipped preprocessing ops:**\n"
                f" • encoding: {ENCODING_OPS}\n"
                f" • scaling:  {SCALING_OPS}\n"
                f" • skew-fix: {SKEW_OPS}\n"
                f" • balancing: {BALANCE_OPS}\n\n"
                "**Hyperparameter knobs per model:**\n"
                + "\n".join(f"  • {m}: {ALL_PARAMS[m]}" for m in ALL_PARAMS)
                + "\n\n"
                "When giving advice, only pick from the above options. "
                "If you don't know, say you don't know.\n\n"
                "If upload and no steps or dataset, say they are on homepage, say: Let get started with pipline and ask them to upload a dataset.\n\n"
                "If general questions are asked, answer them in the context of the current page.\n\n"
                "If on the Training page, compare all runs and tell which performed best (by AUC) and why.\n"
                "If on the Transform page, suggest the best encoding/scaling/skew-fix/balancing method and/or dropping columns for the data.\n"
                "If on the eda page, what are the most important features to look at and why?\n"
                "If on the clean page, for what column to fill its null value what to choose mean, median or mode then make graphs to see.\n"
                "If on the train page, what is the best model to use and why and what given hyperparameter to choose from and why?\n"
            )
        }

        user_msg = {
            "role": "user",
            "content": (
                f"Question: *{page}*> {question}*\n\n"
                f"Please provide a concise, actionable recommendation.\n\n"
                "Here is the full **pipeline history** so far:\n"
                + json.dumps(steps, indent=2)
                + "\n\nPlease reply with concise, actionable recommendations."
            )
        }

        return [system_msg, user_msg]
    except Exception as e:
        print(f"❌ Error in build_prompt: {e}")
        raise ValueError("Error in build_prompt: " + str(e))


async def stream_groq_response(api_key: str, messages: List[Dict]) -> AsyncGenerator[str, None]:
    try:
        headers = {"Authorization":f"Bearer {api_key}", "Content-Type":"application/json"}
        payload = {"model":GROQ_MODEL, "messages":messages, "stream":True, "temperature":0.6}
        async with aiohttp.ClientSession() as sess:
            async with sess.post(GROQ_API_URL, json=payload, headers=headers) as resp:
                async for chunk in resp.content:
                    txt = chunk.decode("utf-8").lstrip("data:").strip()
                    if not txt or txt=="[DONE]": continue
                    try:
                        delta = json.loads(txt)["choices"][0]["delta"].get("content")
                        if delta: yield delta
                    except:
                        continue
    except Exception as e:
        print(f"Error in stream_groq_response: {e}")
        raise ValueError("Error in stream_groq_response" + str(e))