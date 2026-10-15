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
 * Abre la camara o la galeria del movil y devuelve un File listo para subir.
 *
 * Hay dos fuentes distintas a proposito: no es lo mismo hacer una foto nueva
 * que elegir una que ya tienes en el carrete. En la web esto no hace nada,
 * porque ahi se usa el <input type="file">, que ya abre la galeria.
 */
export async function abrirFoto(origen = 'camara', opciones = {}) {
  if (!esAppNativa()) return null

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

  const fuente = origen === 'galeria' ? CameraSource.Photos : CameraSource.Camera

  const foto = await Camera.getPhoto({
    quality: opciones.calidad ?? CALIDAD,
    allowEditing: false,
    // Base64 y no una URL del fichero: la foto no cambia de sitio si el
    // telefono rearranca, y no hace falta ningun permiso de almacenamiento.
    resultType: CameraResultType.Base64,
    source: fuente,
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

/** Foto nueva con la camara. */
export const hacerFoto = (opciones) => abrirFoto('camara', opciones)

/** Elegir una foto que ya esta en el movil. */
export const elegirDeGaleria = (opciones) => abrirFoto('galeria', opciones)

/** Comprueba que un archivo sea una imagen del tamaño permitido. */
export function validarImagen(archivo) {
  if (!archivo) return 'No se recibio ninguna imagen'
  if (!archivo.type.startsWith('image/')) return 'Solo se permiten imagenes'
  if (archivo.size > TAMANO_MAXIMO) return 'La imagen no puede pesar mas de 8 MB'
  return null
}