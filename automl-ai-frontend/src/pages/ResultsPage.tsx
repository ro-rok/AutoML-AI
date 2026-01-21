// src/pages/ResultsPage.tsx
import { useState, useEffect } from 'react'
import { FiCheckCircle, FiAlertCircle, FiMaximize2, FiArrowRight } from 'react-icons/fi'
import { api } from '../api/client'
import { useSessionStore } from '../store/useSessionStore'
import { useGraphStore } from '../store/useGraphStore'
import * as echarts from 'echarts'

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

export default function ResultsPage() {
  const { sessionId } = useSessionStore()
  const { addGraph } = useGraphStore()
  
  const [results, setResults] = useState<TrainingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Load training results
  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/train/results?session_id=${sessionId}`)
        const data = response.data.results || []
        setResults(data)
        
        // Auto-select best model
        if (data.length > 0) {
          const best = data.reduce((prev: TrainingResult, current: TrainingResult) =>
            current.metrics.accuracy > prev.metrics.accuracy ? current : prev
          )
          setSelectedModel(best.model_id)
        }
        
        setError(null)
      } catch (err: any) {
        console.error('Failed to load results:', err)
        setError(err.response?.data?.detail || 'Failed to load training results')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      loadResults()
    }
  }, [sessionId])

  // Render confusion matrix chart
  const renderConfusionMatrix = (result: TrainingResult) => {
    if (!result.confusion_matrix) return null

    const cm = result.confusion_matrix
    const chartId = `cm-${result.model_id}`

    useEffect(() => {
      const chartDom = document.getElementById(chartId)
      if (!chartDom) return

      const chart = echarts.init(chartDom, 'dark')
      
      const option = {
        tooltip: {
          position: 'top',
          formatter: (params: any) => {
            const labels = ['Negative', 'Positive']
            return `Actual: ${labels[params.data[1]]}<br/>Predicted: ${labels[params.data[0]]}<br/>Count: ${params.data[2]}`
          }
        },
        grid: {
          left: 80,
          right: 20,
          top: 40,
          bottom: 60
        },
        xAxis: {
          type: 'category',
          data: ['Pred Neg', 'Pred Pos'],
          splitArea: { show: true }
        },
        yAxis: {
          type: 'category',
          data: ['Act Neg', 'Act Pos'],
          splitArea: { show: true }
        },
        visualMap: {
          min: 0,
          max: Math.max(...cm.flat()),
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 10,
          inRange: {
            color: ['#1a1a1a', '#ef4444']
          }
        },
        series: [{
          name: 'Confusion Matrix',
          type: 'heatmap',
          data: [
            [0, 0, cm[0][0]],
            [1, 0, cm[0][1]],
            [0, 1, cm[1][0]],
            [1, 1, cm[1][1]]
          ],
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      }

      chart.setOption(option)

      return () => {
        chart.dispose()
      }
    }, [result.model_id])

    return <div id={chartId} style={{ width: '100%', height: '300px' }} />
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
              <div className="text-gray-400">Loading training results...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <FiAlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
              <div>
                <div className="text-lg font-semibold text-red-500 mb-2">Error Loading Results</div>
                <div className="text-sm text-gray-300">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No results state
  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <FiAlertCircle className="text-gray-500 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2">No Training Results</h3>
            <p className="text-gray-400 mb-6">
              Train some models first to see evaluation results here.
            </p>
            <a
              href="/train"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold"
            >
              <span>Go to Training</span>
              <FiArrowRight />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Find best model
  const bestModel = results.reduce((prev, current) =>
    current.metrics.accuracy > prev.metrics.accuracy ? current : prev
  )

  const selectedResult = results.find(r => r.model_id === selectedModel) || results[0]

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-red-500 mb-2">Model Evaluation</h2>
          <p className="text-gray-400">
            Compare model performance and select the best model for export
          </p>
        </div>

        {/* Model Comparison Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-xl font-semibold flex items-center space-x-2">
              <FiCheckCircle className="text-green-500" />
              <span>Model Comparison</span>
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Model</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Accuracy</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Precision</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Recall</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">F1 Score</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">ROC-AUC</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const isBest = result.model_id === bestModel.model_id
                  const isSelected = result.model_id === selectedModel
                  
                  return (
                    <tr
                      key={result.model_id}
                      className={`border-t border-gray-800 ${
                        isSelected ? 'bg-red-500/10' : 'hover:bg-gray-800/50'
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
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedModel(result.model_id)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            isSelected
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Metrics for Selected Model */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Confusion Matrix */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedResult.model_name} - Confusion Matrix</h3>
              <button
                onClick={() => {
                  if (selectedResult.confusion_matrix) {
                    addGraph({
                      type: 'confusion_matrix',
                      title: `${selectedResult.model_name} - Confusion Matrix`,
                      data: selectedResult.confusion_matrix
                    })
                  }
                }}
                className="p-2 hover:bg-gray-800 rounded"
                title="Expand"
              >
                <FiMaximize2 size={18} />
              </button>
            </div>
            {renderConfusionMatrix(selectedResult)}
          </div>

          {/* Metrics Breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Classification Report</h3>
            <div className="space-y-4">
              {Object.entries(selectedResult.metrics).map(([metric, value]) => (
                <div key={metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-400 capitalize">
                      {metric.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {(value as number).toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(value as number) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Importance (if available) */}
        {selectedResult.feature_importance && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Feature Importance</h3>
            <div className="text-gray-400 text-sm">
              Feature importance visualization will be implemented with ECharts
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Export Model</h3>
          <p className="text-gray-400 text-sm mb-4">
            Selected model: <span className="text-red-500 font-semibold">{selectedResult.model_name}</span>
          </p>
          <div className="flex space-x-4">
            <a
              href="/export"
              className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold inline-flex items-center space-x-2"
            >
              <span>Continue to Export</span>
              <FiArrowRight />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}