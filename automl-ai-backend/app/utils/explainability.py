import shap
import pandas as pd

def get_shap_values(model, X_sample: pd.DataFrame, model_type: str = "tree"):
    explainer = shap.Explainer(model, X_sample) if model_type != "tree" else shap.TreeExplainer(model)
    shap_values = explainer(X_sample)
    shap_summary = pd.DataFrame(shap_values.values, columns=X_sample.columns).abs().mean().sort_values(ascending=False)
    return shap_summary.to_dict()
