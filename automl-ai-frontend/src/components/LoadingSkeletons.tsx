import { motion } from 'framer-motion';

// Base skeleton component
export function Skeleton({ 
  className = '', 
  animate = true,
  style 
}: { 
  className?: string; 
  animate?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div 
      className={`${animate ? 'skeleton' : 'bg-bg-surface'} ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto bg-bg-surface rounded-lg border border-border-default">
      <table className="min-w-full">
        <thead>
          <tr className="bg-bg-elevated">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-elevated'}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Card skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </>
  );
}

// Graph skeleton
export function GraphSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`bg-bg-surface rounded-lg border border-border-default p-6 ${height}`}>
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex items-end justify-between h-full gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Metrics skeleton
export function MetricsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-surface border border-border-default rounded-lg p-4">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// List skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-bg-surface rounded-lg border border-border-default">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Spinner component
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`} role="status" aria-label="Loading">
      <svg
        className="animate-spin text-accent-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// Progress bar component
export function ProgressBar({ 
  progress, 
  label, 
  showPercentage = true,
  className = '' 
}: { 
  progress: number; 
  label?: string; 
  showPercentage?: boolean;
  className?: string;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-text-secondary">{label}</span>}
          {showPercentage && <span className="text-sm text-text-tertiary">{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-accent-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon?: React.ComponentType<{ className?: string }>; 
  title: string; 
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-text-tertiary" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-text-secondary mb-6 max-w-md">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Loading overlay
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-bg-surface border border-border-default rounded-lg p-6 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-text-secondary">{message}</p>
      </div>
    </div>
  );
}
