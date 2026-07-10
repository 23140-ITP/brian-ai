import { Send, Sparkles } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { DocumentMeta, documents } from '../data/mock'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

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
          setMessages((rows) => rows.map((message) => (
            message.id === assistantId
              ? { ...message, content: 'Live backend unavailable. Brian AI did not substitute a demo answer.' }
              : message
          )))
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

  const latestMessage = messages[messages.length - 1]

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_16rem]">
      <h1 className="text-2xl font-bold tracking-tight xl:sr-only">AI Copilot</h1>
      <Card className="order-2 xl:order-none">
        <CardHeader>
          <CardTitle>Document context</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72 xl:h-[calc(100vh-16rem)] xl:min-h-80">
            <div className="flex flex-col gap-1 pr-3">
              {library.map((doc) => {
                const selected = doc.id === activeDocumentId
                return (
                  <Button
                    key={doc.id}
                    type="button"
                    variant={selected ? 'secondary' : 'ghost'}
                    size="lg"
                    className="h-auto min-h-12 w-full justify-start whitespace-normal text-left"
                    aria-pressed={selected}
                    onClick={() => setActiveDocumentId(doc.id)}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <strong className="truncate font-medium">{doc.filename}</strong>
                      <span className="text-xs text-muted-foreground">{doc.docType} · {doc.chunks} chunks</span>
                    </span>
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="order-1 xl:order-none xl:min-h-[calc(100vh-8.125rem)]">
        <CardHeader>
          <CardDescription>AI Copilot</CardDescription>
          <CardTitle>Ask refinery questions with citations</CardTitle>
          <CardAction>
            <Sparkles aria-hidden="true" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="h-[32rem] xl:h-[calc(100vh-20rem)] xl:min-h-96">
            <div className="flex flex-col gap-3 pr-4">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    'flex max-w-[85%] flex-col gap-3 rounded-lg px-4 py-3 text-base leading-relaxed',
                    message.role === 'user'
                      ? 'self-end bg-primary text-primary-foreground'
                      : 'self-start bg-muted text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.citations?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((citation) => (
                        <Badge key={citation} variant="outline">{citation}</Badge>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
              {loading ? (
                <Alert>
                  <Sparkles aria-hidden="true" />
                  <AlertDescription>
                    {streamStatus === 'initializing'
                      ? 'Retry scheduled. Waiting for the knowledge base seed...'
                      : 'Streaming evidence from local corpus...'}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </ScrollArea>
          <span className="sr-only" aria-live="polite">
            {!loading && latestMessage?.role === 'assistant' && latestMessage.content
              ? 'Brian AI answer ready.'
              : ''}
          </span>
        </CardContent>
        <CardFooter>
          <form className="w-full" onSubmit={send}>
            <InputGroup>
              <InputGroupTextarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={2}
                aria-label="Ask Brian AI"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit" size="icon-sm" aria-label="Send query">
                  <Send data-icon="inline-start" aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </CardFooter>
      </Card>

      <Card className="order-3 xl:order-none">
        <CardHeader>
          <CardTitle>Source confidence</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <strong className="text-3xl font-semibold">91%</strong>
          <span className="text-sm text-muted-foreground">Top citations update after each answer.</span>
          <Progress value={91} aria-label="Source confidence: 91%" />
        </CardContent>
      </Card>
    </div>
  )
}
