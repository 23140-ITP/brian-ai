import { Component, ErrorInfo, ReactNode } from 'react'

type PageErrorBoundaryProps = {
  children: ReactNode
  pageName: string
}

type PageErrorBoundaryState = {
  error: Error | null
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Brian AI ${this.props.pageName} failed`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <section className="page-error panel" role="alert">
        <p>Brian AI recovered this view.</p>
        <h1>{this.props.pageName} needs a refresh</h1>
        <span>The rest of the app is still available. Retry the view or switch to another workflow.</span>
        <button type="button" onClick={() => this.setState({ error: null })}>Retry view</button>
      </section>
    )
  }
}
