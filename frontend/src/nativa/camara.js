/**
 * Camara y galeria, usando el modulo nativo cuando estamos dentro de la app
 * de Android y el selector de archivos del navegador cuando no.
 *
 * La web sigue igual deValida que antes: si ejecutas esto en Vercel, el boton
 * de subir foto abre el selector de archivos como siempre.
 */
import { Capacitor } from '@capacitor/core'

const CALIDAD = 85
const TAMANO_MAXIMO = 8 * 1024 * 1024

export const esAppNativa = () => Capacitor.isNativePlatform()

/**
 * Abre la camara y devuelve un File listo para subir.
 * En la web devuelve null, porque ahi se usa el <input type="file">.
 */
export async function hacerFoto() {
  if (!esAppNativa()) return null

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

  const foto = await Camera.getPhoto({
    quality: CALIDAD,
    allowEditing: false,
    // Base64 y no una URL del fichero: la foto no cambia de sitio si el
    // telefono rearranca, y no hace falta ningun permiso de almacenamiento.
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    correctOrientation: true,
  })

  const base64 = foto.base64Data
  if (!base64) throw new Error('La camara no devolvo ninguna imagen')

  // Los bytes reales, quitando el prefijo data:image/...;base64
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i)
  }

  const tipo = foto.format ? `image/${foto.format}` : 'image/jpeg'
  const archivo = new File([bytes], `foto.${foto.format || 'jpg'}`, { type: tipo })

  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error('La imagen no puede pesar mas de 8 MB')
  }

  return archivo
}

/** Comprueba que un archivo sea una imagen del tamaño permitido. */
export function validarImagen(archivo) {
  if (!archivo) return 'No se recibio ninguna imagen'
  if (!archivo.type.startsWith('image/')) return 'Solo se permiten imagenes'
  if (archivo.size > TAMANO_MAXIMO) return 'La imagen no puede pesar mas de 8 MB'
  return null
}