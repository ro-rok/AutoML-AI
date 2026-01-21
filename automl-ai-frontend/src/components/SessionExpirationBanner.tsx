import { useEffect, useState } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { useExtendSession, useClearSession } from '../hooks/useQueries';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

/**
 * Banner component that displays session expiration warnings and provides
 * actions to extend or clear the session.
 */
export default function SessionExpirationBanner() {
  const sessionId = useSessionStore((state) => state.sessionId);
  const expiresAt = useSessionStore((state) => state.expiresAt);
  const setExpiresAt = useSessionStore((state) => state.setExpiresAt);
  const resetSession = useSessionStore((state) => state.resetSession);
  
  const [showWarning, setShowWarning] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);
  
  const extendMutation = useExtendSession();
  const clearMutation = useClearSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!expiresAt) {
      setShowWarning(false);
      return;
    }
    
    const checkExpiration = () => {
      const now = new Date();
      const expirationDate = new Date(expiresAt);
      const hoursUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      setHoursRemaining(Math.max(0, hoursUntilExpiration));
      
      // Show warning if less than 24 hours remaining
      if (hoursUntilExpiration > 0 && hoursUntilExpiration < 24) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };
    
    // Check immediately on mount
    checkExpiration();
    
    // Check every 5 minutes
    const interval = setInterval(checkExpiration, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  const handleExtend = async () => {
    if (!sessionId) return;
    
    try {
      const result = await extendMutation.mutateAsync(sessionId);
      
      if (result.expires_at) {
        setExpiresAt(new Date(result.expires_at));
      }
      
      toast.success('Session extended by 7 days', {
        style: {
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        },
      });
      
      setShowWarning(false);
    } catch (error) {
      toast.error('Failed to extend session. Please try again.', {
        style: {
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        },
      });
    }
  };
  
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
  
  if (!showWarning || !sessionId) {
    return null;
  }
  
  const formatTimeRemaining = () => {
    if (hoursRemaining < 1) {
      const minutes = Math.floor(hoursRemaining * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(hoursRemaining);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };
  
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-color-warning/10 border-b border-color-warning/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-color-warning flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Session Expiring Soon
              </p>
              <p className="text-xs text-text-secondary">
                Your session will expire in {formatTimeRemaining()}. Extend it to keep your work.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExtend}
              disabled={extendMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-text-primary bg-accent-primary hover:bg-accent-primary-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {extendMutation.isPending ? 'Extending...' : 'Extend Session'}
            </button>
            
            <button
              onClick={handleClear}
              disabled={clearMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearMutation.isPending ? 'Clearing...' : 'Clear Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
