import { useId } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

/* ------------------------------------------------------------
   Piezas compartidas por las pantallas
   ------------------------------------------------------------ */

export function PageHead({ eyebrow, titulo, sub, children }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && (
          <span className="eyebrow">
            <span className="dot" />
            {eyebrow}
          </span>
        )}
        <h1>{titulo}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  )
}

export function StatCard({ icono, valor, etiqueta, tendencia }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon">
          <Icon nombre={icono} />
        </span>
        {tendencia && (
          <span className="stat-trend">
            <Icon nombre="arrow-up-right" />
            {tendencia}
          </span>
        )}
      </div>
      <h3>{valor}</h3>
      <p>{etiqueta}</p>
    </article>
  )
}

export function TabsProgreso({ activo }) {
  const tabs = [
    ['progreso', 'Resumen', '/progreso'],
    ['medidas', 'Medidas', '/medidas'],
    ['fotos', 'Fotos', '/fotos'],
  ]

  return (
    <div className="tabs" role="tablist" aria-label="Secciones de progreso">
      {tabs.map(([clave, texto, ruta]) => (
        <Link
          key={clave}
          to={ruta}
          role="tab"
          aria-selected={activo === clave}
          className={`tab ${activo === clave ? 'is-active' : ''}`}
        >
          {texto}
        </Link>
      ))}
    </div>
  )
}

export function GraficaLinea({
  valores = [],
  etiquetas = [],
  unidad = 't',
  descripcion = 'Evolución del entrenamiento',
  objetivo,
}) {
  const id = useId().replace(/:/g, '')
  const W = 640
  const H = 218
  const padX = 18
  const padTop = 14
  const padBottom = 28

  const datos = valores.length > 0 ? valores : [0]
  const max = Math.max(...datos)
  const min = Math.min(...datos)
  const rango = max - min || 1
  const techo = max + rango * 0.35
  const suelo = min - rango * 0.35
  const x = (i) => padX + (i * (W - padX * 2)) / Math.max(datos.length - 1, 1)
  const y = (v) => H - padBottom - ((v - suelo) / (techo - suelo)) * (H - padTop - padBottom)

  const puntos = datos.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  const linea = `M${puntos.join(' L')}`
  const area = `${linea} L${x(datos.length - 1).toFixed(1)},${H - padBottom} L${padX},${H - padBottom} Z`

  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descripcion}>
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff5a1f" stopOpacity=".22" />
          <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3].map((i) => {
        const yy = padTop + (i * (H - padTop - padBottom)) / 3
        return <line key={i} className="grid-line" x1={padX} y1={yy} x2={W - padX} y2={yy} />
      })}

      {objetivo != null && (
        <line
          className="objective-line"
          x1={padX}
          y1={y(objetivo)}
          x2={W - padX}
          y2={y(objetivo)}
        >
          <title>Objetivo: {objetivo} {unidad}</title>
        </line>
      )}

      <path className="area" d={area} fill={`url(#area-${id})`} />
      <path className="line" d={linea} pathLength="1" />

      {datos.map((v, i) => (
        <circle key={i} className="dot" cx={x(i)} cy={y(v)} r="4.2">
          <title>{etiquetas[i] || `Punto ${i + 1}`}: {v} {unidad}</title>
        </circle>
      ))}

      {etiquetas.map((e, i) => (
        <text key={i} className="axis-label" x={x(i)} y={H - 8} textAnchor="middle">
          {e}
        </text>
      ))}
    </svg>
  )
}

export function Sparkline({ valores = [] }) {
  if (valores.length < 2) return null
  const W = 100
  const H = 30
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const puntos = valores.map((v, i) => {
    const x = 2 + (i * (W - 4)) / (valores.length - 1)
    const y = H - 3 - ((v - min) / rango) * (H - 7)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="sparkline" d={`M${puntos.join(' L')}`} pathLength="1" />
    </svg>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="loading-panel" role="status">
      <span className="loading-dot" />
      <span>{texto}</span>
    </div>
  )
}

export function Vacio({ icono = 'info', titulo, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon nombre={icono} /></span>
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Avisos({ error, exito }) {
  if (!error && !exito) return null
  return (
    <div className="page-alerts" aria-live="polite">
      {error && <div className="alert alert-danger">{error}</div>}
      {exito && <div className="alert alert-success">{exito}</div>}
    </div>
  )
}

export function numero(valor) {
  return Number(valor || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

export function fechaCorta(valor) {
  if (!valor) return '—'
  const [y, m, d] = String(valor).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return valor
  return `${String(d).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]}`
}

export function fechaHoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
