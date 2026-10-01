import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error capturado por ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container py-5">
          <div className="dashboard-card">
            <h4 className="fw-bold text-danger mb-3">
              <i className="bi bi-exclamation-octagon me-2"></i>
              Algo salio mal en esta pagina
            </h4>

            <p className="text-muted mb-3">
              Puedes copiar este mensaje para ayudar a encontrar el problema:
            </p>

            <pre
              className="p-3 rounded"
              style={{
                background: '#1a1a2e',
                color: '#ff6b6b',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {this.state.error.message || String(this.state.error)}
              {this.state.info?.componentStack ? `\n${this.state.info.componentStack}` : ''}
            </pre>

            <button
              className="btn btn-primary mt-3"
              onClick={() => {
                this.setState({ error: null, info: null })
                window.location.href = '/dashboard'
              }}
            >
              <i className="bi bi-house me-2"></i>Volver al inicio
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary