from sklearn.model_selection import cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix
import shap

# Mapping models to constructors
MODEL_MAP = {
    "logistic": LogisticRegression,
    "linear": LinearRegression,
    "random_forest": RandomForestClassifier,
    "decision_tree": DecisionTreeClassifier,
    "naive_bayes": GaussianNB,
    "svm": SVC,
    "knn": KNeighborsClassifier,
    "xgboost": XGBClassifier,
    "lightgbm": LGBMClassifier,
}

CLASSIFICATION_MODELS = {
    "logistic", "random_forest", "decision_tree",
    "knn", "svm", "naive_bayes", "xgboost", "lightgbm"
}

REGRESSION_MODELS = {
    "linear"
}

# Default hyperparameters per model
DEFAULT_PARAMS = {
    "logistic": {"solver": "liblinear", "max_iter": 100},
    "random_forest": {"n_estimators": 100, "max_depth": 10},
    "decision_tree": {"max_depth": 5},
    "svm": {"C": 1.0, "kernel": "rbf", "probability": True},
    "knn": {"n_neighbors": 5},
    "xgboost": {"use_label_encoder": False, "eval_metric": "logloss"},
    "lightgbm": { "num_leaves":31,"max_depth":7,"learning_rate":0.05,"feature_fraction":0.8},
    "naive_bayes": {},
    "linear": {}
}

def cast_params(user_params, default_params):
    casted = {}
    for k, v in user_params.items():
        if k in default_params:
            expected_type = type(default_params[k])
            try:
                if isinstance(default_params[k], (list, tuple)):
                    if v in default_params[k]:
                        casted[k] = v
                    else:
                        print(f"[WARN] Invalid value for {k}: {v}, using {default_params[k][0]}")
                        casted[k] = default_params[k][0]
                else:
                    casted[k] = expected_type(v)
            except Exception as e:
                print(f"[WARN] Failed to cast {k}: {v} -> {e}, using default {default_params[k]}")
                casted[k] = default_params[k]
        else:
            casted[k] = v
    return casted

def train_and_evaluate(model_key, X, y, user_params=None, test_size=0.2, random_state=42, stratify=True):
    if model_key not in MODEL_MAP:
        raise ValueError(f"Unsupported model '{model_key}'")

    stratify_col = y if stratify and model_key in CLASSIFICATION_MODELS else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=stratify_col
    )

    ModelClass = MODEL_MAP[model_key]
    params = DEFAULT_PARAMS.get(model_key, {}).copy()
    if user_params:
        params.update(cast_params(user_params, params))

    model = ModelClass(**params)
    print(f"Training {model_key} with params: {params}")
    model.fit(X_train, y_train)

    if model_key in CLASSIFICATION_MODELS:
        preds = model.predict(X_test)
        probs = None
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_test)[:, 1]
        elif hasattr(model, "decision_function"):
            probs = model.decision_function(X_test)
        scores = {
            "accuracy": round(accuracy_score(y_test, preds), 4),
            "precision": round(precision_score(y_test, preds, zero_division=0), 4),
            "recall": round(recall_score(y_test, preds, zero_division=0), 4),
            "f1": round(f1_score(y_test, preds, zero_division=0), 4),
            "roc_auc": round(roc_auc_score(y_test, preds), 4),
        }
        cm = confusion_matrix(y_test, preds)
        print(f"Model: {model_key}, accuracy: {accuracy_score(y_test, preds)}, precision: {precision_score(y_test, preds, zero_division=0):.4f}, recall: {recall_score(y_test, preds, zero_division=0):.4f}, f1: {f1_score(y_test, preds, zero_division=0):.4f}, roc_auc: {roc_auc_score(y_test, preds):.4f}")
        
    elif model_key in REGRESSION_MODELS:
        preds = model.predict(X_test)
        probs = None
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_test)[:, 1]
        elif hasattr(model, "decision_function"):
            probs = model.decision_function(X_test)
        scores = {
            "rmse": round(np.sqrt(mean_squared_error(y_test, preds)), 4),
            "mae": round(mean_absolute_error(y_test, preds), 4),
            "r2": round(r2_score(y_test, preds), 4)
        }
    else:
        raise ValueError(f"Model '{model_key}' is not supported.")

    if probs is not None:
        df_test = X_test.copy()
        df_test["__y_true"]  = y_test
        df_test["__y_score"] = probs
        
    # try:
    #     if model_key in ["random_forest", "decision_tree", "xgboost", "lightgbm"]:
    #         explainer = shap.TreeExplainer(model)
    #     else:
    #         explainer = shap.Explainer(model, X_train)
    #     shap_values = explainer(X_test)
    #     shap.summary_plot(shap_values, X_test, show=False)
    #     print("SHAP values computed successfully.")
    # except Exception as e:
    #     print(f"Error computing SHAP values: {e}")

    return model.__class__.__name__, params, scores, cm if model_key in CLASSIFICATION_MODELS else None, df_test if df_test is not None else None
