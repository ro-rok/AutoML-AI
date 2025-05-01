import { useState } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

export default function ExportPage() {
  const { sessionId } = useSessionStore();
  const [metadata, setMetadata] = useState({ rows: 1000, columns: 15 }); 
  const [metrics, setMetrics] = useState({ accuracy: 0.92 }); 
  const [tips, setTips] = useState(["Use SMOTE", "Try parameter tuning"]);

  const download = async (type: 'pdf' | 'ipynb') => {
    const route = type === 'pdf' ? '/export/pdf' : '/export/ipynb';
    const body = type === 'pdf'
      ? { session_id: sessionId, metadata, metrics, tips }
      : { code_steps: ['# example notebook cell', 'print("Hello")'] };

    const res = await api.post(route, body, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sessionId}_export.${type}`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Export Pipeline</h2>
      <button onClick={() => download('pdf')} className="bg-blue-600 text-white px-4 py-2">Download PDF</button>
      <button onClick={() => download('ipynb')} className="bg-green-600 text-white px-4 py-2">Download IPYNB</button>
    </div>
  );
}
