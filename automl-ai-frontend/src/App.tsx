// src/App.tsx
import { Suspense, lazy, useRef, useEffect, useCallback } from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { toast } from "react-hot-toast"
import { api } from "./api/client"
import { Analytics } from "@vercel/analytics/react"
import { PAGE_TRANSITION } from "./utils/motionConstants"
import { useSessionRestoration } from "./hooks/useSessionRestoration"
import { useLenis } from "./hooks/useLenis"

import Header from "./components/Header"
import Footer from "./components/Footer"
import ChatAssistant from "./components/ChatAssistant"
import PipelineSpine from "./components/PipelineSpine"
import SessionExpirationBanner from "./components/SessionExpirationBanner"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { ToastContainer } from "./components/ErrorToast"
import { useToastStore } from "./store/useToastStore"

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const EDAPage = lazy(() => import('./pages/EDAPage'));
const CleanPage = lazy(() => import('./pages/CleanPage'));
const TransformPage = lazy(() => import('./pages/TransformPage'));
const TrainPage = lazy(() => import('./pages/TrainPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const ExportPage = lazy(() => import('./pages/ExportPage'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="skeleton w-32 h-32 rounded-full" />
    </div>
  );
}

// Animated routes wrapper
function AnimatedRoutes() {
  const location = useLocation();
  
  // Restore session state on app initialization
  const { isRestoring } = useSessionRestoration();
  
  // Show loading while restoring session
  if (isRestoring) {
    return <LoadingFallback />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={PAGE_TRANSITION}
        className="flex-1"
      >
        <Suspense fallback={<LoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/eda" element={<EDAPage />} />
            <Route path="/clean" element={<CleanPage />} />
            <Route path="/transform" element={<TransformPage />} />
            <Route path="/train" element={<TrainPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  // Initialize Lenis smooth scrolling
  useLenis();

  // Get toasts from store
  const { toasts, dismissToast } = useToastStore();

  const PING_INTERVAL = 25 * 60 * 1000;
  const PING_TIMEOUT = 15 * 1000;
  const PING_THRESHOLD = 500; 

  // refs so we can skip re-renders
  const lastPingTime = useRef(0);
  const pinging = useRef(false);

  const pingBackend = useCallback(() => {
    if (pinging.current) return;

    const now = Date.now();
    if (now - lastPingTime.current < PING_INTERVAL) return;

    pinging.current = true;
    let toastId: string | undefined;
    let timeoutId: number | undefined;
    let thresholdId: number | undefined;
    let gaveUp = false;

    const showLoading = () => {
      toastId = toast.loading(
        <div className="flex items-center">
          <span>
            Waking up backend   
            <span className="animate-pulse text-blue-400"> ...</span>
            <br />
            <span className="text-sm text-gray-400">This may take a few seconds.</span>
          </span>
        </div>,
        { style: { background: "#18181b", color: "#fff", fontSize: "1rem", minWidth: "260px" } }
      );
      // After PING_TIMEOUT, show error and stop retrying
      timeoutId = setTimeout(() => {
        gaveUp = true;
        if (toastId) {
          toast.dismiss(toastId);
        }
        toast.error(
          <div className="flex items-center gap-2">
            <span>
              Backend is taking longer than expected. <br/> Thank you for your patience.<br />
              <span className="text-sm text-gray-400">Please try again later.</span>
            </span>
          </div>,
          { style: { background: "#18181b", color: "#fff", fontSize: "1rem", minWidth: "260px" } }
        );
        pinging.current = false;
      }, PING_TIMEOUT);
    };

    const tryPing = () => {
      if (gaveUp) return;
      api.get('/ping')
        .then(() => {
          clearTimeout(thresholdId);
          if (timeoutId) clearTimeout(timeoutId);
          if (toastId) {
            toast.dismiss(toastId);
            toast.success(
              <div className="flex items-center gap-2">
                <span>
                  Backend is awake! 
                  <br />
                  <span className="text-sm text-gray-400">You can now use the app. Sorry for the wait.</span>
                </span>
              </div>,
              { style: { background: "#18181b", color: "#fff", fontSize: "1rem", minWidth: "220px" } }
            );
          }
          lastPingTime.current = Date.now();
          pinging.current = false;
        })
        .catch(() => {
          if (!gaveUp) {
            setTimeout(tryPing, 750);
          }
        });
    };

    thresholdId = setTimeout(showLoading, PING_THRESHOLD);
    tryPing();
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        pingBackend();
      }
    };
    ['mousemove','mousedown','touchstart','visibilitychange']
      .forEach(e => window.addEventListener(e, handler));
    return () => {
      ['mousemove','mousedown','touchstart','visibilitychange']
        .forEach(e => window.removeEventListener(e, handler));
    };
  }, [pingBackend]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="relative flex flex-col bg-bg-base text-text-primary min-h-screen">
            {/* Fixed header */}
            <Header onLogoClick={() => {}} />

            {/* Session expiration banner */}
            <SessionExpirationBanner />

            {/* Pipeline Spine */}
            <PipelineSpine />

            {/* Main content with animated routes */}
            <div className="flex-1 pt-16 lg:pl-24">
              <AnimatedRoutes />
            </div>

            {/* Footer */}
            <Footer />

            {/* Chat Assistant */}
            <ChatAssistant />

            {/* Custom Toast Container */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* React Hot Toast (for backend ping notifications) */}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 5000,
                style: {
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: 'var(--color-success)',
                    secondary: 'var(--text-primary)',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: 'var(--color-error)',
                    secondary: 'var(--text-primary)',
                  },
                },
              }}
            />
          </div>
          <Analytics />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
