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

export default api