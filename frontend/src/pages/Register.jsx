import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mensajeDeError } from '../api/axios'
import AuthShell from '../components/AuthShell'
import Icon from '../components/Icon'
import { Avisos } from '../components/ui'

function Register() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      await register(nombre, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(mensajeDeError(err, 'Error al registrar usuario'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Primer paso"
      titulo={<>Crea tu<br />cuenta</>}
      intro="Tu espacio privado para entrenar, medir y ver cómo pasa el tiempo a tu favor."
    >
      <Avisos error={error} />

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="nombre">Nombre completo</label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            required
          />
        </div>

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
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            minLength={6}
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <span className="field-error">Las contraseñas no coinciden</span>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? (
            <><span className="mini-spinner" /> Creando cuenta…</>
          ) : (
            <>Crear cuenta <Icon nombre="arrow-right" /></>
          )}
        </button>
      </form>

      <p className="login-note">Al crear la cuenta aceptas que este espacio es solo para ti y tu familia.</p>
      <p className="auth-switch">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthShell>
  )
}

export default Register
