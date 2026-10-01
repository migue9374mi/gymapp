const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Listar rutinas públicas de la comunidad, con filtros y busqueda
router.get('/rutinas', async (req, res) => {
  try {
    const { buscar, categoria, musculo, orden } = req.query;

    let sql = `
      SELECT r.id, r.nombre, r.descripcion, r.categoria, r.fecha_creacion,
             r.user_id, u.nombre as autor,
             (SELECT COUNT(*) FROM ejercicios WHERE rutina_id = r.id) as num_ejercicios,
             (SELECT COUNT(*) FROM comentarios WHERE rutina_id = r.id) as num_comentarios,
             (SELECT COUNT(*) FROM likes WHERE rutina_id = r.id) as num_likes,
             EXISTS(SELECT 1 FROM likes WHERE rutina_id = r.id AND user_id = ?) as me_gusta
      FROM rutinas r
      JOIN users u ON r.user_id = u.id
      WHERE r.es_publica = 1`;
    const params = [req.userId];

    if (buscar && buscar.trim()) {
      const termino = `%${buscar.trim()}%`;
      sql += ` AND (r.nombre LIKE ? OR r.descripcion LIKE ? OR u.nombre LIKE ?
               OR EXISTS(SELECT 1 FROM ejercicios e WHERE e.rutina_id = r.id AND e.nombre LIKE ?))`;
      params.push(termino, termino, termino, termino);
    }

    if (categoria && categoria !== 'todas') {
      sql += ' AND r.categoria = ?';
      params.push(categoria);
    }

    if (musculo && musculo !== 'todos') {
      sql += ` AND EXISTS(SELECT 1 FROM ejercicios e WHERE e.rutina_id = r.id AND e.musculo = ?)`;
      params.push(musculo);
    }

    // Orden: más novedades, más me gusta o más comentadas
    if (orden === 'likes') {
      sql += ' ORDER BY num_likes DESC, r.fecha_creacion DESC';
    } else if (orden === 'comentarios') {
      sql += ' ORDER BY num_comentarios DESC, r.fecha_creacion DESC';
    } else {
      sql += ' ORDER BY r.fecha_creacion DESC';
    }

    const rutinas = await db.all(sql, params);
    res.json({ rutinas });
  } catch (error) {
    console.error('Error obteniendo rutinas de la comunidad:', error);
    res.status(500).json({ error: 'Error al obtener la comunidad' });
  }
});

// Ver una rutina publica con sus ejercicios y comentarios
router.get('/rutinas/:id', async (req, res) => {
  try {
    const rutina = await db.get(
      `SELECT r.*, u.nombre as autor,
        (SELECT COUNT(*) FROM comentarios WHERE rutina_id = r.id) as num_comentarios,
        (SELECT COUNT(*) FROM likes WHERE rutina_id = r.id) as num_likes,
        EXISTS(SELECT 1 FROM likes WHERE rutina_id = r.id AND user_id = ?) as me_gusta
       FROM rutinas r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ? AND r.es_publica = 1`,
      [req.userId, req.params.id]
    );

    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada o no es publica' });
    }

    const ejercicios = await db.all(
      'SELECT * FROM ejercicios WHERE rutina_id = ? ORDER BY orden, id',
      [req.params.id]
    );

    const comentarios = await db.all(
      `SELECT c.id, c.texto, c.fecha, u.nombre as autor
       FROM comentarios c
       JOIN users u ON c.user_id = u.id
       WHERE c.rutina_id = ?
       ORDER BY c.fecha DESC`,
      [req.params.id]
    );

    res.json({
      rutina,
      ejercicios,
      comentarios,
      esMia: rutina.user_id === req.userId,
    });
  } catch (error) {
    console.error('Error obteniendo rutina de la comunidad:', error);
    res.status(500).json({ error: 'Error al obtener la rutina' });
  }
});

// Dar o quitar like
router.post('/rutinas/:id/like', async (req, res) => {
  try {
    const rutina = await db.get('SELECT id FROM rutinas WHERE id = ? AND es_publica = 1', [req.params.id]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const existente = await db.get(
      'SELECT id FROM likes WHERE rutina_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (existente) {
      await db.run('DELETE FROM likes WHERE id = ?', [existente.id]);
    } else {
      await db.run('INSERT INTO likes (rutina_id, user_id) VALUES (?, ?)', [req.params.id, req.userId]);
    }

    const total = (await db.get(
      'SELECT COUNT(*) as n FROM likes WHERE rutina_id = ?',
      [req.params.id]
    )).n;

    res.json({ me_gusta: !existente, num_likes: total });
  } catch (error) {
    console.error('Error en like:', error);
    res.status(500).json({ error: 'Error al marcar la rutina' });
  }
});

// Añadir comentario
router.post('/rutinas/:id/comentarios', async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacio' });
    }

    const rutina = await db.get('SELECT id FROM rutinas WHERE id = ? AND es_publica = 1', [req.params.id]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const resultado = await db.run(
      'INSERT INTO comentarios (rutina_id, user_id, texto) VALUES (?, ?, ?)',
      [req.params.id, req.userId, texto.trim()]
    );

    const comentario = await db.get(
      `SELECT c.id, c.texto, c.fecha, u.nombre as autor
       FROM comentarios c JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [resultado.lastInsertRowid]
    );

    const total = (await db.get(
      'SELECT COUNT(*) as n FROM comentarios WHERE rutina_id = ?',
      [req.params.id]
    )).n;

    res.status(201).json({ comentario, num_comentarios: total });
  } catch (error) {
    console.error('Error anadiendo comentario:', error);
    res.status(500).json({ error: 'Error al anadir el comentario' });
  }
});

// Borrar tu propio comentario
router.delete('/comentarios/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM comentarios WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Comentario eliminado' });
  } catch (error) {
    console.error('Error eliminando comentario:', error);
    res.status(500).json({ error: 'Error al eliminar el comentario' });
  }
});

// Copiar una rutina publica a tu cuenta
router.post('/rutinas/:id/copiar', async (req, res) => {
  try {
    const origen = await db.get(
      'SELECT * FROM rutinas WHERE id = ? AND es_publica = 1',
      [req.params.id]
    );
    if (!origen) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    // No se puede copiar una rutina que ya es tuya
    if (origen.user_id === req.userId) {
      return res.status(400).json({ error: 'Esta rutina ya es tuya' });
    }

    const resultado = await db.run(
      'INSERT INTO rutinas (user_id, nombre, descripcion, categoria) VALUES (?, ?, ?, ?)',
      [
        req.userId,
        `${origen.nombre} (copia)`,
        origen.descripcion || 'Copia de una rutina de la comunidad',
        origen.categoria,
      ]
    );
    const nuevaId = resultado.lastInsertRowid;

    const ejercicios = await db.all(
      'SELECT * FROM ejercicios WHERE rutina_id = ? ORDER BY orden, id',
      [req.params.id]
    );
    for (const e of ejercicios) {
      await db.run(
        'INSERT INTO ejercicios (rutina_id, nombre, series, reps, peso, descanso, musculo, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nuevaId, e.nombre, e.series, e.reps, e.peso, e.descanso, e.musculo, e.orden]
      );
    }

    res.status(201).json({
      message: `Rutina copiada con ${ejercicios.length} ejercicio(s)`,
      rutina_id: nuevaId,
    });
  } catch (error) {
    console.error('Error copiando rutina:', error);
    res.status(500).json({ error: 'Error al copiar la rutina' });
  }
});

module.exports = router;