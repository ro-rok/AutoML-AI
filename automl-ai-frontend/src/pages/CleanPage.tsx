import { useState } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

export default function CleanPage() {
  const { sessionId } = useSessionStore();
  const [schema, setSchema] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<{ [key: string]: string }>({});
  const [targetColumn, setTargetColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const fetchSchema = async () => {
    const res = await api.post(`/pipeline/eda`, { session_id: sessionId });
    const cols = Object.keys(res.data.skewness || {});
    setSchema(cols);
    setStrategies(Object.fromEntries(cols.map((c) => [c, 'mean'])));
    setTargetColumn(cols[cols.length - 1] || '');
  };

  const clean = async () => {
    setLoading(true);
    console.log('targetColumn', targetColumn);
    const res = await api.post('/pipeline/clean', {
      session_id: sessionId,
      fill_strategies: strategies,
      target_column: targetColumn,
    });
    console.log(res.data);
    setPreview(res.data.preview);
    setLoading(false);
  };

  return (
    <div className="p-6 mb-11">
      <h2 className="text-xl font-bold mb-4">Clean Missing Values</h2>
      <button onClick={fetchSchema} className="mb-4 px-3 py-1 bg-gray-800 text-white rounded">Load Columns</button>
      {schema.map((col) => (
        <div key={col} className="mb-2">
          <label className="mr-2 font-semibold">{col}</label>
          <select
            value={strategies[col]}
            onChange={(e) =>
              setStrategies({ ...strategies, [col]: e.target.value })
            }
            className="px-2 py-1 border"
          >
            <option value="mean">Mean</option>
            <option value="median">Median</option>
            <option value="mode">Mode</option>
            <option value="drop">Drop</option>
          </select>
        </div>
      ))}
      <div className="mb-2">
        <label className="mr-2 font-semibold">Target Column</label>
        <select
          value={targetColumn}
          onChange={(e) => setTargetColumn(e.target.value)}
          className="px-2 py-1 border"
        >
          {schema.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>
      <button onClick={clean} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        Clean Data
      </button>
      {loading && <p className="mt-4">Cleaning...</p>}
      {preview.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Preview:</h3>
          <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
