from fpdf import FPDF
import nbformat
from datetime import datetime
import pandas as pd
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell
import os

class PDFReport(FPDF):
    def header(self):
        self.set_font("Arial", "B", 14)
        self.cell(0, 10, "AutoML-AI Report", 0, 1, "C")
        self.ln(5)

    def section_title(self, title):
        self.set_font("Arial", "B", 12)
        self.cell(0, 8, title, 0, 1)
        self.ln(2)

    def section_body(self, body):
        self.set_font("Arial", "", 10)
        self.multi_cell(0, 5, body)
        self.ln()

def generate_pdf(session_id: str, session_data: dict = None) -> str:
    df: pd.DataFrame = session_data["data"]
    meta: dict      = session_data["meta"]
    steps: dict     = meta.get("steps", {})

    out_path = f"{session_id}.pdf"
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ─── Header ──────────────────────────────────────────────────────────────────
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "AutoML-AI Report", ln=True, align="C")
    pdf.ln(4)

    # ─── Session Info ────────────────────────────────────────────────────────────
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "Session Info", ln=True)
    pdf.set_font("Arial", "", 10)
    info = (
        f"Session ID: {session_id}\n"
        f"Filename: {meta.get('filename','')}\n"
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"Rows: {df.shape[0]}, Columns: {df.shape[1]}"
    )
    pdf.multi_cell(0, 6, info)
    pdf.ln(2)

    # ─── Cleaning ────────────────────────────────────────────────────────────────
    if "clean" in steps:
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Data Cleaning", ln=True)
        pdf.set_font("Arial", "", 10)
        for col, strat in steps["clean"].items():
            pdf.cell(0, 6, f"• {col}: {strat}", ln=True)
        pdf.ln(2)

    # ─── EDA Summary ─────────────────────────────────────────────────────────────
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "EDA Summary", ln=True)
    pdf.set_font("Arial", "", 10)
    # recompute correlation & skewness on-the-fly
    corr = df.select_dtypes(include=["number"]).corr().round(2)
    skew = df.select_dtypes(include=["number"]).skew().round(2)
    pdf.cell(0, 6, "Correlation (first 3 cols):", ln=True)
    # print first 3 columns of correlation matrix
    for idx, col in enumerate(corr.columns[:3]):
        row = ", ".join(f"{v:.2f}" for v in corr[col].iloc[:3])
        pdf.cell(0, 5, f"  {col}: {row}", ln=True)
    pdf.ln(1)
    pdf.cell(0, 6, "Skewness (first 5):", ln=True)
    for col, val in skew.iloc[:5].items():
        pdf.cell(0, 5, f"  {col}: {val:.2f}", ln=True)
    pdf.ln(2)

    # ─── Transformation ──────────────────────────────────────────────────────────
    if "transform" in steps:
        t = steps["transform"]
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Transformation", ln=True)
        pdf.set_font("Arial", "", 10)
        if t.get("drop_columns"):
            pdf.cell(0, 6, f"• Dropped: {t['drop_columns']}", ln=True)
        if t.get("encoding"):
            pdf.cell(0, 6, f"• Encoding: {t['encoding']} on {t.get('encoding_columns', 'all')}", ln=True)
        if t.get("scaling"):
            pdf.cell(0, 6, f"• Scaling: {t['scaling']} on {t.get('scaling_columns', 'all')}", ln=True)
        if t.get("balancing"):
            pdf.cell(0, 6, f"• Balancing: {t['balancing']}", ln=True)
        pdf.ln(2)

    # ─── Model Training & Evaluation ─────────────────────────────────────────────
    if "train" in steps:
        tr = steps["train"]
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Model Training & Evaluation", ln=True)
        pdf.set_font("Arial", "", 10)
        pdf.cell(0, 6, f"• Model: {tr['model']}", ln=True)
        pdf.cell(0, 6, f"• Hyperparameters: {tr['params_used']}", ln=True)
        pdf.ln(1)

        # confusion matrix if exists
        cm = tr.get("confusion_matrix")
        if cm:
            pdf.cell(0, 6, "Confusion Matrix:", ln=True)
            # assume cm is a 2×2 list
            for row in cm:
                pdf.cell(0, 6, "    " + "  ".join(str(x) for x in row), ln=True)
            pdf.ln(1)

        # metrics
        pdf.cell(0, 6, "Metrics:", ln=True)
        for k, v in tr["evaluation"].items():
            pdf.cell(0, 5, f"  • {k}: {v}", ln=True)

    # ─── Save ────────────────────────────────────────────────────────────────────
    pdf.output(out_path)
    return out_path

def generate_ipynb(session_id: str, session_data: dict) -> str:
    """
    Builds a Jupyter notebook reproducing the entire pipeline for a given session.
    Returns the path to the written .ipynb file.
    """
    meta = session_data.get("meta", {})
    steps = meta.get("steps", {})
    filename = f"{session_id}.ipynb"

    nb = new_notebook()
    cells = []

    # Title
    cells.append(new_markdown_cell(f"# AutoML-AI Exported Pipeline\n"
                                   f"**Session ID:** {session_id}\n"
                                   f"**Generated:** {datetime.now()}\n---"))

    # 1) Data import
    cells.append(new_markdown_cell("## 1. Data Import"))
    cells.append(new_code_cell(
        "import pandas as pd\n"
        f"# Replace `'path/to/{meta.get('filename','dataset.csv')}'` with your actual file\n"
        f"df = pd.read_csv('path/to/{meta.get('filename','dataset.csv')}')\n"
        "df.head()"
    ))

    # 2) Cleaning
    if "clean" in steps:
        cells.append(new_markdown_cell("## 2. Data Cleaning"))
        code = ["from sklearn.impute import SimpleImputer"]
        for col, strat in steps["clean"].items():
            if strat in ("mean", "median", "mode"):
                strategy = {"mean": "mean", "median": "median", "mode": "most_frequent"}[strat]
                code.append(f"imp_{col} = SimpleImputer(strategy='{strategy}')")
                code.append(f"df[['{col}']] = imp_{col}.fit_transform(df[['{col}']])")
            elif strat == "drop":
                code.append(f"df = df.dropna(subset=['{col}'])")
        code.append("df.head()")
        cells.append(new_code_cell("\n".join(code)))

    # 3) EDA
    cells.append(new_markdown_cell("## 3. Exploratory Data Analysis"))
    cells.append(new_code_cell(
        "import numpy as np\n"
        "# Correlation\n"
        "corr = df.select_dtypes(include=[np.number]).corr()\n"
        "corr"
    ))

    # 4) Transformation
    if "transform" in steps:
        t = steps["transform"]
        cells.append(new_markdown_cell("## 4. Transformation"))
        lines = []
        if t.get("drop_columns"):
            cols = t["drop_columns"]
            lines.append(f"df = df.drop(columns={cols})")
        if t.get("encoding"):
            method = t["encoding"]
            cols = t.get("encoding_columns", [])
            if method == "label":
                lines.append("from sklearn.preprocessing import LabelEncoder")
                for col in cols:
                    lines.append(f"df['{col}'] = LabelEncoder().fit_transform(df['{col}'].astype(str))")
            else:
                lines.append(f"df = pd.get_dummies(df, columns={cols}, drop_first=True)")
        if t.get("scaling"):
            method = t["scaling"]
            cols = t.get("scaling_columns", [])
            lines.append(f"from sklearn.preprocessing import {'StandardScaler' if method=='standard' else 'MinMaxScaler'}")
            scaler = "StandardScaler()" if method=="standard" else "MinMaxScaler()"
            lines.append(f"sc = {scaler}")
            lines.append(f"df[{cols}] = sc.fit_transform(df[{cols}])")
        if t.get("balancing"):
            bal = t["balancing"]
            if bal == "smote":
                lines.append("from imblearn.over_sampling import SMOTE")
                lines.append("sm = SMOTE(random_state=42)")
                lines.append("X = df.drop(columns=[target_col])  # set target_col below")
                lines.append("y = df[target_col]")
                lines.append("X, y = sm.fit_resample(X, y)")
                lines.append("df = pd.concat([X, y], axis=1)")
        lines.append("df.head()")
        cells.append(new_code_cell("\n".join(lines)))

    # 5) Model Training & Evaluation
    if "train" in steps:
        tr = steps["train"]
        cells.append(new_markdown_cell("## 5. Model Training & Evaluation"))
        lines = [
            "from sklearn.model_selection import train_test_split",
            "from sklearn.metrics import classification_report, confusion_matrix",
            "",
            "# -- Adjust these to match your target column --",
            "target_col = '{{ your_target_column }}'",
            "X = df.drop(columns=[target_col])",
            "y = df[target_col]",
            "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)",
            "",
            f"from {tr['model_module']} import {tr['model_class']}",
            f"model = {tr['model_class']}(**{tr['params']})",
            "model.fit(X_train, y_train)",
            "",
            "preds = model.predict(X_test)",
            "print(classification_report(y_test, preds, zero_division=0))",
            "print('Confusion Matrix:')",
            "print(confusion_matrix(y_test, preds))",
        ]
        cells.append(new_code_cell("\n".join(lines)))

    # 6) Final preview of metrics
    if "train" in steps:
        m = steps["train"]["metrics"]
        cells.append(new_markdown_cell("## 6. Reported Metrics"))
        content = "\n".join(f"- **{k}**: {v}" for k, v in m.items())
        cells.append(new_markdown_cell(content))

    nb["cells"] = cells
    nbformat.write(nb, filename)
    return filename
