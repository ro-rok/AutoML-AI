// src/pages/CleanPage.tsx
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import { useNavigate } from 'react-router-dom';

interface CleaningOperation {
  column: string;
  strategy: string;
  fill_value?: any;
}

interface PreviewDiff {
  before: any[];
  after: any[];
  changed_rows: number;
  deleted_rows: number;
}

export default function CleanPage() {
  const { sessionId } = useSessionStore();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<any[]>([]);
  const [columnsWithMissing, setColumnsWithMissing] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<Record<string, CleaningOperation>>({});
  const [preview, setPreview] = useState<PreviewDiff | null>(null);
  const [applying, setApplying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch session state to get schema and missing values
  useEffect(() => {
    async function fetchSessionState() {
      if (!sessionId) {
        navigate('/upload');
        return;
      }

      try {
        setLoading(true);
        const res = await api.get(`/session/state?session_id=${sessionId}`);
        const sessionData = res.data;

        setSchema(sessionData.schema || []);

        // Find columns with missing values
        const missing = (sessionData.schema || []).filter(
          (col: any) => col.null_count > 0
        );
        setColumnsWithMissing(missing);

        // Initialize default strategies (fill_mean for numerical, fill_mode for categorical)
        const defaultStrategies: Record<string, CleaningOperation> = {};
        missing.forEach((col: any) => {
          const isNumerical = col.inferred_type === 'numerical';
          defaultStrategies[col.column] = {
            column: col.column,
            strategy: isNumerical ? 'fill_mean' : 'fill_mode',
          };
        });
        setStrategies(defaultStrategies);
      } catch (err) {
        console.error('Failed to load session state', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSessionState();
  }, [sessionId, navigate]);

  // Preview cleaning operations
  const handlePreview = async () => {
    if (Object.keys(strategies).length === 0) return;

    try {
      setPreviewLoading(true);
      const operations = Object.values(strategies);
      const res = await api.post('/clean/preview', {
        session_id: sessionId,
        operations,
      });

      setPreview(res.data.preview);
    } catch (err) {
      console.error('Failed to preview cleaning', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Apply cleaning operations
  const handleApply = async () => {
    if (Object.keys(strategies).length === 0) return;

    try {
      setApplying(true);
      const operations = Object.values(strategies);
      const idempotencyKey = `clean-${Date.now()}`;

      await api.post('/clean/apply', {
        session_id: sessionId,
        operations,
        idempotency_key: idempotencyKey,
      });

      // Navigate to next step (transform)
      navigate('/transform');
    } catch (err: any) {
      console.error('Failed to apply cleaning', err);
      if (err.response?.status === 409) {
        alert('Session state conflict. Please refresh and try again.');
      }
    } finally {
      setApplying(false);
    }
  };

  // Reset step
  const handleReset = async () => {
    if (!confirm('Reset all cleaning operations? This will restore the dataset to its original state.')) {
      return;
    }

    try {
      await api.post(`/clean/reset?session_id=${sessionId}`);
      // Reload page to refresh state
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset cleaning', err);
    }
  };

  // Update strategy for a column
  const updateStrategy = (column: string, strategy: string, fillValue?: any) => {
    setStrategies((prev) => ({
      ...prev,
      [column]: {
        column,
        strategy,
        fill_value: fillValue,
      },
    }));
    // Clear preview when strategy changes
    setPreview(null);
  };

  if (loading) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (columnsWithMissing.length === 0) {
    return (
      <div className="bg-black text-white min-h-screen pb-16">
        <div className="max-w-4xl mx-auto p-8">
          <h2 className="text-3xl font-bold text-red-500 mb-4">Clean Missing Values</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <p className="text-green-500 text-lg font-medium mb-4">
              ✓ No missing values found in your dataset!
            </p>
            <p className="text-gray-400 mb-6">
              Your dataset is clean and ready for transformation.
            </p>
            <button
              onClick={() => navigate('/transform')}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-colors"
            >
              Continue to Transform
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen pb-16">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-red-500 mb-2">Clean Missing Values</h2>
          <p className="text-gray-400">
            Handle missing values in your dataset by selecting a cleaning strategy for each column.
          </p>
        </div>

        {/* Columns with missing values */}
        <div className="space-y-6 mb-8">
          {columnsWithMissing.map((col) => {
            const currentStrategy = strategies[col.column]?.strategy || 'fill_mean';
            const isNumerical = col.inferred_type === 'numerical';

            return (
              <div
                key={col.column}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{col.column}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {col.null_count} missing ({((col.null_count / col.total_count) * 100).toFixed(1)}%)
                      • Type: {col.inferred_type}
                    </p>
                  </div>
                </div>

                {/* Strategy selector */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Cleaning Strategy
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Drop rows */}
                    <button
                      onClick={() => updateStrategy(col.column, 'drop_rows')}
                      className={`px-4 py-3 rounded-lg border transition-all ${
                        currentStrategy === 'drop_rows'
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      Drop Rows
                    </button>

                    {/* Fill mean (numerical only) */}
                    {isNumerical && (
                      <button
                        onClick={() => updateStrategy(col.column, 'fill_mean')}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          currentStrategy === 'fill_mean'
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        Fill Mean
                      </button>
                    )}

                    {/* Fill median (numerical only) */}
                    {isNumerical && (
                      <button
                        onClick={() => updateStrategy(col.column, 'fill_median')}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          currentStrategy === 'fill_median'
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        Fill Median
                      </button>
                    )}

                    {/* Fill mode */}
                    <button
                      onClick={() => updateStrategy(col.column, 'fill_mode')}
                      className={`px-4 py-3 rounded-lg border transition-all ${
                        currentStrategy === 'fill_mode'
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      Fill Mode
                    </button>

                    {/* Forward fill */}
                    <button
                      onClick={() => updateStrategy(col.column, 'forward_fill')}
                      className={`px-4 py-3 rounded-lg border transition-all ${
                        currentStrategy === 'forward_fill'
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      Forward Fill
                    </button>

                    {/* Backward fill */}
                    <button
                      onClick={() => updateStrategy(col.column, 'backward_fill')}
                      className={`px-4 py-3 rounded-lg border transition-all ${
                        currentStrategy === 'backward_fill'
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      Backward Fill
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview diff */}
        {preview && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Preview Changes</h3>
            <p className="text-sm text-gray-400 mb-4">
              {preview.deleted_rows > 0
                ? `${preview.deleted_rows} rows will be deleted`
                : 'No rows will be deleted'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Before</h4>
                <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-64">
                  <pre className="text-xs text-gray-300">
                    {JSON.stringify(preview.before, null, 2)}
                  </pre>
                </div>
              </div>

              {/* After */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">After</h4>
                <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-64">
                  <pre className="text-xs text-gray-300">
                    {JSON.stringify(preview.after, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreview}
            disabled={previewLoading || Object.keys(strategies).length === 0}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {previewLoading ? 'Loading Preview...' : 'Preview Changes'}
          </button>

          <button
            onClick={handleApply}
            disabled={applying || Object.keys(strategies).length === 0}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? 'Applying...' : 'Apply All'}
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-semibold transition-colors"
          >
            Reset Step
          </button>
        </div>
      </div>
    </div>
  );
}
