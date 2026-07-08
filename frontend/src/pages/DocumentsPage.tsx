import { UploadCloud } from 'lucide-react'
import { ChangeEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DocumentMeta, documents } from '../data/mock'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'

const ingestSteps = ['Extracting text', 'Chunking', 'Embedding with cache', 'Extracting entities', 'Running pattern detection']

export function DocumentsPage() {
  const navigate = useNavigate()
  const { setActiveDocumentId } = useAppStore()
  const [steps, setSteps] = useState<string[]>([])
  const [library, setLibrary] = useState<DocumentMeta[]>(documents)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.documents().then(setLibrary)
  }, [])

  const ingest = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSteps([])
    setMessage(`Uploading ${file.name}...`)
    try {
      const result = await api.ingestDocument(file, ({ current, total, step }) => {
        setSteps((currentSteps) => currentSteps.includes(step) ? currentSteps : [...currentSteps, step])
        setMessage(`Ingesting ${file.name}: ${current}/${total} ${step}`)
      })
      setSteps(ingestSteps)
      setMessage(`Ingested ${result.doc_id}: ${result.chunks} chunks, ${result.entities} entities, ${result.alerts_triggered} alert.`)
      setLibrary(await api.documents())
    } catch {
      setMessage('Backend ingest is unavailable. The visible demo corpus remains loaded.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="page documents-page">
      <section className="page-heading compact">
        <div>
          <h1>Document Intelligence</h1>
          <p>Upload PDFs or CSVs and Brian AI updates RAG, graph links, compliance evidence, and alerts.</p>
        </div>
      </section>
      <label className="upload-zone">
        <UploadCloud size={28} />
        <strong>Drop files or click to ingest</strong>
        <span>PDF and CSV supported - updates the backend corpus when the API is running</span>
        <input type="file" accept=".pdf,.csv,.txt" onChange={ingest} />
      </label>
      {steps.length > 0 && (
        <div className="ingest-steps panel">
          {ingestSteps.map((step) => <span key={step} className={steps.includes(step) ? 'done' : ''}>{step}</span>)}
        </div>
      )}
      {message && <p className="flow-message">{message}</p>}
      <section className="document-library">
        {library.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className="doc-card doc-card-button"
            onClick={() => {
              setActiveDocumentId(doc.id)
              navigate('/copilot')
            }}
          >
            <p>{doc.docType}</p>
            <strong>{doc.filename}</strong>
            <span>{doc.chunks} chunks - ingested {doc.ingestedAt}</span>
          </button>
        ))}
      </section>
    </div>
  )
}
