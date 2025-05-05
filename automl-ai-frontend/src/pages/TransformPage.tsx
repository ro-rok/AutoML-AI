import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

export default function TransformPage() {
  const { sessionId } = useSessionStore();
  const [target, setTarget] = useState('');
  const [encoding, setEncoding] = useState("none");
  const [scaling, setScaling] = useState("none");
  const [balancing, setBalancing] = useState("none");
  const [exclude, setExclude] = useState<string[]>([]);
  const [availableCols, setAvailableCols] = useState<string[]>([]);
  const [catCols, setCatCols] = useState<string[]>([]);
  const [numCols, setNumCols] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [encodingCols, setEncodingCols] = useState<string[]>([]);
  const [scalingCols, setScalingCols] = useState<string[]>([]);
  const [skewCols, setSkewCols] = useState<string[]>([]);
  const [skewness, setSkewness] = useState("none");


  useEffect(() => {
    const fetchCols = async () => {
      const res = await api.post('/pipeline/eda', { session_id: sessionId });
      const corrCols = Object.keys(res.data.correlation_matrix || {});
      const uniqueCols = Object.keys(res.data.unique_values || {});
      const skewCols = Object.keys(res.data.skewness || {});
      setAvailableCols([...new Set([...corrCols, ...uniqueCols, ...skewCols])]);
      setCatCols(Object.keys(res.data.unique_values || {}));
      setNumCols(Object.keys(res.data.skewness || {}));
    };

    if (sessionId) fetchCols();
  }, [sessionId]);

  const handleTransform = async () => {
    console.log("Transforming with params:", {
      sessionId,
      target,
      encoding,
      encodingCols,
      scaling,
      scalingCols,
      balancing,
      exclude,
      skewness,
      skewCols,
    });
    const res = await api.post('/pipeline/transform', {
      session_id: sessionId,
      target_column: target || availableCols[0],
      encoding,
      encoding_columns: encodingCols,
      scaling,
      scaling_columns: scalingCols,
      balancing,
      drop_columns: exclude,
      skewness,
      skewness_columns: skewCols,
    });
    setResult(res.data);
  };

  const checkboxGroup = (cols: string[], selected: string[], setSelected: (v: string[]) => void) => (
    <div className="flex flex-wrap gap-2">
      {cols.map(col => (
        <label key={col} className="text-sm">
          <input
            type="checkbox"
            checked={selected.includes(col)}
            onChange={(e) => {
              if (e.target.checked) setSelected([...selected, col]);
              else setSelected(selected.filter(c => c !== col));
            }}
          />
          <span className="ml-1">{col}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6 mb-10">
      <h2 className="text-2xl font-bold">Transform Dataset</h2>

      <div>
        <label className="font-semibold">Target Column for Model:</label> <br/ >
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="ml-2 px-2 py-1 border">
          {availableCols.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div>
          <h3 className="font-semibold text-lg mt-4">Skewness</h3>
          <select value={skewness} onChange={(e) => setSkewness(e.target.value)} className="px-2 py-1 border mt-1">
            <option value="none">None</option>
            <option value="log">Log Transformation</option>
            <option value="sqrt">Square Root Transformation</option>
            <option value="boxcox">Box-Cox Transformation</option>
            <option value="yeojohnson">Yeo-Johnson Transformation</option>
          </select>
          <p className="text-xs mt-1 text-gray-600">Applies to numeric columns only</p>
          <div>
            <h3 className="font-semibold">Skewness Columns:</h3>
            {checkboxGroup(numCols, skewCols, setSkewCols)}
          </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mt-4">Encoding</h3>
        <select value={encoding} onChange={(e) => setEncoding(e.target.value)} className="px-2 py-1 border mt-1">
          <option value="none">None</option>
          <option value="label">Label Encoding</option>
          <option value="onehot">One-Hot Encoding</option>
          <option value="ordinal">Ordinal Encoding</option>
          <option value="binary">Binary Encoding</option>
        </select>
        <p className="text-xs mt-1 text-gray-600">Applies to categorical columns only</p>
        <div>
          <h3 className="font-semibold">Encoding Columns:</h3>
          {checkboxGroup(catCols, encodingCols, setEncodingCols)}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mt-4">Scaling</h3>
        <select value={scaling} onChange={(e) => setScaling(e.target.value)} className="px-2 py-1 border mt-1">
          <option value="none">None</option>
          <option value="standard">Standard Scaler</option>
          <option value="minmax">MinMax Scaler</option>
          <option value="robust">Robust Scaler</option>
          <option value="maxabs">MaxAbs Scaler</option>
        </select>
        <p className="text-xs mt-1 text-gray-600">Applies to numeric columns only</p>
        <div>
          <h3 className="font-semibold">Scaling Columns:</h3>
          {checkboxGroup(numCols, scalingCols, setScalingCols)}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mt-4">Balancing</h3>
        <select value={balancing} onChange={(e) => setBalancing(e.target.value)} className="px-2 py-1 border mt-1">
          <option value="none">None</option>
          <option value="smote">SMOTE</option>
          <option value="undersample">Undersample</option>
        </select>
      </div>

      <div>
        <h3 className="font-semibold text-lg mt-4">Drop Columns</h3>
        {checkboxGroup(availableCols, exclude, setExclude)}
      </div>

      <button onClick={handleTransform} className="bg-blue-600 text-white px-6 py-2 rounded mt-4">
        Transform
      </button>
      
      {result && (
        <div className="mt-6">
          <h3 className="font-semibold">Transformed Preview</h3>
          <pre className="bg-gray-100 p-3 text-sm overflow-x-auto">
            {JSON.stringify(result.transformed_preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
