import { useState, useMemo, useEffect } from 'react'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import {
  FiUploadCloud,
  FiLoader,
  FiHash,
  FiBarChart2,
  FiCheckSquare,
  FiCalendar,
  FiHelpCircle,
  FiDownloadCloud,
} from 'react-icons/fi'
import { api } from '../api/client'
import { useSessionStore } from '../store/useSessionStore'

export default function UploadPage() {
  const { setSessionId, preview, setPreview, schema, setSchema, setFileName, fileName } =
    useSessionStore()

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const dtypeCounts = useMemo(() => {
    const cnt: Record<string, number> = {}
    schema.forEach((c) => {
      cnt[c.dtype] = (cnt[c.dtype] || 0) + 1
    })
    return cnt
  }, [schema])

  const iconFor = (type: typeof schema[0]['inferred_type']) => {
    switch (type) {
      case 'numerical':
        return <FiBarChart2 className="inline text-red-400" />
      case 'categorical':
        return <FiHash className="inline text-yellow-400" />
      case 'boolean':
        return <FiCheckSquare className="inline text-green-400" />
      case 'datetime':
        return <FiCalendar className="inline text-blue-400" />
      default:
        return <FiHelpCircle className="inline text-gray-400" />
    }
  }

  useEffect(() => {
    const handleWheel = (_e: WheelEvent) => {}
    window.addEventListener('wheel', handleWheel)
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  const handleUpload = async () => {
    if (!file) return alert('Please choose a file first.')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/upload/file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSessionId(res.data.session_id)
      setPreview(res.data.preview)
      setSchema(res.data.schema)
      setFileName(file.name)
    } catch (err: any) {
      console.error(err)
      alert('Upload failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSample = async (path: string, label: string) => {
    setLoading(true)
    try {
      const response = await fetch(path)
      const blob = await response.blob()
      const sampleFile = new File([blob], label, { type: 'text/csv' })
      const form = new FormData()
      form.append('file', sampleFile)
      const upload = await api.post('/upload/file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSessionId(upload.data.session_id)
      setPreview(upload.data.preview)
      setSchema(upload.data.schema)
      setFileName(sampleFile.name)
    } catch (err: any) {
      console.error(err)
      alert('Sample load failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Upload Dataset</h2>

      {/* --- if no preview yet, show uploader */}
      {preview.length === 0 ? (
        <div className="space-y-6">
          {/* File upload */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="fileInput"
              className="cursor-pointer px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
            >
              {file ? 'Change file…' : 'Choose file…'}
            </label>
            <input
              id="fileInput"
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <span className="italic text-gray-300">{file.name}</span>}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
            className={`flex items-center gap-2 w-full justify-center py-2 rounded text-white ${
              loading ? 'bg-red-700 cursor-wait' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiUploadCloud />}
            {loading ? 'Uploading…' : 'Upload & Preview'}
          </button>

          {/* Sample Datasets */}
          <div className="pt-4">
            <h2 className="text-lg text-gray-300 font-semibold mb-2">Or try a sample dataset:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['email_phishing_data.csv', 'Email Phishing'],
                ['heart.csv', 'Heart Disease'],
                ['student.csv', 'Student Depression'],
                
              ].map(([filename, label]) => (
                <button
                  key={filename}
                  onClick={() => handleSample(`/sample/${filename}`, filename)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-100 hover:bg-gray-700 rounded"
                >
                  <FiDownloadCloud /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="text-gray-200">Loaded &ldquo;{fileName}&rdquo;</div>
          </div>

          {/* --- tabs */}
          
          <TabGroup>
            <TabList className="flex space-x-1 bg-gray-800 p-1 rounded mb-4">
              {['Overview', 'Preview', 'Schema'].map((t) => (
                <Tab
                  key={t}
                  className={({ selected }) =>
                    `flex-1 py-2 text-center rounded ${
                      selected
                        ? 'bg-black text-red-500 font-semibold'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`
                  }
                >
                  {t}
                </Tab>
              ))}
            </TabList>
            <TabPanels className="bg-gray-900 p-4 rounded space-y-4">
              {/* Overview */}
              <TabPanel className="text-gray-200 space-y-1">
                <div>Columns: {schema.length}</div>
                <div>Sample rows: {preview.length}</div>
                <div>
                  Missing cells:{' '}
                  {schema.reduce((sum, c) => sum + c.null_count, 0)}
                </div>
                <div>
                  <span className="font-semibold">Raw dtypes:</span>{' '}
                  {Object.entries(dtypeCounts).map(([dt, cnt]) => (
                    <span key={dt} className="mr-2">
                      {dt}: {cnt}
                    </span>
                  ))}
                </div>
                <div>
                  <span className="font-semibold">Inferred:</span>
                  <ul className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    {schema.map((c, i) => (
                      <li key={i} className="flex items-center gap-1">
                        {iconFor(c.inferred_type)} {c.column}{' '}
                        {c.null_count > 0 && (
                          <span className="ml-auto px-1 bg-yellow-600 text-xs rounded">
                            {c.null_count} null
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </TabPanel>

              {/* Preview */}
              <TabPanel className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800">
                      {Object.keys(preview[0]).map((col) => (
                        <th
                          key={col}
                          className="px-2 py-1 text-left text-gray-400"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, r) => (
                      <tr
                        key={r}
                        className={r % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}
                      >
                        {Object.values(row).map((val, c) => (
                          <td key={c} className="px-2 py-1">
                            {val == null ? '—' : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabPanel>

              {/* Schema */}
              <TabPanel className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800">
                      {['Column', 'Dtype', 'Type', 'Nulls'].map((h) => (
                        <th key={h} className="px-2 py-1 text-left text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schema.map((c, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}
                      >
                        <td className="px-2 py-1">{c.column}</td>
                        <td className="px-2 py-1">{c.dtype}</td>
                        <td className="px-2 py-1 flex items-center gap-1">
                          {iconFor(c.inferred_type)} {c.inferred_type}
                        </td>
                        <td className="px-2 py-1">{c.null_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </>
      )}
    </div>
  )
}
