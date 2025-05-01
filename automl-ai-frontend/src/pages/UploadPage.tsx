import { useState } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const { setSessionId } = useSessionStore();

  const handleUpload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/upload/file', form);
    setSessionId(res.data.session_id);
    console.log(res.data);
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Upload Your Dataset</h1>
      <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        Upload & Start
      </button>
    </div>
  );
}
