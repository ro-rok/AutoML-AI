import io, random
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats

# Optional: for SHAP summary plots
try:
    import shap
except ImportError:
    shap = None

# Get a random style and colormap
def _apply_random_style():
    styles = plt.style.available
    plt.style.use(random.choice(styles))
    colormaps = [m for m in plt.colormaps() if not m.endswith("_r")]
    return random.choice(colormaps)

def _save_fig_to_buf(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    plt.close(fig)
    return buf

def plot_histogram(df: pd.DataFrame, column: str = None, bins: int = 30):
    cmap = _apply_random_style()
    fig, ax = plt.subplots(figsize=(6, 4))

    if column:
        data = df[column].dropna()
        mean_val = data.mean()
        median_val = data.median()
        skew_val = data.skew()

        ax.hist(data, bins=bins, color='skyblue', edgecolor="black")
        ax.axvline(mean_val, color='red', linestyle='dashed', linewidth=1, label=f'Mean: {mean_val:.2f}')
        ax.axvline(median_val, color='green', linestyle='dashed', linewidth=1, label=f'Median: {median_val:.2f}')
        ax.set_title(f"Histogram of {column} (Skewness: {skew_val:.2f})")
        ax.set_xlabel(column)
        ax.set_ylabel("Frequency")
        ax.legend()
    else:
        df.select_dtypes(include=np.number).hist(bins=bins, figsize=(8, 6), layout=(2, 3), color='skyblue', edgecolor="black")
        plt.suptitle("Histograms")

    return _save_fig_to_buf(fig)

def plot_bar(df: pd.DataFrame, column: str):
    cmap = _apply_random_style()
    counts = df[column].value_counts()
    fig, ax = plt.subplots(figsize=(6, 4))
    counts.plot.bar(color='lightcoral', ax=ax, edgecolor='black')
    ax.set_title(f"Bar chart of {column}")
    ax.set_ylabel("Count")
    ax.set_xlabel(column)
    return _save_fig_to_buf(fig)

def plot_pie(df: pd.DataFrame, column: str):
    cmap = _apply_random_style()
    counts = df[column].value_counts()
    fig, ax = plt.subplots(figsize=(5, 5))
    counts.plot.pie(
        autopct="%1.1f%%", startangle=90, cmap=cmap, ax=ax
    )
    ax.set_ylabel("")
    ax.set_title(f"Pie chart of {column}")
    return _save_fig_to_buf(fig)

def plot_boxplot(df: pd.DataFrame, column: str = None):
    cmap = _apply_random_style()
    fig, ax = plt.subplots(figsize=(6, 4))
    if column:
        data = df[column].dropna()
        sns.boxplot(x=data, ax=ax, color='orchid')
        mean_val = data.mean()
        median_val = data.median()
        ax.axvline(mean_val, color='red', linestyle='dashed', label=f'Mean: {mean_val:.2f}')
        ax.axvline(median_val, color='green', linestyle='dashed', label=f'Median: {median_val:.2f}')
        ax.legend()
        ax.set_title(f"Boxplot of {column}")
    else:
        sns.boxplot(data=df.select_dtypes(include=np.number), orient="h", palette='Set2', ax=ax)
        ax.set_title("Boxplots (numeric columns)")
    return _save_fig_to_buf(fig)

def plot_qq(df: pd.DataFrame, column: str):
    fig = plt.figure(figsize=(5, 5))
    stats.probplot(df[column].dropna(), dist="norm", plot=plt)
    plt.title(f"QQ-plot of {column}")
    return _save_fig_to_buf(fig)

def plot_scatter(df: pd.DataFrame, x: str, y: str):
    cmap = _apply_random_style()
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.scatter(df[x], df[y], c=df[y], cmap=cmap, alpha=0.7, edgecolor="k")
    ax.set_title(f"Scatter: {y} vs {x}")
    ax.set_xlabel(x)
    ax.set_ylabel(y)

    corr = df[[x, y]].corr().iloc[0, 1]
    ax.text(0.05, 0.95, f'Corr: {corr:.2f}', transform=ax.transAxes, fontsize=10, verticalalignment='top', bbox=dict(boxstyle="round", facecolor="white", alpha=0.5))

    return _save_fig_to_buf(fig)

def plot_line(df: pd.DataFrame, x: str, y: str):
    cmap = _apply_random_style()
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(df[x], df[y], marker=random.choice(['o', 's', '^', '.']), color='teal')
    ax.set_title(f"Line plot: {y} over {x}")
    ax.set_xlabel(x)
    ax.set_ylabel(y)
    return _save_fig_to_buf(fig)

def plot_heatmap(df: pd.DataFrame):
    cmap = _apply_random_style()
    corr = df.select_dtypes(include=np.number).corr()
    fig, ax = plt.subplots(figsize=(6, 6))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap=cmap, ax=ax)
    ax.set_title("Correlation Heatmap")
    return _save_fig_to_buf(fig)

def plot_roc_curve(y_true, y_score, pos_label=1, roc_auc = 0.0):
    from sklearn.metrics import roc_curve, auc
    fpr, tpr, _ = roc_curve(y_true, y_score, pos_label=pos_label)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot(fpr, tpr, label=f"AUC = {roc_auc:.3f}", color='blue')
    ax.plot([0, 1], [0, 1], linestyle='--', color='grey')
    ax.set_title("ROC Curve")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.legend(loc="lower right")
    return _save_fig_to_buf(fig)

def plot_model_comparison(metrics: dict):
    print(metrics)
    cmap = _apply_random_style()
    names = list(metrics.keys())
    aucs = [metrics[m]["roc_auc"] for m in names]
    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(names, aucs, color='skyblue', edgecolor='black')
    ax.set_title("Model AUC Comparison")
    ax.set_ylabel("ROC AUC")
    ax.set_xticklabels(names, rotation=45, ha="right")

    for bar, val in zip(bars, aucs):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), f'{val:.2f}', ha='center', va='bottom')


    ax.axhline(y=0.5, color='red', linestyle='--', label='Baseline AUC = 0.5')
    ax.legend()

    return _save_fig_to_buf(fig)

def plot_shap_summary(shap_values: any, X: pd.DataFrame):
    fig = shap.summary_plot(shap_values, X, show=False)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    plt.close(fig)
    return buf
