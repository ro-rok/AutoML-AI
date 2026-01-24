import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// Query keys
export const QUERY_KEYS = {
  session: (sessionId: string) => ['session', sessionId],
  schema: (sessionId: string) => ['schema', sessionId],
  edaSummary: (sessionId: string) => ['eda', 'summary', sessionId],
  trainResults: (sessionId: string) => ['train', 'results', sessionId],
  jobStatus: (jobId: string) => ['job', jobId],
} as const;

// Session state query
export function useSessionState(sessionId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.session(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/session/state?session_id=${sessionId}`);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Schema query
export function useSchema(sessionId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.schema(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/schema?sessionId=${sessionId}`);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// EDA summary query
export function useEDASummary(sessionId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.edaSummary(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/eda/summary?sessionId=${sessionId}`);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Training results query
export function useTrainResults(sessionId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.trainResults(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/train/results?sessionId=${sessionId}`);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Job status query (for polling)
export function useJobStatus(jobId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.jobStatus(jobId || ''),
    queryFn: async () => {
      if (!jobId) return null;
      const response = await api.get(`/jobs/${jobId}`);
      return response.data;
    },
    enabled: !!jobId && enabled,
    refetchInterval: (query) => {
      // Stop polling if job is completed or failed
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    staleTime: 0, // Always fetch fresh data
  });
}

// Upload mutation
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch session and schema queries
      if (data.sessionId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session(data.sessionId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schema(data.sessionId) });
      }
    },
  });
}

// Extend session mutation
export function useExtendSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.post('/session/extend', { sessionId });
      return response.data;
    },
    onSuccess: (_, sessionId) => {
      // Invalidate session query to get updated expiration
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session(sessionId) });
    },
  });
}

// Clear session mutation
export function useClearSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.post('/session/clear', { sessionId });
      return response.data;
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
    },
  });
}
