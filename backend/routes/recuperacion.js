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
const { enviar, hayCorreo } = require('../correo');

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

    res.json({ message: MENSAJE_NEUTRAL });
  } catch (error) {
    console.error('Error pidiendo recuperacion:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

function correoHtml(nombre, enlace, minutos) {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
      <div style="background:#1a1a2e;padding:26px;text-align:center">
        <span style="color:#e63960;font-size:26px;font-weight:bold">GymApp</span>
      </div>
      <div style="padding:30px">
        <p style="margin:0 0 18px">Hola ${nombre},</p>
        <p style="margin:0 0 18px">
          Alguien (espero que seas tu) ha pedido cambiar la contraseña de tu cuenta.
          Pulsa el botón para poner una nueva.
        </p>
        <p style="text-align:center;margin:0 0 24px">
          <a href="${enlace}" style="background:#e63960;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:bold;display:inline-block">
            Cambiar mi contraseña
          </a>
        </p>
        <p style="margin:0 0 8px;color:#666;font-size:13px">
          El enlace vale ${minutos} minutos y solo se puede usar una vez.
        </p>
        <p style="margin:0;color:#666;font-size:13px">
          Si el botón no funciona, copia esta direccion en el navegador:<br>
          <span style="word-break:break-all;color:#e63960">${enlace}</span>
        </p>
        <p style="margin:22px 0 0;color:#666;font-size:13px">
          Si no has pedido esto, no hagas nada: tu contraseña sigue siendo la misma.
        </p>
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

// ---------------------------------------------------------------- Estado

router.get('/estado', (req, res) => {
  res.json({ correoConfigurado: hayCorreo });
});

module.exports = router;
module.exports.hashToken = hashToken; // lo usan las pruebas
