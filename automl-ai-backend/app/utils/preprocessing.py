import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder, OneHotEncoder
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler

def apply_encoding(df: pd.DataFrame, method: str, cat_columns: list) -> pd.DataFrame:
    df = df.copy()
    if method == "label":
        for col in cat_columns:
            df[col] = LabelEncoder().fit_transform(df[col].astype(str))
    elif method == "onehot":
        df = pd.get_dummies(df, columns=cat_columns, drop_first=True)
    return df

def apply_scaling(df: pd.DataFrame, method: str, columns: list) -> pd.DataFrame:
    df = df.copy()
    scaler = StandardScaler() if method == "standard" else MinMaxScaler()
    df[columns] = scaler.fit_transform(df[columns])
    return df

def apply_balancing(X: pd.DataFrame, y: pd.Series, method: str):
    if method == "smote":
        return SMOTE().fit_resample(X, y)
    elif method == "undersample":
        return RandomUnderSampler().fit_resample(X, y)
    return X, y
