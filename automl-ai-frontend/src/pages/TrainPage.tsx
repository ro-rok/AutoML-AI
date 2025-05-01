import { useState } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

const models = [
  'logistic', 'random_forest', 'decision_tree', 'knn',
  'svm', 'naive_bayes', 'xgboost', 'lightgbm'
];

export default function TrainPage() {
  const { sessionId } = useSessionStore();
  const [target, setTarget] = useState('');
  const [modelKey, setModelKey] = useState('logistic');
  const [params, setParams] = useState<{ [key: string]: string }>({});
  const [metrics, setMetrics] = useState<any | null>(null);

  const updateParam = (k: string, v: string) => setParams({ ...params, [k]: v });

  const handleTrain = async () => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v.trim() !== '')
    );
    const res = await api.post('/pipeline/train', {
      session_id: sessionId,
      target_column: target,
      model_key: modelKey,
      hyperparameters: cleanParams
    });
    setMetrics(res.data.evaluation);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Model Training</h2>
      <input placeholder="Target Column" value={target} onChange={(e) => setTarget(e.target.value)} className="border p-2" />
      <select value={modelKey} onChange={(e) => setModelKey(e.target.value)} className="border p-2">
        {models.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <div className="space-y-2">
        <h3 className="font-semibold">Hyperparameters</h3>
        {Object.entries(params).map(([k, v]) => (
          <input key={k} placeholder={k} value={v} onChange={(e) => updateParam(k, e.target.value)} className="border p-2 w-full" />
        ))}
        <button onClick={() => updateParam('', '')} className="text-blue-600 text-sm">+ Add Param</button>
      </div>
      <button onClick={handleTrain} className="bg-blue-600 text-white px-4 py-2">Train</button>

      {metrics && (
        <div className="mt-6">
          <h3 className="font-semibold">Metrics</h3>
          <pre className="bg-gray-100 p-2">{JSON.stringify(metrics, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
