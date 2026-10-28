import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import AuthShell from '../components/AuthShell'
import Icon from '../components/Icon'
import { Avisos } from '../components/ui'

const TITULOS = {
  cargando: 'Comprobando',
  valido: <>Nueva<br />contraseña</>,
  invalido: <>Enlace<br />caducado</>,
  hecho: <>Contraseña<br />cambiada</>,
}

/**
 * Poner la contrasena nueva desde el enlace del correo.
 *
 * Al abrir la pagina se comprueba el enlace antes de mostrar el formulario,
 * para no preguntar por una contrasena nueva a alguien que llego con un
 * enlace caducado.
 */
export default function RecuperarContrasena() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [estado, setEstado] = useState('cargando') // cargando | valido | invalido | hecho
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepetida, setPasswordRepetida] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelado = false

    const comprobar = async () => {
      try {
        const res = await api.get(`/recuperar/recuperar/${token}`)
        if (cancelado) return
        setNombre(res.data.nombre || '')
        setEstado('valido')
      } catch (err) {
        if (cancelado) return
        setEstado('invalido')
      }
    }

    comprobar()
    return () => { cancelado = true }
  }, [token])

  const enviar = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== passwordRepetida) {
      setError('Las dos contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await api.post(`/recuperar/recuperar/${token}`, { password, passwordRepetida })
      setEstado('hecho')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      // Si el token se caduca mientras escribe, se le avisa y listo
      const mensaje = mensajeDeError(err, 'No se pudo cambiar la contraseña')
      setError(mensaje)
      if (/caducado|no es válido/i.test(mensaje)) setEstado('invalido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Recuperar acceso"
      titulo={TITULOS[estado]}
      intro={
        estado === 'valido'
          ? (nombre ? `Hola ${nombre}, elige una contraseña nueva.` : 'Elige una contraseña nueva para tu cuenta.')
          : estado === 'cargando'
            ? 'Estamos comprobando que el enlace siga siendo válido.'
            : null
      }
    >
      {estado === 'cargando' && (
        <div className="loading-panel" role="status">
          <span className="loading-dot" />
          <span>Comprobando el enlace…</span>
        </div>
      )}

      {estado === 'invalido' && (
        <>
          <div className="alert alert-danger" role="alert">
            <Icon nombre="info" />
            <span>Este enlace no vale o se ha caducado.</span>
          </div>
          <p className="helper-copy">
            Los enlaces duran una hora y solo se pueden usar una vez. Pide uno
            nuevo y te lo mandamos al instante.
          </p>
          <Link to="/olvide-contrasena" className="btn btn-primary btn-lg btn-block">
            Pedir un enlace nuevo <Icon nombre="arrow-right" />
          </Link>
        </>
      )}

      {estado === 'hecho' && (
        <>
          <div className="alert alert-success" role="alert">
            <Icon nombre="check" />
            <span>Ya puedes entrar con tu contraseña nueva.</span>
          </div>
          <p className="helper-copy">Te llevamos al inicio de sesión…</p>
        </>
      )}

      {estado === 'valido' && (
        <>
          <Avisos error={error} />

          <form className="login-form" onSubmit={enviar}>
            <div className="field">
              <label htmlFor="password">Contraseña nueva</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="passwordRepetida">Repite la contraseña</label>
              <input
                id="passwordRepetida"
                type="password"
                value={passwordRepetida}
                onChange={(e) => setPasswordRepetida(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                required
              />
              {passwordRepetida && password !== passwordRepetida && (
                <span className="field-error">No coinciden</span>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading ? (
                <><span className="mini-spinner" /> Guardando…</>
              ) : (
                <>Guardar contraseña <Icon nombre="check" /></>
              )}
            </button>
          </form>
        </>
      )}

      <p className="auth-switch">
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  )
}
