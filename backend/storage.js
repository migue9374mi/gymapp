/**
 * Almacenamiento de fotos con dos modos:
 *
 *  - LOCAL (por defecto): se guardan en backend/uploads y las sirve Express.
 *    Es lo que usas en tu PC.
 *
 *  - NUBE: Cloudinary, si defines CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y
 *    CLOUDINARY_API_SECRET. Necesario al desplegar, porque los hostings
 *    gratuitos borran el disco en cada reinicio.
 *
 * Todo el resto de la app no sabe en que modo estamos: solo pide guardar un
 * archivo y recibe un nombre. Para la nube, ese "nombre" es la URL publica.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ES_NUBE = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

// --- Modo local ---
const CARPETA = path.join(__dirname, 'uploads');

if (!fs.existsSync(CARPETA)) {
  fs.mkdirSync(CARPETA, { recursive: true });
}

const EXTENSIONES_PERMITIDAS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const TAMANO_MAXIMO = 8 * 1024 * 1024; // 8 MB

function validar(file) {
  if (!file) {
    throw new Error('No se recibio ningun archivo');
  }
  if (!EXTENSIONES_PERMITIDAS[file.mimetype]) {
    throw new Error('Solo se permiten imagenes (jpg, png, webp, gif)');
  }
  if (file.size > TAMANO_MAXIMO) {
    throw new Error('La imagen no puede pesar mas de 8 MB');
  }
}

/** Sube la imagen a Cloudinary usando su API HTTP. */
async function subirACloudinary(file) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const credenciales = Buffer.from(
    `${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`
  ).toString('base64');

  const datos = new FormData();
  datos.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'foto');

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${credenciales}` },
    body: datos,
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text();
    throw new Error(`Cloudinary devolvio error ${respuesta.status}: ${texto}`);
  }

  const resultado = await respuesta.json();
  return resultado.secure_url;
}

/** Borra la imagen en Cloudinary. */
async function borrarDeCloudinary(valor) {
  if (!valor || !valor.startsWith('http')) return; // en local guardamos solo el nombre
  try {
    const url = new URL(valor);
    const partes = url.pathname.split('/');
    const nombreConExtension = partes.pop();
    const nombre = nombreConExtension.replace(/\.[^.]+$/, '');
    const carpeta = partes.pop();
    const publicoId = `${carpeta}/${nombre}`;

    const credenciales = Buffer.from(
      `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`
    ).toString('base64');

    await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credenciales}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_id: publicoId }),
      }
    );
  } catch (e) {
    console.error('No se pudo borrar de Cloudinary:', e.message);
  }
}

/**
 * Guarda un archivo y devuelve el valor con el que guardarlo en la base de
 * datos. En local es un nombre de archivo; en la nube, la URL completa.
 */
async function guardarArchivo(file) {
  validar(file);

  if (ES_NUBE) {
    return subirACloudinary(file);
  }

  const extension = EXTENSIONES_PERMITIDAS[file.mimetype];
  const nombre = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
  fs.writeFileSync(path.join(CARPETA, nombre), file.buffer);
  return nombre;
}

/** Elimina el archivo del almacenamiento. Silencioso si no existe. */
async function borrarArchivo(valor) {
  if (!valor) return;

  if (ES_NUBE) {
    return borrarDeCloudinary(valor);
  }

  // Nunca permitas salir de la carpeta de uploads
  const destino = path.join(CARPETA, path.basename(valor));
  if (!destino.startsWith(CARPETA)) return;
  try {
    if (fs.existsSync(destino)) fs.unlinkSync(destino);
  } catch (e) {
    console.error('No se pudo borrar el archivo:', e.message);
  }
}

module.exports = {
  guardarArchivo,
  borrarArchivo,
  CARPETA,
  TAMANO_MAXIMO,
  modoNube: ES_NUBE,
};