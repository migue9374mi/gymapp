/**
 * Iconos de linea de Gym Edition.
 *
 * Toda la interfaz usa el mismo trazo de 2 px. El sprite se pinta una sola
 * vez dentro del armazon y cada icono lo referencia con <use>, asi no se
 * repite el mismo SVG decenas de veces.
 */

const SIMBOLOS = [
  ['home', <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-7h6v7" /></>],
  ['calendar', <><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>],
  ['dumbbell', <><path d="M6 9v6M3 10v4M18 9v6M21 10v4M6 12h12" /></>],
  ['chart', <><path d="M4 20V11M10 20V4M16 20v-6M22 20H2" /></>],
  ['user', <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>],
  ['play', <path d="M8 5.5 19 12 8 18.5Z" />],
  ['check', <path d="m4.5 12.5 5 5 10-11" />],
  ['plus', <path d="M12 5v14M5 12h14" />],
  ['clock', <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>],
  ['flame', <><path d="M12.5 22c4.1 0 7-2.8 7-6.6 0-3-1.9-5.6-4-7.7-.8 2.6-2 4-3.2 4.6.4-3.2-1-6.2-3-8.3.2 3.2-4.3 5.8-4.3 11.4C5 19.2 8.4 22 12.5 22Z" /><path d="M12.2 22c1.9 0 3.2-1.3 3.2-3 0-1.4-.8-2.5-1.9-3.6-.4 1.2-1 1.9-1.6 2.2.2-1.5-.5-2.8-1.5-3.8.1 1.5-2 2.7-2 5.2 0 1.7 1.4 3 3.8 3Z" /></>],
  ['arrow-right', <><path d="M4 12h15M13 6l6 6-6 6" /></>],
  ['arrow-left', <><path d="M20 12H5M11 6l-6 6 6 6" /></>],
  ['arrow-up-right', <><path d="M7 17 17 7M8 7h9v9" /></>],
  ['chevron-down', <path d="m6 9 6 6 6-6" />],
  ['chevron-right', <path d="m9 6 6 6-6 6" />],
  ['chevron-left', <path d="m15 6-6 6 6 6" />],
  ['bell', <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>],
  ['message', <><path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" /><path d="M8 9h8M8 13h5" /></>],
  ['image', <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m21 15-5-5L5 20" /></>],
  ['key', <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 3l4 4M14 6l2 2" /></>],
  ['lock', <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>],
  ['eye', <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.7" /></>],
  ['list', <><path d="M9 6h12M9 12h12M9 18h12" /><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></>],
  ['warning', <><path d="M12 3 2.5 20h19Z" /><path d="M12 9v5M12 17.5h.01" /></>],
  ['settings', <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>],
  ['camera', <><path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3.5" /></>],
  ['ruler', <><path d="m3 17 14-14 4 4L7 21Z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></>],
  ['users', <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M18 14.4c2 .7 3.5 2.5 3.5 5.1" /></>],
  ['logout', <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>],
  ['pause', <path d="M9 5v14M15 5v14" />],
  ['skip', <><path d="m5 5 10 7-10 7Z" /><path d="M19 5v14" /></>],
  ['rotate', <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>],
  ['x', <path d="m6 6 12 12M18 6 6 18" />],
  ['trophy', <><path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8" /></>],
  ['target', <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>],
  ['heart', <path d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-7.9a5.3 5.3 0 0 0 0-7.5Z" />],
  ['edit', <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17Z" /><path d="m13.5 6.5 3 3" /></>],
  ['scale', <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6" /><circle cx="12" cy="13" r="2" /></>],
  ['info', <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>],
  ['menu', <path d="M4 7h16M4 12h16M4 17h16" />],
  ['search', <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>],
  ['send', <><path d="m4 4 16 8-16 8 3-8Z" /><path d="M7 12h13" /></>],
  ['trash', <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>],
  ['upload', <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>],
  ['copy', <><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M16 8V4H4v12h4" /></>],
]

export function Sprite() {
  return (
    <svg aria-hidden="true" className="svg-sprite">
      {SIMBOLOS.map(([nombre, contenido]) => (
        <symbol key={nombre} id={`i-${nombre}`} viewBox="0 0 24 24">
          {contenido}
        </symbol>
      ))}
    </svg>
  )
}

export default function Icon({ nombre, className = '' }) {
  return (
    <svg className={`icon ${className}`.trim()} aria-hidden="true" focusable="false">
      <use href={`#i-${nombre}`} />
    </svg>
  )
}
