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

# Default hyperparameters per model
DEFAULT_PARAMS = {
    "logistic": {"solver": "liblinear", "max_iter": 100},
    "random_forest": {"n_estimators": 100, "max_depth": None},
    "decision_tree": {"max_depth": None},
    "svm": {"C": 1.0, "kernel": "rbf", "probability": True},
    "knn": {"n_neighbors": 5},
    "xgboost": {"use_label_encoder": False, "eval_metric": "logloss"},
    "lightgbm": {},
    "naive_bayes": {},
    "linear": {}
}

def train_and_evaluate(model_key, X, y, user_params=None):
    if model_key not in MODEL_MAP:
        raise ValueError(f"Unsupported model '{model_key}'")

    ModelClass = MODEL_MAP[model_key]
    params = DEFAULT_PARAMS.get(model_key, {}).copy()
    if user_params:
        params.update(user_params)

    model = ModelClass(**params)
    model.fit(X, y)

    # Basic evaluation with cross-val
    scores = {
        "accuracy": round(np.mean(cross_val_score(model, X, y, scoring="accuracy", cv=5)), 4),
        "precision": round(np.mean(cross_val_score(model, X, y, scoring="precision", cv=5)), 4),
        "recall": round(np.mean(cross_val_score(model, X, y, scoring="recall", cv=5)), 4),
        "f1": round(np.mean(cross_val_score(model, X, y, scoring="f1", cv=5)), 4),
        "roc_auc": round(np.mean(cross_val_score(model, X, y, scoring="roc_auc", cv=5)), 4),
    }

    return model.__class__.__name__, params, scores
