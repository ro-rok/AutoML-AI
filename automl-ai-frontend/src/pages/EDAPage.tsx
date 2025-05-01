import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

export default function EDAPage() {
  const { sessionId } = useSessionStore();
  const [edaResult, setEdaResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    api.post('/pipeline/eda', { session_id: sessionId })
      .then((res) => setEdaResult(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Exploratory Data Analysis</h2>
      {loading && <p>Loading...</p>}
      {!loading && edaResult && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Correlation Matrix</h3>
            <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{JSON.stringify(edaResult.correlation_matrix, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold">Skewness</h3>
            <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{JSON.stringify(edaResult.skewness, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold">Class Distribution</h3>
            <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{JSON.stringify(edaResult.class_distribution, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold">Feature Summary</h3>
            <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{JSON.stringify(edaResult.numeric_summary, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
