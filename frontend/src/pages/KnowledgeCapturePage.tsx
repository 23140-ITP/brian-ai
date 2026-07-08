import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

export function KnowledgeCapturePage() {
  const [step, setStep] = useState(0)
  const [expert, setExpert] = useState('A. Rao')
  const [topic, setTopic] = useState('P-204B pump failures')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [submitted, setSubmitted] = useState<{ doc_id: string; linked_entities: string[] } | null>(null)

  useEffect(() => {
    api.captureQuestions().then((rows) => {
      setQuestions(rows)
      setAnswers(Array(rows.length).fill(''))
    })
  }, [])

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
    const result = await api.captureExpertKnowledge({
      session_id: `${Date.now()}`,
      expert_name: expert,
      topic,
      answers: questions.map((question, index) => ({ question, answer: answers[index] || '' }))
    })
    setSubmitted({ doc_id: result.doc_id, linked_entities: result.linked_entities })
  }

  if (submitted) {
    return (
      <div className="page">
        <section className="success-state panel">
          <h1>Expert knowledge ingested</h1>
          <p>Brian AI created {submitted.doc_id} and linked it to {submitted.linked_entities.join(', ')}.</p>
          <Link className="button-link" to="/documents">Open Documents</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="page capture-page">
      <section className="page-heading compact">
        <div>
          <h1>Expert Knowledge Capture</h1>
          <p>Preserve knowledge before it walks out the door.</p>
        </div>
      </section>
      <form className="panel interview-panel" onSubmit={submit}>
        {step === 0 ? (
          <>
            <label>
              Expert Name
              <input
                aria-label="Expert name"
                value={expert}
                onChange={(event) => setExpert(event.target.value)}
              />
            </label>
            <label>
              Topic / Equipment Area
              <input
                aria-label="Topic or equipment area"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              />
            </label>
            <button type="submit">Begin Interview</button>
          </>
        ) : step <= questions.length && questions.length > 0 ? (
          <>
            <p>Question {step} of {questions.length}</p>
            <h2>{questions[step - 1]}</h2>
            <textarea
              aria-label={`Answer for: ${questions[step - 1]}`}
              rows={7}
              value={answers[step - 1]}
              onChange={(event) => {
                const next = [...answers]
                next[step - 1] = event.target.value
                setAnswers(next)
              }}
            />
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setStep(Math.max(0, step - 1))}>Previous</button>
              <button type="submit">{step === questions.length ? 'Review Answers' : 'Next Question'}</button>
            </div>
          </>
        ) : step === reviewStep && questions.length > 0 ? (
          <>
            <p>Review</p>
            <h2>Review captured expertise before ingest</h2>
            <div className="capture-review-list">
              <div>
                <span>Expert</span>
                <strong>{expert}</strong>
              </div>
              <div>
                <span>Topic</span>
                <strong>{topic}</strong>
              </div>
              {questions.map((question, index) => (
                <article key={question}>
                  <span>Question {index + 1}</span>
                  <strong>{question}</strong>
                  <p>{answers[index] || 'No answer recorded.'}</p>
                </article>
              ))}
            </div>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setStep(questions.length)}>Previous</button>
              <button type="submit">Submit & Ingest</button>
            </div>
          </>
        ) : (
          <p>Loading interview questions...</p>
        )}
      </form>
    </div>
  )
}
