/**
 * Imagen de fondo de la app.
 *
 * Reutiliza el mismo almacenamiento que las fotos de progreso (Cloudinary en
 * la nube, disco en local), asi que no hay nada nuevo que configurar.
 *
 * El fondo se guarda en la tabla de usuarios, uno por persona: cada quien ve
 * el suyo y el de nadie mas.
 */
const express = require('express');
const multer = require('multer');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { guardarArchivo, borrarArchivo, TAMANO_MAXIMO, modoNube } = require('../storage');

const router = express.Router();

// Las tres rutas de este archivo son privadas
router.use(authenticateToken);

// Los fondos se ven muy grandes en pantalla, asi que basta con uno
// reasonable. 12 MB es mucho mas que las fotos de progreso.
const TAMANO_FONDO = 12 * 1024 * 1024;

const TIPOS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_FONDO },
});

/** Opacidad admitida, acotada para que un valor raro no deje la app ilegible. */
function normalizarOpacidad(valor) {
  const n = parseFloat(valor);
  if (!Number.isFinite(n)) return 0.35;
  return Math.min(0.95, Math.max(0.05, n));
}

router.post('/', (req, res) => {
  upload.single('fondo')(req, res, async (err) => {
    if (err) {
      const mensaje = err.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen no puede pesar mas de 12 MB'
        : 'Error al subir la imagen';
      return res.status(400).json({ error: mensaje });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibio ninguna imagen' });
      }

      if (!TIPOS[req.file.mimetype]) {
        return res.status(400).json({ error: 'Solo se permiten imagenes (jpg, png o webp)' });
      }

      const anterior = await db.get('SELECT fondo FROM users WHERE id = ?', [req.userId]);

      const url = await guardarArchivo(req.file);

      const opacidad = normalizarOpacidad(
        req.body.opacidad !== undefined ? req.body.opacidad : 0.35
      );

      await db.run(
        'UPDATE users SET fondo = ?, fondo_opacidad = ? WHERE id = ?',
        [url, opacidad, req.userId]
      );

      // El fondo viejo, si lo habia, se borra de Cloudinary
      if (anterior?.fondo && anterior.fondo !== url) {
        await borrarArchivo(anterior.fondo);
      }

      console.log(`Fondo puesto a ${req.userId} (${modoNube ? 'Cloudinary' : 'disco'})`);

      res.json({ fondo: url, fondo_opacidad: opacidad });
    } catch (error) {
      console.error('Error poniendo el fondo:', error);
      res.status(400).json({ error: error.message || 'Error al guardar el fondo' });
    }
  });
});

/** Cambiar lo fuerte que se ve, sin volver a subir la imagen. */
router.put('/opacidad', async (req, res) => {
  try {
    const opacidad = normalizarOpacidad(req.body.opacidad);

    await db.run('UPDATE users SET fondo_opacidad = ? WHERE id = ?', [opacidad, req.userId]);

    res.json({ fondo_opacidad: opacidad });
  } catch (error) {
    console.error('Error cambiando la opacidad del fondo:', error);
    res.status(500).json({ error: 'Error al cambiar la intensidad' });
  }
});

/** Quitar el fondo y dejarlo como estaba. */
router.delete('/', async (req, res) => {
  try {
    const user = await db.get('SELECT fondo FROM users WHERE id = ?', [req.userId]);

    await db.run('UPDATE users SET fondo = NULL, fondo_opacidad = 0.35 WHERE id = ?', [req.userId]);

    if (user?.fondo) {
      await borrarArchivo(user.fondo);
    }

    res.json({ message: 'Fondo quitado' });
  } catch (error) {
    console.error('Error quitando el fondo:', error);
    res.status(500).json({ error: 'Error al quitar el fondo' });
  }
});

module.exports = router;
