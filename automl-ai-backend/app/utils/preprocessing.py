import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder, OrdinalEncoder, RobustScaler, MaxAbsScaler, PowerTransformer, QuantileTransformer
from scipy.stats import boxcox, yeojohnson
import numpy as np
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler

def apply_encoding(df: pd.DataFrame, method: str, cat_columns: list) -> pd.DataFrame:
    print(f"Applying {method} encoding to columns: {cat_columns}")
    if not cat_columns:
        print("No categorical columns provided for encoding.")
        return df
    try:
        df = df.copy()
        if method == "label":
            for col in cat_columns:
                df[col] = LabelEncoder().fit_transform(df[col].astype(str))
        elif method == "onehot":
            df = pd.get_dummies(df, columns=cat_columns, drop_first=True)
        elif method == "ordinal":
            for col in cat_columns:
                df[col] = OrdinalEncoder().fit_transform(df[[col]])
        elif method == "binary":
            for col in cat_columns:
                df[col] = df[col].apply(lambda x: 1 if x == 'yes' else 0)
        print(f"Applied {method} encoding to columns: {cat_columns}")
        return df
    except Exception as e:
        print(f"Error during encoding: {e} - {method} encoding failed.")
        raise ValueError(f"Unknown encoding method: {method}")

def apply_scaling(df: pd.DataFrame, method: str, columns: list) -> pd.DataFrame:
    try:    
        df = df.copy()
        if method == "standard":
            scaler = StandardScaler()
        elif method == "minmax":
            scaler = MinMaxScaler()
        elif method == "robust":
            scaler = RobustScaler()
        elif method == "maxabs":
            scaler = MaxAbsScaler()
        df[columns] = scaler.fit_transform(df[columns])
        print(f"Applied {method} scaling to columns: {columns}")
        return df
    except Exception as e:
        print(f"Error during scaling: {e} - {method} scaling failed.")
        raise ValueError(f"Unknown scaling method: {method}")

def apply_balancing(X: pd.DataFrame, y: pd.Series, method: str):
    try:
        counts = y.value_counts()
        min_class = counts.idxmin()
        min_count = counts[min_class]
        print(f"Class distribution before balancing: {counts.to_dict()}")
        print(f"Minority class: {min_class} with {min_count} samples.")
        print(f"Balancing method: {method}")

        if method == "smote":
            if min_count < 2:
                raise ValueError("Not enough samples in minority class to apply SMOTE.")
            k = max(1, min(min_count - 1, 5))  # Adjust k_neighbors to available samples
            sm = SMOTE(random_state=42, k_neighbors=k)
            X, y = sm.fit_resample(X, y)
            print(f"Applied SMOTE with k_neighbors={k}.")
            print(f"Class distribution after balancing: {y.value_counts().to_dict()}")
            return sm.fit_resample(X, y)

        elif method == "undersample":
            rus = RandomUnderSampler(random_state=42)
            X, y = rus.fit_resample(X, y)
            print(f"Applied RandomUnderSampler.")
            print(f"Class distribution after balancing: {y.value_counts().to_dict()}")
            return rus.fit_resample(X, y)

    except Exception as e:
        print(f"Error during balancing: {e} - {method} balancing failed.")
        raise ValueError(f"Unknown balancing method: {method}")

def apply_skewness_fix(df: pd.DataFrame, method: str, columns: list) -> pd.DataFrame:
    df = df.copy()
    print(f"Applying skewness fix using {method} on columns: {columns}")
    for col in columns:
        try:
            if method == "log":
                df[col] = np.log1p(df[col].clip(lower=0))
            elif method == "boxcox":
                df[col], _ = boxcox(df[col].clip(lower=1e-5)) 
            elif method == "yeojohnson":
                df[col], _ = yeojohnson(df[col])
            elif method == "sqrt":
                df[col] = np.sqrt(df[col].clip(lower=0))
            print(f"Applied {method} skewness correction to {col}.")
        except Exception as e:
            print(f"Skewness fix failed for {col}: {e}")
    print(f"Applied {method} skewness correction to: {columns}")
    return df