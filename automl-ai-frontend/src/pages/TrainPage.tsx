import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

const ALL_PARAMS: Record<string, Record<string, any>> = {
  logistic: {
    penalty: ["l1", "l2", "elasticnet", "none"],
    solver: ["newton-cg", "lbfgs", "liblinear", "sag", "saga"],
    C: 1.0,
    max_iter: 100,
    fit_intercept: [true, false],
    class_weight: ["balanced", null],
  },
  random_forest: {
    n_estimators: 100,
    max_depth: 10,
    criterion: ["gini", "entropy"],
    bootstrap: [true, false],
    class_weight: ["balanced", "balanced_subsample", null],
  },
  decision_tree: {
    criterion: ["gini", "entropy"],
    max_depth: 5,
    min_samples_split: 2,
    class_weight: [null, "balanced"],
  },
  knn: {
    n_neighbors: 5,
    weights: ["uniform", "distance"],
    algorithm: ["auto", "ball_tree", "kd_tree", "brute"],
  },
  svm: {
    C: 1.0,
    kernel: ["linear", "poly", "rbf", "sigmoid"],
    probability: [true, false],
    decision_function_shape: ["ovo", "ovr"],
  },
  xgboost: {
    booster: ["gbtree", "gblinear", "dart"],
    learning_rate: 0.1,
    max_depth: 6,
    n_estimators: 100,
    eval_metric: "logloss",
  },
  lightgbm: {
    boosting_type: ["gbdt", "dart"],
    learning_rate: 0.05,
    num_leaves: 31,
    max_depth: 7,
    n_estimators: 100,
  },
  naive_bayes: {
    var_smoothing: 1e-9,
  },
  linear: {
    fit_intercept: [true, false],
    normalize: [true, false],
  }
};

export default function TrainPage() {
  const { sessionId } = useSessionStore();
  const [target, setTarget] = useState('');
  const [modelKey, setModelKey] = useState('logistic');
  const [params, setParams] = useState<Record<string, any>>({});
  const [metrics, setMetrics] = useState<any | null>(null);
  const [availableCols, setAvailableCols] = useState<string[]>([]);
  const [testSize, setTestSize] = useState(0.2);
  const [randomState, setRandomState] = useState(42);
  const [stratify, setStratify] = useState(true);

  useEffect(() => {
    const fetchCols = async () => {
      const res = await api.post('/pipeline/eda', { session_id: sessionId });
      const cols = Object.keys(res.data.correlation_matrix || {});
      setAvailableCols(cols);
      setTarget(cols[0] || '');
    };
    if (sessionId) fetchCols();
  }, [sessionId]);

  useEffect(() => {
    const modelDefaults = ALL_PARAMS[modelKey];
    const initialParams: Record<string, any> = {};
    for (const [key, val] of Object.entries(modelDefaults)) {
      initialParams[key] = Array.isArray(val) ? val[0] : val;
    }
    setParams(initialParams);
  }, [modelKey]);

  const handleTrain = async () => {
    const res = await api.post('/pipeline/train', {
      session_id: sessionId,
      target_column: target,
      model_key: modelKey,
      hyperparameters: params,
      test_size: testSize,
      random_state: randomState,
      stratify,
    });
    setMetrics(res.data.evaluation);
  };

  const updateParam = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Model Training</h2>

      <label className="block font-semibold">Target Column</label>
      <select value={target} onChange={(e) => setTarget(e.target.value)} className="border p-2 w-full">
        {availableCols.map(col => (
          <option key={col} value={col}>{col}</option>
        ))}
      </select>

      <label className="block font-semibold">Model</label>
      <select value={modelKey} onChange={(e) => setModelKey(e.target.value)} className="border p-2 w-full">
        {Object.keys(ALL_PARAMS).map(key => (
          <option key={key} value={key}>{key}</option>
        ))}
      </select>

      <div className="space-y-2">
        <h3 className="font-semibold">Hyperparameters</h3>
        {Object.entries(ALL_PARAMS[modelKey]).map(([key, val]) => (
          <div key={key} className="mb-2">
            <label className="text-sm block font-medium mb-1">{key}</label>
            {Array.isArray(val) ? (
              <div className="flex flex-wrap gap-x-4">
                {val.map((opt, idx) => (
                  <label key={idx} className="text-sm flex items-center gap-x-2">
                    <input
                      type="radio"
                      name={key}
                      value={String(opt)}
                      checked={params[key] === opt}
                      onChange={() => updateParam(key, opt)}
                    />
                    {String(opt)}
                  </label>
                ))}
              </div>
            ) : (
              <input
                type={typeof val === 'number' ? 'number' : 'text'}
                value={params[key]}
                onChange={(e) =>
                  updateParam(key, typeof val === 'number' ? Number(e.target.value) : e.target.value)
                }
                className="border p-2 w-full"
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="font-semibold block">Test Size</label>
          <input type="number" min={0} max={1} step={0.01} value={testSize}
                 onChange={(e) => setTestSize(Number(e.target.value))} className="border p-2 w-full" />
        </div>
        <div>
          <label className="font-semibold block">Random State</label>
          <input type="number" value={randomState}
                 onChange={(e) => setRandomState(Number(e.target.value))} className="border p-2 w-full" />
        </div>
        <div>
          <label className="font-semibold block">Stratify</label>
          <select value={stratify ? "true" : "false"} onChange={(e) => setStratify(e.target.value === "true")} className="border p-2 w-full">
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      </div>

      <button onClick={handleTrain} className="bg-blue-600 text-white px-6 py-2 rounded">
        Train Model
      </button>

      {metrics && (
        <div className="mt-6">
          <h3 className="font-semibold">Evaluation Metrics</h3>
          <pre className="bg-gray-100 p-3 text-sm overflow-x-auto">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
