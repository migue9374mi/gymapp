const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

// Descanso recomendado en segundos segun el grupo muscular
const DESCANSO_SUGERIDO = {
  piernas: 180, gluteos: 180, pantorrillas: 90,
  pecho: 120, espalda: 120, hombro: 90, clavicular: 90,
  biceps: 60, triceps: 60, antebrazo: 60, core: 60,
  cardio: 45, otro: 90,
}

function calcularDescanso(musculo, series) {
  const base = DESCANSO_SUGERIDO[String(musculo || 'otro').toLowerCase()] ?? 90;
  const n = parseInt(series) || 3;
  if (n >= 5) return base + 30;
  if (n <= 2) return Math.max(30, base - 30);
  return base;
}

// Hora actual del servidor en formato HH:MM
function ahoraHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Convierte "HH:MM" a minutos desde medianoche
function horaAMinutos(hora) {
  if (!hora) return null;
  const match = String(hora).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

// Calcula la duracion en minutos a partir de hora de inicio y fin.
// Si termina antes de empezar, se asume que cruzo la medianoche.
function calcularDuracion(horaInicio, horaFin) {
  const inicio = horaAMinutos(horaInicio);
  const fin = horaAMinutos(horaFin);
  if (inicio === null || fin === null) return null;
  let diff = fin - inicio;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

// ==================== SESIONES ====================

// Registrar un entrenamiento terminado
router.post('/sesiones', async (req, res) => {
  try {
    const { rutina_id, fecha, hora_inicio, hora_fin, notas } = req.body;

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es obligatoria' });
    }

    // La duracion se calcula a partir de la hora de inicio y la de finalizacion
    let duracion = calcularDuracion(hora_inicio, hora_fin);

    if (hora_inicio && hora_fin && duracion === null) {
      return res.status(400).json({ error: 'El formato de la hora debe ser HH:MM' });
    }

    // Si no se indictaron horas, estimarla segun los ejercicios de la rutina
    if (duracion === null) {
      if (rutina_id) {
        const ejercicios = await db.all('SELECT series, descanso FROM ejercicios WHERE rutina_id = ?', [rutina_id]);
        const segundos = ejercicios.reduce((sum, e) => sum + (e.series * (45 + e.descanso)), 0);
        duracion = Math.max(1, Math.round(segundos / 60));
      } else {
        duracion = 0;
      }
    }

    const result = await db.run(
      'INSERT INTO sesiones (user_id, rutina_id, fecha, duracion_minutos, notas, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.userId, rutina_id || null, fecha, duracion, notas || '', hora_inicio || null, hora_fin || null]
    );

    const sesion = await db.get('SELECT * FROM sesiones WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Entrenamiento registrado', sesion });
  } catch (error) {
    console.error('Error registrando sesion:', error);
    res.status(500).json({ error: 'Error al registrar el entrenamiento' });
  }
});

// Listar sesiones por rango de fechas
router.get('/sesiones', async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    let sql = `
      SELECT s.*, r.nombre as rutina_nombre, r.categoria
      FROM sesiones s
      LEFT JOIN rutinas r ON s.rutina_id = r.id
      WHERE s.user_id = ?`;
    const params = [req.userId];

    if (desde) { sql += ' AND s.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND s.fecha <= ?'; params.push(hasta); }

    sql += ' ORDER BY s.fecha DESC';

    const sesiones = await db.all(sql, params);
    res.json({ sesiones });
  } catch (error) {
    console.error('Error listando sesiones:', error);
    res.status(500).json({ error: 'Error al obtener entrenamientos' });
  }
});

// Ver una sesion con sus ejercicios
router.get('/sesiones/:id', async (req, res) => {
  try {
    const sesion = await db.get('SELECT * FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    const ejercicios = await db.all(
      'SELECT * FROM sesiones_ejercicios WHERE sesion_id = ? ORDER BY id',
      [req.params.id]
    );

    const todasSeries = await db.all(
      'SELECT sesion_ejercicio_id, numero_serie, peso, reps FROM sesiones_series WHERE sesion_id = ? ORDER BY numero_serie',
      [req.params.id]
    );

    // Calcular el estado de cada ejercicio y adjuntar sus series
    ejercicios.forEach((ej) => {
      const suyas = todasSeries.filter((s) => s.sesion_ejercicio_id === ej.id);
      ej.series_registradas = suyas;
      // rojo = sin iniciar, amarillo = a medias, verde = terminado
      if (suyas.length === 0) {
        ej.estado = 'rojo';
      } else if (suyas.length < ej.series) {
        ej.estado = 'amarillo';
      } else {
        ej.estado = 'verde';
      }
    });

    res.json({ sesion: { ...sesion, ejercicios } });
  } catch (error) {
    console.error('Error obteniendo sesion:', error);
    res.status(500).json({ error: 'Error al obtener el entrenamiento' });
  }
});

// Registrar el peso/reps de una serie
router.post('/sesiones/:id/series', async (req, res) => {
  try {
    const { ejercicio_id, numero_serie, peso, reps } = req.body;

    const sesion = await db.get('SELECT id FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    const ejercicio = await db.get(
      'SELECT * FROM sesiones_ejercicios WHERE id = ? AND sesion_id = ?',
      [ejercicio_id, req.params.id]
    );
    if (!ejercicio) {
      return res.status(404).json({ error: 'Ejercicio no encontrado en este entrenamiento' });
    }

    const numero = parseInt(numero_serie);
    if (!numero || numero < 1) {
      return res.status(400).json({ error: 'Numero de serie invalido' });
    }

    // INSERT OR REPLACE para poder corregir una serie ya registrada
    await db.run(
      `INSERT OR REPLACE INTO sesiones_series (sesion_id, sesion_ejercicio_id, numero_serie, peso, reps)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, ejercicio_id, numero, parseFloat(peso) || 0, reps ? parseInt(reps) : null]
    );

    const serie = await db.get(
      'SELECT * FROM sesiones_series WHERE sesion_ejercicio_id = ? AND numero_serie = ?',
      [ejercicio_id, numero]
    );

    res.status(201).json({ message: `Serie ${numero} registrada`, serie });
  } catch (error) {
    console.error('Error registrando serie:', error);
    res.status(500).json({ error: 'Error al registrar la serie' });
  }
});

// Borrar una serie registrada (por si te equivocaste)
router.delete('/sesiones/:id/series/:ejercicioId/:numero', async (req, res) => {
  try {
    const sesion = await db.get('SELECT id FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    await db.run(
      'DELETE FROM sesiones_series WHERE sesion_id = ? AND sesion_ejercicio_id = ? AND numero_serie = ?',
      [req.params.id, req.params.ejercicioId, parseInt(req.params.numero)]
    );

    res.json({ message: 'Serie eliminada' });
  } catch (error) {
    console.error('Error eliminando serie:', error);
    res.status(500).json({ error: 'Error al eliminar la serie' });
  }
});

// Finalizar la rutina: guarda la hora de fin y calcula la duracion automaticamente
router.post('/sesiones/:id/finalizar', async (req, res) => {
  try {
    const { hora_inicio, hora_fin } = req.body;

    const sesion = await db.get('SELECT * FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    const ahora = ahoraHHMM();
    const inicio = hora_inicio || sesion.hora_inicio || ahora;
    const fin = hora_fin || ahora;

    const duracion = calcularDuracion(inicio, fin);
    if (duracion === null) {
      return res.status(400).json({ error: 'El formato de la hora debe ser HH:MM' });
    }

    await db.run(
      'UPDATE sesiones SET hora_inicio = ?, hora_fin = ?, duracion_minutos = ?, finalizada = 1 WHERE id = ?',
      [inicio, fin, duracion, req.params.id]
    );

    const actualizada = await db.get('SELECT * FROM sesiones WHERE id = ?', [req.params.id]);
    res.json({
      message: 'Rutina finalizada',
      sesion: actualizada,
      duracion_minutos: duracion,
      hora_inicio: inicio,
      hora_fin: fin
    });
  } catch (error) {
    console.error('Error finalizando sesion:', error);
    res.status(500).json({ error: 'Error al finalizar la rutina' });
  }
});

// Actualizar una sesion (horas y notas)
router.put('/sesiones/:id', async (req, res) => {
  try {
    const { hora_inicio, hora_fin, notas } = req.body;

    const sesion = await db.get('SELECT * FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    const inicio = hora_inicio !== undefined ? hora_inicio : sesion.hora_inicio;
    const fin = hora_fin !== undefined ? hora_fin : sesion.hora_fin;

    if (hora_inicio && hora_fin && calcularDuracion(hora_inicio, hora_fin) === null) {
      return res.status(400).json({ error: 'El formato de la hora debe ser HH:MM' });
    }

    const duracion = calcularDuracion(inicio, fin);

    await db.run(
      'UPDATE sesiones SET hora_inicio = ?, hora_fin = ?, duracion_minutos = ?, notas = ? WHERE id = ?',
      [inicio || null, fin || null, duracion !== null ? duracion : (sesion.duracion_minutos || 0), notas ?? (sesion.notas || ''), req.params.id]
    );

    const actualizada = await db.get('SELECT * FROM sesiones WHERE id = ?', [req.params.id]);
    res.json({ message: 'Entrenamiento actualizado', sesion: actualizada });
  } catch (error) {
    console.error('Error actualizando sesion:', error);
    res.status(500).json({ error: 'Error al actualizar el entrenamiento' });
  }
});

router.delete('/sesiones/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Entrenamiento eliminado' });
  } catch (error) {
    console.error('Error eliminando sesion:', error);
    res.status(500).json({ error: 'Error al eliminar entrenamiento' });
  }
});

// ==================== EJERCICIOS EXTRA ====================

// Copiar los ejercicios de una rutina a una sesion recien creada
router.post('/sesiones/:id/copiar-rutina', async (req, res) => {
  try {
    const { rutina_id } = req.body;

    const sesion = await db.get('SELECT id FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    const rutina = await db.get('SELECT id FROM rutinas WHERE id = ? AND user_id = ?', [rutina_id, req.userId]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const yaCopiados = await db.get('SELECT COUNT(*) as n FROM sesiones_ejercicios WHERE sesion_id = ?', [req.params.id]);
    if (yaCopiados.n > 0) {
      return res.status(400).json({ error: 'Esta sesion ya tiene ejercicios' });
    }

    const ejercicios = await db.all('SELECT * FROM ejercicios WHERE rutina_id = ? ORDER BY orden', [rutina_id]);
    for (const e of ejercicios) {
      await db.run(
        'INSERT INTO sesiones_ejercicios (sesion_id, ejercicio_id, nombre, musculo, series, reps, peso, descanso, es_extra, justificacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
        [req.params.id, e.id, e.nombre, e.musculo, e.series, e.reps, e.peso, e.descanso, null]
      );
    }

    res.json({ message: `${ejercicios.length} ejercicios copiados` });
  } catch (error) {
    console.error('Error copiando rutina:', error);
    res.status(500).json({ error: 'Error al copiar los ejercicios' });
  }
});

// Anadir un ejercicio extra a una sesion (solo ese dia)
router.post('/sesiones/:id/extra', async (req, res) => {
  try {
    const { nombre, musculo, series, reps, peso, descanso, justificacion } = req.body;

    const sesion = await db.get('SELECT id FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del ejercicio es obligatorio' });
    }

    await db.run(
      'INSERT INTO sesiones_ejercicios (sesion_id, nombre, musculo, series, reps, peso, descanso, es_extra, justificacion) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
      [
        req.params.id,
        nombre.trim(),
        musculo || 'otro',
        parseInt(series) || 3,
        (reps !== undefined && reps !== null && reps !== '') ? parseInt(reps) : null,
        (peso !== undefined && peso !== null && peso !== '') ? parseFloat(peso) : null,
        calcularDescanso(musculo, series),
        justificacion || ''
      ]
    );

    res.status(201).json({ message: 'Ejercicio extra anadido a esta sesion' });
  } catch (error) {
    console.error('Error anadiendo extra:', error);
    res.status(500).json({ error: 'Error al anadir el ejercicio extra' });
  }
});

// Quitar un ejercicio de la sesion, con justificacion
router.delete('/sesiones/:id/ejercicio/:ejercicioId', async (req, res) => {
  try {
    const { justificacion } = req.query;

    const sesion = await db.get('SELECT id FROM sesiones WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!sesion) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    const ejercicio = await db.get(
      'SELECT * FROM sesiones_ejercicios WHERE id = ? AND sesion_id = ?',
      [req.params.ejercicioId, req.params.id]
    );
    if (!ejercicio) {
      return res.status(404).json({ error: 'Ejercicio no encontrado en esta sesion' });
    }

    // Guardamos la justificacion como nota de la sesion antes de quitarlo
    if (justificacion) {
      const actual = sesion.notas || '';
      const nota = `Se quito "${ejercicio.nombre}": ${justificacion}`;
      await db.run('UPDATE sesiones SET notas = ? WHERE id = ?', [(actual ? actual + '\n' : '') + nota, req.params.id]);
    }

    await db.run('DELETE FROM sesiones_ejercicios WHERE id = ?', [req.params.ejercicioId]);

    res.json({ message: 'Ejercicio quitado de la sesion' });
  } catch (error) {
    console.error('Error quitando ejercicio:', error);
    res.status(500).json({ error: 'Error al quitar el ejercicio' });
  }
});

module.exports = router;