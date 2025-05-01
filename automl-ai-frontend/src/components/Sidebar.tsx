import { useStepStore } from '../store/useStepStore';
import { Link } from 'react-router-dom';

const steps = [
  'Upload', 'Clean', 'EDA', 'Transform', 'Train', 'Export'
];

export default function Sidebar() {
  const { currentStep } = useStepStore();

  return (
    <div className="w-48 min-h-screen bg-gray-900 text-white p-4">
      <h2 className="font-bold text-lg mb-6">AutoML-AI</h2>
      <ul className="space-y-3">
        {steps.map((label, idx) => (
          <li key={label}>
            <Link
              to={`/${label.toLowerCase()}`}
              className={`block px-2 py-1 rounded ${idx === currentStep ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}