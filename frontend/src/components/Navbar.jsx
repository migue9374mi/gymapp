import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container">
        <Link className="navbar-brand" to="/dashboard">
          💪 GymApp
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/dashboard">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/plan">Plan Semanal</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/entrenar">Entrenar</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/rutinas">Rutinas</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/progreso">Progreso</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/medidas">Medidas</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/fotos">Fotos</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/comunidad">Comunidad</Link>
            </li>
          </ul>
          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="userDropdown"
                role="button"
                data-bs-toggle="dropdown"
              >
                {user?.nombre || 'Usuario'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <Link className="dropdown-item" to="/perfil">
                    <i className="bi bi-person-circle me-2"></i>Mi Perfil
                  </Link>
                </li>
                <li>
                  <span className="dropdown-item-text small text-muted">{user?.email}</span>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
