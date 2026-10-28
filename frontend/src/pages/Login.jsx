import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mensajeDeError } from '../api/axios'
import AuthShell from '../components/AuthShell'
import Icon from '../components/Icon'
import { Avisos } from '../components/ui'

const CLAVE_RECORDAR = 'gymapp_recordar_email'

function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem(CLAVE_RECORDAR) || '')
  const [password, setPassword] = useState('')
  const [recordar, setRecordar] = useState(() => Boolean(localStorage.getItem(CLAVE_RECORDAR)))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      if (recordar) localStorage.setItem(CLAVE_RECORDAR, email)
      else localStorage.removeItem(CLAVE_RECORDAR)
      navigate('/dashboard')
    } catch (err) {
      setError(mensajeDeError(err, 'Error al iniciar sesión'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Bienvenido de nuevo"
      titulo={<>Entra y<br />entrena</>}
      intro="Nos alegra verte. Tu plan de hoy está listo cuando tú lo estés."
    >
      <Avisos error={error} />

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <div className="login-row">
          <label className="check-inline">
            <input
              type="checkbox"
              checked={recordar}
              onChange={(e) => setRecordar(e.target.checked)}
            />
            Recordarme
          </label>
          <Link to="/olvide-contrasena">¿Olvidaste la contraseña?</Link>
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? (
            <><span className="mini-spinner" /> Entrando…</>
          ) : (
            <>Entrar <Icon nombre="arrow-right" /></>
          )}
        </button>
      </form>

      <p className="login-note">Acceso privado · Solo para ti y los tuyos</p>
      <p className="auth-switch">
        ¿No tienes cuenta? <Link to="/register">Crear una cuenta</Link>
      </p>
    </AuthShell>
  )
}

export default Login
