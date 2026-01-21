// src/pages/TransformPage.tsx
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

interface TransformOperation {
  type: string;
  columns: string[];
  method: string;
  parameters?: Record<string, any>;
}

interface TransformResult {
  transformed_preview: any[];
  new_row_count: number;
  new_column_count: number;
}

export default function TransformPage() {
  const { sessionId } = useSessionStore();

  // Available columns from EDA
  const [numCols, setNumCols] = useState<string[]>([]);
  const [catCols, setCatCols] = useState<string[]>([]);
  const [classDist, setClassDist] = useState<Record<string, number>>({});

  // Skew correction state
  const [skewMethod, setSkewMethod] = useState<string | null>(null);
  const [skewCols, setSkewCols] = useState<string[]>([]);

  // Encoding state
  const [encMethod, setEncMethod] = useState<string | null>(null);
  const [encCols, setEncCols] = useState<string[]>([]);

  // Scaling state
  const [scaleMethod, setScaleMethod] = useState<string | null>(null);
  const [scaleCols, setScaleCols] = useState<string[]>([]);

  // Balancing state
  const [balMethod, setBalMethod] = useState<string | null>(null);

  // Drop columns state
  const [dropCols, setDropCols] = useState<string[]>([]);

  // Result and loading state
  const [result, setResult] = useState<TransformResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('skew');

  // Fetch columns and class distribution on mount
  useEffect(() => {
    if (!sessionId) return;
    
    api.post('/pipeline/eda', { session_id: sessionId })
      .then(res => {
        const { correlation_matrix, unique_values, class_distribution } = res.data;
        setNumCols(Object.keys(correlation_matrix || {}));
        setCatCols(Object.keys(unique_values || {}));
        setClassDist(class_distribution || {});
      })
      .catch(console.error);
  }, [sessionId]);

  // Helper to toggle column selection
  const toggle = (arr: string[], setFn: (v: string[]) => void, val: string) => {
    setFn(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  // Check if we can apply transformations
  const canApply = () => {
    return (
      (skewMethod && skewCols.length > 0) ||
      (encMethod && encCols.length > 0) ||
      (scaleMethod && scaleCols.length > 0) ||
      balMethod ||
      dropCols.length > 0
    );
  };

  // Build operations array from current state
  const buildOperations = (): TransformOperation[] => {
    const operations: TransformOperation[] = [];

    // Add skew correction
    if (skewMethod && skewCols.length > 0) {
      operations.push({
        type: 'skew_correction',
        columns: skewCols,
        method: skewMethod,
      });
    }

    // Add encoding
    if (encMethod && encCols.length > 0) {
      operations.push({
        type: 'encoding',
        columns: encCols,
        method: encMethod,
      });
    }

    // Add scaling
    if (scaleMethod && scaleCols.length > 0) {
      operations.push({
        type: 'scaling',
        columns: scaleCols,
        method: scaleMethod,
      });
    }

    // Add balancing
    if (balMethod) {
      operations.push({
        type: 'class_balancing',
        columns: [], // Balancing uses target column from session
        method: balMethod,
      });
    }

    return operations;
  };

  // Handle apply transformations
  const handleTransform = async () => {
    if (!canApply()) return;
    
    setLoading(true);
    try {
      const operations = buildOperations();
      
      const res = await api.post<TransformResult>('/transform/apply', {
        session_id: sessionId,
        operations,
      });
      
      setResult(res.data);
      
      // Reset state after successful transform
      setSkewMethod(null);
      setSkewCols([]);
      setEncMethod(null);
      setEncCols([]);
      setScaleMethod(null);
      setScaleCols([]);
      setBalMethod(null);
      setDropCols([]);
    } catch (e) {
      console.error('Transform failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { key: 'skew', label: 'Skew Correction' },
    { key: 'encode', label: 'Encoding' },
    { key: 'scale', label: 'Scaling' },
    { key: 'balance', label: 'Class Balancing' },
  ];

  return (
    <div className="bg-black text-white min-h-screen p-6">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Transform Dataset</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-800 p-1 rounded mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={`flex-1 py-2 px-4 text-center rounded whitespace-nowrap ${
              selectedTab === tab.key
                ? 'bg-black text-red-500 font-semibold'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {/* Skew Correction Tab */}
        {selectedTab === 'skew' && (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-300">Method</label>
              <div className="flex flex-wrap gap-4">
                {['log', 'sqrt', 'boxcox', 'yeojohnson'].map((method) => (
                  <label key={method} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="skew"
                      value={method}
                      checked={skewMethod === method}
                      onChange={() => setSkewMethod(method)}
                      className="accent-red-500"
                    />
                    <span className="ml-2 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">
                Select Numerical Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {numCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => toggle(skewCols, setSkewCols, col)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      skewCols.includes(col)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Encoding Tab */}
        {selectedTab === 'encode' && (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-300">Method</label>
              <div className="flex flex-wrap gap-4">
                {['label', 'onehot', 'ordinal', 'binary'].map((method) => (
                  <label key={method} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="encode"
                      value={method}
                      checked={encMethod === method}
                      onChange={() => setEncMethod(method)}
                      className="accent-red-500"
                    />
                    <span className="ml-2 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">
                Select Categorical Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {catCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => toggle(encCols, setEncCols, col)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      encCols.includes(col)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scaling Tab */}
        {selectedTab === 'scale' && (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-300">Method</label>
              <div className="flex flex-wrap gap-4">
                {['standard', 'minmax', 'robust', 'maxabs'].map((method) => (
                  <label key={method} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="scale"
                      value={method}
                      checked={scaleMethod === method}
                      onChange={() => setScaleMethod(method)}
                      className="accent-red-500"
                    />
                    <span className="ml-2 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">
                Select Numerical Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {numCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => toggle(scaleCols, setScaleCols, col)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      scaleCols.includes(col)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Class Balancing Tab */}
        {selectedTab === 'balance' && (
          <div className="space-y-4">
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-300 mb-2">
                <strong>Current Class Distribution:</strong>
              </p>
              <div className="flex flex-wrap gap-4">
                {Object.entries(classDist).map(([cls, count]) => (
                  <div key={cls} className="text-sm">
                    <span className="text-gray-400">{cls}:</span>{' '}
                    <span className="text-white font-semibold">{count}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-2 italic">
                Note: Balancing runs after encoding
              </p>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">Method</label>
              <div className="flex flex-wrap gap-4">
                {['smote', 'random_oversample', 'random_undersample'].map((method) => (
                  <label key={method} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="balance"
                      value={method}
                      checked={balMethod === method}
                      onChange={() => setBalMethod(method)}
                      className="accent-red-500"
                    />
                    <span className="ml-2 capitalize">{method.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply Button */}
      <div className="mt-6">
        <button
          onClick={handleTransform}
          disabled={loading || !canApply()}
          className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Applying Transformations...' : 'Apply Transformations'}
        </button>
      </div>

      {/* Results Preview */}
      {result && (
        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-200">
            Transformed Data Preview
          </h3>
          <div className="bg-gray-900 p-4 rounded-lg mb-4">
            <p className="text-gray-300">
              <strong>New Row Count:</strong> {result.new_row_count}
            </p>
            <p className="text-gray-300">
              <strong>New Column Count:</strong> {result.new_column_count}
            </p>
          </div>
          <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-800">
                  {result.transformed_preview.length > 0 &&
                    Object.keys(result.transformed_preview[0]).map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-sm text-gray-300 font-semibold">
                        {col}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {result.transformed_preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-3 text-sm text-gray-200">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
