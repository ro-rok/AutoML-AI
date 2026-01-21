// src/pages/EDAPage.tsx
import { useEffect, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import { useScrollReveal } from '../hooks/useScrollReveal';
import OptimizedImage from '../components/OptimizedImage';

type ColumnStats = {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
  skewness: number;
};

type CategoricalStats = {
  unique_count: number;
  top_values: Array<{ value: string; count: number }>;
};

type MissingValueInfo = {
  count: number;
  percentage: number;
};

type EDAResult = {
  session_id: string;
  numerical_summary: Record<string, ColumnStats>;
  categorical_summary: Record<string, CategoricalStats>;
  correlations: number[][];
  correlation_columns: string[];
  skewness: Record<string, number>;
  missing_values: Record<string, MissingValueInfo>;
  row_count: number;
  column_count: number;
  numerical_columns: string[];
  categorical_columns: string[];
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

// Loading skeleton component
function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-900 rounded-lg p-4">
          <div className="h-6 bg-gray-800 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            <div className="h-4 bg-gray-800 rounded w-4/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EDAPage() {
  const { sessionId } = useSessionStore();
  const [eda, setEda] = useState<EDAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrImgUrl, setCorrImgUrl] = useState<string | null>(null);

  // Scroll reveal animations
  const suggestionsRef = useScrollReveal({ animation: 'fadeUp', duration: 0.6 });
  const missingValuesRef = useScrollReveal({ animation: 'fadeUp', duration: 0.6 });
  const numericalSummaryRef = useScrollReveal({ animation: 'fadeUp', duration: 0.6 });
  const categoricalSummaryRef = useScrollReveal({ animation: 'fadeUp', duration: 0.6, stagger: 0.1 });
  const correlationRef = useScrollReveal({ animation: 'fadeUp', duration: 0.6 });

  // Graph builder state
  const [selCat, setSelCat] = useState<'numeric' | 'categorical' | ''>('');
  const [selCols, setSelCols] = useState<string[]>([]);
  const [selGraph, setSelGraph] = useState<string>('');
  const [graphUrl, setGraphUrl] = useState<string | null>(null);
  const [gLoading, setGLoading] = useState(false);

  // Fetch EDA summary on mount
  useEffect(() => {
    if (!sessionId) return;
    
    const fetchEDA = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<EDAResult>('/eda/summary', {
          params: { session_id: sessionId }
        });
        setEda(response.data);
      } catch (err: any) {
        console.error('Error fetching EDA summary:', err);
        setError(err.response?.data?.detail || 'Failed to load EDA summary');
      } finally {
        setLoading(false);
      }
    };

    fetchEDA();
  }, [sessionId]);

  // Fetch correlation heatmap on mount
  useEffect(() => {
    if (!sessionId) return;
    
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

  // Generate custom graph
  const generateGraph = async () => {
    if (!selCat || !selGraph || selCols.length === 0) return;
    setGLoading(true);
    const params: any = { session_id: sessionId };
    if (['histogram', 'boxplot', 'qq'].includes(selGraph)) {
      params.column = selCols[0];
    } else if (selGraph === 'scatter' || selGraph === 'line') {
      params.x = selCols[0];
      params.y = selCols[1] || selCols[0];
    } else {
      params.column = selCols[0];
    }
    try {
      const res = await api.get(`/graph/${selGraph}`, {
        params,
        responseType: 'blob'
      });
      setGraphUrl(URL.createObjectURL(res.data));
    } catch (err) {
      console.error(err);
    } finally {
      setGLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-black text-white min-h-screen p-6">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Exploratory Data Analysis</h2>
        <StatsSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-black text-white min-h-screen p-6">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Exploratory Data Analysis</h2>
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!eda) {
    return (
      <div className="bg-black text-white min-h-screen p-6">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Exploratory Data Analysis</h2>
        <p className="text-gray-400">No EDA data available. Please upload a dataset first.</p>
      </div>
    );
  }

  const numericCols = eda.numerical_columns;
  const categoricalCols = eda.categorical_columns;

  // Generate AI suggestions based on EDA results
  const generateSuggestions = (): string[] => {
    const suggestions: string[] = [];

    // Check for missing values
    const missingCount = Object.keys(eda.missing_values).length;
    if (missingCount > 0) {
      suggestions.push(`${missingCount} column(s) have missing values. Consider cleaning them in the next step.`);
    }

    // Check for high skewness
    const highSkewCols = Object.entries(eda.skewness)
      .filter(([_, skew]) => Math.abs(skew) > 1)
      .map(([col]) => col);
    if (highSkewCols.length > 0) {
      suggestions.push(`${highSkewCols.length} column(s) have high skewness. Consider log or box-cox transformation.`);
    }

    // Check for high correlation
    if (eda.correlations.length > 0) {
      const highCorr: string[] = [];
      for (let i = 0; i < eda.correlations.length; i++) {
        for (let j = i + 1; j < eda.correlations[i].length; j++) {
          if (Math.abs(eda.correlations[i][j]) > 0.9) {
            highCorr.push(`${eda.correlation_columns[i]} and ${eda.correlation_columns[j]}`);
          }
        }
      }
      if (highCorr.length > 0) {
        suggestions.push(`High correlation detected between: ${highCorr.slice(0, 3).join(', ')}. Consider removing redundant features.`);
      }
    }

    // Check for high cardinality categorical columns
    const highCardCols = Object.entries(eda.categorical_summary)
      .filter(([_, stats]) => stats.unique_count > 50)
      .map(([col]) => col);
    if (highCardCols.length > 0) {
      suggestions.push(`${highCardCols.length} categorical column(s) have high cardinality (>50 unique values). Consider grouping or encoding strategies.`);
    }

    if (suggestions.length === 0) {
      suggestions.push('Your data looks good! Proceed to the next step.');
    }

    return suggestions;
  };

  const suggestions = generateSuggestions();

  return (
    <div className="bg-black text-white min-h-screen p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Exploratory Data Analysis</h2>
      <p className="text-gray-400 mb-6">
        Dataset: {eda.row_count} rows × {eda.column_count} columns
      </p>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div ref={suggestionsRef} className="mb-6 bg-gradient-to-r from-red-900/20 to-red-800/10 border border-red-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-red-400 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AI Insights
          </h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-300">
                <span className="text-red-400 mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TabGroup>
        <TabList className="flex space-x-1 bg-gray-800 p-1 rounded mb-4">
          {['Summary', 'Graphs'].map((label) => (
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
          {/* ─── SUMMARY TAB ─── */}
          <TabPanel className="space-y-8">
            {/* Missing Values */}
            {Object.keys(eda.missing_values).length > 0 && (
              <section ref={missingValuesRef}>
                <h3 className="text-xl font-semibold mb-3 text-red-400">Missing Values</h3>
                <div className="overflow-x-auto bg-gray-900 rounded-lg">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-gray-300 border-b border-gray-700">
                        <th className="px-4 py-2">Column</th>
                        <th className="px-4 py-2">Missing Count</th>
                        <th className="px-4 py-2">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(eda.missing_values).map(([col, info]) => (
                        <tr key={col} className="border-t border-gray-700">
                          <td className="px-4 py-2 font-medium">{col}</td>
                          <td className="px-4 py-2">{info.count}</td>
                          <td className="px-4 py-2">{info.percentage.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Numerical Summary */}
            {numericCols.length > 0 && (
              <section ref={numericalSummaryRef}>
                <h3 className="text-xl font-semibold mb-3">Numerical Summary</h3>
                <div className="overflow-x-auto bg-gray-900 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-300 border-b border-gray-700">
                        <th className="px-3 py-2 sticky left-0 bg-gray-900">Column</th>
                        <th className="px-3 py-2">Mean</th>
                        <th className="px-3 py-2">Median</th>
                        <th className="px-3 py-2">Std</th>
                        <th className="px-3 py-2">Min</th>
                        <th className="px-3 py-2">Q25</th>
                        <th className="px-3 py-2">Q75</th>
                        <th className="px-3 py-2">Max</th>
                        <th className="px-3 py-2">Skewness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numericCols.map((col) => {
                        const stats = eda.numerical_summary[col];
                        return (
                          <tr key={col} className="border-t border-gray-700">
                            <td className="px-3 py-2 font-medium sticky left-0 bg-gray-900">{col}</td>
                            <td className="px-3 py-2">{stats.mean.toFixed(2)}</td>
                            <td className="px-3 py-2">{stats.median.toFixed(2)}</td>
                            <td className="px-3 py-2">{stats.std.toFixed(2)}</td>
                            <td className="px-3 py-2">{stats.min.toFixed(2)}</td>
                            <td className="px-3 py-2">{stats.q25.toFixed(2)}</td>
                            <td className="px-3 py-2">{stats.q75.toFixed(2)}</td>
                            <td className="px-3 py-2">{stats.max.toFixed(2)}</td>
                            <td className="px-3 py-2">{stats.skewness.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Categorical Summary */}
            {categoricalCols.length > 0 && (
              <section ref={categoricalSummaryRef}>
                <h3 className="text-xl font-semibold mb-3">Categorical Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoricalCols.map((col) => {
                    const stats = eda.categorical_summary[col];
                    return (
                      <div key={col} className="bg-gray-900 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-red-400">{col}</h4>
                        <p className="text-sm text-gray-400 mb-2">
                          Unique values: {stats.unique_count}
                        </p>
                        <div className="space-y-1">
                          {stats.top_values.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="truncate mr-2">{item.value}</span>
                              <span className="text-gray-400">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Correlation Heatmap */}
            {eda.correlations.length > 0 && (
              <section ref={correlationRef}>
                <h3 className="text-xl font-semibold mb-3">Correlation Heatmap</h3>
                {corrLoading ? (
                  <div className="flex items-center justify-center h-[400px] bg-gray-900 rounded-lg">
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
                  <OptimizedImage
                    src={corrImgUrl}
                    alt="Correlation Heatmap"
                    className="w-full max-h-[500px] object-contain rounded-lg shadow-lg bg-gray-900"
                    loading="lazy"
                  />
                ) : (
                  <p className="text-gray-500 bg-gray-900 rounded-lg p-4">
                    Failed to load heatmap.
                  </p>
                )}
              </section>
            )}
          </TabPanel>

          {/* ─── GRAPHS TAB ─── */}
          <TabPanel className="space-y-4">
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="cat"
                  className="accent-red-500"
                  checked={selCat === 'numeric'}
                  onChange={() => {
                    setSelCat('numeric');
                    setSelCols([]);
                    setSelGraph('');
                    setGraphUrl(null);
                  }}
                />
                <span>Numeric</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="cat"
                  className="accent-red-500"
                  checked={selCat === 'categorical'}
                  onChange={() => {
                    setSelCat('categorical');
                    setSelCols([]);
                    setSelGraph('');
                    setGraphUrl(null);
                  }}
                />
                <span>Categorical</span>
              </label>
            </div>

            {selCat && (
              <div className="space-y-4">
                {/* Select graph type */}
                <div>
                  <label className="block mb-1 font-medium">Graph Type</label>
                  <select
                    value={selGraph}
                    onChange={(e) => {
                      setSelGraph(e.target.value);
                      setSelCols([]);
                      setGraphUrl(null);
                    }}
                    className="bg-gray-800 text-white p-2 rounded w-full border border-gray-700 focus:border-red-500 focus:outline-none"
                  >
                    <option value="">— Choose a graph type —</option>
                    {GRAPH_TYPES[selCat].map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select columns */}
                {selGraph && (
                  <div>
                    <label className="block mb-1 font-medium">
                      Column{selGraph === 'scatter' || selGraph === 'line' ? 's' : ''}
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {(selCat === 'numeric' ? numericCols : categoricalCols).map((col) => (
                        <label key={col} className="flex items-center space-x-2">
                          <input
                            type={selGraph === 'scatter' || selGraph === 'line' ? 'checkbox' : 'radio'}
                            name="cols"
                            className="accent-red-500"
                            value={col}
                            checked={selCols.includes(col)}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSelCols((prev) => {
                                if (e.target.type === 'radio') return [v];
                                // checkbox
                                return prev.includes(v)
                                  ? prev.filter((x) => x !== v)
                                  : [...prev, v].slice(0, 2);
                              });
                              setGraphUrl(null);
                            }}
                          />
                          <span>{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={generateGraph}
                  disabled={!selGraph || selCols.length === 0 || gLoading}
                  className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {gLoading ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                      <span>Generating…</span>
                    </span>
                  ) : (
                    'Generate Graph'
                  )}
                </button>

                {/* Display generated graph */}
                {graphUrl && (
                  <div className="mt-4 bg-gray-900 rounded-lg p-4">
                    <OptimizedImage
                      src={graphUrl}
                      alt="Generated Graph"
                      className="w-full max-h-96 object-contain rounded shadow-lg"
                      loading="lazy"
                    />
                    <a
                      href={graphUrl}
                      download={`${selGraph}.png`}
                      className="block mt-4 text-center text-red-500 hover:text-red-400 underline"
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
