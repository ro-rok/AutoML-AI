import { useState, useRef, useEffect } from 'react'
import { FiMessageSquare as ChatIcon, FiX as XIcon } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useClickAway } from 'react-use'
import { useSessionStore } from '../store/useSessionStore'
import gsap from 'gsap'
import { useStepStore } from '../store/useStepStore'

interface Message { role: 'user' | 'assistant'; content: string | StructuredChunk[];}


interface StructuredChunk {
    type: 'heading' | 'bullet' | 'paragraph' | 'code';
    text: string;
  }
  
  function formatResponseChunks(raw: string): StructuredChunk[] {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const chunks: StructuredChunk[] = [];
  
    for (let line of lines) {
        if (/^\*\*(.+?)\*\*/.test(line)) {
            chunks.push({ type: 'heading', text: line.replace(/\*\*/g, '') });
          } else if (/^[-•*]\s/.test(line)) {
            chunks.push({ type: 'bullet', text: line.replace(/^[-•*]\s/, '').replace(/\*\*/g, '') });
          } else if (/^`/.test(line)) {
            chunks.push({ type: 'code', text: line.replace(/`/g, '') });
          } else {
            chunks.push({ type: 'paragraph', text: line.replace(/\*\*/g, '') });
          }       
    }
  
    return chunks;
  }

  export default function ChatAssistant() {
    const { sessionId } = useSessionStore();
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [streaming, setStreaming] = useState(false);
    const panel = useRef<HTMLDivElement>(null);
    const messageEndRef = useRef<HTMLDivElement>(null);
    useClickAway(panel, () => setOpen(false));
  
    useEffect(() => {
      setMsgs([{
        role: 'assistant',
        content: [
          { type: 'heading', text: '👋 Hi! I\'m your ML pipeline assistant.' },
          { type: 'bullet', text: 'I know your EDA, cleaning & transform steps.' },
          { type: 'bullet', text: 'Ask “How to handle missing values?”' },
          { type: 'bullet', text: 'Try “Model suggestions?” or “Tuning tips for RandomForest?”' },
          { type: 'paragraph', text: 'Type below to get started.' }
        ]
      }]);
    }, []);
  
    useEffect(() => {
      if (messageEndRef.current) {
        gsap.to(messageEndRef.current, {
          scrollTop: messageEndRef.current.scrollHeight,
          duration: 0.4
        });
      }
    }, [msgs]);

  function animateIn(target: string) {
    gsap.from(target, { opacity: 0, duration: 0.5 });
  }

  const currentStep = useStepStore(state => state.currentStep)
  const page = ['upload', 'clean', 'eda', 'transform', 'train', 'export'][currentStep]

  const send = async () => {
    if (!draft.trim() || streaming) return
    const question = draft.trim()
    setMsgs(m => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }])
    setDraft('')
    setStreaming(true)

    try {
      console.log('stepKey', page)
      const resp = await fetch('http://localhost:8000/groq/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question, page })
      })

      if (!resp.ok || !resp.body) throw new Error('Unable to stream response. Check server.')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          fullText += decoder.decode(value, { stream: true })
          const formattedChunks = formatResponseChunks(fullText)
          setMsgs(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { role: 'assistant', content: formattedChunks }
            return copy
          })
        }
      }

      animateIn('.assistant-msg:last-child')
    } catch (err) {
      console.error('Streaming error:', err)
      setMsgs(m => [...m, { role: 'assistant', content: '⚠️ Something went wrong.' }])
    } finally {
      setStreaming(false)
    }
  }

  const renderContent = (content: string | StructuredChunk[]) => {
    if (typeof content === 'string') {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }

    return content.map((chunk, i) => {
      switch (chunk.type) {
        case 'heading':
          return <h3 key={i} className="text-sm font-bold mb-1 text-blue-300">{chunk.text}</h3>;
        case 'bullet':
          return <li key={i} className="ml-4 list-disc text-gray-200">{chunk.text}</li>;
        case 'code':
          return <pre key={i} className="bg-gray-800 text-sm text-green-300 p-2 rounded mt-1 mb-1 overflow-auto">{chunk.text}</pre>;
        case 'paragraph':
        default:
          return <p key={i} className="text-gray-300 text-sm mb-1">{chunk.text}</p>;
      }
    });
  };

  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 bg-gray-800 p-3 rounded-full text-white shadow-lg"
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
            className="fixed bottom-20 right-6 z-40 w-80 sm:w-96 h-[70vh] flex flex-col bg-gray-900 rounded-lg shadow-xl"
          >
            <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
              <h2 className="text-white font-semibold">Assistant</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div ref={messageEndRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-gray-100 text-sm">
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] whitespace-pre-wrap px-3 py-2 rounded-lg ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-800 text-gray-100 rounded-bl-none'
                  }`}>
                    <div>{renderContent(m.content)}</div>
                  </div>
                </motion.div>
              ))}
              {streaming && <p className="text-gray-400 text-xs">⏳ Generating...</p>}
            </div>

            <div className="bg-gray-800 p-3 flex items-center gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={streaming ? '…' : 'Ask me…'}
                disabled={streaming}
                className="flex-1 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-full px-4 py-2"
              />
              <button
                onClick={send}
                disabled={streaming}
                className="text-blue-400 hover:text-blue-200 disabled:opacity-50"
              >➤</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}