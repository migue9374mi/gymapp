/**
 * Envio de correos.
 *
 * Hay dos formas de mandar un correo y en este proyecto solo funciona una:
 *
 *  - POR API HTTP (Brevo). Va por el puerto 443, el mismo que usa esta app
 *    para todo lo demas. Es la que hay que usar en la nube.
 *
 *  - POR SMTP (Gmail, Mailgun...). Es lo tipico, pero Render bloquea las
 *    conexiones salientes a los puertos de SMTP (25, 465, 587). Se queda
 *    esperando hasta que se agota el tiempo y falla con "Connection timeout".
 *    Sigue aqui para poder trabajar en local o si algun dia cambias de
 *    alojamiento.
 *
 * Como se elige: si hay BREVO_API_KEY, se usa la API. Si no, se usa SMTP.
 */
const nodemailer = require('nodemailer');

// --- Modo 1: API HTTP de Brevo ---
// Al copiar y pegar desde un panel es facil que se cuele un espacio al
// final o unas comillas, y con eso Brevo contesta 401 sin decir nada util.
// Se limpian antes de usarlas.
function limpiarClave(valor) {
  return String(valor || '').trim().replace(/^["']+|["']+$/g, '').trim()
}

const BREVO_API_KEY = limpiarClave(process.env.BREVO_API_KEY)
const REMITENTE = String(process.env.EMAIL_REMITENTE || '').trim()

// --- Modo 2: SMTP ---
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

const MODO = BREVO_API_KEY ? 'http' : (SMTP_HOST && SMTP_USER && SMTP_PASS ? 'smtp' : 'ninguno')

let transporteSmtp = null
if (MODO === 'smtp') {
  transporteSmtp = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Sin estos limites, si algo va mal la peticion web se queda
    // colgando dos minutos. Con ellos falla en segundos y explica por que.
    connectionTimeout: 10 * 1000,
    greetingTimeout: 10 * 1000,
    socketTimeout: 20 * 1000,
  })
}

console.log('')
console.log('=========================================================')
if (MODO === 'http') {
  console.log('  CORREO: por API de Brevo (puerto 443)')
  console.log(`  Clave: ${BREVO_API_KEY.slice(0, 12)}... (${BREVO_API_KEY.length} caracteres)`)
  console.log(`  Remitente: ${REMITENTE || '(sin definir: pon EMAIL_REMITENTE)'}`)
} else if (MODO === 'smtp') {
  console.log(`  CORREO: por SMTP (${SMTP_HOST}:${SMTP_PORT})`)
  console.log('  Aviso: en la nube los puertos SMTP suelen estar bloqueados.')
  console.log('         Si falla, usa la API de Brevo: define BREVO_API_KEY.')
} else {
  console.log('  CORREO: DESACTIVADO')
  console.log('  La recuperacion de contrasena no podra enviar el enlace.')
  console.log('  Para activarlo define BREVO_API_KEY (recomendado en la nube).')
}
console.log('=========================================================')
console.log('')

/**
 * Manda un correo. Devuelve { enviado: true } o { enviado: false, motivo }.
 * Nunca lanza: que falle un correo no debe tumbar la peticion.
 */
async function enviar({ para, asunto, texto, html }) {
  if (MODO === 'http') {
    return enviarPorBrevo({ para, asunto, texto, html })
  }
  if (MODO === 'smtp') {
    return enviarPorSmtp({ para, asunto, texto, html })
  }
  return { enviado: false, motivo: 'El envio de correos no esta configurado en el servidor' }
}

async function enviarPorBrevo({ para, asunto, texto, html }) {
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: REMITENTE || SMTP_USER, name: 'GymApp' },
        to: [{ email: para }],
        subject: asunto,
        html: html || `<p>${texto}</p>`,
        text,
      }),
    })

    if (!r.ok) {
      const cuerpo = await r.text()
      console.error(`Brevo devolvio ${r.status}: ${cuerpo.slice(0, 300)}`)
      return { enviado: false, motivo: `Brevo devolvio ${r.status}` }
    }

    console.log(`Correo enviado a ${para}: ${asunto}`)
    return { enviado: true }
  } catch (e) {
    console.error(`No se pudo enviar el correo a ${para}:`, e.message)
    return { enviado: false, motivo: e.message }
  }
}

async function enviarPorSmtp({ para, asunto, texto, html }) {
  try {
    await transporteSmtp.sendMail({
      from: REMITENTE || SMTP_USER,
      to: para,
      subject: asunto,
      text,
      html,
    })
    console.log(`Correo enviado a ${para}: ${asunto}`)
    return { enviado: true }
  } catch (e) {
    console.error(`No se pudo enviar el correo a ${para}:`, e.message)
    return { enviado: false, motivo: e.message }
  }
}

// ---------------------------------------------------------------- Comprobacion

let comprobacion = null
let comprobacionHecha = 0
const CACHI_MS = 60 * 1000

/**
 * Comprueba de verdad que se puede mandar correo, no solo que las variables
 * esten puestas. Tener SMTP_HOST escrito no significa que el envio funcione.
 */
async function verificar() {
  const ahora = Date.now()
  if (comprobacion && ahora - comprobacionHecha < CACHI_MS) {
    return comprobacion
  }

  if (MODO === 'http') {
    try {
      // Pedir los datos de la cuenta demuestra que la clave es valida
      const r = await fetch('https://api.brevo.com/v3/account', {
        headers: { accept: 'application/json', 'api-key': BREVO_API_KEY },
      })
      comprobacion = r.ok
        ? { conectado: true }
        : { conectado: false, error: `La clave de Brevo no es valida (HTTP ${r.status})` }
    } catch (e) {
      comprobacion = { conectado: false, error: e.message }
    }
  } else if (MODO === 'smtp') {
    try {
      await Promise.race([
        transporteSmtp.verify(),
        new Promise((_, rechazar) =>
          setTimeout(() => rechazar(new Error('El servidor de correo no ha contestado a tiempo')), 15000)
        ),
      ])
      comprobacion = { conectado: true }
    } catch (e) {
      comprobacion = { conectado: false, error: e.message }
    }
  } else {
    comprobacion = { conectado: false, error: 'No hay ningun servicio de correo configurado' }
  }

  comprobacionHecha = ahora
  return comprobacion
}

/**
 * Comprueba si se puede abrir una conexion TCP a un host y puerto.
 *
 * Sirve para distinguir dos fallos que se ven igual: que el puerto este
 * bloqueado (típico en la nube) o que la configuracion este mal.
 */
async function probarPuerto(host, puerto, ms = 8000) {
  const net = require('net')
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const terminar = (resultado) => {
      socket.destroy()
      resolve(resultado)
    }
    socket.setTimeout(ms)
    socket.once('connect', () => terminar({ abierto: true }))
    socket.once('timeout', () => terminar({ abierto: false, error: 'Tiempo de espera agotado' }))
    socket.once('error', (e) => terminar({ abierto: false, error: e.code || e.message }))
    socket.connect(puerto, host)
  })
}

// Al arrancar, avisa de si el correo va a funcionar
verificar().then((r) => {
  if (r.conectado) {
    console.log('  Conexion con el servicio de correo verificada: OK')
  } else {
    console.error(`  ATENCION: el correo no va a funcionar: ${r.error}`)
  }
})

module.exports = { enviar, hayCorreo: MODO !== 'ninguno', modo: MODO, verificar, probarPuerto }
