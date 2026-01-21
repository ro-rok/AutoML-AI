import { create } from 'zustand';

export type StructuredChunk = {
  type: 'heading' | 'bullet' | 'paragraph' | 'code';
  text: string;
};

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string | StructuredChunk[];
  timestamp: Date;
  quickActions?: QuickAction[];
};

export type QuickAction = {
  label: string;
  action: () => void;
  icon?: string;
};

interface AssistantState {
  // Messages
  messages: AssistantMessage[];
  addMessage: (message: Omit<AssistantMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string | StructuredChunk[]) => void;
  clearMessages: () => void;
  
  // Streaming state
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  
  // Panel state
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  togglePanel: () => void;
  
  // Abort controller for canceling requests
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [],
  isStreaming: false,
  isOpen: false,
  abortController: null,
  
  addMessage: (message) => {
    const newMessage: AssistantMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },
  
  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    });
  },
  
  clearMessages: () => set({ messages: [] }),
  
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  
  setIsOpen: (open) => set({ isOpen: open }),
  
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  
  setAbortController: (controller) => set({ abortController: controller }),
}));
