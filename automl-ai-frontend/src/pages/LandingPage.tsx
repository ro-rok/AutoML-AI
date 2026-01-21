import { useNavigate } from 'react-router-dom';
import CinematicHero from '../components/CinematicHero';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStartPipeline = () => {
    navigate('/upload');
  };

  const handleLoadSample = () => {
    // TODO: Implement sample dataset loading
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <CinematicHero 
        onStartPipeline={handleStartPipeline}
        onLoadSample={handleLoadSample}
      />
    </div>
  );
}
