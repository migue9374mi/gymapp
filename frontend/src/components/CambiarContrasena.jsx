import { useState } from 'react'
import api, { mensajeDeError } from '../api/axios'
import Icon from './Icon'
import { Avisos } from './ui'

/**
 * Formulario para cambiar la contraseña.
 *
 * Pide siempre la contraseña actual. No es un capricho de forma: si solo
 * pidiera la nueva, cualquiera que se colara en la sesión de alguien podría
 * quedarse con la cuenta cambiándole la clave.
 */
export default function CambiarContrasena() {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordRepetida, setPasswordRepetida] = useState('')

  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  const limpiar = () => {
    setPasswordActual('')
    setPasswordNueva('')
    setPasswordRepetida('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    // Esto lo comprueba tambien el backend, pero avisar aqui evita
    // un viaje de ida y vuelta por algo que ya sabemos.
    if (passwordNueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (passwordNueva !== passwordRepetida) {
      setError('Las dos contraseñas nuevas no coinciden')
      return
    }

    setGuardando(true)
    try {
      const res = await api.post('/auth/cambiar-contrasena', {
        passwordActual,
        passwordNueva,
        passwordRepetida,
      })
      setExito(res.data.message)
      limpiar()
      setTimeout(() => setExito(''), 5000)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cambiar la contraseña'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="panel settings-panel">
      <div className="panel-head">
        <div>
          <h3>Cambiar contraseña</h3>
          <p className="helper-copy">Necesitas la contraseña actual para poder cambiarla.</p>
        </div>
        <span className="tag tag-ink"><Icon nombre="lock" /> Seguridad</span>
      </div>

      <div className="panel-body">
        <Avisos error={error} exito={exito} />

        <form onSubmit={enviar}>
          <div className="form-grid">
            <div className="field field--full">
              <label htmlFor="password-actual">Contraseña actual</label>
              <input
                id="password-actual"
                type="password"
                className="form-control"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password-nueva">Contraseña nueva</label>
              <input
                id="password-nueva"
                type="password"
                className="form-control"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password-repetida">Repite la nueva</label>
              <input
                id="password-repetida"
                type="password"
                className="form-control"
                value={passwordRepetida}
                onChange={(e) => setPasswordRepetida(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
              {passwordRepetida && passwordNueva !== passwordRepetida && (
                <span className="field-error">No coinciden</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? (
                <><span className="mini-spinner" /> Guardando…</>
              ) : (
                <><Icon nombre="check" /> Guardar contraseña</>
              )}
            </button>
            <span className="helper-copy">Mínimo 6 caracteres.</span>
          </div>
        </form>
      </div>
    </section>
  )
}
