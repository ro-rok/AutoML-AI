import { useState } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

export default function TransformPage() {
  const { sessionId } = useSessionStore();
  const [encoding, setEncoding] = useState("label");
  const [scaling, setScaling] = useState("standard");
  const [balancing, setBalancing] = useState("smote");
  const [target, setTarget] = useState("");
  const [exclude, setExclude] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const handleTransform = async () => {
    const res = await api.post('/pipeline/transform', {
      session_id: sessionId,
      target_column: target,
      encoding,
      scaling,
      balancing,
      drop_columns: exclude,
    });
    setResult(res.data);  
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Transform Dataset</h2>

      <div className="space-y-4">
        <div>
          <label className="font-semibold">Target Column:</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="ml-2 px-2 py-1 border"
          />
        </div>

        <div>
          <label className="font-semibold">Encoding:</label>
          <select value={encoding} onChange={(e) => setEncoding(e.target.value)} className="ml-2 px-2 py-1 border">
            <option value="label">Label</option>
            <option value="onehot">One-Hot</option>
          </select>
        </div>

        <div>
          <label className="font-semibold">Scaling:</label>
          <select value={scaling} onChange={(e) => setScaling(e.target.value)} className="ml-2 px-2 py-1 border">
            <option value="standard">Standard</option>
            <option value="minmax">MinMax</option>
          </select>
        </div>

        <div>
          <label className="font-semibold">Balancing:</label>
          <select value={balancing} onChange={(e) => setBalancing(e.target.value)} className="ml-2 px-2 py-1 border">
            <option value="smote">SMOTE</option>
            <option value="undersample">Undersample</option>
          </select>
        </div>

        <div>
          <label className="font-semibold">Drop Columns (comma-separated):</label>
          <input
            type="text"
            onChange={(e) => setExclude(e.target.value.split(",").map((s) => s.trim()))}
            className="ml-2 px-2 py-1 border"
          />
        </div>

        <button onClick={handleTransform} className="px-4 py-2 bg-blue-600 text-white rounded">
          Transform
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h3 className="font-semibold">Transformed Preview</h3>
          <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">
            {JSON.stringify(result.transformed_preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
