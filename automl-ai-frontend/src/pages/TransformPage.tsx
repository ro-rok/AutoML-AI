// src/pages/TransformPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import { usePipelineStore } from '../store/useStepStore';

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
  const { completeStep } = usePipelineStore();
  const navigate = useNavigate();

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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
    } catch (e: any) {
      console.error('Transform failed:', e);
      const errorMessage = e.response?.data?.detail || e.message || 'Failed to apply transformations. Please try again.';
      setError(errorMessage);
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
    <div className="bg-black text-white min-h-screen p-4 sm:p-6 md:p-8 pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-500 mb-4 sm:mb-6">Transform Dataset</h2>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-gray-800 p-1 rounded mb-4 sm:mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`flex-1 py-2 px-3 sm:px-4 text-center rounded whitespace-nowrap text-sm sm:text-base min-w-[100px] ${
                selectedTab === tab.key
                  ? 'bg-black text-red-500 font-semibold'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4 max-w-6xl mx-auto">
        {/* Skew Correction Tab */}
        {selectedTab === 'skew' && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block mb-2 sm:mb-3 font-semibold text-gray-300 text-sm sm:text-base">Method</label>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
                {['log', 'sqrt', 'boxcox', 'yeojohnson'].map((method) => (
                  <label key={method} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="skew"
                      value={method}
                      checked={skewMethod === method}
                      onChange={() => setSkewMethod(method)}
                      className="accent-red-500 w-4 h-4"
                    />
                    <span className="ml-2 capitalize text-sm sm:text-base">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2 sm:mb-3 font-semibold text-gray-300 text-sm sm:text-base">
                Select Numerical Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {numCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => toggle(skewCols, setSkewCols, col)}
                    className={`px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-colors min-h-[44px] ${
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
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block mb-2 sm:mb-3 font-semibold text-gray-300 text-sm sm:text-base">Method</label>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
                {['label', 'onehot', 'ordinal', 'binary'].map((method) => (
                  <label key={method} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="encode"
                      value={method}
                      checked={encMethod === method}
                      onChange={() => setEncMethod(method)}
                      className="accent-red-500 w-4 h-4"
                    />
                    <span className="ml-2 capitalize text-sm sm:text-base">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2 sm:mb-3 font-semibold text-gray-300 text-sm sm:text-base">
                Select Categorical Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {catCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => toggle(encCols, setEncCols, col)}
                    className={`px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-colors min-h-[44px] ${
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
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block mb-2 sm:mb-3 font-semibold text-gray-300 text-sm sm:text-base">Method</label>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
                {['standard', 'minmax', 'robust', 'maxabs'].map((method) => (
                  <label key={method} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="scale"
                      value={method}
                      checked={scaleMethod === method}
                      onChange={() => setScaleMethod(method)}
                      className="accent-red-500 w-4 h-4"
                    />
                    <span className="ml-2 capitalize text-sm sm:text-base">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2 sm:mb-3 font-semibold text-gray-300 text-sm sm:text-base">
                Select Numerical Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {numCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => toggle(scaleCols, setScaleCols, col)}
                    className={`px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-colors min-h-[44px] ${
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
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-gray-900 p-4 sm:p-6 rounded-lg">
              <p className="text-gray-300 mb-2 sm:mb-3 text-sm sm:text-base">
                <strong>Current Class Distribution:</strong>
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {Object.entries(classDist).map(([cls, count]) => (
                  <div key={cls} className="text-xs sm:text-sm">
                    <span className="text-gray-400">{cls}:</span>{' '}
                    <span className="text-white font-semibold">{count}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-xs sm:text-sm mt-2 italic">
                Note: Balancing runs after encoding
              </p>
            </div>
            <div>
              <label className="block mb-2 sm:mb-3 font-semibold text-gray-300 text-sm sm:text-base">Method</label>
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4">
                {['smote', 'random_oversample', 'random_undersample'].map((method) => (
                  <label key={method} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="balance"
                      value={method}
                      checked={balMethod === method}
                      onChange={() => setBalMethod(method)}
                      className="accent-red-500 w-4 h-4"
                    />
                    <span className="ml-2 capitalize text-sm sm:text-base">{method.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 max-w-6xl mx-auto bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold mb-1">Transformation Failed</h4>
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Button */}
      <div className="mt-6 sm:mt-8 max-w-6xl mx-auto">
        <button
          onClick={handleTransform}
          disabled={loading || !canApply()}
          className="w-full sm:w-auto bg-red-500 hover:bg-red-600 px-6 py-3 sm:py-4 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base min-h-[44px]"
        >
          {loading ? 'Applying Transformations...' : 'Apply Transformations'}
        </button>
      </div>

      {/* Results Preview */}
      {result && (
        <section className="mt-8 sm:mt-12 max-w-6xl mx-auto">
          <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-200">
            Transformed Data Preview
          </h3>
          <div className="bg-gray-900 p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
            <p className="text-gray-300 text-sm sm:text-base mb-2">
              <strong>New Row Count:</strong> {result.new_row_count}
            </p>
            <p className="text-gray-300 text-sm sm:text-base">
              <strong>New Column Count:</strong> {result.new_column_count}
            </p>
          </div>
          <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-800">
                  {result.transformed_preview.length > 0 &&
                    Object.keys(result.transformed_preview[0]).map((col) => (
                      <th key={col} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm text-gray-300 font-semibold">
                        {col}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {result.transformed_preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-200">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Continue to Train Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                completeStep('transform');
                navigate('/train');
              }}
              className="
                py-3 px-8 
                bg-red-500 hover:bg-red-600 
                text-white font-semibold text-lg rounded-lg
                transition-all duration-200
                hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
                hover:-translate-y-0.5
                focus:outline-none focus:ring-3 focus:ring-red-500/50
                flex items-center gap-2
              "
            >
              Continue to Train →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
