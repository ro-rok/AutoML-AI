import { useState, useRef, useEffect } from 'react'
import { FiMessageSquare as ChatIcon, FiX as XIcon, FiStopCircle } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useClickAway } from 'react-use'
import { useSessionStore } from '../store/useSessionStore'
import { useAssistantStore, type StructuredChunk } from '../store/useAssistantStore'
import gsap from 'gsap'
import { useStepStore } from '../store/useStepStore'
import backgroundImage from '../assets/AI-Robot.webp'

function formatResponseChunks(raw: string): StructuredChunk[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const chunks: StructuredChunk[] = []

  for (let line of lines) {
    if (/^\*\*(.+?)\*\*/.test(line)) {
      chunks.push({ type: 'heading', text: line.replace(/\*\*/g, '') })
    } else if (/^[-•*]\s/.test(line)) {
      chunks.push({ type: 'bullet', text: line.replace(/^[-•*]\s/, '').replace(/\*\*/g, '') })
    } else if (/^`/.test(line)) {
      chunks.push({ type: 'code', text: line.replace(/`/g, '') })
    } else {
      chunks.push({ type: 'paragraph', text: line.replace(/\*\*/g, '') })
    }
  }

  return chunks
}

export default function ChatAssistant() {
  const { sessionId } = useSessionStore()
  const { messages, addMessage, updateLastMessage, isStreaming, setIsStreaming } = useAssistantStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const panel = useRef<HTMLDivElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const { currentStep } = useStepStore() as any
  const abortControllerRef = useRef<AbortController | null>(null)

  useClickAway(panel, () => setOpen(false))

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        role: 'assistant',
        content: [
          { type: 'heading', text: '👋 Hi! I\'m your ML pipeline assistant.' },
          { type: 'bullet', text: 'I know your EDA, cleaning & transform steps.' },
          { type: 'bullet', text: 'Ask "How to handle missing values?"' },
          { type: 'bullet', text: 'Try "Model suggestions?" or "Tuning tips for RandomForest?"' },
          { type: 'paragraph', text: 'Type below to get started.' }
        ]
      })
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (messageEndRef.current) {
      gsap.to(messageEndRef.current, {
        scrollTop: messageEndRef.current.scrollHeight,
        duration: 0.4
      })
    }
  }, [messages])

  const stepNames = ['upload', 'eda', 'clean', 'transform', 'train', 'results', 'export']
  const currentStepName = stepNames[currentStep] || 'upload'

  const send = async () => {
    if (!draft.trim() || isStreaming) return
    
    const question = draft.trim()
    addMessage({ role: 'user', content: question })
    addMessage({ role: 'assistant', content: '' })
    setDraft('')
    setIsStreaming(true)

    // Create abort controller
    abortControllerRef.current = new AbortController()

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE}/groq/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          prompt: question,
          context: { currentStep: currentStepName }
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                // Finalize message
                const chunks = formatResponseChunks(buffer)
                updateLastMessage(chunks)
                break
              } else if (data) {
                buffer += data
                updateLastMessage(buffer)
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updateLastMessage('⚠️ Request cancelled.')
      } else {
        console.error('Error fetching answer', err)
        updateLastMessage('⚠️ Something went wrong.')
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const renderContent = (content: string | StructuredChunk[]) => {
    if (typeof content === 'string') {
      return <p className="whitespace-pre-wrap">{content}</p>
    }

    return content.map((chunk, i) => {
      switch (chunk.type) {
        case 'heading':
          return <h3 key={i} className="text-sm font-bold mb-1 text-red-400">{chunk.text}</h3>
        case 'bullet':
          return <li key={i} className="ml-4 list-disc text-red-200">{chunk.text}</li>
        case 'code':
          return <pre key={i} className="bg-black/70 text-sm text-red-300 p-2 rounded mt-1 mb-1 overflow-auto border border-red-800">{chunk.text}</pre>
        case 'paragraph':
        default:
          return <p key={i} className="text-gray-200 text-sm mb-1">{chunk.text}</p>
      }
    })
  }

  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 bg-red-900 p-3 rounded-full text-white shadow-lg hover:bg-red-800 transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-label="Chat assistant"
      >
        {open ? <XIcon className="w-6 h-6" /> : <ChatIcon className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="fixed bottom-20 right-6 z-40 w-80 sm:w-96 h-[70vh] bg-black flex flex-col rounded-lg shadow-xl border border-gray-800"
          >
            <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
              <h2 className="text-white font-semibold">AI Assistant</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div ref={messageEndRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-gray-100 text-sm">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] whitespace-pre-wrap px-3 py-2 rounded-lg backdrop-blur-sm ${
                    m.role === 'user'
                      ? 'bg-red-700 text-white rounded-br-none'
                      : 'bg-black/60 text-gray-100 border border-red-900/40 rounded-bl-none'
                  }`}>
                    <div>{renderContent(m.content)}</div>
                  </div>
                </motion.div>
              ))}
              {isStreaming && (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-3 flex items-center gap-2 rounded-b-lg">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder={isStreaming ? '…' : 'Ask me…'}
                disabled={isStreaming}
                className="flex-1 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {isStreaming ? (
                <button
                  onClick={abort}
                  className="text-red-400 hover:text-red-200 p-2"
                  aria-label="Stop generation"
                >
                  <FiStopCircle className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!draft.trim()}
                  className="text-blue-400 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ➤
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
