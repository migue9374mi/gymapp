import { useState } from 'react'
import api, { mensajeDeError } from '../api/axios'

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
    <div className="dashboard-card mb-4">
      <h5 className="fw-bold mb-1">
        <i className="bi bi-key me-2"></i>Cambiar contraseña
      </h5>
      <p className="text-muted small mb-3">
        Necesitas la contraseña actual para poder cambiarla.
      </p>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {exito && (
        <div className="alert alert-success py-2">
          <i className="bi bi-check-circle me-2"></i>{exito}
        </div>
      )}

      <form onSubmit={enviar}>
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label small text-muted">Contraseña actual</label>
            <input
              type="password"
              className="form-control"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">Contraseña nueva</label>
            <input
              type="password"
              className="form-control"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">Repite la nueva</label>
            <input
              type="password"
              className="form-control"
              value={passwordRepetida}
              onChange={(e) => setPasswordRepetida(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            {passwordRepetida && passwordNueva !== passwordRepetida && (
              <small className="text-danger">No coinciden</small>
            )}
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
              ) : (
                <><i className="bi bi-check-lg me-2"></i>Guardar contraseña</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}