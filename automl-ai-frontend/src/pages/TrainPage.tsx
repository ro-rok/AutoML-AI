// src/pages/TrainPage.tsx
import { useState, useEffect } from 'react'
import { Tab, Switch , TabGroup, TabList } from '@headlessui/react'
import { FiPlay } from 'react-icons/fi'
import { api } from '../api/client'
import { useSessionStore } from '../store/useSessionStore'

// Full display names for each model
const MODEL_NAMES: Record<string, string> = {
  logistic:       'Logistic Regression',
  random_forest:  'Random Forest Classifier',
  decision_tree:  'Decision Tree',
  knn:            'K-Nearest Neighbors',
  svm:            'Support Vector Machine',
  xgboost:        'XGBoost',
  lightgbm:       'LightGBM',
  naive_bayes:    'Naive Bayes',
  linear:         'Linear Regression',
}

const ALL_PARAMS: Record<string, Record<string, any>> = {
  logistic: {
    penalty:       ['l2','l1','elasticnet','none'],
    solver:        ['newton-cg','lbfgs','liblinear','sag','saga'],
    C:             1.0,
    max_iter:      100,
    fit_intercept: [true,false],
    class_weight:  ['balanced',null],
  },
  random_forest: {
    n_estimators: 100,
    max_depth:    10,
    criterion:    ['gini','entropy'],
    bootstrap:    [true,false],
    class_weight: ['balanced','balanced_subsample',null],
  },
  decision_tree: {
    criterion:          ['gini','entropy'],
    max_depth:           5,
    min_samples_split:   2,
    class_weight:       [null,'balanced'],
  },
  knn: {
    n_neighbors:  5,
    weights:     ['uniform','distance'],
    algorithm:   ['auto','ball_tree','kd_tree','brute'],
  },
  svm: {
    C:                   1.0,
    kernel:             ['linear','poly','rbf','sigmoid'],
    probability:       [true,false],
    decision_function_shape: ['ovo','ovr'],
  },
  xgboost: {
    booster:        ['gbtree','gblinear','dart'],
    learning_rate:  0.1,
    max_depth:      6,
    n_estimators:   100,
  },
  lightgbm: {
    boosting_type: ['gbdt','dart'],
    learning_rate: 0.05,
    num_leaves:     31,
    max_depth:      7,
    n_estimators:   100,
  },
  naive_bayes: {
    var_smoothing: 1e-9,
  },
  linear: {
    fit_intercept: [true,false],
    normalize:     [true,false],
  },
}

export default function TrainPage() {
  const { sessionId } = useSessionStore()
  const modelKeys = Object.keys(ALL_PARAMS)
  const [modelKey, setModelKey] = useState(modelKeys[0])
  const [params, setParams]   = useState<Record<string, any>>({})
  const [testSize, setTestSize] = useState(0.2)
  const [randomState, setRandomState] = useState(42)
  const [stratify, setStratify] = useState(true)
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null)
  const [confMatrix, setConfMatrix] = useState<number[][] | null>(null)
  const [rocUrl, setRocUrl] = useState<string | null>(null)

  // Whenever the chosen model changes, reset its params to defaults
  useEffect(() => {
    const def = ALL_PARAMS[modelKey]
    const init: Record<string, any> = {}
    for (const [k,v] of Object.entries(def)) {
      init[k] = Array.isArray(v) ? v[0] : v
    }
    setParams(init)
    setMetrics(null)
    setConfMatrix(null)
    setRocUrl(null)
  }, [modelKey])

  const handleTrain = async () => {
    setLoading(true)
    try {
      // 1. Train
      const res = await api.post('/pipeline/train', {
        session_id: sessionId,
        model_key: modelKey,
        hyperparameters: params,
        test_size: testSize,
        random_state: randomState,
        stratify,
      })
      setMetrics(res.data.evaluation)
      setConfMatrix(res.data.confusion_matrix)

      // 2. Fetch ROC curve
      const blob = await api.get('/graph/roc_plot', {
        params: { session_id: sessionId },
        responseType: 'blob'
      })
      setRocUrl(URL.createObjectURL(blob.data))
    } catch (e) {
      console.error(e)
      alert('Training failed. Check console.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-5">
      <h2 className="text-3xl font-bold mb-6">Train a Model</h2>

      {/* 1) Model Carousel */}
      <TabGroup
        selectedIndex={modelKeys.indexOf(modelKey)}
        onChange={i => setModelKey(modelKeys[i])}
      >
        <TabList className="flex space-x-2 overflow-x-auto mb-6 py-2">
          {modelKeys.map(key => (
            <Tab key={key} className={({ selected }) =>
              `flex-shrink-0 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap
               ${selected
                 ? 'bg-red-500 text-black'
                 : 'bg-gray-800 text-gray-300'}`
            }>
              {MODEL_NAMES[key]}
            </Tab>
          ))}
        </TabList>
      </TabGroup>

      {/* 2) Hyperparameters */}
      <div className="space-y-6 mb-8">
        {Object.entries(ALL_PARAMS[modelKey]).map(([param, opts]) => (
          <div key={param}>
            <div className="text-sm text-gray-400 mb-1">{param}</div>
            {Array.isArray(opts) ? (
              <div className="flex space-x-2 overflow-x-auto">
                {opts.map((opt: any) => (
                  <label
                    key={String(opt)}
                    className={`
                      px-3 py-1 rounded-full cursor-pointer flex-shrink-0
                      ${params[param] === opt
                        ? 'bg-red-500 text-black'
                        : 'bg-gray-800 text-gray-300'}
                    `}
                  >
                    <input
                      type="radio"
                      name={param}
                      value={String(opt)}
                      checked={params[param] === opt}
                      onChange={() => setParams(p => ({ ...p, [param]: opt }))}
                      className="hidden"
                    />
                    {String(opt)}
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="number"
                value={params[param]}
                onChange={e => setParams(p => ({ ...p, [param]: Number(e.target.value) }))}
                className="bg-gray-800 p-1 rounded w-24"
              />
            )}
          </div>
        ))}
      </div>

      {/* 3) Additional Options */}
      <div className="space-y-4 mb-8">
        <div>
          <div className="text-sm text-gray-400 mb-1">Test Size</div>
          <input
            type="number"
            min={0} max={1} step={0.01}
            value={testSize}
            onChange={e => setTestSize(parseFloat(e.target.value))}
            className="bg-gray-800 p-1 rounded w-24"
          />
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Random State</div>
          <input
            type="number"
            value={randomState}
            onChange={e => setRandomState(parseInt(e.target.value))}
            className="bg-gray-800 p-1 rounded w-24"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={stratify}
            onChange={setStratify}
            className={`${stratify ? 'bg-red-500' : 'bg-gray-700'}
                        relative inline-flex items-center h-6 w-12 rounded-full`}
          >
            <span
              className={`${stratify ? 'translate-x-6' : 'translate-x-1'}
                          inline-block w-4 h-4 transform bg-white rounded-full transition`}
            />
          </Switch>
          <span>Stratify Split</span>
        </div>
      </div>

      {/* 4) Train Button */}
      <button
        onClick={handleTrain}
        disabled={loading}
        className={`px-6 py-2 rounded font-semibold
          ${loading
            ? 'bg-red-700 cursor-wait opacity-60'
            : 'bg-red-500 hover:bg-red-600'}
        `}
      >
        <FiPlay className="inline-block mr-2" size={20} /> {loading ? 'Training…' : 'Start Training'}
      </button>

      {/* 5) Results */}
      {metrics && (
        <div className="mt-10 space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            {Object.entries(metrics).filter(([name]) => name !== 'ROC_AUC').map(([name, val]) => (
              <div
                key={name}
                className="bg-gray-800 p-4 rounded-lg text-center"
              >
                <div className="text-gray-400 text-sm">{name.toUpperCase()}</div>
                <div className="text-2xl font-bold text-red-500">{val}</div>
              </div>
            ))}
          </div>

          {/* Confusion Matrix */}
          {confMatrix && (
            <div>
              <h3 className="font-semibold mb-2 text-lg">Confusion Matrix</h3>
              <div className="inline-grid grid-cols-3 grid-rows-3 bg-gray-900 p-5 rounded-lg gap-3 text-white">
            
                <div />
            
                <div className="text-center font-semibold">Predicted Negative</div>
                <div className="text-center font-semibold">Predicted Positive</div>
            
                <div className="flex items-center justify-center font-semibold">Actual Negative</div>
                <div className="bg-green-600 text-center p-5 text-xl font-bold">
                  {confMatrix[0][0]}
                </div>
                <div className="bg-gray-700 text-center p-5 text-xl font-bold">
                  {confMatrix[0][1]}
                </div>
            
                <div className="flex items-center justify-center font-semibold">Actual Positive</div>
                <div className="bg-gray-700 text-center p-5 text-xl font-bold">
                  {confMatrix[1][0]}
                </div>
                <div className="bg-red-600 text-center p-5 text-xl font-bold">
                  {confMatrix[1][1]}
                </div>
              </div>
            </div>
          )}

          {/* ROC Curve */}
          {rocUrl && (
            <div>
              <h3 className="font-semibold mb-2">ROC Curve</h3>
              <img
                src={rocUrl}
                alt="ROC Curve"
                className="w-full max-w-md rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
