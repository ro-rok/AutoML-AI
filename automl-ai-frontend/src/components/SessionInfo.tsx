import { useSessionStore } from '../store/useSessionStore';
import { useClearSession } from '../hooks/useQueries';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

/**
 * Component that displays session information including expiration timestamp
 * and provides a clear session button.
 */
export default function SessionInfo() {
  const sessionId = useSessionStore((state) => state.sessionId);
  const expiresAt = useSessionStore((state) => state.expiresAt);
  const resetSession = useSessionStore((state) => state.resetSession);
  
  const clearMutation = useClearSession();
  const navigate = useNavigate();
  
  const handleClear = async () => {
    if (!sessionId) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to clear your session? All pipeline data will be lost.'
    );
    
    if (!confirmed) return;
    
    try {
      await clearMutation.mutateAsync(sessionId);
      
      // Reset local state
      resetSession();
      
      toast.success('Session cleared successfully', {
        style: {
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        },
      });
      
      // Navigate to landing page
      navigate('/');
    } catch (error) {
      toast.error('Failed to clear session. Please try again.', {
        style: {
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        },
      });
    }
  };
  
  if (!sessionId || !expiresAt) {
    return null;
  }
  
  const formatExpiration = () => {
    const date = new Date(expiresAt);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="flex items-center gap-4 text-xs text-text-tertiary">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Expires: {formatExpiration()}</span>
      </div>
      
      <button
        onClick={handleClear}
        disabled={clearMutation.isPending}
        className="text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Clear session and start over"
      >
        {clearMutation.isPending ? 'Clearing...' : 'Clear Session'}
      </button>
    </div>
  );
}
