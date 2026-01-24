// src/pages/TrainPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Switch } from '@headlessui/react'
import { FiPlay, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { api } from '../api/client'
import { useSessionStore } from '../store/useSessionStore'
import { usePipelineStore } from '../store/useStepStore'

// Full display names for each model
const MODEL_NAMES: Record<string, string> = {
  logistic: 'Logistic Regression',
  random_forest: 'Random Forest Classifier',
  decision_tree: 'Decision Tree',
  knn: 'K-Nearest Neighbors',
  svm: 'Support Vector Machine',
  xgboost: 'XGBoost',
  lightgbm: 'LightGBM',
  naive_bayes: 'Naive Bayes',
}

interface ModelConfig {
  id: string
  name: string
  type: string
  hyperparameters?: Record<string, any>
  enabled: boolean
}

interface TrainingResult {
  model_id: string
  model_name: string
  model_type: string
  metrics: {
    accuracy: number
    precision: number
    recall: number
    f1: number
    roc_auc: number
  }
  confusion_matrix: number[][] | null
  feature_importance: any | null
  training_time: number
  trained_at: string
}

interface JobStatus {
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  current_model: string | null
  current_iteration: number
  total_iterations: number
  results?: TrainingResult[]
  error?: {
    code: string
    message: string
    suggested_action: string
  }
}

export default function TrainPage() {
  const { sessionId } = useSessionStore()
  
  // Model selection state
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(['logistic', 'random_forest', 'xgboost'])
  )
  
  // Training configuration
  const [testSize, setTestSize] = useState(0.2)
  const [randomState, setRandomState] = useState(42)
  const [hyperparameterTuning, setHyperparameterTuning] = useState(false)
  
  // Job state
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [results, setResults] = useState<TrainingResult[]>([])

  // Toggle model selection
  const toggleModel = (modelType: string) => {
    const newSelection = new Set(selectedModels)
    if (newSelection.has(modelType)) {
      newSelection.delete(modelType)
    } else {
      newSelection.add(modelType)
    }
    setSelectedModels(newSelection)
  }

  // Start training
  const handleStartTraining = async () => {
    if (selectedModels.size === 0) {
      alert('Please select at least one model to train')
      return
    }

    try {
      // Build model configs
      const models: ModelConfig[] = Array.from(selectedModels).map((type) => ({
        id: `${type}-${Date.now()}`,
        name: MODEL_NAMES[type],
        type,
        enabled: true,
      }))

      // Start training job
      const response = await api.post(`/train?session_id=${sessionId}`, {
        models,
        test_size: testSize,
        random_state: randomState,
        hyperparameter_tuning: hyperparameterTuning,
      })

      const { job_id } = response.data
      setJobId(job_id)
      setIsPolling(true)
    } catch (error: any) {
      console.error('Failed to start training:', error)
      alert(error.response?.data?.detail || 'Failed to start training')
    }
  }

  // Poll job status
  useEffect(() => {
    if (!jobId || !isPolling) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/train/jobs/${jobId}`)
        const status: JobStatus = response.data
        setJobStatus(status)

        if (status.status === 'completed') {
          setIsPolling(false)
          setResults(status.results || [])
        } else if (status.status === 'failed') {
          setIsPolling(false)
        }
      } catch (error) {
        console.error('Failed to poll job status:', error)
        setIsPolling(false)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [jobId, isPolling])

  // Render training status
  const renderTrainingStatus = () => {
    if (!jobStatus) return null

    const { status, progress, current_model, current_iteration, total_iterations, error } = jobStatus

    if (status === 'pending') {
      return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-3">
            <FiLoader className="animate-spin text-red-500" size={24} />
            <div>
              <div className="text-lg font-semibold">Training job queued</div>
              <div className="text-sm text-gray-400">Preparing to train models...</div>
            </div>
          </div>
        </div>
      )
    }

    if (status === 'running') {
      return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Training in progress</div>
              <div className="text-sm text-gray-400">
                {current_iteration} / {total_iterations} models
              </div>
            </div>
            {current_model && (
              <div className="text-sm text-gray-400 mb-3">
                Currently training: <span className="text-red-500 font-medium">{current_model}</span>
              </div>
            )}
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-gray-500">
            This can take 10–60s depending on dataset size and model complexity
          </div>
        </div>
      )
    }

    if (status === 'failed' && error) {
      return (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <FiAlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <div className="text-lg font-semibold text-red-500 mb-2">Training failed</div>
              <div className="text-sm text-gray-300 mb-2">{error.message}</div>
              <div className="text-xs text-gray-400">{error.suggested_action}</div>
              <button
                onClick={() => {
                  setJobId(null)
                  setJobStatus(null)
                  setIsPolling(false)
                }}
                className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (status === 'completed') {
      return (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-3">
            <FiCheckCircle className="text-green-500" size={24} />
            <div>
              <div className="text-lg font-semibold text-green-500">Training completed</div>
              <div className="text-sm text-gray-400">
                Successfully trained {total_iterations} model{total_iterations > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // Render results
  const renderResults = () => {
    if (results.length === 0) return null

    // Find best model by accuracy
    const bestModel = results.reduce((best, current) =>
      current.metrics.accuracy > best.metrics.accuracy ? current : best
    )

    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-red-500">Training Results</h3>

        {/* Model comparison table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Model</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Accuracy</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Precision</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Recall</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">F1 Score</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const isBest = result.model_id === bestModel.model_id
                return (
                  <tr
                    key={result.model_id}
                    className={`border-t border-gray-800 ${
                      isBest ? 'bg-red-500/10' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{result.model_name}</span>
                        {isBest && (
                          <span className="px-2 py-0.5 bg-red-500 text-black text-xs font-bold rounded">
                            BEST
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {result.metrics.accuracy.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {result.metrics.precision.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {result.metrics.recall.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {result.metrics.f1.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {result.metrics.roc_auc.toFixed(4)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Confusion matrices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((result) => {
            if (!result.confusion_matrix) return null
            const cm = result.confusion_matrix
            return (
              <div key={result.model_id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h4 className="font-semibold mb-4">{result.model_name} - Confusion Matrix</h4>
                <div className="inline-grid grid-cols-3 grid-rows-3 gap-2 text-sm">
                  <div />
                  <div className="text-center font-semibold text-gray-400">Pred Neg</div>
                  <div className="text-center font-semibold text-gray-400">Pred Pos</div>
                  
                  <div className="flex items-center justify-end font-semibold text-gray-400 pr-2">
                    Act Neg
                  </div>
                  <div className="bg-green-600/20 border border-green-600 text-center p-4 rounded font-bold">
                    {cm[0][0]}
                  </div>
                  <div className="bg-gray-700/50 border border-gray-600 text-center p-4 rounded font-bold">
                    {cm[0][1]}
                  </div>
                  
                  <div className="flex items-center justify-end font-semibold text-gray-400 pr-2">
                    Act Pos
                  </div>
                  <div className="bg-gray-700/50 border border-gray-600 text-center p-4 rounded font-bold">
                    {cm[1][0]}
                  </div>
                  <div className="bg-red-600/20 border border-red-600 text-center p-4 rounded font-bold">
                    {cm[1][1]}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Continue to Results Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              completeStep('train');
              navigate('/results');
            }}
            className="
              py-3 px-8 
              bg-red-500 hover:bg-red-600 
              text-white font-semibold text-lg rounded-lg
              transition-all duration-200
              hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
              hover:-translate-y-0.5
              focus:outline-none focus:ring-3 focus:ring-red-500/50
              flex items-center gap-2
            "
          >
            Continue to Results →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-red-500 mb-2">Train Models</h2>
        <p className="text-gray-400 mb-8">
          Select models to train and configure training parameters
        </p>

        {/* Training status */}
        {renderTrainingStatus()}

        {/* Model selection */}
        {!isPolling && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Select Models</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(MODEL_NAMES).map(([type, name]) => (
                <button
                  key={type}
                  onClick={() => toggleModel(type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedModels.has(type)
                      ? 'border-red-500 bg-red-500/10 text-red-500'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium">{name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Training configuration */}
        {!isPolling && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Training Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Test Size</label>
                <input
                  type="number"
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={testSize}
                  onChange={(e) => setTestSize(parseFloat(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-red-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Proportion of data for testing (0.1-0.5)
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Random State</label>
                <input
                  type="number"
                  value={randomState}
                  onChange={(e) => setRandomState(parseInt(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-red-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Seed for reproducibility
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Hyperparameter Tuning</label>
                <div className="flex items-center space-x-3 h-10">
                  <Switch
                    checked={hyperparameterTuning}
                    onChange={setHyperparameterTuning}
                    className={`${
                      hyperparameterTuning ? 'bg-red-500' : 'bg-gray-700'
                    } relative inline-flex items-center h-6 w-12 rounded-full transition-colors`}
                  >
                    <span
                      className={`${
                        hyperparameterTuning ? 'translate-x-6' : 'translate-x-1'
                      } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                    />
                  </Switch>
                  <span className="text-sm">{hyperparameterTuning ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Automatically tune model parameters (slower)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start training button */}
        {!isPolling && !jobStatus && (
          <button
            onClick={handleStartTraining}
            disabled={selectedModels.size === 0}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 ${
              selectedModels.size === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <FiPlay size={20} />
            <span>Start Training</span>
          </button>
        )}

        {/* Results */}
        {renderResults()}
      </div>
    </div>
  )
}
