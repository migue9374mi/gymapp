/**
 * Envio de correos.
 *
 * Se configura con variables de entorno, asi que el servicio de correo es
 * intercambiable sin tocar una linea de codigo. Con una cuenta de Gmail
 * bastan SMTP_HOST, SMTP_USER y SMTP_PASS; si algun dia prefieres
 * Brevo, Resend o similar, cambias tres valores y sigue igual.
 *
 * Si no hay nada configurado, la app sigue funcionando: la recuperacion de
 * contrasena avisa de que no se pudo enviar el correo, y lo demas no se ve
 * afectado.
 *
 * Por que un servicio externo y no Turso: lo he comprobado en la
 * documentacion oficial y Turso no tiene funcion de envio de correo.
 */
const nodemailer = require('nodemailer');

// Configuracion: SMTP generico (sirve para Gmail, Brevo, Resend, Mailgun...)
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
// Remitente. Si no se pone, se usa SMTP_USER.
const REMITENTE = process.env.EMAIL_REMITENTE || SMTP_USER

const HAY_SMTP = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

let transporte = null

if (HAY_SMTP) {
  transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // El puerto 465 es TLS directo; el 587 va con STARTTLS
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

console.log('')
console.log('=========================================================')
if (HAY_SMTP) {
  console.log(`  CORREO: activado (${SMTP_HOST}:${SMTP_PORT})`)
  console.log(`  Enviando como: ${REMITENTE}`)
} else {
  console.log('  CORREO: DESACTIVADO')
  console.log('  La recuperacion de contrasena no podra enviar el enlace.')
  console.log('  Para activarlo, define en Render:')
  console.log('    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
  console.log('  Con Gmail: SMTP_HOST=smtp.gmail.com y una "contrasena de app"')
}
console.log('=========================================================')
console.log('')

/**
 * Manda un correo. Devuelve { enviado: true } o { enviado: false, motivo }.
 * Nunca lanza: que falle un correo no debe tumbar la peticion.
 */
async function enviar({ para, asunto, texto, html }) {
  if (!HAY_SMTP) {
    console.warn('Intento de enviar correo sin configurar SMTP:', para, '-', asunto)
    return { enviado: false, motivo: 'El envio de correos no esta configurado en el servidor' }
  }

  try {
    await transporte.sendMail({ from: REMITENTE, to: para, subject: asunto, text, html })
    console.log(`Correo enviado a ${para}: ${asunto}`)
    return { enviado: true }
  } catch (e) {
    console.error(`No se pudo enviar el correo a ${para}:`, e.message)
    return { enviado: false, motivo: e.message }
  }
}

/**
 * Comprueba de verdad que se puede conectar y autenticar con el servidor.
 *
 * Tener las variables puestas no significa que el envío vaya a funcionar:
 * la contraseña puede estar mal, o el servidor puede rechazar la IP. Este
 * aviso se hace al arrancar y se puede consultar, para no tener que esperar
 * a que alguien se queje de que no le llega el correo.
 */
let comprobacion = null
let comprobacionHecha = 0
const CACHI_MS = 60 * 1000

async function verificar() {
  if (!HAY_SMTP) {
    return { conectado: false, error: 'No hay SMTP configurado' }
  }

  const ahora = Date.now()
  if (comprobacion && ahora - comprobacionHecha < CACHI_MS) {
    return comprobacion
  }

  try {
    await transporte.verify()
    comprobacion = { conectado: true }
  } catch (e) {
    // El mensaje de nodemailer suele traer el motivo real (EAUTH, ETIMEDOUT...)
    comprobacion = { conectado: false, error: e.message }
  }

  comprobacionHecha = ahora
  return comprobacion
}

// Al arrancar, avisa de si el correo va a funcionar
verificar().then((r) => {
  if (r.conectado) {
    console.log(`  Conexion con el correo verificada: OK`)
  } else {
    console.error(`  ATENCION: no se pudo conectar con el servidor de correo: ${r.error}`)
    console.error('  Los correos de recuperacion NO se van a enviar.')
  }
})

module.exports = { enviar, hayCorreo: HAY_SMTP, verificar }
