import { useState, useCallback, useRef } from 'react'
import { FiUploadCloud, FiLoader, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useSessionStore } from '../store/useSessionStore'
import SchemaTable from '../components/SchemaTable'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const WARNING_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadPage() {
  const navigate = useNavigate()
  const { 
    setSessionId, 
    setPreview, 
    setSchema, 
    setFileMetadata,
    schema,
    targetColumn,
    setTargetColumn,
    setExpiresAt,
    setCreatedAt,
  } = useSessionStore()

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    loaded: number
    total: number
    speed: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sizeWarning, setSizeWarning] = useState(false)
  const [suggestedTarget, setSuggestedTarget] = useState<string | null>(null)
  const [uploadComplete, setUploadComplete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s'
  }

  const validateFile = (selectedFile: File): boolean => {
    setError(null)
    setSizeWarning(false)

    // Check file type
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      setError('Unsupported file format. Please upload CSV or XLSX files.')
      return false
    }

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large (${formatBytes(selectedFile.size)}). Maximum size is 100MB. Try reducing your dataset or sampling rows.`)
      return false
    }

    if (selectedFile.size > WARNING_FILE_SIZE) {
      setSizeWarning(true)
    }

    return true
  }

  const handleFileSelect = (selectedFile: File) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return
    
    setLoading(true)
    setError(null)
    setUploadProgress({ loaded: 0, total: file.size, speed: 0 })

    const startTime = Date.now()
    let lastLoaded = 0
    let lastTime = startTime

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await api.post('/upload/file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const now = Date.now()
          const timeDiff = (now - lastTime) / 1000 // seconds
          const loadedDiff = (progressEvent.loaded || 0) - lastLoaded

          if (timeDiff > 0) {
            const speed = loadedDiff / timeDiff
            setUploadProgress({
              loaded: progressEvent.loaded || 0,
              total: progressEvent.total || file.size,
              speed,
            })
            lastLoaded = progressEvent.loaded || 0
            lastTime = now
          }
        },
      })

      // Store session data
      setSessionId(res.data.session_id)
      setPreview(res.data.preview)
      
      // Set expiration (7 days from now)
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      setCreatedAt(now)
      setExpiresAt(expiresAt)
      
      // Transform schema to match expected format
      const transformedSchema = res.data.schema.map((col: any) => ({
        name: col.column,
        dtype: col.dtype,
        inferredType: col.inferred_type,
        nullCount: col.null_count,
        nullPercentage: 0, // Will be calculated if needed
        sampleValues: col.sample_values || [],
      }))
      
      setSchema(transformedSchema)
      setFileMetadata(file.name, file.size)
      
      // Set suggested target
      if (res.data.suggested_target) {
        setSuggestedTarget(res.data.suggested_target)
        setTargetColumn(res.data.suggested_target)
      }

      // Mark upload as complete
      setUploadComplete(true)
      setUploadProgress(null)
    } catch (err: any) {
      console.error('Upload error:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed'
      setError(errorMessage)
      setUploadProgress(null)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-black px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {!uploadComplete ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                Upload Dataset
              </h1>
              <p className="text-gray-400 text-lg">
                Start your ML pipeline by uploading your dataset
              </p>
            </div>

            {/* PII Warning */}
            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg flex items-start gap-3">
              <FiAlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-200">
                <strong className="font-semibold">Privacy Notice:</strong> Do not upload sensitive or personally identifiable information (PII)
              </div>
            </div>

            {/* Upload Zone */}
            <div
              className={`
                relative border-2 border-dashed rounded-xl p-12 transition-all duration-300
                ${dragActive 
                  ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                  : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                }
                ${loading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !loading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              <div className="flex flex-col items-center justify-center text-center">
                {loading ? (
                  <>
                    <FiLoader className="w-16 h-16 text-red-500 animate-spin mb-4" />
                    <p className="text-xl font-semibold text-white mb-2">
                      {uploadProgress ? 'Uploading...' : 'Processing...'}
                    </p>
                    {uploadProgress && (
                      <div className="w-full max-w-md">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                          <span>{formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}</span>
                          <span>{formatSpeed(uploadProgress.speed)}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300"
                            style={{ width: `${(uploadProgress.loaded / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : file ? (
                  <>
                    <FiCheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <p className="text-xl font-semibold text-white mb-2">
                      {file.name}
                    </p>
                    <p className="text-gray-400 mb-4">
                      {formatBytes(file.size)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setSizeWarning(false)
                        setError(null)
                      }}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Choose different file
                    </button>
                  </>
                ) : (
                  <>
                    <FiUploadCloud className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-xl font-semibold text-white mb-2">
                      Drag and drop your dataset here
                    </p>
                    <p className="text-gray-400 mb-4">
                      or click to browse files
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports CSV and XLSX files up to 100MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Size Warning */}
            {sizeWarning && !error && (
              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg flex items-start gap-3">
                <FiAlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-yellow-200">
                  <strong className="font-semibold">Large file detected:</strong> Files over 50MB may take longer to process. Consider sampling your data for faster results.
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-600/30 rounded-lg flex items-start gap-3">
                <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            )}

            {/* Upload Button */}
            {file && !loading && (
              <button
                onClick={handleUpload}
                className="
                  mt-6 w-full py-4 px-6 
                  bg-red-500 hover:bg-red-600 
                  text-white font-semibold text-lg rounded-lg
                  transition-all duration-200
                  hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
                  hover:-translate-y-0.5
                  focus:outline-none focus:ring-3 focus:ring-red-500/50
                "
              >
                Upload & Continue
              </button>
            )}

            {/* Divider */}
            <div className="relative my-12">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black text-gray-500">Or try a sample dataset</span>
              </div>
            </div>

            {/* Sample Datasets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { file: 'heart.csv', label: 'Heart Disease Prediction', desc: 'Medical classification' },
                { file: 'stroke.csv', label: 'Brain Stroke Prediction', desc: 'Healthcare analytics' },
                { file: 'email_phishing_data.csv', label: 'Email Phishing Detection', desc: 'Cybersecurity' },
                { file: 'water_potability.csv', label: 'Water Potability', desc: 'Environmental science' },
              ].map(({ file: filename, label, desc }) => (
                <button
                  key={filename}
                  onClick={async () => {
                    setLoading(true)
                    setError(null)
                    try {
                      const response = await fetch(`/sample/${filename}`)
                      const blob = await response.blob()
                      const sampleFile = new File([blob], filename, { type: 'text/csv' })
                      handleFileSelect(sampleFile)
                      // Auto-upload sample
                      setTimeout(() => {
                        setFile(sampleFile)
                        handleUpload()
                      }, 100)
                    } catch (err: any) {
                      setError('Failed to load sample dataset: ' + err.message)
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="
                    p-4 bg-gray-900 border border-gray-800 rounded-lg
                    hover:border-gray-700 hover:bg-gray-800
                    transition-all duration-200
                    text-left
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  <div className="font-semibold text-white mb-1">{label}</div>
                  <div className="text-sm text-gray-400">{desc}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Schema View */}
            <div className="mb-8">
              <button
                onClick={() => {
                  setUploadComplete(false)
                  setFile(null)
                  setSchema([])
                }}
                className="text-gray-400 hover:text-white transition-colors mb-4"
              >
                ← Upload different file
              </button>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                Schema Detected
              </h1>
              <p className="text-gray-400 text-lg">
                Review your dataset structure and select a target column
              </p>
            </div>

            <SchemaTable
              schema={schema}
              targetColumn={targetColumn}
              onTargetColumnChange={setTargetColumn}
              suggestedTarget={suggestedTarget}
            />

            {/* Continue Button */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => navigate('/eda')}
                disabled={!targetColumn}
                className="
                  flex-1 py-4 px-6 
                  bg-red-500 hover:bg-red-600 
                  text-white font-semibold text-lg rounded-lg
                  transition-all duration-200
                  hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
                  hover:-translate-y-0.5
                  focus:outline-none focus:ring-3 focus:ring-red-500/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                Continue to EDA →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
