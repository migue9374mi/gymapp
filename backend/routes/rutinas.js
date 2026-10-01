const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Descanso recomendado en segundos segun el grupo muscular.
// Los ejercicios compuestos (movimientos grandes) necesitan mas recuperacion
// que los de aislamiento.
const DESCANSO_SUGERIDO = {
  piernas: 180,
  gluteos: 180,
  pantorrillas: 90,
  pecho: 120,
  espalda: 120,
  hombro: 90,
  clavicular: 90,
  biceps: 60,
  triceps: 60,
  antebrazo: 60,
  core: 60,
  cardio: 45,
  otro: 90,
}

// Calcula el descanso automaticamente a partir del musculo y las series
function calcularDescanso(musculo, series) {
  const base = DESCANSO_SUGERIDO[String(musculo || 'otro').toLowerCase()] ?? 90;
  const n = parseInt(series) || 3;
  // Con muchas series se añade algo mas de recuperacion
  if (n >= 5) return base + 30;
  if (n <= 2) return Math.max(30, base - 30);
  return base;
}

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Listar rutinas del usuario
router.get('/', async (req, res) => {
  try {
    const rutinas = await db.all(
      `SELECT r.*,
        (SELECT COUNT(*) FROM ejercicios WHERE rutina_id = r.id) as num_ejercicios,
        (SELECT COUNT(*) FROM entrenamientos WHERE rutina_id = r.id) as veces_entrenada
       FROM rutinas r
       WHERE r.user_id = ?
       ORDER BY r.fecha_creacion DESC`,
      [req.userId]
    );
    res.json({ rutinas });
  } catch (error) {
    console.error('Error listando rutinas:', error);
    res.status(500).json({ error: 'Error al obtener rutinas' });
  }
});

// Obtener una rutina con sus ejercicios
router.get('/:id', async (req, res) => {
  try {
    const rutina = await db.get('SELECT * FROM rutinas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);

    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const ejercicios = await db.all(
      'SELECT * FROM ejercicios WHERE rutina_id = ? ORDER BY orden, id',
      [req.params.id]
    );

    res.json({ rutina: { ...rutina, ejercicios } });
  } catch (error) {
    console.error('Error obteniendo rutina:', error);
    res.status(500).json({ error: 'Error al obtener rutina' });
  }
});

// Crear rutina
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, categoria } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la rutina es obligatorio' });
    }

    const result = await db.run(
      'INSERT INTO rutinas (user_id, nombre, descripcion, categoria) VALUES (?, ?, ?, ?)',
      [req.userId, nombre.trim(), descripcion || '', categoria || 'general']
    );

    const rutina = await db.get('SELECT * FROM rutinas WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Rutina creada', rutina });
  } catch (error) {
    console.error('Error creando rutina:', error);
    res.status(500).json({ error: 'Error al crear rutina' });
  }
});

// Actualizar rutina
router.put('/:id', async (req, res) => {
  try {
    const { nombre, descripcion, categoria } = req.body;

    const existente = await db.get('SELECT * FROM rutinas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existente) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la rutina es obligatorio' });
    }

    await db.run(
      'UPDATE rutinas SET nombre = ?, descripcion = ?, categoria = ? WHERE id = ?',
      [nombre.trim(), descripcion || '', categoria || 'general', req.params.id]
    );

    const rutina = await db.get('SELECT * FROM rutinas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Rutina actualizada', rutina });
  } catch (error) {
    console.error('Error actualizando rutina:', error);
    res.status(500).json({ error: 'Error al actualizar rutina' });
  }
});

// Eliminar rutina (los ejercicios se borran en cascada)
router.delete('/:id', async (req, res) => {
  try {
    const rutina = await db.get('SELECT * FROM rutinas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    await db.run('DELETE FROM rutinas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Rutina eliminada' });
  } catch (error) {
    console.error('Error eliminando rutina:', error);
    res.status(500).json({ error: 'Error al eliminar rutina' });
  }
});

// Hacer publica / privada
router.patch('/:id/publicar', async (req, res) => {
  try {
    const rutina = await db.get('SELECT * FROM rutinas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const nuevoEstado = rutina.es_publica ? 0 : 1;
    await db.run('UPDATE rutinas SET es_publica = ? WHERE id = ?', [nuevoEstado, req.params.id]);

    res.json({
      message: nuevoEstado ? 'Rutina compartida con la comunidad' : 'Rutina ahora es privada',
      es_publica: nuevoEstado
    });
  } catch (error) {
    console.error('Error cambiando visibilidad:', error);
    res.status(500).json({ error: 'Error al cambiar visibilidad' });
  }
});

// === EJERCICIOS ===

// Añadir ejercicio a una rutina
router.post('/:id/ejercicios', async (req, res) => {
  try {
    const rutina = await db.get('SELECT id FROM rutinas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const { nombre, series, reps, peso, descanso, musculo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del ejercicio es obligatorio' });
    }

    // Calcular el siguiente orden
    const ultimo = await db.get('SELECT MAX(orden) as max FROM ejercicios WHERE rutina_id = ?', [req.params.id]);
    const orden = (ultimo?.max || 0) + 1;

    // reps y peso quedan en NULL si no se proporcionan: no se inventan datos
    const repsValor = (reps !== undefined && reps !== null && reps !== '') ? parseInt(reps) : null;
    const pesoValor = (peso !== undefined && peso !== null && peso !== '') ? parseFloat(peso) : null;

    const result = await db.run(
      'INSERT INTO ejercicios (rutina_id, nombre, series, reps, peso, descanso, musculo, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.params.id,
        nombre.trim(),
        parseInt(series) || 3,
        repsValor,
        pesoValor,
        calcularDescanso(musculo, series),
        musculo || 'otro',
        orden
      ]
    );

    const ejercicio = await db.get('SELECT * FROM ejercicios WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Ejercicio añadido', ejercicio });
  } catch (error) {
    console.error('Error añadiendo ejercicio:', error);
    res.status(500).json({ error: 'Error al añadir ejercicio' });
  }
});

// Actualizar ejercicio
router.put('/:id/ejercicios/:ejercicioId', async (req, res) => {
  try {
    const rutina = await db.get('SELECT id FROM rutinas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const ejercicio = await db.get(
      'SELECT * FROM ejercicios WHERE id = ? AND rutina_id = ?',
      [req.params.ejercicioId, req.params.id]
    );
    if (!ejercicio) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    const { nombre, series, reps, peso, descanso, musculo } = req.body;

    const musculoFinal = musculo || ejercicio.musculo;
    const seriesFinal = parseInt(series) || ejercicio.series;

    await db.run(
      'UPDATE ejercicios SET nombre = ?, series = ?, reps = ?, peso = ?, descanso = ?, musculo = ? WHERE id = ?',
      [
        (nombre || ejercicio.nombre).trim(),
        seriesFinal,
        (reps !== undefined && reps !== null && reps !== '') ? parseInt(reps) : ejercicio.reps,
        (peso !== undefined && peso !== null && peso !== '') ? parseFloat(peso) : ejercicio.peso,
        calcularDescanso(musculoFinal, seriesFinal),
        musculoFinal,
        req.params.ejercicioId
      ]
    );

    const actualizado = await db.get('SELECT * FROM ejercicios WHERE id = ?', [req.params.ejercicioId]);
    res.json({ message: 'Ejercicio actualizado', ejercicio: actualizado });
  } catch (error) {
    console.error('Error actualizando ejercicio:', error);
    res.status(500).json({ error: 'Error al actualizar ejercicio' });
  }
});

// Eliminar ejercicio
router.delete('/:id/ejercicios/:ejercicioId', async (req, res) => {
  try {
    const rutina = await db.get('SELECT id FROM rutinas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    await db.run('DELETE FROM ejercicios WHERE id = ? AND rutina_id = ?', [req.params.ejercicioId, req.params.id]);
    res.json({ message: 'Ejercicio eliminado' });
  } catch (error) {
    console.error('Error eliminando ejercicio:', error);
    res.status(500).json({ error: 'Error al eliminar ejercicio' });
  }
});

module.exports = router;