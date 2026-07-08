import { Send, Sparkles } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { DocumentMeta, documents } from '../data/mock'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  confidence?: number
}

export function CopilotPage() {
  const { model, activeDocumentId, copilotDraftQuery, setActiveDocumentId, setCopilotDraftQuery } = useAppStore()
  const [query, setQuery] = useState('What caused the P-204B seal failure?')
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'Ask about equipment, compliance gaps, work orders, or procedures. Brian AI will answer with document citations.' }
  ])
  const [library, setLibrary] = useState<DocumentMeta[]>(documents)
  const [loading, setLoading] = useState(false)
  const [streamStatus, setStreamStatus] = useState<'idle' | 'streaming' | 'initializing'>('idle')
  const retryTimer = useRef<number | null>(null)

  useEffect(() => {
    api.documents().then(setLibrary)
  }, [])

  useEffect(() => {
    if (!copilotDraftQuery) return
    setQuery(copilotDraftQuery)
    setCopilotDraftQuery('')
  }, [copilotDraftQuery, setCopilotDraftQuery])

  useEffect(() => () => {
    if (retryTimer.current) window.clearTimeout(retryTimer.current)
  }, [])

  const runQuery = async (clean: string, retrying = false) => {
    if (!clean || (loading && !retrying)) return
    const selectedDocument = library.find((doc) => doc.id === activeDocumentId)
    const scopedQuery = selectedDocument ? `${clean}\nContext document: ${selectedDocument.filename}` : clean
    const assistantId = `assistant-${Date.now()}`
    setMessages((rows) => [
      ...rows,
      ...(retrying ? [] : [{ id: `user-${Date.now()}`, role: 'user' as const, content: clean }]),
      { id: assistantId, role: 'assistant' as const, content: '' }
    ])
    setQuery('')
    setLoading(true)
    setStreamStatus('streaming')
    await api.askStream(
      scopedQuery,
      model,
      (token) => {
        setMessages((rows) => rows.map((message) => (
          message.id === assistantId ? { ...message, content: `${message.content}${token}` } : message
        )))
      },
      ({ citations, confidence }) => {
        setMessages((rows) => rows.map((message) => (
          message.id === assistantId ? { ...message, citations, confidence } : message
        )))
        setLoading(false)
        setStreamStatus('idle')
      },
      (error) => {
        if (error !== 'ERR_EMPTY_KB') {
          setLoading(false)
          setStreamStatus('idle')
          return
        }
        setStreamStatus('initializing')
        setMessages((rows) => rows.map((message) => (
          message.id === assistantId
            ? {
                ...message,
                content: 'Knowledge base is initializing - this takes about 30 seconds on first load. Brian AI will retry this question automatically.'
              }
            : message
        )))
        if (retryTimer.current) window.clearTimeout(retryTimer.current)
        retryTimer.current = window.setTimeout(() => {
          setLoading(false)
          setStreamStatus('idle')
          runQuery(clean, true)
        }, 30_000)
      }
    )
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    await runQuery(query.trim())
  }

  return (
    <div className="page copilot-layout">
      <aside className="document-tree panel">
        <p>Document context</p>
        {library.map((doc) => (
          <button key={doc.id} className={doc.id === activeDocumentId ? 'selected' : ''} type="button" onClick={() => setActiveDocumentId(doc.id)}>
            <strong>{doc.filename}</strong>
            <span>{doc.docType} · {doc.chunks} chunks</span>
          </button>
        ))}
      </aside>
      <section className="chat-panel panel">
        <header className="panel-header">
          <div>
            <p>AI Copilot</p>
            <h1>Ask refinery questions with citations</h1>
          </div>
          <Sparkles size={22} />
        </header>
        <div className="messages">
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <p>{message.content}</p>
              {message.citations && (
                <div className="citation-strip">
                  {message.citations.map((citation) => <span key={citation}>{citation}</span>)}
                </div>
              )}
            </article>
          ))}
          {loading && (
            <article className="message assistant pulse">
              <p>{streamStatus === 'initializing' ? 'Retry scheduled. Waiting for the knowledge base seed...' : 'Streaming evidence from local corpus...'}</p>
            </article>
          )}
        </div>
        <form className="chat-input" onSubmit={send}>
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={2} aria-label="Ask Brian AI" />
          <button type="submit" aria-label="Send query"><Send size={18} /></button>
        </form>
      </section>
      <aside className="source-panel panel">
        <p>Source confidence</p>
        <strong>91%</strong>
        <span>Top citations update after each answer.</span>
        <div className="confidence-bar"><i style={{ width: '91%' }} /></div>
      </aside>
    </div>
  )
}
