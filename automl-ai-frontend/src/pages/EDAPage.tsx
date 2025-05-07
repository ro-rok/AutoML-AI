// src/pages/EDAPage.tsx
import { useEffect, useState } from 'react';
import { Tab ,TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

type EDAResult = {
  correlation_matrix: Record<string, Record<string, number>>;
  skewness: Record<string, number>;
  unique_values: Record<string, number>;
  class_distribution: Record<string, number>;
  numeric_summary: Record<string, Record<string, number>>;
  num_rows: number;
  num_columns: number;
};

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

export default function EDAPage() {
  const { sessionId } = useSessionStore();
  const [eda, setEda] = useState<EDAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrImgUrl, setCorrImgUrl] = useState<string | null>(null);



  // Graph builder state
  const [selCat, setSelCat] = useState<'numeric'|'categorical'|''>('');
  const [selCols, setSelCols] = useState<string[]>([]);
  const [selGraph, setSelGraph] = useState<string>('');
  const [graphUrl, setGraphUrl] = useState<string|null>(null);
  const [gLoading, setGLoading] = useState(false);

  // fetch EDA on mount
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    api.post<EDAResult>('/pipeline/eda', { session_id: sessionId })
      .then(r => setEda(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  // fetch correlation heatmap on mount
  useEffect(() => {
    const generateCorrGraph = async () => {
      setCorrLoading(true);
      try {
        const res = await api.get('/graph/heatmap', {
          params: { session_id: sessionId },
          responseType: 'blob'
        });
        const imageUrl = URL.createObjectURL(res.data);
        setCorrImgUrl(imageUrl);
      } catch (err) {
        console.error('Error fetching correlation heatmap:', err);
      } finally {
        setCorrLoading(false);
      }
    };

    generateCorrGraph();
  }, [sessionId]);

  // handlers
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

  // render
  if (loading || !eda) {
    return <div className="p-6 text-gray-400">Loading EDA…
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
    </div>;
  }

  const numericCols = Object.keys(eda.numeric_summary);
  const categoricalCols = Object.keys(eda.unique_values);

  return (
    <div className="bg-black text-white min-h-screen p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Exploratory Data Analysis</h2>

      <TabGroup>
        
        <TabList className="flex space-x-1 bg-gray-800 p-1 rounded mb-4">
          {['Stats','Graphs'].map((label) => (
            <Tab
              key={label}
              className={({ selected }) =>
                `flex-1 py-2 text-center rounded ${
                  selected
                    ? 'bg-black text-red-500 font-semibold'
                    : 'text-gray-400 hover:bg-gray-700'
                }`
              }
            >
              {label}
            </Tab>
          ))}
        </TabList>

        <TabPanels className="mt-6 space-y-8">
          {/* ─── STATS ─── */}
          <TabPanel>
            {/* heatmap */}
            

            {/* numeric summary */}
            <section>
              <h3 className="font-semibold mb-2">Numeric Summary</h3>
              <div className="overflow-x-auto bg-gray-900 rounded-lg">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-gray-300">
                      <th className="px-3 py-1">Column</th>
                      {Object.keys(eda.numeric_summary[numericCols[0]]).map(stat => (
                        <th key={stat} className="px-3 py-1">{stat}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {numericCols.map(col => (
                      <tr key={col} className="border-t border-gray-700">
                        <td className="px-3 py-1 font-medium">{col}</td>
                        {Object.values(eda.numeric_summary[col]).map((v,i) => (
                          <td key={i} className="px-3 py-1">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* skewness */}
            <section>
              <h3 className="font-semibold mb-2">Skewness</h3>
              <div className="overflow-x-auto bg-gray-900 rounded-lg">
                <table className="min-w-[300px]">
                  <thead className="text-gray-300">
                    <tr><th className="px-3 py-1">Column</th><th className="px-3 py-1">Skew</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(eda.skewness).map(([c,s])=>(
                      <tr key={c} className="border-t border-gray-700">
                        <td className="px-3 py-1">{c}</td><td className="px-3 py-1">{s}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* unique values */}
            <section>
              <h3 className="font-semibold mb-2">Unique Values</h3>
              <div className="overflow-x-auto bg-gray-900 rounded-lg">
                <table className="min-w-[300px]">
                  <thead className="text-gray-300">
                    <tr><th className="px-3 py-1">Column</th><th className="px-3 py-1">Count</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(eda.unique_values).map(([c,u])=>(
                      <tr key={c} className="border-t border-gray-700">
                        <td className="px-3 py-1">{c}</td><td className="px-3 py-1">{u}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Correlation Heatmap</h3>
              {corrLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <svg className="animate-spin h-8 w-8 text-red-500" viewBox="0 0 24 24">
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
              ) : corrImgUrl ? (
                <img
                  src={corrImgUrl}
                  alt="Correlation Heatmap"
                  className="w-full max-h-[400px] object-contain rounded-lg shadow-lg bg-gray-900"
                />
              ) : (
                <p className="text-gray-500">Failed to load heatmap.</p>
              )}
            </section>

            {/* class distribution */}
            <section>
              <h3 className="font-semibold mb-2">Class Distribution</h3>
              <div className="overflow-x-auto bg-gray-900 rounded-lg">
                <table className="min-w-[200px]">
                  <thead className="text-gray-300">
                    <tr><th className="px-3 py-1">Class</th><th className="px-3 py-1">Count</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(eda.class_distribution).map(([cl,cnt])=>(
                      <tr key={cl} className="border-t border-gray-700">
                        <td className="px-3 py-1">{cl}</td><td className="px-3 py-1">{cnt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </TabPanel>

          {/* ─── GRAPHS ─── */}
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
  );
}
