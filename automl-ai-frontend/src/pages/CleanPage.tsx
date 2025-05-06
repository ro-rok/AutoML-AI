// src/pages/CleanPage.tsx
import { useState, useEffect } from 'react';
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from '@headlessui/react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import classNames from 'classnames';

type GraphTypes = Record<string, string[]>;

export default function CleanPage() {
  const { sessionId } = useSessionStore();

  // Cleaning state
  const [beforeNulls, setBeforeNulls] = useState<Record<string, number>>({});
  const [strategies, setStrategies] = useState<Record<string, string>>({});
  const [allCols, setAllCols] = useState<string[]>([]);
  const [target, setTarget] = useState<string>('');
  const [loadingClean, setLoadingClean] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [numericCols, setNumericCols] = useState<string[]>([]);
  const [categoricalCols, setCategoricalCols] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Graph state
  const [graphTypes, setGraphTypes] = useState<GraphTypes>({});
  const [selectedGraph, setSelectedGraph] = useState<string>('');
  const [graphCols, setGraphCols] = useState<string[]>([]);
  const [graphImg, setGraphImg] = useState<string | null>(null);
  const [graphLoader, setGraphLoader] = useState(false);

  // Fetch initial metadata (null counts, preview, cols, graph types)
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await api.post('/pipeline/clean', {
          session_id: sessionId,
          // dummy fill so backend returns metadata but no changes
          fill_strategies: {},
          target_column: ''
        });
        const {
          before_nulls,
          numeric_cols,
          categorical_cols,
          graph_types,
          preview: prv
        } = res.data;
        // set null-columns and default "mean"
        setBeforeNulls(before_nulls);
        const nullCols = Object.keys(before_nulls);
        setStrategies(Object.fromEntries(nullCols.map(c => [c, 'mean'])));
        // derive all columns from preview keys
        const cols = prv[0] ? Object.keys(prv[0]) : [];
        setAllCols(cols);
        setTarget(res.data.target_column || cols[cols.length - 1] || '');
        setPreview(prv);
        setNumericCols(numeric_cols);
        setCategoricalCols(categorical_cols);
        setGraphTypes(graph_types);
      } catch (err) {
        console.error('Failed to load cleaning metadata', err);
      }
    }
    fetchMeta();
  }, [sessionId]);

  // Apply cleaning
  const applyClean = async () => {
    setLoadingClean(true);
    try {
      const res = await api.post('/pipeline/clean', {
        session_id: sessionId,
        fill_strategies: strategies,
        target_column: target
      });
      setPreview(res.data.preview);
      setBeforeNulls(res.data.after_nulls); // show remaining nulls
    } catch (err) {
      console.error('Clean error', err);
    } finally {
      setLoadingClean(false);
    }
  };

  // Generate graph
  const generateGraph = async () => {
    setGraphLoader(true);
    if (!selectedCategory || graphCols.length === 0) return;
    setGraphImg(null);
    const params: any = { session_id: sessionId };
    // category drives which endpoint and params
    if (selectedCategory === 'numeric') {
      // pick first col for single‐col graphs, or both for scatter
      if (graphCols.length === 1) params.column = graphCols[0];
      else [params.x, params.y] = graphCols;
    } else {
      params.column = graphCols[0];
    }
    // pick the first endpoint under that category
    const endpoint = graphTypes[selectedCategory][0];
    const res = await api.get(`/graph/${endpoint}`, {
      params,
      responseType: 'blob'
    });
    const url = URL.createObjectURL(res.data);
    setGraphImg(url);
    setGraphLoader(false);
  };

  return (
    <div className="bg-black text-white min-h-screen pb-16">
      <div className="max-w-4xl mx-auto p-4">
        <TabGroup>
          <TabList className="flex space-x-1 bg-gray-900 p-1 rounded">
            {['Cleaning', 'Graphs'].map(tab => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  classNames(
                    'flex-1 py-2 text-center rounded',
                    selected
                      ? 'bg-red-500 text-black'
                      : 'text-gray-300 hover:bg-gray-800'
                  )
                }
              >{tab}</Tab>
            ))}
          </TabList>

          <TabPanels className="mt-4">
          {/* ───── Cleaning Tab ───── */}
          <TabPanel>
            <h2 className="text-2xl font-bold mb-4">Clean Missing Values</h2>
            <div className="space-y-4">
              {Object.values(beforeNulls).every(cnt => cnt === 0) ? (
                <div className="text-green-500 font-medium">No null values found</div>
              ) : (
                Object.entries(beforeNulls).map(([col, cnt]) => (
                  <div key={col} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{col} ({cnt} missing)</span>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      {['mean', 'median', 'mode'].map(opt => (
                        <label key={opt} className="flex items-center space-x-1">
                          <input
                            type="radio"
                            name={`strat-${col}`}
                            value={opt}
                            checked={strategies[col] === opt}
                            onChange={() =>
                              setStrategies(s => ({ ...s, [col]: opt }))
                            }
                            className="accent-red-500"
                          />
                          <span className="capitalize text-gray-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <div className="mt-6">
                <span className="font-medium">Target Column:</span>
                <div className="mt-1 flex flex-wrap gap-3">
                  {allCols.map(col => (
                    <label key={col} className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="target-col"
                        value={col}
                        checked={target === col}
                        onChange={() => setTarget(col)}
                        className="accent-red-500"
                      />
                      <span className="text-gray-300">{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={applyClean}
                disabled={loadingClean}
                className="mt-4 px-4 py-1 bg-red-500 hover:bg-red-600 rounded font-semibold disabled:opacity-50"
              >
                {Object.values(beforeNulls).every(cnt => cnt === 0)
                  ? 'Set Target Column'
                  : loadingClean
                  ? 'Cleaning'
                  : 'Apply Cleaning'}
              </button>


              {preview.length > 0 && (
                <div className="mt-8 bg-gray-800 p-4 rounded">
                  <h3 className="font-semibold mb-2">Preview (first 5 rows)</h3>
                  <div className="overflow-auto">
                    <table className="w-full table-auto border-collapse">
                      <thead>
                        <tr>
                          {Object.keys(preview[0]).map(col => (
                            <th key={col} className="px-2 py-1 text-left text-sm border-b">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className={i % 2 ? 'bg-gray-700' : 'bg-gray-800'}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-2 py-1 text-xs">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

            {/* ───── Graphs Tab ───── */}
            <TabPanel>
              <h2 className="text-2xl font-bold mb-4">Explore Graphs</h2>
              <div className="flex flex-col gap-6">
                <div>
                  <span className="block font-medium mb-2">Category:</span>
                  <div className="flex flex-wrap gap-4">
                    {Object.keys(graphTypes).map(cat => (
                      <label key={cat} className="flex items-center space-x-1">
                        <input
                          type="radio"
                          name="graph-category"
                          value={cat}
                          checked={selectedCategory === cat}
                          onChange={() => {
                            setSelectedCategory(cat);
                            setGraphCols([]);
                            setGraphImg(null);
                          }}
                          className="accent-red-500"
                        />
                        <span className="text-gray-300 capitalize">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedCategory && (
                  <div>
                  <span className="block font-medium mb-2">
                    {selectedCategory === 'numeric' ? 'Numeric Column(s)' : 'Categorical Column'}:
                  </span>
                  <div className="flex flex-wrap gap-4">
                    {(selectedCategory === 'numeric' ? numericCols : categoricalCols).map(col => (
                    <label key={col} className="flex items-center space-x-1">
                      <input
                      type={
                        selectedCategory === 'numeric'
                        ? graphTypes[selectedCategory].includes('scatter')
                          ? 'radio'
                          : 'radio'
                        : 'radio'
                      }
                      name="graph-col"
                      value={col}
                      checked={graphCols.includes(col)}
                      onChange={e => {
                        const v = e.target.value;
                        setGraphCols(prev => {
                        if (e.target.type === 'radio') return [v];
                        return prev.includes(v)
                          ? prev.filter(x => x !== v)
                          : [...prev, v];
                        });
                        setGraphImg(null);
                      }}
                      className="accent-red-500"
                      />
                      <span className="text-gray-300">{col}</span>
                    </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label htmlFor="selectGraph" className="block font-medium mb-2">
                    Select Graph:
                    </label>
                    <select
                    id="selectGraph"
                    value={selectedGraph}
                    onChange={e => setSelectedGraph(e.target.value)}
                    className="bg-gray-800 text-white p-2 rounded"
                    >
                    {graphTypes[selectedCategory].map(graphOption => (
                      <option key={graphOption} value={graphOption}>
                      {graphOption}
                      </option>
                    ))}
                    </select>
                  </div>
                  </div>
                )}
                {
                  graphLoader && (
                    <div className="flex items-center justify-center mt-4">
                        <svg
                        className="animate-spin h-5 w-5 text-red-500 transition-transform duration-300 hover:scale-110"
                        viewBox="0 0 24 24"
                        >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                        </svg>
                    </div>
                  )
                }
                <button
                  onClick={generateGraph}
                  disabled={!selectedCategory || graphCols.length === 0}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded font-semibold disabled:opacity-50"
                >
                  Generate Graph
                </button>

                {graphImg && (
                  <div className="mt-4">
                    <img
                      src={graphImg}
                      alt="Graph"
                      className="max-h-64 mx-auto cursor-pointer rounded shadow-lg"
                    />
                    <a
                      href={graphImg}
                      download={`${selectedCategory}.png`}
                      className="block mt-2 text-red-500 text-center underline"
                    >
                      Download PNG
                    </a>
                  </div>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
