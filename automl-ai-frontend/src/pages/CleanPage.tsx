// src/pages/CleanPage.tsx
import { useState, useEffect } from 'react';
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from '@headlessui/react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';


const GRAPH_TYPES: Record<'numeric' | 'categorical', { value: string; label: string }[]> = {
  numeric: [
    { value: 'histogram', label: 'Histogram Graph' },
    { value: 'boxplot', label: 'Boxplot Graph' },
    { value: 'scatter', label: 'Scatter Graph' },
    { value: 'line', label: 'Line Graph' },
    { value: 'qq', label: 'QQ Plot' },
  ],
  categorical: [
    { value: 'bar', label: 'Bar Graph' },
    { value: 'pie', label: 'Pie Chart' },
  ],
};
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
  
  // Graph state
  const [selCat, setSelCat] = useState<'numeric'|'categorical'|''>('');
  const [selCols, setSelCols] = useState<string[]>([]);
  const [selGraph, setSelGraph] = useState<string>('');
  const [graphUrl, setGraphUrl] = useState<string|null>(null);
  const [gLoading, setGLoading] = useState(false);

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
    if (!selCat || !selGraph || selCols.length===0) return;
    setGLoading(true);
    const params: any = { session_id: sessionId };
    if (['histogram','boxplot','qq'].includes(selGraph)) {
      params.column = selCols[0];
    } else if (selGraph==='scatter' || selGraph==='line') {
      params.x = selCols[0]; params.y = selCols[1] || selCols[0];
    } else {
      params.column = selCols[0];
    }
    try {
      const res = await api.get(`/graph/${selGraph}`, {
        params,
        responseType: 'blob'
      });
      setGraphUrl(URL.createObjectURL(res.data));
    } catch(err) {
      console.error(err);
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div className="bg-black text-white min-h-screen pb-16">
      <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Clean Missing Values</h2>
        <TabGroup>
          <TabList className="flex space-x-1 bg-gray-800 p-1 rounded mb-4">
            {['Cleaning', 'Graphs'].map(tab => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  `flex-1 py-2 text-center rounded ${
                    selected
                      ? 'bg-black text-red-500 font-semibold'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`
                }
              >{tab}</Tab>
            ))}
          </TabList>

          <TabPanels className="mt-4">
          {/* ───── Cleaning Tab ───── */}
          <TabPanel>
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
                      {['mean', 'median', 'mode','drop'].map(opt => (
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
            <TabPanel className="space-y-4">
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="cat"
                    className="accent-red-500"
                    checked={selCat==='numeric'}
                    onChange={()=>{ setSelCat('numeric'); setSelCols([]); setSelGraph(''); setGraphUrl(null); }}
                  />
                  <span>Numeric</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="cat"
                    className="accent-red-500"
                    checked={selCat==='categorical'}
                    onChange={()=>{ setSelCat('categorical'); setSelCols([]); setSelGraph(''); setGraphUrl(null); }}
                  />
                  <span>Categorical</span>
                </label>
              </div>
  
              {selCat && (
                <div className="space-y-4">
                  {/* select graph */}
                  <div>
                    <label className="block mb-1">Graph Type</label>
                    <select
                      value={selGraph}
                      onChange={e=>{ setSelGraph(e.target.value); setSelCols([]); setGraphUrl(null); }}
                      className="bg-gray-800 text-white p-2 rounded w-full"
                    >
                      <option value="">— choose —</option>
                      {GRAPH_TYPES[selCat].map(g=>(
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
  
                  {/* select columns */}
                  <div>
                    <label className="block mb-1">Column{selGraph==='scatter'||selGraph==='line'? 's': ''}</label>
                    <div className="flex flex-wrap gap-3">
                      {(selCat==='numeric'? numericCols : categoricalCols).map(col=>(
                        <label key={col} className="flex items-center space-x-2">
                          <input
                            type={selGraph==='scatter' ? 'checkbox' : 'radio'}
                            name="cols"
                            className="accent-red-500"
                            value={col}
                            checked={selCols.includes(col)}
                            onChange={e=>{
                              const v=e.target.value;
                              setSelCols(prev=>{
                                if (e.target.type==='radio') return [v];
                                // checkbox
                                return prev.includes(v)
                                  ? prev.filter(x=>x!==v)
                                  : [...prev, v].slice(0,2);
                              });
                              setGraphUrl(null);
                            }}
                          />
                          <span>{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
  
                  {/* generate */}
                  <button
                    onClick={generateGraph}
                    disabled={!selGraph||selCols.length===0||gLoading}
                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded disabled:opacity-50"
                  >
                    {gLoading? 'Generating…':'Generate'}
                  </button>
  
                  {graphUrl && (
                    <div className="mt-4">
                      <img src={graphUrl} alt="Graph" className="w-full max-h-64 object-contain rounded shadow-lg" />
                      <a
                        href={graphUrl}
                        download={`${selGraph}.png`}
                        className="block mt-2 text-red-500 underline text-center"
                      >
                        Download PNG
                      </a>
                    </div>
                  )}
                </div>
              )}
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
