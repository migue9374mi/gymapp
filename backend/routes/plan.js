const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

// Ver el plan semanal completo (rutinas asignadas por dia)
router.get('/', async (req, res) => {
  try {
    const plan = await db.all(
      `SELECT ps.id as plan_id, ps.dia_semana, ps.rutina_id,
        r.nombre, r.categoria, r.descripcion
       FROM plan_semanal ps
       JOIN rutinas r ON ps.rutina_id = r.id
       WHERE ps.user_id = ?
       ORDER BY ps.dia_semana, ps.orden`,
      [req.userId]
    );

    // Agrupar por dia
    const porDia = {};
    for (let i = 0; i < 7; i++) {
      porDia[i] = { dia: i, nombre: DIAS[i], rutinas: [] };
    }
    plan.forEach((p) => {
      porDia[p.dia_semana].rutinas.push({
        plan_id: p.plan_id,
        rutina_id: p.rutina_id,
        nombre: p.nombre,
        categoria: p.categoria,
        descripcion: p.descripcion
      });
    });

    res.json({ plan: Object.values(porDia) });
  } catch (error) {
    console.error('Error obteniendo plan:', error);
    res.status(500).json({ error: 'Error al obtener el plan semanal' });
  }
});

// Asignar una rutina a un dia
router.post('/', async (req, res) => {
  try {
    const { dia_semana, rutina_id } = req.body;

    if (dia_semana === undefined || dia_semana < 0 || dia_semana > 6) {
      return res.status(400).json({ error: 'Dia de la semana invalido' });
    }

    const rutina = await db.get('SELECT id FROM rutinas WHERE id = ? AND user_id = ?', [rutina_id, req.userId]);
    if (!rutina) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    // Evitar duplicados en el mismo dia
    const existente = await db.get(
      'SELECT id FROM plan_semanal WHERE user_id = ? AND dia_semana = ? AND rutina_id = ?',
      [req.userId, dia_semana, rutina_id]
    );
    if (existente) {
      return res.status(400).json({ error: 'Esa rutina ya esta asignada a ese dia' });
    }

    const ultimo = await db.get(
      'SELECT MAX(orden) as max FROM plan_semanal WHERE user_id = ? AND dia_semana = ?',
      [req.userId, dia_semana]
    );
    const orden = (ultimo?.max || 0) + 1;

    await db.run(
      'INSERT INTO plan_semanal (user_id, dia_semana, rutina_id, orden) VALUES (?, ?, ?, ?)',
      [req.userId, dia_semana, rutina_id, orden]
    );

    res.status(201).json({ message: `Rutina asignada al ${DIAS[dia_semana]}` });
  } catch (error) {
    console.error('Error asignando rutina:', error);
    res.status(500).json({ error: 'Error al asignar rutina' });
  }
});

// Quitar una rutina de un dia
router.delete('/:planId', async (req, res) => {
  try {
    await db.run('DELETE FROM plan_semanal WHERE id = ? AND user_id = ?', [req.params.planId, req.userId]);
    res.json({ message: 'Rutina quitada del plan' });
  } catch (error) {
    console.error('Error quitando rutina:', error);
    res.status(500).json({ error: 'Error al quitar rutina del plan' });
  }
});

module.exports = router;