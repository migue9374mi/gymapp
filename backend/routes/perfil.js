const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Resumen completo del perfil, basado solo en rutinas finalizadas
router.get('/', async (req, res) => {
  try {
    const uid = req.userId;

    const usuario = await db.get(
      'SELECT id, nombre, email, fecha_registro FROM users WHERE id = ?',
      [uid]
    );

    // --- Totales de rutinas finalizadas ---
    const totales = await db.get(
      `SELECT COUNT(*) as entrenamientos,
              COALESCE(SUM(duracion_minutos), 0) as minutos,
              COUNT(DISTINCT fecha) as dias
       FROM sesiones WHERE user_id = ? AND finalizada = 1`,
      [uid]
    );

    // --- Volumen total levantado (peso x reps de cada serie registrada) ---
    const volumen = (await db.get(
      `SELECT COALESCE(SUM(ss.peso * COALESCE(ss.reps, se.reps)), 0) as total
       FROM sesiones_series ss
       JOIN sesiones s ON ss.sesion_id = s.id
       JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id
       WHERE s.user_id = ? AND s.finalizada = 1`,
      [uid]
    )).total;

    // --- Repeticiones totales ---
    const reps = (await db.get(
      `SELECT COALESCE(SUM(COALESCE(ss.reps, se.reps)), 0) as total
       FROM sesiones_series ss
       JOIN sesiones s ON ss.sesion_id = s.id
       JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id
       WHERE s.user_id = ? AND s.finalizada = 1`,
      [uid]
    )).total;

    // --- Distribucion por musculo (volumen y tiempo de series) ---
    const porMusculo = await db.all(
      `SELECT se.musculo,
              SUM(ss.peso * COALESCE(ss.reps, se.reps)) as volumen,
              COUNT(ss.id) as series
       FROM sesiones_series ss
       JOIN sesiones s ON ss.sesion_id = s.id
       JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id
       WHERE s.user_id = ? AND s.finalizada = 1 AND se.musculo IS NOT NULL
       GROUP BY se.musculo
       ORDER BY volumen DESC`,
      [uid]
    );

    // --- Ejercicios mas trabajados (volumen) ---
    const topEjercicios = await db.all(
      `SELECT se.nombre,
              SUM(ss.peso * COALESCE(ss.reps, se.reps)) as volumen,
              COUNT(ss.id) as series,
              MAX(ss.peso) as max_peso
       FROM sesiones_series ss
       JOIN sesiones s ON ss.sesion_id = s.id
       JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id
       WHERE s.user_id = ? AND s.finalizada = 1
       GROUP BY se.nombre
       ORDER BY volumen DESC
       LIMIT 5`,
      [uid]
    );

    // --- Records personales: maximo de peso por ejercicio ---
    const records = await db.all(
      `SELECT se.nombre, MAX(ss.peso) as max_peso, se.musculo
       FROM sesiones_series ss
       JOIN sesiones s ON ss.sesion_id = s.id
       JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id
       WHERE s.user_id = ? AND s.finalizada = 1 AND ss.peso > 0
       GROUP BY se.nombre
       ORDER BY max_peso DESC
       LIMIT 5`,
      [uid]
    );

    // --- Rachas ---
    const fechas = (await db.all(
      'SELECT DISTINCT fecha FROM sesiones WHERE user_id = ? AND finalizada = 1 ORDER BY fecha DESC',
      [uid]
    )).map((f) => {
      const [y, m, d] = f.fecha.split('-').map(Number);
      return new Date(y, m - 1, d);
    });

    let rachaDiaria = 0;
    if (fechas.length > 0) {
      rachaDiaria = 1;
      for (let i = 1; i < fechas.length; i++) {
        const diff = Math.round((fechas[i - 1] - fechas[i]) / (1000 * 60 * 60 * 24));
        if (diff === 1) rachaDiaria++;
        else break;
      }
    }

    // --- Ultimas 6 rutinas finalizadas ---
    const ultimas = await db.all(
      `SELECT s.id, s.fecha, s.hora_inicio, s.hora_fin, s.duracion_minutos, r.nombre as rutina_nombre
       FROM sesiones s
       LEFT JOIN rutinas r ON s.rutina_id = r.id
       WHERE s.user_id = ? AND s.finalizada = 1
       ORDER BY s.fecha DESC, s.id DESC
       LIMIT 6`,
      [uid]
    );

    // --- Rutinas propias y publicadas ---
    const rutinasCreadas = (await db.get(
      'SELECT COUNT(*) as total FROM rutinas WHERE user_id = ?',
      [uid]
    )).total;

    const rutinasPublicadas = (await db.get(
      'SELECT COUNT(*) as total FROM rutinas WHERE user_id = ? AND es_publica = 1',
      [uid]
    )).total;

    // --- Ultima medida corporal (peso, altura, IMC) ---
    const ultimaMedida = await db.get(
      'SELECT peso, altura, fecha FROM medidas WHERE user_id = ? ORDER BY fecha DESC LIMIT 1',
      [uid]
    );

    let imc = null;
    let categoriaIMC = null;
    if (ultimaMedida) {
      const m = ultimaMedida.altura / 100;
      imc = (ultimaMedida.peso / (m * m)).toFixed(1);
      const v = parseFloat(imc);
      if (v < 18.5) categoriaIMC = 'Bajo peso';
      else if (v < 25) categoriaIMC = 'Peso normal';
      else if (v < 30) categoriaIMC = 'Sobrepeso';
      else if (v < 35) categoriaIMC = 'Obesidad grado I';
      else if (v < 40) categoriaIMC = 'Obesidad grado II';
      else categoriaIMC = 'Obesidad grado III';
    }

    // --- Progreso de peso ---
    const pesos = await db.all(
      'SELECT fecha, peso FROM medidas WHERE user_id = ? ORDER BY fecha ASC',
      [uid]
    );
    const cambioPeso = pesos.length >= 2
      ? (pesos[pesos.length - 1].peso - pesos[0].peso).toFixed(1)
      : 0;

    res.json({
      usuario,
      resumen: {
        entrenamientos: totales.entrenamientos,
        minutos: totales.minutos,
        dias: totales.dias,
        volumen: Math.round(volumen),
        repeticiones: reps,
        rachaDiaria,
        rutinasCreadas,
        rutinasPublicadas,
      },
      porMusculo,
      topEjercicios,
      records,
      ultimas,
      corporal: {
        ...(ultimaMedida || {}),
        imc,
        categoria: categoriaIMC,
        cambioPeso,
      },
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
});

module.exports = router;