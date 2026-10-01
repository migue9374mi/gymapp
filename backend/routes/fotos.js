const express = require('express');
const multer = require('multer');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { guardarArchivo, borrarArchivo, TAMANO_MAXIMO, modoNube } = require('../storage');

const router = express.Router();
router.use(authenticateToken);

// multer guarda el archivo en memoria para decidir si vale antes de escribirlo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO },
});

// Listar fotos del usuario
router.get('/', async (req, res) => {
  try {
    const fotos = await db.all(
      'SELECT * FROM fotos WHERE user_id = ? ORDER BY fecha DESC, id DESC',
      [req.userId]
    );
    res.json({ fotos });
  } catch (error) {
    console.error('Error listando fotos:', error);
    res.status(500).json({ error: 'Error al obtener las fotos' });
  }
});

// Subir una foto
router.post('/', async (req, res) => {
  const subir = upload.single('foto');

  subir(req, res, async (err) => {
    if (err) {
      const mensaje = err.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen no puede pesar mas de 8 MB'
        : 'Error al subir la imagen';
      return res.status(400).json({ error: mensaje });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibio ninguna imagen' });
      }

      const archivo = await guardarArchivo(req.file);

      const ahora = new Date();
      const fecha = req.body.fecha
        || `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

      const resultado = await db.run(
        'INSERT INTO fotos (user_id, nombre, archivo, fecha, nota, musculo) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.userId,
          req.file.originalname || 'foto',
          archivo,
          fecha,
          (req.body.nota || '').trim(),
          req.body.musculo || 'general',
        ]
      );

      const foto = await db.get('SELECT * FROM fotos WHERE id = ?', [resultado.lastInsertRowid]);
      res.status(201).json({ message: 'Foto subida', foto });
    } catch (error) {
      console.error('Error subiendo foto:', error);
      res.status(400).json({ error: error.message || 'Error al guardar la foto' });
    }
  });
});

// Actualizar el texto de una foto
router.put('/:id', async (req, res) => {
  try {
    const { nota, musculo, fecha } = req.body;

    const foto = await db.get('SELECT * FROM fotos WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!foto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    await db.run(
      'UPDATE fotos SET nota = ?, musculo = ?, fecha = ? WHERE id = ?',
      [
        nota !== undefined ? nota : foto.nota,
        musculo !== undefined ? musculo : foto.musculo,
        fecha || foto.fecha,
        req.params.id,
      ]
    );

    const actualizada = await db.get('SELECT * FROM fotos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Foto actualizada', foto: actualizada });
  } catch (error) {
    console.error('Error actualizando foto:', error);
    res.status(500).json({ error: 'Error al actualizar la foto' });
  }
});

// Eliminar una foto (borra tambien el archivo del disco)
router.delete('/:id', async (req, res) => {
  try {
    const foto = await db.get('SELECT * FROM fotos WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!foto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    await db.run('DELETE FROM fotos WHERE id = ?', [req.params.id]);
    await borrarArchivo(foto.archivo);

    res.json({ message: 'Foto eliminada' });
  } catch (error) {
    console.error('Error eliminando foto:', error);
    res.status(500).json({ error: 'Error al eliminar la foto' });
  }
});

module.exports = router;