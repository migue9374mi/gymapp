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
 * Camara, para hacer fotos nuevas.
 *
 * OJO: elegir una foto que ya esta en el movil NO se hace aqui, aunque
 * pareceria lo logico. Se usa el <input type="file"> de toda la vida, que
 * dentro de la app de Android tambien abre la galeria del telefono.
 *
 * El motivo es que el plugin, al elegir de la galeria, no siempre devuelve
 * la imagen en base64, y sin ella no hay nada que subir. El selector de
 * archivos devuelve un File de verdad, siempre, en web y en movil.
 */
export async function hacerFoto(opciones = {}) {
  if (!esAppNativa()) return null

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

  const foto = await Camera.getPhoto({
    quality: opciones.calidad ?? CALIDAD,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    correctOrientation: true,
    // Reduce en el propio movil antes de pasar por la memoria: una foto de
    // 12 MB en base64 son unos 16 MB cargados, y algunos moviles se ahogan.
    ...(opciones.anchoMaximo ? { width: opciones.anchoMaximo } : {}),
  })

  const base64 = foto.base64Data
  if (!base64) throw new Error('No se ha recibido ninguna imagen')

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