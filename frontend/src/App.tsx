import { lazy, ReactNode, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PageErrorBoundary } from './components/PageErrorBoundary'

const CompliancePage = lazy(() => import('./pages/CompliancePage').then((module) => ({ default: module.CompliancePage })))
const CopilotPage = lazy(() => import('./pages/CopilotPage').then((module) => ({ default: module.CopilotPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((module) => ({ default: module.DocumentsPage })))
const FieldPage = lazy(() => import('./pages/FieldPage').then((module) => ({ default: module.FieldPage })))
const KnowledgeCapturePage = lazy(() => import('./pages/KnowledgeCapturePage').then((module) => ({ default: module.KnowledgeCapturePage })))
const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage').then((module) => ({ default: module.KnowledgeGraphPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function withBoundary(pageName: string, element: ReactNode) {
  return (
    <PageErrorBoundary pageName={pageName}>
      <Suspense fallback={<div className="route-loading panel">Loading {pageName}...</div>}>
        {element}
      </Suspense>
    </PageErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={withBoundary('Dashboard', <DashboardPage />)} />
          <Route path="/copilot" element={withBoundary('AI Copilot', <CopilotPage />)} />
          <Route path="/knowledge-graph" element={withBoundary('Knowledge Graph', <KnowledgeGraphPage />)} />
          <Route path="/compliance" element={withBoundary('Compliance', <CompliancePage />)} />
          <Route path="/documents" element={withBoundary('Documents', <DocumentsPage />)} />
          <Route path="/capture" element={withBoundary('Expert Capture', <KnowledgeCapturePage />)} />
          <Route path="/settings" element={withBoundary('Settings', <SettingsPage />)} />
        </Route>
        <Route path="/field" element={withBoundary('Field Mode', <FieldPage />)} />
      </Routes>
    </BrowserRouter>
  )
}
