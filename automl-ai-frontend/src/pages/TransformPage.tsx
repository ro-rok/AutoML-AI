// src/pages/TransformPage.tsx
import { useEffect, useState } from 'react';
import { Tab , TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import classNames from 'classnames';
import { api } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';

type TransformResult = {
  transformed_preview: Record<string, any>[];
};

export default function TransformPage() {
  const { sessionId } = useSessionStore();
  const [availableCols, setAvailableCols] = useState<string[]>([]);
  const [numCols, setNumCols] = useState<string[]>([]);
  const [catCols, setCatCols] = useState<string[]>([]);
  const [classDist, setClassDist] = useState<Record<string, number>>({});

  // per-tab state
  const [skewMethod, setSkewMethod] = useState<string | null>(null);
  const [skewCols, setSkewCols] = useState<string[]>([]);

  const [encMethod, setEncMethod] = useState<string | null>(null);
  const [encCols, setEncCols] = useState<string[]>([]);

  const [scaleMethod, setScaleMethod] = useState<string | null>(null);
  const [scaleCols, setScaleCols] = useState<string[]>([]);

  const [balMethod, setBalMethod] = useState<string | null>(null);

  const [dropCols, setDropCols] = useState<string[]>([]);

  const [result, setResult] = useState<TransformResult | null>(null);
  const [loading, setLoading] = useState(false);

  // fetch cols + class distribution once
  useEffect(() => {
    if (!sessionId) return;
    api.post('/pipeline/eda', { session_id: sessionId })
      .then(res => {
        const { correlation_matrix, unique_values, class_distribution } = res.data;
        const corr = Object.keys(correlation_matrix || {});
        const uniq = Object.keys(unique_values || {});
        setAvailableCols([...new Set([...corr, ...uniq])]);
        setNumCols(Object.keys(correlation_matrix || {}));
        setCatCols(Object.keys(unique_values || {}));
        setClassDist(class_distribution || {});
      })
      .catch(console.error);
  }, [sessionId]);

  const toggle = (arr: string[], setFn: (v: string[]) => void, val: string) => {
    setFn(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const canApply = () => {
    // require at least one column for tabs that need columns
    const tab = selectedTab;
    if (tab === 'skew')    return skewMethod && skewCols.length > 0;
    if (tab === 'encode')  return encMethod && encCols.length > 0;
    if (tab === 'scale')   return scaleMethod && scaleCols.length > 0;
    if (tab === 'balance') return !!balMethod;
    if (tab === 'drop')    return dropCols.length > 0;
    return false;
  };

  const handleTransform = async () => {
    if (!canApply()) return;
    setLoading(true);
    try {
      const payload = {
        session_id: sessionId,
        skewness:        skewMethod,
        skewness_columns:   skewCols,
        encoding:        encMethod,
        encoding_columns:   encCols,
        scaling:         scaleMethod,
        scaling_columns:    scaleCols,
        balancing:       balMethod,
        drop_columns:    dropCols,
      };
      const res = await api.post<TransformResult>('/pipeline/transform', payload);
      setResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      // reset all state after transform
      setSkewMethod(null);
      setSkewCols([]);
      setEncMethod(null);
      setEncCols([]);
      setScaleMethod(null);
      setScaleCols([]);
      setBalMethod(null);
      setDropCols([]); 
      setLoading(false);
    }
  };

  const TABS = [
    { key: 'skew',    label: 'Skew' },
    { key: 'encode',  label: 'Encoding' },
    { key: 'scale',   label: 'Scaling' },
    { key: 'balance', label: 'Balancing' },
    { key: 'drop',    label: 'Drop Columns' },
  ];

  const [selectedTab, setSelectedTab] = useState(TABS[0].key);

  return (
    <div className="bg-black text-white min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-4">Transform Dataset</h2>

      <TabGroup
        selectedIndex={TABS.findIndex(t => t.key === selectedTab)}
        onChange={i => setSelectedTab(TABS[i].key)}
      >
        {/* scrollable tab list */}
        <div className="overflow-x-auto">
          <TabList className="flex space-x-2 px-2">
            {TABS.map(tab => (
              <Tab
                key={tab.key}
                className={({ selected }) =>
                  classNames(
                    'px-4 py-2 whitespace-nowrap rounded-t-lg text-sm font-medium',
                    selected
                      ? 'bg-gray-800 text-red-500'
                      : 'text-gray-400 hover:text-gray-200'
                  )
                }
              >
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </div>

        <TabPanels className="mt-4">
          {TABS.map(tab => (
            <TabPanel key={tab.key}>
              {tab.key === 'skew' && (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 font-semibold">Method</label>
                    {['log','sqrt','boxcox','yeojohnson'].map(o => (
                      <label key={o} className="inline-flex items-center mr-4">
                        <input
                          type="radio" name="skew" value={o}
                          checked={skewMethod === o}
                          onChange={() => setSkewMethod(o)}
                          className="accent-red-500"
                        />
                        <span className="ml-2 capitalize">{o}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Columns</label>
                    <div className="flex flex-wrap gap-2">
                      {numCols.map(col => (
                        <button
                          key={col}
                          onClick={() => toggle(skewCols, setSkewCols, col)}
                          className={classNames(
                            'px-3 py-1 rounded-full text-sm',
                            skewCols.includes(col)
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700 text-gray-300'
                          )}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab.key === 'encode' && (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 font-semibold">Method</label>
                    {['label','onehot','ordinal','binary'].map(o => (
                      <label key={o} className="inline-flex items-center mr-4">
                        <input
                          type="radio" name="encode" value={o}
                          checked={encMethod === o}
                          onChange={() => setEncMethod(o)}
                          className="accent-red-500"
                        />
                        <span className="ml-2 capitalize">{o}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Columns</label>
                    <div className="flex flex-wrap gap-2">
                      {catCols.map(col => (
                        <button
                          key={col}
                          onClick={() => toggle(encCols, setEncCols, col)}
                          className={classNames(
                            'px-3 py-1 rounded-full text-sm',
                            encCols.includes(col)
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700 text-gray-300'
                          )}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab.key === 'scale' && (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 font-semibold">Method</label>
                    {['standard','minmax','robust','maxabs'].map(o => (
                      <label key={o} className="inline-flex items-center mr-4">
                        <input
                          type="radio" name="scale" value={o}
                          checked={scaleMethod === o}
                          onChange={() => setScaleMethod(o)}
                          className="accent-red-500"
                        />
                        <span className="ml-2 capitalize">{o}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Columns</label>
                    <div className="flex flex-wrap gap-2">
                      {numCols.map(col => (
                        <button
                          key={col}
                          onClick={() => toggle(scaleCols, setScaleCols, col)}
                          className={classNames(
                            'px-3 py-1 rounded-full text-sm',
                            scaleCols.includes(col)
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700 text-gray-300'
                          )}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab.key === 'balance' && (
                <div className="space-y-4">
                  <p className="text-gray-300">
                    <strong>Before balancing:</strong>{' '}
                    {Object.entries(classDist).map(([c,n]) => `${c}: ${n}`).join(' • ')}
                  </p>
                  <p className="text-gray-400 italic">
                    *Note: balancing runs <em>after</em> encoding.*
                  </p>
                  <div>
                    <label className="block mb-1 font-semibold">Method</label>
                    {['smote','undersample'].map(o => (
                      <label key={o} className="inline-flex items-center mr-4">
                        <input
                          type="radio" name="balance" value={o}
                          checked={balMethod === o}
                          onChange={() => setBalMethod(o)}
                          className="accent-red-500"
                        />
                        <span className="ml-2 capitalize">{o}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tab.key === 'drop' && (
                <div>
                  <label className="block mb-1 font-semibold">Columns to Drop</label>
                  <div className="flex flex-wrap gap-2">
                    {availableCols.map(col => (
                      <button
                        key={col}
                        onClick={() => toggle(dropCols, setDropCols, col)}
                        className={classNames(
                          'px-3 py-1 rounded-full text-sm',
                          dropCols.includes(col)
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-700 text-gray-300'
                        )}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>

      <div className="mt-6">
        <button
          onClick={handleTransform}
          disabled={loading || !canApply()}
          className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Applying…' : 'Apply Transform'}
        </button>
      </div>

      {result && (
        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-2">Preview of Transformed Data</h3>
          <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-800">
                  {Object.keys(result.transformed_preview[0]).map(col => (
                    <th key={col} className="px-3 py-2 text-left text-sm text-gray-300">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.transformed_preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-sm text-gray-200">{String(v)}</td>
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
