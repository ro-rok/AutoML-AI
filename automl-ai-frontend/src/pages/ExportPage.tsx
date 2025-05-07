// src/pages/ExportPage.tsx
import { useState, useEffect } from 'react'
import { Tab , TabList, TabPanel, TabPanels, TabGroup } from '@headlessui/react'
import { FiDownload } from 'react-icons/fi'
import { api } from '../api/client'
import { useSessionStore } from '../store/useSessionStore'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function ExportPage() {
  const { sessionId } = useSessionStore()
  const [loadingExport, setLoadingExport] = useState(false)
  const [metrics, setMetrics] = useState<Record<string, any> | null>(null)
  const [compImg, setCompImg] = useState<string | null>(null)
  const [loadingComp, setLoadingComp] = useState(false)

  // Fetch numerical metrics for each run
  useEffect(() => {
    api
      .get('/pipeline/metrics', { params: { session_id: sessionId } })
      .then(res => setMetrics(res.data.metrics))
      .catch(console.error)
  }, [sessionId])

  const download = async (type: 'pdf' | 'ipynb') => {
    setLoadingExport(true)
    try {
      const route = type === 'pdf' ? '/export/pdf' : '/export/ipynb'
      const res = await api.post(route, { session_id: sessionId }, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${sessionId}_export.${type}`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      console.error(e)
      alert('Export failed')
    } finally {
      setLoadingExport(false)
    }
  }

  const fetchComparison = async () => {
    setLoadingComp(true)
    try {
      const res = await api.get('/graph/compare-models', {
        params: { session_id: sessionId },
        responseType: 'blob',
      })
      setCompImg(URL.createObjectURL(res.data))
    } catch (e) {
      console.error(e)
      alert('Failed to load comparison graph')
    } finally {
      setLoadingComp(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Export & Compare</h2>

      <TabGroup>
        <TabList className="flex space-x-1 bg-gray-800 p-1 rounded mb-4">
          <Tab
            className={({ selected }) =>
              `flex-1 py-2 text-center rounded ${
                selected
                  ? 'bg-black text-red-500 font-semibold'
                  : 'text-gray-400 hover:bg-gray-700'
              }`
            }
          > Export
          </Tab>
          <Tab
            onClick={fetchComparison}
            className={({ selected }) =>
              `flex-1 py-2 text-center rounded ${
                selected
                  ? 'bg-black text-red-500 font-semibold'
                  : 'text-gray-400 hover:bg-gray-700'
              }`
            }
          >
            Comparison
          </Tab>
        </TabList>

        <TabPanels>
          {/* ─── Export Panel ─────────────────────────────────────────────────── */}
          <TabPanel>
            <div className="space-y-4">
              <button
                onClick={() => download('pdf')}
                disabled={loadingExport}
                className={classNames(
                  'w-full flex items-center justify-center px-6 py-3 rounded-lg font-semibold',
                  loadingExport
                    ? 'bg-red-700 cursor-wait'
                    : 'bg-red-500 hover:bg-red-600'
                )}
              >
                {loadingExport ? 'Generating PDF…' : <><FiDownload className="mr-2" /> Download PDF</>}
              </button>
              <button
                onClick={() => download('ipynb')}
                disabled={loadingExport}
                className={classNames(
                  'w-full flex items-center justify-center px-6 py-3 rounded-lg font-semibold',
                  loadingExport
                    ? 'bg-red-700 cursor-wait'
                    : 'bg-gray-800 hover:bg-gray-700'
                )}
              >
                {loadingExport ? 'Generating Notebook…' : <><FiDownload className="mr-2" /> Download IPYNB</>}
              </button>
            </div>
          </TabPanel>

          {/* ─── Comparison Panel ────────────────────────────────────────────── */}
          <TabPanel>
            <div className="space-y-4">
              {/* Metrics Table */}
              {metrics ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-900 rounded-lg">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-sm text-gray-400">Model</th>
                        {Object.keys(metrics[Object.keys(metrics)[0]]).map(metric => (
                          <th key={metric} className="px-4 py-2 text-left text-sm text-gray-400">
                            {metric.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(metrics).map(([model, mvals]) => (
                        <tr key={model} className="border-t border-gray-700">
                          <td className="px-4 py-2 text-sm">{model}</td>
                          {Object.values(mvals).map((v, i) => (
                            <td key={i} className="px-4 py-2 text-sm text-red-400">
                              {String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">Loading metrics…</p>
              )}

              {/* Model Comparison Graph */}
              <div className="mt-4">
                {loadingComp ? (
                  <p className="text-gray-500">Rendering comparison chart…</p>
                ) : compImg ? (
                  <img
                    src={compImg}
                    alt="Model AUC Comparison"
                    className="w-full rounded-lg shadow-lg"
                  />
                ) : (
                  <button
                    onClick={fetchComparison}
                    className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600"
                  >
                    Load Comparison Chart
                  </button>
                )}
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  )
}
