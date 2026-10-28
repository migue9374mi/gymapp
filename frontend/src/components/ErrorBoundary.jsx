import { Component } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

// Salida del error.
// Importante: navegar con React Router, NO con window.location.href.
// href hace una recarga completa de la pagina; si el servidor no tiene reglas
// de reescritura (vercel.json) responde 404 en vez de mostrar la app.
function VolverAlInicio({ alPulsarSalir }) {
  const navigate = useNavigate()

  return (
    <button
      className="btn btn-primary"
      onClick={() => {
        alPulsarSalir()
        navigate('/dashboard', { replace: true })
      }}
    >
      <Icon nombre="home" /> Volver al inicio
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
        <div className="empty-state" style={{ marginTop: 32 }}>
          <span className="empty-icon"><Icon nombre="warning" /></span>
          <h3>Algo salió mal en esta página</h3>
          <p>
            Puedes volver al inicio. Si quieres ayudar a encontrar el problema,
            copia el mensaje de abajo.
          </p>

          <pre
            style={{
              width: '100%',
              maxWidth: 640,
              maxHeight: 260,
              overflow: 'auto',
              margin: '8px 0 0',
              padding: 13,
              borderRadius: 10,
              background: 'var(--ink)',
              color: 'var(--lime)',
              fontSize: 10,
              lineHeight: 1.5,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
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
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
