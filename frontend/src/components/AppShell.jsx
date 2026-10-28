/**
 * Armazon de la app: barra lateral, cabecera, navegacion movil y sesion.
 *
 * No guarda datos de las pantallas: solo pide el plan y las rachas para
 * pintar el resumen de hoy. Cada pagina sigue cargando lo suyo.
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Icon, { Sprite } from './Icon'

const CLAVE_SESION = 'gymapp_sesion_activa'

const TITULOS = {
  '/dashboard': 'Inicio',
  '/plan': 'Plan semanal',
  '/entrenar': 'Entrenar',
  '/progreso': 'Progreso',
  '/medidas': 'Medidas',
  '/fotos': 'Fotos',
  '/perfil': 'Perfil',
  '/comunidad': 'Comunidad',
  '/rutinas': 'Mis rutinas',
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function iniciales(nombre) {
  const palabras = String(nombre || '?').trim().split(/\s+/)
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return `${palabras[0][0]}${palabras[palabras.length - 1][0]}`.toUpperCase()
}

function cronometro(segundos) {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(seg)}` : `${pad(m)}:${pad(seg)}`
}

function leerSesion() {
  try {
    const raw = localStorage.getItem(CLAVE_SESION)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function tituloDeRuta(pathname) {
  if (TITULOS[pathname]) return TITULOS[pathname]
  if (pathname.startsWith('/rutinas/')) return 'Rutina'
  if (pathname.startsWith('/comunidad/')) return 'Comunidad'
  return 'GymApp'
}

function SideLink({ to, icono, children, small = false }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) => `side-link ${isActive ? 'is-active' : ''}`}
    >
      <span className="side-icon"><Icon nombre={icono} /></span>
      <span>{children}</span>
      {!small && <span className="side-active-mark" />}
    </NavLink>
  )
}

export default function AppShell() {
  const { user } = useAuth()
  const location = useLocation()

  const [plan, setPlan] = useState([])
  const [streak, setStreak] = useState(null)
  const [sesion, setSesion] = useState(() => leerSesion())
  const [ahora, setAhora] = useState(Date.now())

  useEffect(() => {
    let vivo = true

    Promise.allSettled([api.get('/plan'), api.get('/estadisticas')]).then(([p, e]) => {
      if (!vivo) return
      if (p.status === 'fulfilled') setPlan(p.value.data.plan || [])
      if (e.status === 'fulfilled') setStreak(e.value.data?.rachas?.rachaDiaria ?? 0)
    })

    return () => { vivo = false }
  }, [])

  // El cronometro de la sesion sigue corriendo aunque el usuario navegue.
  useEffect(() => {
    const t = setInterval(() => {
      setSesion(leerSesion())
      setAhora(Date.now())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  const hoy = new Date()
  const indiceHoy = (hoy.getDay() + 6) % 7
  const planHoy = plan[indiceHoy]
  const rutinasHoy = planHoy?.rutinas || []
  const tituloHoy = rutinasHoy.length
    ? rutinasHoy.map((r) => r.nombre).join(' & ')
    : 'Día de descanso'
  const metaHoy = rutinasHoy.length
    ? `${rutinasHoy.length} ${rutinasHoy.length === 1 ? 'rutina' : 'rutinas'} · ${rutinasHoy.map((r) => r.categoria).join(' · ')}`
    : 'Recupera y vuelve mañana'
  const segundosSesion = sesion?.inicioMs ? (ahora - sesion.inicioMs) / 1000 : 0

  return (
    <>
      <Sprite />

      <div className="app-shell">
        <aside className="sidebar">
          <Link className="brand" to="/dashboard" aria-label="GymApp, ir al inicio">
            <span className="brand-mark">GA</span>
            <span className="brand-copy"><strong>GYMAPP</strong><small>TRAINING CLUB</small></span>
          </Link>

          <p className="sidebar-label">Menú</p>
          <nav className="side-nav" aria-label="Navegación principal">
            <SideLink to="/dashboard" icono="home">Inicio</SideLink>
            <SideLink to="/plan" icono="calendar">Plan semanal</SideLink>
            <SideLink to="/entrenar" icono="dumbbell">Entrenar</SideLink>
            <SideLink to="/progreso" icono="chart">Progreso</SideLink>
            <SideLink to="/perfil" icono="user">Perfil</SideLink>
          </nav>

          <p className="sidebar-label">Tu espacio</p>
          <nav className="side-nav side-nav--small" aria-label="Tu espacio">
            <SideLink to="/rutinas" icono="edit" small>Mis rutinas</SideLink>
            <SideLink to="/medidas" icono="ruler" small>Medidas</SideLink>
            <SideLink to="/fotos" icono="camera" small>Fotos</SideLink>
            <SideLink to="/comunidad" icono="users" small>Comunidad</SideLink>
          </nav>

          <div className="sidebar-spacer" />

          <div className="sidebar-today">
            <div className="sidebar-today-top">
              <span className="eyebrow">Sesión de hoy</span>
              <span className="live-dot" />
            </div>
            <strong>{tituloHoy}</strong>
            <span className="sidebar-today-meta">{metaHoy}</span>
            <Link
              className="btn btn-primary btn-block btn-sm"
              to={sesion ? '/entrenar' : rutinasHoy.length ? '/entrenar' : '/plan'}
            >
              {sesion ? 'Continuar' : rutinasHoy.length ? 'Empezar' : 'Ver plan'}
              <Icon nombre="arrow-right" />
            </Link>
          </div>

          <Link className="user-chip" to="/perfil">
            <span className="avatar">{iniciales(user?.nombre)}</span>
            <span className="user-chip-copy">
              <strong>{user?.nombre || 'Mi cuenta'}</strong>
              <small>Ver perfil</small>
            </span>
            <Icon nombre="chevron-right" />
          </Link>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-left">
              <Link className="mobile-brand" to="/dashboard" aria-label="GymApp, inicio">GA</Link>
              <div className="topbar-copy">
                <span className="topbar-eyebrow">
                  {DIAS[hoy.getDay()]} · {hoy.getDate()} {MESES[hoy.getMonth()]}
                </span>
                <strong className="topbar-title">{tituloDeRuta(location.pathname)}</strong>
              </div>
            </div>

            <div className="topbar-right">
              {sesion && (
                <Link className="session-resume" to="/entrenar">
                  <span className="session-resume-dot" />
                  <span className="session-resume-copy">
                    <small>Sesión en curso</small>
                    <strong>{cronometro(segundosSesion)}</strong>
                  </span>
                  <Icon nombre="arrow-right" />
                </Link>
              )}

              {streak != null && (
                <span className="streak-pill" title="Días seguidos entrenando">
                  <Icon nombre="flame" />
                  <strong>{streak}</strong>
                  <span>{streak === 1 ? 'día' : 'días'}</span>
                </span>
              )}

              <Link className="avatar avatar-lg" to="/perfil" aria-label="Abrir perfil">
                {iniciales(user?.nombre)}
              </Link>
            </div>
          </header>

          <main className="view is-entering" id="view" key={location.pathname} tabIndex="-1">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        <NavLink to="/dashboard" end className="mobile-link">
          <Icon nombre="home" /><span>Inicio</span>
        </NavLink>
        <NavLink to="/plan" className="mobile-link">
          <Icon nombre="calendar" /><span>Plan</span>
        </NavLink>
        <NavLink to="/entrenar" className="mobile-link mobile-link--main">
          <span className="mobile-cta"><Icon nombre="dumbbell" /></span>
          <span>{sesion ? 'Seguir' : 'Entrenar'}</span>
        </NavLink>
        <NavLink to="/progreso" className="mobile-link">
          <Icon nombre="chart" /><span>Progreso</span>
        </NavLink>
        <NavLink to="/perfil" className="mobile-link">
          <Icon nombre="user" /><span>Perfil</span>
        </NavLink>
      </nav>
    </>
  )
}
