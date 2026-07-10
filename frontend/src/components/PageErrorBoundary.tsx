import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
      <Card role="alert" className="mx-auto w-full max-w-xl">
        <CardHeader>
          <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle />
          </span>
          <CardTitle>{this.props.pageName} needs a refresh</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Brian AI recovered this view. The rest of the app is still available; retry this workflow when ready.
          </p>
        </CardContent>
        <CardFooter>
          <Button type="button" onClick={() => this.setState({ error: null })}>Retry view</Button>
        </CardFooter>
      </Card>
    )
  }
}
