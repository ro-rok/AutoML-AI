import numpy as np

def sanitize_numpy(obj):
    if isinstance(obj, dict):
        return {sanitize_numpy(k): sanitize_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_numpy(i) for i in obj]
    elif isinstance(obj, tuple):
        return tuple(sanitize_numpy(i) for i in obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (str, int, float, type(None), bool)):
        return obj
    else:
        return str(obj)
