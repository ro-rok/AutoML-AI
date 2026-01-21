import { useEffect, useRef } from 'react';

/**
 * Hook to automatically cleanup GSAP animations on component unmount
 * Returns a ref to store GSAP contexts/timelines for cleanup
 */
export function useGSAPCleanup() {
  const contextsRef = useRef<any[]>([]);
  const timelinesRef = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      // Kill all contexts
      contextsRef.current.forEach(ctx => ctx.revert());
      contextsRef.current = [];

      // Kill all timelines
      timelinesRef.current.forEach(tl => tl.kill());
      timelinesRef.current = [];
    };
  }, []);

  const addContext = (ctx: any) => {
    contextsRef.current.push(ctx);
  };

  const addTimeline = (tl: any) => {
    timelinesRef.current.push(tl);
  };

  return { addContext, addTimeline };
}
