require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const rutinaRoutes = require('./routes/rutinas');
const planRoutes = require('./routes/plan');
const entrenamientoRoutes = require('./routes/entrenamientos');
const estadisticasRoutes = require('./routes/estadisticas');
const medidasRoutes = require('./routes/medidas');
const perfilRoutes = require('./routes/perfil');
const comunidadRoutes = require('./routes/comunidad');
const fotosRoutes = require('./routes/fotos');
const { CARPETA } = require('./storage');

const app = express();
const PORT = process.env.PORT || 5000;

// En produccion el frontend vive en otro dominio (Vercel), asi que hay que
// permitir explicitamente ese origen. FRONTEND_URL con el valor del deploy.
const origenesPermitidos = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: origenesPermitidos.length > 0 ? origenesPermitidos : true,
    credentials: true,
  })
);
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/rutinas', rutinaRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/entrenamientos', entrenamientoRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/medidas', medidasRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/comunidad', comunidadRoutes);
app.use('/api/fotos', fotosRoutes);

// Servir las fotos que suben los usuarios
app.use('/uploads', express.static(CARPETA));

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ message: 'API de Gym funcionando correctamente' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).json({ error: 'Algo salió mal en el servidor' });
});

// Sin este secreto no se pueden firmar los tokens de inicio de sesion,
// y el registro/login fallarian con un error dificil de entender.
if (!process.env.JWT_SECRET) {
  console.error('');
  console.error('=========================================================');
  console.error('  FALTA LA VARIABLE JWT_SECRET');
  console.error('  Sin ella el registro y el login NO funcionaran.');
  console.error('  En Render: Environment > Add Environment Variable');
  console.error('    Key:   JWT_SECRET');
  console.error('    Value: una cadena larga y aleatoria');
  console.error('=========================================================');
  console.error('');
}

// Inicializar base de datos y arrancar servidor
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    if (process.env.TURSO_DATABASE_URL) {
      console.log('Base de datos: Turso (nube)');
    } else {
      console.log('Base de datos: local (ATENCION: se pierde al reiniciar el servidor)');
    }
  });
}).catch(err => {
  console.error('Error inicializando base de datos:', err.message || err);
  process.exit(1);
});
