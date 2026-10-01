const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Muscle types for body measurements
const MUSCULOS_MEDIDA = [
  'brazo', 'antebrazo', 'pecho', 'cintura', 'cadera',
  'muslo', 'gemelo', 'pierna', 'clavicular', 'hombro', 'espalda', 'cuello'
];

// Calculate BMI (Indice de Masa Corporal)
// BMI = peso (kg) / (altura (m))^2
function calcularIMC(peso, alturaCm) {
  const alturaM = alturaCm / 100;
  return (peso / (alturaM * alturaM)).toFixed(1);
}

// BMI categories according to WHO
function categoriaIMC(imc) {
  const valor = parseFloat(imc);
  if (valor < 18.5) return { categoria: 'Bajo peso', color: '#74b9ff' };
  if (valor < 25) return { categoria: 'Peso normal', color: '#00b894' };
  if (valor < 30) return { categoria: 'Sobrepeso', color: '#fdcb6e' };
  if (valor < 35) return { categoria: 'Obesidad grado I', color: '#e17055' };
  if (valor < 40) return { categoria: 'Obesidad grado II', color: '#d63031' };
  return { categoria: 'Obesidad grado III', color: '#d63031' };
}

// Get latest body measurements
router.get('/', async (req, res) => {
  try {
    const medidas = await db.all(
      'SELECT * FROM medidas WHERE user_id = ? ORDER BY fecha DESC',
      [req.userId]
    );

    // Attach muscle measurements to each record
    for (const m of medidas) {
      m.imc = calcularIMC(m.peso, m.altura);
      m.categoria = categoriaIMC(m.imc);
      m.medidas = await db.all(
        'SELECT musculo, valor FROM medidas_musculo WHERE medida_id = ?',
        [m.id]
      );
    }

    res.json({ medidas, musculosDisponibles: MUSCULOS_MEDIDA });
  } catch (error) {
    console.error('Error obteniendo medidas:', error);
    res.status(500).json({ error: 'Error al obtener las medidas' });
  }
});

// Get only the latest measurement
router.get('/actual', async (req, res) => {
  try {
    const medida = await db.get(
      'SELECT * FROM medidas WHERE user_id = ? ORDER BY fecha DESC LIMIT 1',
      [req.userId]
    );

    if (!medida) {
      return res.json({ medida: null });
    }

    medida.imc = calcularIMC(medida.peso, medida.altura);
    medida.categoria = categoriaIMC(medida.imc);
    medida.medidas = await db.all(
      'SELECT musculo, valor FROM medidas_musculo WHERE medida_id = ?',
      [medida.id]
    );

    res.json({ medida });
  } catch (error) {
    console.error('Error obteniendo medida actual:', error);
    res.status(500).json({ error: 'Error al obtener la medida actual' });
  }
});

// Save new measurement (with optional muscle measurements)
router.post('/', async (req, res) => {
  try {
    const { fecha, peso, altura, medidas } = req.body;

    if (!fecha || !peso || !altura) {
      return res.status(400).json({ error: 'Fecha, peso y altura son obligatorios' });
    }

    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);

    if (pesoNum <= 0 || alturaNum <= 0) {
      return res.status(400).json({ error: 'Peso y altura deben ser mayores que cero' });
    }

    // Save main measurement
    const result = await db.run(
      'INSERT INTO medidas (user_id, fecha, peso, altura) VALUES (?, ?, ?, ?)',
      [req.userId, fecha, pesoNum, alturaNum]
    );

    const medidaId = result.lastInsertRowid;

    // Save muscle measurements if provided
    if (medidas && typeof medidas === 'object') {
      for (const [musculo, valor] of Object.entries(medidas)) {
        if (valor && !isNaN(parseFloat(valor))) {
          await db.run(
            'INSERT INTO medidas_musculo (user_id, medida_id, musculo, valor) VALUES (?, ?, ?, ?)',
            [req.userId, medidaId, musculo, parseFloat(valor)]
          );
        }
      }
    }

    const imc = calcularIMC(pesoNum, alturaNum);

    res.status(201).json({
      message: 'Medidas guardadas',
      imc,
      categoria: categoriaIMC(imc)
    });
  } catch (error) {
    console.error('Error guardando medidas:', error);
    res.status(500).json({ error: 'Error al guardar las medidas' });
  }
});

// Delete a measurement record
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM medidas WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Medida eliminada' });
  } catch (error) {
    console.error('Error eliminando medida:', error);
    res.status(500).json({ error: 'Error al eliminar la medida' });
  }
});

module.exports = router;