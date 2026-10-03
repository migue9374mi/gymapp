import { Component } from 'react'
import { useNavigate } from 'react-router-dom'

// Salida del error.
// Importante: navegar con React Router, NO con window.location.href.
// href hace una recarga completa de la pagina; si el servidor no tiene reglas
// de reescritura (vercel.json) responde 404 en vez de mostrar la app.
function VolverAlInicio({ alPulsarSalir }) {
  const navigate = useNavigate()

  return (
    <button
      className="btn btn-primary mt-3"
      onClick={() => {
        alPulsarSalir()
        navigate('/dashboard', { replace: true })
      }}
    >
      <i className="bi bi-house me-2"></i>Volver al inicio
    </button>
  )
}

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

            <VolverAlInicio
              alPulsarSalir={() => {
                this.setState({ error: null, info: null })
              }}
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary