from datetime import datetime
import pandas as pd
import nbformat
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell
from reportlab.lib.pagesizes import inch
from .pdf_report import PDFReport


def generate_pdf(session_id: str, session_data: dict) -> str:
    try:
        df = pd.DataFrame(session_data.get("data", []))
        meta = session_data.get("meta", {})
        steps = meta.get("steps", {})

        out_path = f"{session_id}_report.pdf"
        report = PDFReport(out_path)

        # Session Info
        info = (
            f"Session ID: {session_id}\n"
            f"Filename: {meta.get('filename','')}\n"
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"Target Column: {meta.get('target_column','')}\n"
            f"Data Shape: {df.shape[0]} rows × {df.shape[1]} columns"
        )
        report.add_section("Session Information", info)

        # EDA: Correlation & Skewness
        num = df.select_dtypes(include=["number"])
        corr = num.corr().round(2)
        skew = num.skew().round(2)

        # Correlation table (first 3 cols)
        corr_cols = corr.columns[:3]
        corr_data = [[""] + list(corr_cols)]
        for c in corr_cols:
            corr_data.append([c] + [f"{corr.loc[c, c2]:.2f}" for c2 in corr_cols])
        report.add_section("Correlation (first 3 numeric columns)")
        report.add_table(corr_data)

        # Skewness table (first 5)
        skew_items = list(skew.iloc[:5].items())
        skew_data = [["Column", "Skewness"]] + [[c, f"{v:.2f}"] for c, v in skew_items]
        report.add_section("Skewness (first 5 numeric columns)")
        report.add_table(skew_data, col_widths=[2.5 * inch, 2.5 * inch])

        # Transformation steps
        transform_steps = steps.get("transform", [])
        if transform_steps:
            report.add_section("Transformation Steps")
            for i, t in enumerate(transform_steps, start=1):
                sub = []
                dropped = t.get("dropped_columns", [])
                if dropped:
                    sub.append(f"Dropped: {', '.join(dropped)}")
                for method, cols in t.get("encoding", {}).items():
                    if cols:
                        sub.append(f"Encoding ({method}): {', '.join(cols)}")
                for method, cols in t.get("scaling", {}).items():
                    if cols:
                        sub.append(f"Scaling ({method}): {', '.join(cols)}")
                for method, cols in t.get("skew_fix", {}).items():
                    if cols:
                        sub.append(f"Skew-fix ({method}): {', '.join(cols)}")
                for method, cols in t.get("balancing", {}).items():
                    if method != "none":
                        sub.append(f"Balancing: {method}")
                report.add_section(f"Step {i}", "\n".join(sub))

        # Model Training runs
        train_steps = steps.get("train", [])
        if train_steps:
            report.add_section("Model Training & Evaluation")
            for i, tr in enumerate(train_steps, start=1):
                model = tr.get("model")
                params = tr.get("params", tr.get("params_used", {}))
                report.add_section(f"Run {i}: {model}", f"Parameters: {params}")

                # Confusion matrix
                cm = tr.get("confusion_matrix")
                if cm:
                    cm_table = [
                        ["", "Pred 0", "Pred 1"],
                        ["Actual 0", cm[0][0], cm[0][1]],
                        ["Actual 1", cm[1][0], cm[1][1]],
                    ]
                    report.add_table(cm_table)

                # Metrics
                metrics = tr.get("metrics", tr.get("evaluation", {}))
                metrics_data = [["Metric", "Value"]] + [[k, v] for k, v in metrics.items()]
                report.add_table(metrics_data, col_widths=[2.5 * inch, 2.5 * inch])

        # build and return path
        report.build()
        return out_path
    
    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise e


def generate_ipynb(session_id: str, session_data: dict) -> str:
    try:
    
        data = session_data.get("data", [])
        df = pd.DataFrame(data)

        meta = session_data.get("meta", {})
        steps = meta.get("steps", {})

        nb = new_notebook()
        cells = []

        # Title
        cells.append(new_markdown_cell(
            f"# AutoML-AI Exported Pipeline\n"
            f"**Session ID:** {session_id}  \n"
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n---"
        ))

        # 1) Data import
        cells.append(new_markdown_cell("## 1. Data Import"))
        cells.append(new_code_cell(
            "import pandas as pd\n"
            f"# if you have the original file locally:\n"
            f"df = pd.read_csv('path/to/{meta.get('filename','dataset.csv')}')\n"
            "df.head()" 
        ))

        cells.append(new_code_cell(
            "# Set your target column name below:\n"
            f"target_col = {meta.get('target_column', 'target')}  # replace with your target column name\n"
        ))
        # 2) Cleaning
        clean_steps = steps.get("clean", {})
        if clean_steps:
            cells.append(new_markdown_cell("## 2. Data Cleaning"))
            code = ["from sklearn.impute import SimpleImputer"]
            for step in (clean_steps if isinstance(clean_steps, list) else [clean_steps]):
                for col, strat in step.items():
                    if strat in ("mean", "median"):
                        code.append(f"imp = SimpleImputer(strategy='{strat}')")
                        code.append(f"df[['{col}']] = imp.fit_transform(df[['{col}']])")
                    elif strat == "mode":
                        code.append(f"df['{col}'] = df['{col}'].fillna(df['{col}'].mode()[0])")
                    elif strat == "drop":
                        code.append(f"df = df.dropna(subset=['{col}'])")
            code.append("df.head()")
            cells.append(new_code_cell("\n".join(code)))

        # 3) EDA
        cells.append(new_markdown_cell("## 3. Exploratory Data Analysis"))
        cells.append(new_code_cell(
            "import numpy as np\n"
            "num = df.select_dtypes(include=[np.number])\n"
            "print('Correlation:')\n"
            "print(num.corr().round(2).head())\n"
            "print('\\nSkewness:')\n"
            "print(num.skew().round(2).head())"
        ))

        # 4) Transformations
        transform_steps = steps.get("transform", [])
        if transform_steps:
            cells.append(new_markdown_cell("## 4. Transformations"))
            for i, t in enumerate(transform_steps, start=1):
                lines = [f"# — step {i} —"]
                # drop
                dropped = t.get("dropped_columns", [])
                if dropped:
                    lines.append(f"df = df.drop(columns={dropped})")
                # encoding
                for method, cols in t.get("encoding", {}).items():
                    if cols:
                        if method == "label":
                            lines.append("from sklearn.preprocessing import LabelEncoder")
                            for c in cols:
                                lines.append(f"df['{c}'] = LabelEncoder().fit_transform(df['{c}'])")
                        elif method == "onehot":
                            lines.append(f"df = pd.get_dummies(df, columns={cols}, drop_first=True)")
                        elif method == "ordinal":
                            lines.append("from sklearn.preprocessing import OrdinalEncoder")
                            lines.append(f"df[{cols}] = OrdinalEncoder().fit_transform(df[{cols}])")
                        elif method == "binary":
                            lines.append(f"df[{cols}] = df[{cols}].applymap(lambda x: 1 if x=='yes' else 0)")
                # scaling
                for method, cols in t.get("scaling", {}).items():
                    if cols:
                        if method == "standard":
                            lines.append("from sklearn.preprocessing import StandardScaler")
                            lines.append("sc = StandardScaler()")
                        elif method == "minmax":
                            lines.append("from sklearn.preprocessing import MinMaxScaler")
                            lines.append("sc = MinMaxScaler()")
                        elif method == "robust":
                            lines.append("from sklearn.preprocessing import RobustScaler")
                            lines.append("sc = RobustScaler()")
                        elif method == "maxabs":
                            lines.append("from sklearn.preprocessing import MaxAbsScaler")
                            lines.append("sc = MaxAbsScaler()")
                        lines.append(f"df[{cols}] = sc.fit_transform(df[{cols}])")
                # skew fix
                for method, cols in t.get("skew_fix", {}).items():
                    if cols and method != "none":
                        if method == "log":
                            lines.append(f"df[{cols}] = np.log1p(df[{cols}])")
                        elif method == "sqrt":
                            lines.append(f"df[{cols}] = np.sqrt(df[{cols}])")
                        elif method == "boxcox":
                            lines.append("from scipy.stats import boxcox")
                            for c in cols:
                                lines.append(f"df['{c}'], _ = boxcox(df['{c}'].clip(lower=1e-5))")
                        elif method == "yeojohnson":
                            lines.append("from scipy.stats import yeojohnson")
                            for c in cols:
                                lines.append(f"df['{c}'], _ = yeojohnson(df['{c}'])")
                # balancing
                for method, _ in t.get("balancing", {}).items():
                    if method == "smote":
                        lines.extend([
                            "from imblearn.over_sampling import SMOTE",
                            "sm = SMOTE(random_state=42)",
                            "X = df.drop(columns=[target_col])",
                            "y = df[target_col]",
                            "X, y = sm.fit_resample(X, y)",
                            "df = pd.concat([X, y], axis=1)"
                        ])
                    elif method == "undersample":
                        lines.extend([
                            "from imblearn.under_sampling import RandomUnderSampler",
                            "rus = RandomUnderSampler(random_state=42)",
                            "X = df.drop(columns=[target_col])",
                            "y = df[target_col]",
                            "X, y = rus.fit_resample(X, y)",
                            "df = pd.concat([X, y], axis=1)"
                        ])
                lines.append("df.head()")
                cells.append(new_code_cell("\n".join(lines)))

        # 5) Training & evaluation
        train_steps = steps.get("train", [])
        if train_steps:
            cells.append(new_markdown_cell("## 5. Model Training & Evaluation"))
            for i, tr in enumerate(train_steps, start=1):
                mdl = tr.get("model")
                params = tr.get("params", tr.get("params_used", {}))

                lines = [
                    f"# — run {i}: {mdl} —",
                    "from sklearn.model_selection import train_test_split",
                    "from sklearn.metrics import classification_report, confusion_matrix",
                    "",
                    "# Set your target column name below:",
                    "X = df.drop(columns=[target_col])",
                    "y = df[target_col]",
                    "X_train, X_test, y_train, y_test = train_test_split(",
                    "    X, y, test_size=0.2, random_state=42, stratify=y",
                    ")",
                    "",
                ]

                # import
                if mdl == "LogisticRegression":
                    lines.append("from sklearn.linear_model import LogisticRegression")
                elif mdl == "RandomForestClassifier":
                    lines.append("from sklearn.ensemble import RandomForestClassifier")
                elif mdl == "DecisionTreeClassifier":
                    lines.append("from sklearn.tree import DecisionTreeClassifier")
                elif mdl == "KNeighborsClassifier":
                    lines.append("from sklearn.neighbors import KNeighborsClassifier")
                elif mdl == "SVC":
                    lines.append("from sklearn.svm import SVC")
                elif mdl == "GaussianNB":
                    lines.append("from sklearn.naive_bayes import GaussianNB")
                elif mdl == "XGBClassifier":
                    lines.append("from xgboost import XGBClassifier")
                elif mdl == "LGBMClassifier":
                    lines.append("from lightgbm import LGBMClassifier")
                elif mdl == "LinearRegression":
                    lines.append("from sklearn.linear_model import LinearRegression")

                lines.append(f"model = {mdl}(**{params})")
                lines.append("model.fit(X_train, y_train)")
                lines.append("")
                lines.append("preds = model.predict(X_test)")
                lines.append("")
                lines.append("print('Model Evaluation:')")
                lines.append("print('Classification Report:')")
                lines.append("print(classification_report(y_test, preds))")
                lines.append("")
                lines.append("print('Confusion Matrix:')")
                lines.append("print(confusion_matrix(y_test, preds))")
                lines.append("")
                lines.append("# Visualize the confusion matrix")
                lines.append("import seaborn as sns")
                lines.append("import matplotlib.pyplot as plt")
                lines.append("cm = confusion_matrix(y_test, preds)")
                lines.append("plt.figure(figsize=(10, 7))")
                lines.append("sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')")
                lines.append("plt.title('Confusion Matrix')")
                lines.append("plt.xlabel('Predicted')")
                lines.append("plt.ylabel('Actual')")
                lines.append("plt.show()")
                lines.append("")
                
                cells.append(new_code_cell("\n".join(lines)))

        # Wrap up
        nb["cells"] = cells
        notebook_path = f"{session_id}_pipeline.ipynb"
        nbformat.write(nb, notebook_path)
        return notebook_path
    except Exception as e:
        print(f"Error generating IPYNB: {e}")
        raise e
