/**
 * Recuperacion de contrasena olvidada.
 *
 * El flujo es el de siempre: pides el enlace por correo, y al pincharlo
 * entras a una pagina para poner la contrasena nueva.
 *
 * Tres decisiones de seguridad que conviene tener presentes:
 *
 * 1. La respuesta es SIEMPRE la misma, exista o no el correo. Si dijera
 *    "ese correo no esta registrado", alguien podria usar la pagina para
 *    averiguar con que correos hay cuentas dadas de alta.
 *
 * 2. En la tabla se guarda el SHA-256 del token, nunca el token en claro.
 *    Si alguien lee la base de datos, esos hashes no le sirven para nada.
 *
 * 3. El token caduca en una hora y es de un solo uso. Ademas, pedir uno
 *    nuevo invalida los anteriores.
 */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { enviar, hayCorreo, modo: modoCorreo, verificar, probarPuerto, ultimoEnvio } = require('../correo');

// Se apunta como va cada peticion, para poder diagnostics sin mirar logs.
let ultimaPeticion = null;

const router = express.Router();

const MINUTOS_VALIDEZ = 60;
const MAX_PETICIONES_POR_HORA = 5;

// Se responde siempre esto, exista el correo o no
const MENSAJE_NEUTRAL =
  'Si ese correo tiene una cuenta, te hemos enviado un enlace para cambiar la contraseña';

/** Hash del token: es lo unico que se guarda en la base de datos. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Token aleatorio de 256 bits, en hexadecimal. */
function generarToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Direccion publica de la app, para construir el enlace del correo.
 *
 * FRONTEND_URL puede traer varios origenes separados por coma (la web, y
 * quizas el origen de la app de Android), asi que hay que quedarse con el
 * que serve para abrir una pagina en un navegador.
 */
function urlPublica() {
  if (process.env.URL_PUBLICA) return process.env.URL_PUBLICA.replace(/\/$/, '');

  const origenes = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const web = origenes.find((o) => !/localhost/i.test(o));
  return (web || origenes[0] || '').replace(/\/$/, '');
}

// Si no se averigua el dominio, el enlace del correo no llevaria a ninguna
// parte. Conviene enterarse al arrancar y no en pleno uso.
const URL_PUBLICA = urlPublica();

if (process.env.NODE_ENV !== 'test' && !URL_PUBLICA) {
  console.error('=========================================================');
  console.error('  NO SE HA PODIDO AVERIGUAR LA URL DE LA APP');
  console.error('  Los enlaces de recuperacion de contrasena saldran');
  console.error('  sin dominio y no funcionaran.');
  console.error('  Revisa FRONTEND_URL en las variables de entorno.');
  console.error('=========================================================');
}

// ---------------------------------------------------------------- Pedir enlace

router.post('/olvide-contrasena', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Escribe tu correo' });
    }

    const user = await db.get('SELECT id, nombre, email FROM users WHERE email = ?', [email]);

    // Si el correo no existe, respondemos exactamente lo mismo.
    // Sin esta comprobacion, la pagina serviria para averiguar que correos
    // estan registrados en la app.
    if (!user) {
      ultimaPeticion = { email, situacion: 'ese correo no tiene cuenta' };
      return res.json({ message: MENSAJE_NEUTRAL });
    }

    // Freno para que nadie pida mil enlaces y llene la tabla
    const recientes = await db.get(
      `SELECT COUNT(*) AS n FROM recuperaciones
       WHERE user_id = ? AND creado > datetime('now', '-1 hour')`,
      [user.id]
    );

    if (recientes.n >= MAX_PETICIONES_POR_HORA) {
      // Tampoco decimos "has pedido demasiado", por el mismo motivo
      ultimaPeticion = {
        email,
        situacion: 'frenada: ya van 5 peticiones en la ultima hora',
        peticionesUltimaHora: recientes.n,
      };
      return res.json({ message: MENSAJE_NEUTRAL });
    }

    // Pide un enlace nuevo, caduca el anterior.
    // Se MARCA como usado en vez de borrarlo: si lo borramos, en la tabla
    // solo queda una fila por usuario y el contador de peticiones de abajo
    // nunca llegaria al limite, que es justo lo que hacia antes.
    await db.run('UPDATE recuperaciones SET usado = 1 WHERE user_id = ? AND usado = 0', [user.id]);

    // Limpieza: los tokens viejos no hacen falta para nada
    await db.run("DELETE FROM recuperaciones WHERE creado < datetime('now', '-1 day')");

    const token = generarToken();
    const expira = new Date(Date.now() + MINUTOS_VALIDEZ * 60 * 1000).toISOString();

    await db.run(
      'INSERT INTO recuperaciones (user_id, token_hash, expira) VALUES (?, ?, ?)',
      [user.id, hashToken(token), expira]
    );

    const enlace = `${urlPublica()}/recuperar/${token}`;

    const resultado = await enviar({
      para: user.email,
      asunto: 'Cambiar tu contraseña de GymApp',
      texto: [
        'Hola ' + user.nombre + ',',
        '',
        'Alguien (espero que seas tu) ha pedido cambiar la contraseña de tu cuenta de GymApp.',
        '',
        'Abre este enlace para poner una contraseña nueva:',
        enlace,
        '',
        'El enlace vale durante ' + MINUTOS_VALIDEZ + ' minutos y solo se puede usar una vez.',
        '',
        'Si no has pedido esto, no hagas nada: tu contraseña sigue siendo la misma.',
      ].join('\n'),
      html: correoHtml(user.nombre, enlace, MINUTOS_VALIDEZ),
    });

    if (!resultado.enviado) {
      console.error('Recuperacion generada pero no enviada:', resultado.motivo);
    }

    ultimaPeticion = {
      email,
      situacion: resultado.enviado ? 'enlace enviado' : 'NO se pudo enviar',
      motivo: resultado.enviado ? undefined : resultado.motivo,
      enlace: enlace,
    };

    res.json({ message: MENSAJE_NEUTRAL });
  } catch (error) {
    console.error('Error pidiendo recuperacion:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

function correoHtml(nombre, enlace, minutos) {
  /*
    El correo lleva el mismo aspecto que la app: fondo de papel, bordes
    negros gruesos, esquinas rectas y el rojo de la marca.

    En un correo no se puede meter una hoja de estilos externa, asi que todo
    va en linea. Aun asi, el navegador del correo respeta casi todo: lo unico
    que se pierde en Outlook es la sombra, y ahi el borde negro ya hace el
    trabajo de marcar el boton.
  */
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f7f4ec;font-family:'Helvetica Neue',Arial,Helvetica,sans-serif;color:#0d0d0d">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:3px solid #0d0d0d;box-shadow:6px 6px 0 #0d0d0d">
      <div style="background:#0d0d0d;padding:22px 26px;text-align:center;border-bottom:4px solid #ff3b4e">
        <span style="color:#ff3b4e;font-size:28px;font-weight:900;letter-spacing:-0.5px">GYMAPP</span>
      </div>
      <div style="padding:30px">
        <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#6b6b6b">
          Recuperar contraseña
        </p>
        <p style="margin:0 0 16px;font-size:18px;font-weight:700">Hola ${nombre},</p>
        <p style="margin:0 0 24px;line-height:1.6">
          Alguien (espero que seas tú) ha pedido cambiar la contraseña de tu cuenta.
          Pulsa el botón para poner una nueva.
        </p>
        <p style="text-align:center;margin:0 0 26px">
          <a href="${enlace}" style="background:#ff3b4e;color:#ffffff;text-decoration:none;padding:15px 30px;border:3px solid #0d0d0d;box-shadow:4px 4px 0 #0d0d0d;font-weight:700;display:inline-block">
            CAMBIAR MI CONTRASEÑA
          </a>
        </p>
        <div style="border-top:3px solid #0d0d0d;padding-top:18px">
          <p style="margin:0 0 8px;color:#6b6b6b;font-size:13px;line-height:1.6">
            El enlace vale ${minutos} minutos y solo se puede usar una vez.
          </p>
          <p style="margin:0;color:#6b6b6b;font-size:13px;line-height:1.6">
            Si el botón no funciona, copia esta dirección en el navegador:<br>
            <span style="word-break:break-all;color:#ff3b4e;font-weight:700">${enlace}</span>
          </p>
          <p style="margin:20px 0 0;padding:12px 14px;background:#fff7d6;border-left:6px solid #ffe600;color:#0d0d0d;font-size:13px;line-height:1.6">
            Si no has pedido esto, no hagas nada: tu contraseña sigue siendo la misma.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

// ---------------------------------------------------------------- Comprobar token

router.get('/recuperar/:token', async (req, res) => {
  try {
    const info = await buscarTokenValido(req.params.token);

    if (!info) {
      return res.status(400).json({ error: 'El enlace no es válido o ha caducado' });
    }

    res.json({ valido: true, nombre: info.nombre });
  } catch (error) {
    console.error('Error comprobando token:', error);
    res.status(500).json({ error: 'Error al comprobar el enlace' });
  }
});

/** Devuelve { user_id, nombre } si el token existe, no se ha usado y no ha caducado. */
async function buscarTokenValido(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;

  const fila = await db.get(
    `SELECT r.id, r.user_id, r.expira, u.nombre
     FROM recuperaciones r
     JOIN users u ON u.id = r.user_id
     WHERE r.token_hash = ? AND r.usado = 0`,
    [hashToken(token)]
  );

  if (!fila) return null;

  // La caducidad se compara en JavaScript para no depender de como interprete
  // cada motor la fecha de SQLite.
  if (new Date(fila.expira).getTime() <= Date.now()) {
    await db.run('DELETE FROM recuperaciones WHERE id = ?', [fila.id]);
    return null;
  }

  return fila;
}

// ---------------------------------------------------------------- Poner la nueva

router.post('/recuperar/:token', async (req, res) => {
  try {
    const { password, passwordRepetida } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Escribe la contraseña nueva' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (password !== passwordRepetida) {
      return res.status(400).json({ error: 'Las dos contraseñas no coinciden' });
    }

    const info = await buscarTokenValido(req.params.token);

    if (!info) {
      return res.status(400).json({ error: 'El enlace no es válido o ha caducado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, info.user_id]);

    // El token se gasta: un enlace es de un solo uso
    await db.run('DELETE FROM recuperaciones WHERE user_id = ?', [info.user_id]);

    res.json({ message: 'Contraseña actualizada. Ya puedes entrar.' });
  } catch (error) {
    console.error('Error cambiando contraseña por enlace:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// Estado del servicio de correo
router.get('/estado', async (req, res) => {
  const comprobacion = await verificar();

  // Si falla por SMTP, merece la pena saber si el problema es que el puerto
  // esta bloqueado (tipico en la nube) o que la configuracion esta mal.
  // Con un solo dato no se distingue, y asi se pierde mucho tiempo probando.
  let puertos = null;
  if (modoCorreo === 'smtp' && !comprobacion.conectado) {
    const host = process.env.SMTP_HOST;
    if (host) {
      puertos = {
        smtp: await probarPuerto(host, Number(process.env.SMTP_PORT) || 587),
        https: await probarPuerto(host, 443),
      };
    }
  }

  res.json({
    correoConfigurado: hayCorreo,
    modo: modoCorreo,
    conexion: comprobacion.conectado,
    // El motivo solo se enseña si algo va mal: ayuda a diagnosticar
    // sin filtrar nada útil
    error: comprobacion.conectado ? undefined : comprobacion.error,
    puertos,
    // Que paso en la ultima peticion de enlace, y en el ultimo envio
    ultimaPeticion,
    ultimoEnvio: ultimoEnvio(),
    // El dominio que se pondra en los enlaces del correo
    urlPublica: URL_PUBLICA || null,
  });
});

module.exports = router;
module.exports.hashToken = hashToken; // lo usan las pruebas
