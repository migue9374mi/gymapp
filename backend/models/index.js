const db = require('../database');

// Modelo de Usuario
const User = {
  findByEmail: (email) => db.get('SELECT * FROM users WHERE email = ?', [email]),
  findById: (id) => db.get('SELECT id, nombre, email, avatar, fecha_registro FROM users WHERE id = ?', [id]),
  create: (nombre, email, password) => {
    const result = db.run('INSERT INTO users (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, password]);
    return result.lastInsertRowid;
  }
};

// Modelo de Rutina
const Rutina = {
  findByUserId: (userId) => db.all('SELECT * FROM rutinas WHERE user_id = ? ORDER BY fecha_creacion DESC', [userId]),
  findById: (id) => db.get('SELECT * FROM rutinas WHERE id = ?', [id]),
  findPublic: () => db.all('SELECT r.*, u.nombre as autor FROM rutinas r JOIN users u ON r.user_id = u.id WHERE r.es_publica = 1 ORDER BY r.fecha_creacion DESC'),
  create: (userId, nombre, descripcion, categoria) => {
    const result = db.run('INSERT INTO rutinas (user_id, nombre, descripcion, categoria) VALUES (?, ?, ?, ?)', [userId, nombre, descripcion, categoria]);
    return result.lastInsertRowid;
  },
  update: (id, nombre, descripcion, categoria) => {
    db.run('UPDATE rutinas SET nombre = ?, descripcion = ?, categoria = ? WHERE id = ?', [nombre, descripcion, categoria, id]);
  },
  delete: (id) => db.run('DELETE FROM rutinas WHERE id = ?', [id]),
  togglePublic: (id, esPublica) => db.run('UPDATE rutinas SET es_publica = ? WHERE id = ?', [esPublica, id])
};

// Modelo de Ejercicio
const Ejercicio = {
  findByRutinaId: (rutinaId) => db.all('SELECT * FROM ejercicios WHERE rutina_id = ? ORDER BY orden', [rutinaId]),
  create: (rutinaId, nombre, series, reps, peso, descanso, musculo, orden) => {
    const result = db.run('INSERT INTO ejercicios (rutina_id, nombre, series, reps, peso, descanso, musculo, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [rutinaId, nombre, series, reps, peso, descanso, musculo, orden]);
    return result.lastInsertRowid;
  },
  delete: (id) => db.run('DELETE FROM ejercicios WHERE id = ?', [id])
};

// Modelo de Entrenamiento
const Entrenamiento = {
  findByUserId: (userId) => db.all('SELECT * FROM entrenamientos WHERE user_id = ? ORDER BY fecha DESC', [userId]),
  create: (userId, rutinaId, fecha, duracion, notas) => {
    const result = db.run('INSERT INTO entrenamientos (user_id, rutina_id, fecha, duracion_minutos, notas) VALUES (?, ?, ?, ?, ?)', [userId, rutinaId, fecha, duracion, notas]);
    return result.lastInsertRowid;
  }
};

// Modelo de Comentario
const Comentario = {
  findByRutinaId: (rutinaId) => db.all('SELECT c.*, u.nombre as autor FROM comentarios c JOIN users u ON c.user_id = u.id WHERE c.rutina_id = ? ORDER BY c.fecha DESC', [rutinaId]),
  create: (rutinaId, userId, texto) => {
    const result = db.run('INSERT INTO comentarios (rutina_id, user_id, texto) VALUES (?, ?, ?)', [rutinaId, userId, texto]);
    return result.lastInsertRowid;
  }
};

// Modelo de Like
const Like = {
  toggle: (rutinaId, userId) => {
    const existing = db.get('SELECT * FROM likes WHERE rutina_id = ? AND user_id = ?', [rutinaId, userId]);
    if (existing) {
      db.run('DELETE FROM likes WHERE rutina_id = ? AND user_id = ?', [rutinaId, userId]);
      return false;
    } else {
      db.run('INSERT INTO likes (rutina_id, user_id) VALUES (?, ?)', [rutinaId, userId]);
      return true;
    }
  },
  countByRutina: (rutinaId) => db.get('SELECT COUNT(*) as count FROM likes WHERE rutina_id = ?', [rutinaId]).count
};

// Modelo de Progreso
const Progreso = {
  findByUserId: (userId) => db.all('SELECT * FROM progreso_peso WHERE user_id = ? ORDER BY fecha DESC', [userId]),
  create: (userId, peso, fecha) => {
    const result = db.run('INSERT INTO progreso_peso (user_id, peso, fecha) VALUES (?, ?, ?)', [userId, peso, fecha]);
    return result.lastInsertRowid;
  }
};

module.exports = { User, Rutina, Ejercicio, Entrenamiento, Comentario, Like, Progreso };
