// src/pages/ExportPage.tsx
import { useState } from 'react'
import { FiDownload, FiCheck } from 'react-icons/fi'
import { api } from '../api/client'
import { useSessionStore } from '../store/useSessionStore'
import { usePipelineStore } from '../store/useStepStore'
import { motion } from 'framer-motion'

export default function ExportPage() {
  const { sessionId } = useSessionStore()
  const { completeStep } = usePipelineStore()
  const [loadingExport, setLoadingExport] = useState(false)
  const [exportProgress, setExportProgress] = useState<string>('')
  const [exportType, setExportType] = useState<'pdf' | 'notebook' | null>(null)
  
  // Section selection for PDF
  const [includeSections, setIncludeSections] = useState({
    datasetSummary: true,
    edaCharts: true,
    cleaningSummary: true,
    transformSummary: true,
    modelEvaluation: true,
    featureImportance: true,
  })

  const toggleSection = (section: keyof typeof includeSections) => {
    setIncludeSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const download = async (type: 'pdf' | 'notebook') => {
    setLoadingExport(true)
    setExportType(type)
    setExportProgress(`Generating ${type === 'pdf' ? 'PDF' : 'Notebook'}...`)
    
    try {
      const route = type === 'pdf' ? '/export/pdf' : '/export/notebook'
      const config = {
        include_sections: includeSections,
      }
      
      const res = await api.post(
        route,
        { session_id: sessionId, config },
        { responseType: 'blob' }
      )
      
      setExportProgress('Download ready!')
      
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${sessionId}_export.${type === 'pdf' ? 'pdf' : 'ipynb'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      
      // Mark export as completed
      completeStep('export')
      
      setTimeout(() => {
        setExportProgress('')
        setExportType(null)
      }, 2000)
    } catch (e: any) {
      console.error(e)
      const errorMsg = e.response?.data?.detail || 'Export failed'
      alert(errorMsg)
      setExportProgress('')
      setExportType(null)
    } finally {
      setLoadingExport(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-3xl font-bold text-red-500 mb-2">Export Your Pipeline</h2>
        <p className="text-gray-400 mb-8">
          Download your ML pipeline as a PDF report or runnable Jupyter notebook
        </p>

        {/* Section Selection */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4 text-white">Customize Report Sections</h3>
          <p className="text-sm text-gray-400 mb-4">
            Select which sections to include in your export
          </p>
          
          <div className="space-y-3">
            {Object.entries(includeSections).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleSection(key as keyof typeof includeSections)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      value
                        ? 'bg-red-500 border-red-500'
                        : 'border-gray-600 bg-gray-800'
                    }`}
                  >
                    {value && <FiCheck className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-sm text-gray-200">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="space-y-4">
          {/* PDF Export */}
          <motion.button
            onClick={() => download('pdf')}
            disabled={loadingExport}
            whileHover={{ scale: loadingExport ? 1 : 1.02 }}
            whileTap={{ scale: loadingExport ? 1 : 0.98 }}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold transition-all ${
              loadingExport && exportType === 'pdf'
                ? 'bg-red-700 cursor-wait'
                : loadingExport
                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-red-500/50'
            }`}
          >
            {loadingExport && exportType === 'pdf' ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5" />
                <span>Download PDF Report</span>
              </>
            )}
          </motion.button>

          {/* Notebook Export */}
          <motion.button
            onClick={() => download('notebook')}
            disabled={loadingExport}
            whileHover={{ scale: loadingExport ? 1 : 1.02 }}
            whileTap={{ scale: loadingExport ? 1 : 0.98 }}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold transition-all ${
              loadingExport && exportType === 'notebook'
                ? 'bg-gray-700 cursor-wait'
                : loadingExport
                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-gray-600'
            }`}
          >
            {loadingExport && exportType === 'notebook' ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Notebook...</span>
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5" />
                <span>Download Jupyter Notebook</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Progress Message */}
        {exportProgress && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800 text-center"
          >
            <p className="text-sm text-gray-300">{exportProgress}</p>
          </motion.div>
        )}

        {/* Info Section */}
        <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold mb-3 text-white">Export Information</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              <strong className="text-gray-300">PDF Report:</strong> Includes charts, summaries, and model evaluation metrics. Perfect for sharing results.
            </p>
            <p>
              <strong className="text-gray-300">Jupyter Notebook:</strong> Contains executable code cells for each pipeline step. Reproduce your entire workflow.
            </p>
            <p className="text-xs text-gray-500 mt-4">
              File size limits: PDF (10MB), Notebook (5MB)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
