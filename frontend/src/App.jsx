import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
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
import ErrorBoundary from './components/ErrorBoundary'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" /> : children
}

function AppContent() {
  const { user } = useAuth()

  return (
    <Router>
      {user && <Navbar />}
      <ErrorBoundary key={window.location.pathname}>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/rutinas" element={
            <PrivateRoute>
              <Rutinas />
            </PrivateRoute>
          } />
          <Route path="/rutinas/:id" element={
            <PrivateRoute>
              <RutinaDetalle />
            </PrivateRoute>
          } />
          <Route path="/plan" element={
            <PrivateRoute>
              <Plan />
            </PrivateRoute>
          } />
          <Route path="/entrenar" element={
            <PrivateRoute>
              <Entrenar />
            </PrivateRoute>
          } />
          <Route path="/progreso" element={
            <PrivateRoute>
              <Progreso />
            </PrivateRoute>
          } />
          <Route path="/medidas" element={
            <PrivateRoute>
              <Medidas />
            </PrivateRoute>
          } />
          <Route path="/perfil" element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          } />
          <Route path="/comunidad" element={
            <PrivateRoute>
              <Comunidad />
            </PrivateRoute>
          } />
          <Route path="/comunidad/:id" element={
            <PrivateRoute>
              <ComunidadDetalle />
            </PrivateRoute>
          } />
          <Route path="/fotos" element={
            <PrivateRoute>
              <Fotos />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </ErrorBoundary>
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
