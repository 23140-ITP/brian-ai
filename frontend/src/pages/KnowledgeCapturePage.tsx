import { ArrowLeft, ArrowRight, CheckCircle2, FileText, LoaderCircle, Send, Sparkles, TriangleAlert } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'

export function KnowledgeCapturePage() {
  const workspace = useAppStore((state) => state.workspace)
  const demo = workspace === 'demo'
  const [step, setStep] = useState(0)
  const [expert, setExpert] = useState(demo ? 'A. Rao' : '')
  const [topic, setTopic] = useState(demo ? 'P-204B pump failures' : '')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [submitted, setSubmitted] = useState<{ doc_id: string; linked_entities: string[] } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const submissionInFlight = useRef(false)
  const sessionId = useRef(`capture-${crypto.randomUUID()}`)

  useEffect(() => {
    api.captureQuestions().then((rows) => {
      setQuestions(rows)
      setAnswers(Array(rows.length).fill(''))
    })
  }, [workspace])

  const reviewStep = questions.length + 1

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (step === 0) {
      setStep(1)
      return
    }
    if (step <= questions.length) {
      setStep(step + 1)
      return
    }
    if (submissionInFlight.current) return
    submissionInFlight.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await api.captureExpertKnowledge({
        session_id: sessionId.current,
        expert_name: expert,
        topic,
        answers: questions.map((question, index) => ({ question, answer: answers[index] || '' }))
      })
      setSubmitted({ doc_id: result.doc_id, linked_entities: result.linked_entities })
    } catch {
      setSubmitError('Brian AI could not ingest this interview. Review the answers and try again.')
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>
              <h1>Expert knowledge ingested</h1>
            </CardTitle>
            <CardDescription>Brian AI created {submitted.doc_id} and linked it to {submitted.linked_entities.join(', ')}.</CardDescription>
            <CardAction>
              <Badge variant="secondary">
                <CheckCircle2 data-icon="inline-start" />
                Complete
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-medium">Linked entities</p>
            <div className="flex flex-wrap gap-2">
              {submitted.linked_entities.map((entity) => (
                <Badge key={entity} variant="outline">{entity}</Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to="/documents">
                <FileText data-icon="inline-start" />
                Open Documents
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Expert Knowledge Capture</h1>
        <p className="text-sm text-muted-foreground">{demo ? 'Try the complete interview workflow with a simulated Demo result.' : 'Preserve knowledge before it walks out the door.'}</p>
      </header>

      <form className="w-full max-w-3xl" onSubmit={submit}>
        <Card>
          {step === 0 ? (
            <>
              <CardHeader>
                <CardTitle>
                  <h2>Interview setup</h2>
                </CardTitle>
                <CardDescription>Identify the expert and the equipment or process area to document.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="expert-name">Expert Name</FieldLabel>
                    <Input
                      id="expert-name"
                      aria-label="Expert name"
                      value={expert}
                      onChange={(event) => setExpert(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="expert-topic">Topic / Equipment Area</FieldLabel>
                    <Input
                      id="expert-topic"
                      aria-label="Topic or equipment area"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit">
                  <Sparkles data-icon="inline-start" />
                  Begin Interview
                </Button>
              </CardFooter>
            </>
          ) : step <= questions.length && questions.length > 0 ? (
            <>
              <CardHeader>
                <CardDescription>Question {step} of {questions.length}</CardDescription>
                <CardTitle>
                  <h2>{questions[step - 1]}</h2>
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">{step} / {questions.length}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`capture-answer-${step}`}>Your answer</FieldLabel>
                    <Textarea
                      id={`capture-answer-${step}`}
                      aria-label={`Answer for: ${questions[step - 1]}`}
                      rows={7}
                      value={answers[step - 1]}
                      onChange={(event) => {
                        const next = [...answers]
                        next[step - 1] = event.target.value
                        setAnswers(next)
                      }}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(Math.max(0, step - 1))}>
                  <ArrowLeft data-icon="inline-start" />
                  Previous
                </Button>
                <Button type="submit">
                  {step === questions.length ? 'Review Answers' : 'Next Question'}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </>
          ) : step === reviewStep && questions.length > 0 ? (
            <>
              <CardHeader>
                <CardDescription>Review</CardDescription>
                <CardTitle>
                  <h2>Review captured expertise before ingest</h2>
                </CardTitle>
                <CardAction><Badge variant="outline">{questions.length} answers</Badge></CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card size="sm">
                    <CardHeader>
                      <CardDescription>Expert</CardDescription>
                      <CardTitle><h3>{expert}</h3></CardTitle>
                    </CardHeader>
                  </Card>
                  <Card size="sm">
                    <CardHeader>
                      <CardDescription>Topic</CardDescription>
                      <CardTitle><h3>{topic}</h3></CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                <div className="flex flex-col gap-3">
                  {questions.map((question, index) => (
                    <Card key={question} size="sm">
                      <CardHeader>
                        <CardDescription>Question {index + 1}</CardDescription>
                        <CardTitle><h3>{question}</h3></CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{answers[index] || 'No answer recorded.'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {submitError && (
                  <Alert variant="destructive" role="alert">
                    <TriangleAlert aria-hidden="true" />
                    <AlertTitle>Interview not ingested</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(questions.length)}>
                  <ArrowLeft data-icon="inline-start" />
                  Previous
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                    : <Send data-icon="inline-start" />}
                  {submitting ? 'Submitting...' : 'Submit & Ingest'}
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>
                  <h2>Preparing interview</h2>
                </CardTitle>
                <CardDescription>Loading interview questions...</CardDescription>
              </CardHeader>
              <CardContent role="status" className="flex flex-col gap-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </>
          )}
        </Card>
      </form>
    </div>
  )
}
