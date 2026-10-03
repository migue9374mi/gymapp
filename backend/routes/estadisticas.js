const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

// ==================== RACHAS ====================

// Calcula la racha semanal actual y la mejor
async function calcularRachaSemanal(userId) {
  // Obtener las ultimas 52 semanas
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  let semanasCompletadas = 0;
  let rachaActual = 0;
  let mejorRacha = 0;
  let rachaParcialActual = 0;

  for (let semana = 0; semana < 52; semana++) {
    // Fecha del lunes de esa semana
    const diasDesdeLunes = (hoy.getDay() + 6) % 7; // 0 = lunes
    const lunes = new Date(inicioHoy);
    lunes.setDate(lunes.getDate() - diasDesdeLunes - (semana * 7));

    const domingo = new Date(lunes);
    domingo.setDate(domingo.getDate() + 6);

    // Ver si tiene alguna rutina planificada esa semana
    const diasPlanificados = await db.all(
      'SELECT DISTINCT dia_semana FROM plan_semanal WHERE user_id = ?',
      [userId]
    );
    if (diasPlanificados.length === 0) {
      continue;
    }

    // Ver si completo esos dias en esa semana
    const inicioStr = lunes.toISOString().split('T')[0];
    const finStr = domingo.toISOString().split('T')[0];

    const diasCompletados = await db.all(
      `SELECT DISTINCT fecha FROM sesiones
       WHERE user_id = ? AND finalizada = 1 AND fecha >= ? AND fecha <= ?`,
      [userId, inicioStr, finStr]
    );

    // Dias de la semana que tenian rutina planificada
    const diasAEvaluar = diasPlanificados.map((d) => d.dia_semana);

    // Para cada dia planificado, ver si hay sesion
    let diasCompletadosCount = 0;
    for (const diaSemana of diasAEvaluar) {
      const fechaEsperada = new Date(lunes);
      fechaEsperada.setDate(fechaEsperada.getDate() + diaSemana);
      const fechaStr = fechaEsperada.toISOString().split('T')[0];

      const tiene = await db.get(
        'SELECT COUNT(*) as n FROM sesiones WHERE user_id = ? AND finalizada = 1 AND fecha = ?',
        [userId, fechaStr]
      );
      if (tiene.n > 0) diasCompletadosCount++;
    }

    const completo = diasCompletadosCount === diasAEvaluar.length;

    // Solo contar como completada si ya termino la semana
    const semanaTerminada = domingo < inicioHoy;

    if (completo) {
      semanasCompletadas++;
      if (semanaTerminada || semana === 0) {
        rachaActual++;
        mejorRacha = Math.max(mejorRacha, rachaActual);
      }
    } else {
      if (semana === 0) {
        rachaParcialActual = diasCompletadosCount;
      }
      if (semanaTerminada) {
        rachaActual = 0;
      }
    }
  }

  return {
    rachaActual,
    mejorRacha,
    semanasCompletadas,
    diasCompletadosEstaSemana: rachaParcialActual
  };
}

// Racha diaria de dias consecutivos
async function calcularRachaDiaria(userId) {
  const sesiones = await db.all(
    'SELECT DISTINCT fecha FROM sesiones WHERE user_id = ? AND finalizada = 1 ORDER BY fecha DESC',
    [userId]
  );
  if (sesiones.length === 0) return { rachaDiaria: 0, mejorRachaDiaria: 0 };

  // Convertir a objetos Date sin problemas de zona horaria
  const fechas = sesiones.map((s) => {
    const [y, m, d] = s.fecha.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  let racha = 1;
  for (let i = 1; i < fechas.length; i++) {
    const diff = Math.round((fechas[i - 1] - fechas[i]) / (1000 * 60 * 60 * 24));
    if (diff === 1) racha++;
    else break;
  }

  // Calcular mejor racha historica
  let mejor = 1;
  let actual = 1;
  for (let i = 1; i < fechas.length; i++) {
    const diff = Math.round((fechas[i - 1] - fechas[i]) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      actual++;
      mejor = Math.max(mejor, actual);
    } else {
      actual = 1;
    }
  }

  return { rachaDiaria: racha, mejorRachaDiaria: mejor };
}

// ==================== RUTAS ====================

// Obtener todas las estadisticas
router.get('/', async (req, res) => {
  try {
    const semanal = await calcularRachaSemanal(req.userId);
    const diaria = await calcularRachaDiaria(req.userId);

    // Dias de la semana con mas entrenamiento
    const porDiaSemana = new Array(7).fill(0);
    const sesiones = await db.all('SELECT fecha FROM sesiones WHERE user_id = ? AND finalizada = 1', [req.userId]);
    sesiones.forEach((s) => {
      const [y, m, d] = s.fecha.split('-').map(Number);
      const diaSemana = (new Date(y, m - 1, d).getDay() + 6) % 7;
      porDiaSemana[diaSemana]++;
    });

    // Tiempo total y por musculo
    const tiempoTotal = (await db.get(
      'SELECT COALESCE(SUM(duracion_minutos), 0) as total FROM sesiones WHERE user_id = ? AND finalizada = 1',
      [req.userId]
      )).total;

    // Volumen por musculo. Sale de las series realmente registradas (ss), no del
    // peso previsto del ejercicio: ese campo se deja en NULL a proposito, porque
    // el peso lo anota el usuario serie a serie al entrenar. Multiplicar por NULL
    // daba 0 siempre.
    const volumenPorMusculo = await db.all(
      `SELECT se.musculo, COALESCE(SUM(ss.peso * COALESCE(ss.reps, se.reps)), 0) as volumen, COUNT(DISTINCT s.id) as veces, COUNT(ss.id) as series
       FROM sesiones_series ss
       JOIN sesiones s ON ss.sesion_id = s.id
       JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id
       WHERE s.user_id = ? AND s.finalizada = 1 AND se.musculo IS NOT NULL
       GROUP BY se.musculo ORDER BY volumen DESC`,
      [req.userId]
    );

    // Dias de descanso entre sesiones
    const fechasUnicas = (await db.all(
      'SELECT DISTINCT fecha FROM sesiones WHERE user_id = ? AND finalizada = 1 ORDER BY fecha',
      [req.userId]
    )).map((f) => {
      const [y, m, d] = f.fecha.split('-').map(Number);
      return new Date(y, m - 1, d);
    });

    const descansos = [];
    for (let i = 1; i < fechasUnicas.length; i++) {
      const diff = Math.round((fechasUnicas[i] - fechasUnicas[i - 1]) / (1000 * 60 * 60 * 24));
      descansos.push(diff);
    }

    const diasDescansoPromedio = descansos.length > 0
      ? (descansos.reduce((a, b) => a + b, 0) / descansos.length).toFixed(1)
      : 0;

    const maxDescanso = descansos.length > 0 ? Math.max(...descansos) : 0;
    const minDescanso = descansos.length > 0 ? Math.min(...descansos) : 0;

    res.json({
      rachas: { ...semanal, ...diaria },
      diasSemana: porDiaSemana,
      nombresDias: DIAS,
      tiempoTotal,
      volumenPorMusculo,
      descansos: {
        promedio: diasDescansoPromedio,
        maximo: maxDescanso,
        minimo: minDescanso
      },
      totalEntrenamientos: sesiones.length
    });
  } catch (error) {
    console.error('Error obteniendo estadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
});

// Historial de las ultimas semanas (para graficos)
router.get('/historial', async (req, res) => {
  try {
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const diasDesdeLunes = (hoy.getDay() + 6) % 7;

    const historial = [];
    for (let semana = 7; semana >= 0; semana--) {
      const lunes = new Date(inicioHoy);
      lunes.setDate(lunes.getDate() - diasDesdeLunes - (semana * 7));

      const domingo = new Date(lunes);
      domingo.setDate(domingo.getDate() + 6);

      const inicioStr = lunes.toISOString().split('T')[0];
      const finStr = domingo.toISOString().split('T')[0];

      const total = await db.get(
        'SELECT COUNT(*) as n, SUM(duracion_minutos) as minutos FROM sesiones WHERE user_id = ? AND finalizada = 1 AND fecha >= ? AND fecha <= ?',
        [req.userId, inicioStr, finStr]
      );

      historial.push({
        semana: `S${8 - semana}`,
        fechaInicio: inicioStr,
        fechaFin: finStr,
        entrenamientos: total.n || 0,
        minutos: total.minutos || 0
      });
    }

    res.json({ historial });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

module.exports = router;