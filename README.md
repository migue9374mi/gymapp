# 💪 GymApp - Plataforma de Entrenamiento

Aplicación web para gestionar rutinas de gym, seguir el progreso, rachas de entrenamiento y compartir rutinas con la comunidad.

## 📁 Estructura

```
pagina-gym/
├── backend/          # API REST con Node.js + Express + SQLite
│   ├── server.js
│   ├── database.js
│   ├── routes/auth.js
│   └── models/index.js
└── frontend/         # Interfaz con React + Vite
    ├── src/
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   ├── components/
    │   └── api/axios.js
    └── vite.config.js
```

## 🚀 Cómo ejecutarlo

### 1. Backend (terminal 1)

```bash
cd backend
npm install
npm start
```

El servidor queda en `http://localhost:5000`

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

La app queda en `http://localhost:3000`

## ✅ Funcionalidades

### Fase 1 — Base y usuarios
- Registro de usuarios
- Login con JWT (token válido por 7 días)
- Sesión persistente (no pierdes el login al recargar)
- Protección de rutas privadas
- Dashboard con resumen real de tus rutinas

### Fase 2 — Rutinas y ejercicios
- Crear rutinas con nombre, descripción y categoría
  (General, Push, Pull, Pierna, Full Body, Core, Cardio)
- Editar y eliminar rutinas
- Añadir ejercicios con: nombre, músculo, series, reps, peso y descanso
- Editar y eliminar ejercicios
- Compartir rutinas con la comunidad (públicas) o mantenerlas privadas
- Resumen automático: nº ejercicios, series totales y volumen estimado en kg

## 📅 Próximas fases

- **Fase 3:** Registro de entrenamientos, rachas y calendario
- **Fase 4:** Estadísticas por músculo y gráficos
- **Fase 5:** Comunidad (comentar, dar like, explorar rutinas de otros)
- **Fase 6:** Subida de archivos y extras

## 🔐 Seguridad

- Contraseñas encriptadas con bcrypt
- Tokens firmados con JWT
- Clave secreta en `.env` (cámbiala antes de publicar)

## 🌐 Despliegue gratuito (pendiente)

- Backend: Render
- Frontend: Vercel o Netlify
- Costo total: $0