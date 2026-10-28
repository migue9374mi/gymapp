import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Rutinas from './pages/Rutinas'
import RutinaDetalle from './pages/RutinaDetalle'
import Plan from './pages/Plan'
import Entrenar from './pages/Entrenar'
import Progreso from './pages/Progreso'
import Medidas from './pages/Medidas'
import Perfil from './pages/Perfil'
import Comunidad from './pages/Comunidad'
import ComunidadDetalle from './pages/ComunidadDetalle'
import Fotos from './pages/Fotos'
import OlvideContrasena from './pages/OlvideContrasena'
import RecuperarContrasena from './pages/RecuperarContrasena'
import ErrorBoundary from './components/ErrorBoundary'
import ProgramadorAvisos from './nativa/ProgramadorAvisos'
import FondoApp from './components/FondoApp'

function CargandoPantalla() {
  return (
    <div className="loading-screen" role="status">
      <span className="loading-dot" />
      <span>Cargando…</span>
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <CargandoPantalla />
  return user ? <Navigate to="/dashboard" /> : children
}

/**
 * Todo lo que hay dentro de la app privada comparte armazon: sidebar,
 * cabecera y navegacion movil. El fondo del usuario se pinta debajo.
 */
function PrivateLayout() {
  const { user, loading } = useAuth()
  if (loading) return <CargandoPantalla />
  if (!user) return <Navigate to="/login" />

  return (
    <>
      <FondoApp />
      <div className="app-capa">
        <ProgramadorAvisos />
        <ErrorBoundary key={window.location.pathname}>
          <AppShell />
        </ErrorBoundary>
      </div>
    </>
  )
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/olvide-contrasena" element={<PublicRoute><OlvideContrasena /></PublicRoute>} />
        <Route path="/recuperar/:token" element={<PublicRoute><RecuperarContrasena /></PublicRoute>} />

        <Route element={<PrivateLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rutinas" element={<Rutinas />} />
          <Route path="/rutinas/:id" element={<RutinaDetalle />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/entrenar" element={<Entrenar />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/medidas" element={<Medidas />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/comunidad" element={<Comunidad />} />
          <Route path="/comunidad/:id" element={<ComunidadDetalle />} />
          <Route path="/fotos" element={<Fotos />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
