import axios from 'axios'

// En desarrollo Vite hace de proxy hacia http://localhost:5000 (ver vite.config.js).
// En produccion hay que definir VITE_API_URL con la URL del backend desplegado.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
})

// URL completa de una imagen subida por el usuario.
// En local las fotos las sirve el backend desde /uploads.
// En la nube (Cloudinary) el backend ya guarda la URL completa, asi que se
// devuelve tal cual.
export function urlImagen(valor) {
  if (!valor) return ''
  // Si ya es una URL completa (Cloudinary), usarla directamente
  if (valor.startsWith('http')) return valor
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/uploads/${valor}`
  }
  return `/uploads/${valor}`
}

// Interceptor para añadir el token a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/**
 * Convierte cualquier error en un texto que se pueda mostrar.
 *
 * Hace falta porque un servidor puede responder con un objeto
 * (por ejemplo {code, message}) en vez de un texto, y React no
 * permite dibujar objetos: revienta con el error "Objects are not
 * valid as a React child".
 */
export function mensajeDeError(err, porDefecto = 'Ocurrio un error') {
  const datos = err?.response?.data

  // Respuesta del backend: { error: '...' }
  if (datos && typeof datos === 'object' && typeof datos.error === 'string' && datos.error) {
    return datos.error
  }

  // Respuesta en texto plano (Vercel, HTML de error de Express, etc.)
  if (typeof datos === 'string' && datos.trim() && datos.length < 300) {
    return datos
  }

  // Respuesta con otra forma, por ejemplo { code, message }
  if (datos && typeof datos === 'object') {
    if (typeof datos.message === 'string' && datos.message) return datos.message
    if (typeof datos.code === 'string' && datos.code) return `Error ${datos.code}`
  }

  // Error de red (el servidor no respondio)
  if (typeof err?.message === 'string' && err.message) return err.message

  return porDefecto
}

export default api