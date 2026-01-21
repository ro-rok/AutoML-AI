import { useEffect, useRef } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { usePipelineStore, PipelineStep, StepStatus } from '../store/useStepStore';
import { useSessionState } from './useQueries';

/**
 * Hook to restore session state from backend on app initialization.
 * Loads session state if a sessionId exists in localStorage.
 */
export function useSessionRestoration() {
  const sessionId = useSessionStore((state) => state.sessionId);
  const setFileMetadata = useSessionStore((state) => state.setFileMetadata);
  const setSchema = useSessionStore((state) => state.setSchema);
  const setTargetColumn = useSessionStore((state) => state.setTargetColumn);
  const setExpiresAt = useSessionStore((state) => state.setExpiresAt);
  const setCreatedAt = useSessionStore((state) => state.setCreatedAt);
  const setDatasetState = useSessionStore((state) => state.setDatasetState);
  
  const setCurrentStep = usePipelineStore((state) => state.setCurrentStep);
  const setStepStatus = usePipelineStore((state) => state.setStepStatus);
  const setStepValidations = usePipelineStore((state) => state.setStepValidations);
  const setStepSuggestions = usePipelineStore((state) => state.setStepSuggestions);
  
  const hasRestored = useRef(false);
  
  const { data: sessionState, isSuccess, isError } = useSessionState(sessionId);
  
  useEffect(() => {
    // Only restore once
    if (hasRestored.current || !isSuccess || !sessionState) {
      return;
    }
    
    hasRestored.current = true;
    
    // Restore session metadata
    if (sessionState.created_at) {
      setCreatedAt(new Date(sessionState.created_at));
    }
    
    if (sessionState.expires_at) {
      setExpiresAt(new Date(sessionState.expires_at));
    }
    
    // Restore dataset information
    if (sessionState.dataset) {
      setFileMetadata(
        sessionState.dataset.filename || '',
        0 // file_size not included in state response
      );
      
      if (sessionState.dataset.schema) {
        setSchema(sessionState.dataset.schema);
      }
      
      if (sessionState.dataset.target_column) {
        setTargetColumn(sessionState.dataset.target_column);
      }
      
      // Restore dataset state
      setDatasetState({
        originalRowCount: sessionState.dataset.row_count || 0,
        currentRowCount: sessionState.dataset.row_count || 0,
        originalColumnCount: sessionState.dataset.column_count || 0,
        currentColumnCount: sessionState.dataset.column_count || 0,
        cleaningOperations: [],
        transformOperations: [],
      });
    }
    
    // Restore pipeline progress
    if (sessionState.current_step) {
      setCurrentStep(sessionState.current_step as PipelineStep);
    }
    
    // Restore step states
    if (sessionState.steps) {
      Object.entries(sessionState.steps).forEach(([stepName, stepState]: [string, any]) => {
        setStepStatus(stepName as PipelineStep, stepState.status as StepStatus);
        
        if (stepState.validations && stepState.validations.length > 0) {
          setStepValidations(stepName as PipelineStep, stepState.validations);
        }
        
        if (stepState.ai_suggestions && stepState.ai_suggestions.length > 0) {
          setStepSuggestions(stepName as PipelineStep, stepState.ai_suggestions);
        }
      });
    }
    
    console.log('Session restored successfully:', sessionId);
  }, [
    isSuccess,
    sessionState,
    sessionId,
    setFileMetadata,
    setSchema,
    setTargetColumn,
    setExpiresAt,
    setCreatedAt,
    setDatasetState,
    setCurrentStep,
    setStepStatus,
    setStepValidations,
    setStepSuggestions,
  ]);
  
  return {
    isRestoring: !hasRestored.current && !!sessionId,
    isRestored: hasRestored.current,
    isError,
  };
}
