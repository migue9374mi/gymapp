# Guia de despliegue (todo gratis)

El objetivo: que la app funcione aunque apagues tu PC.

En tu PC ahora mismo todo esta en tu disco. Los hostings gratuitos
(Render, Vercel) **borran el disco cada vez que reinician el servidor**, asi
que si lo subimos tal cual perderias tus datos. Por eso hay que mover dos
cosas a servicios gratuitos en internet:

| Qué | En local | En la nube (gratis) |
|-----|----------|---------------------|
| Datos (usuarios, rutinas, pesos) | `database.db` | Turso |
| Fotos de progreso | `backend/uploads` | Cloudinary |

> **Estado actual:** los dos ya estan configurados. La app en
> https://gymapp-peach-rho.vercel.app guarda usuarios, rutinas, pesos y fotos
> fuera del servidor, asi que sobreviven a reinicios y a que apagues el PC.

---

## Parte 1 — Código en GitHub

1. Crea una cuenta en https://github.com
2. Crea un repositorio nuevo (por ejemplo `gymapp`), **privado** esta bien.
3. Desde la carpeta del proyecto:

```bash
cd "C:\Users\Miguel\Desktop\pagina gym"
git init
git add .
git commit -m "Primera version de GymApp"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gymapp.git
git push -u origin main
```

El archivo `backend/.gitignore` ya excluye `database.db`, `uploads/` y `.env`,
asi que tus datos personales **no** se suben a GitHub.

---

## Parte 2 — Base de datos en Turso (gratis)

1. Entra en https://turso.tech y creas cuenta.
2. Click en **Create Database**, ponle nombre `gymapp`.
3. El panel te mostrara:
   - **Database URL** (algo como `https://gymapp-xxxx.turso.io`)
   - **Auth Token** (una cadena larga)
4. Copia ambos, los usaremos en el paso 4.

---

## Parte 3 — Fotos en Cloudinary (gratis)

Sin esto las fotos se guardan en el disco del servidor y **se pierden en cada
reinicio**: Render las borra. Con Cloudinary quedan guardadas para siempre.

**Pasos:**

1. Entra en https://cloudinary.com y creas cuenta (con Google es fastest).
2. Acepta las condiciones y te llevara al panel.
3. Arriba del todo hay un pantallazo azul con tres datos:
   - **Cloud name** (por ejemplo `miapp1234`)
   - **API key** (un numero larguisimo)
   - **API secret** (una cadena con letras y numeros)
4. Copia los tres. **Ojo: el API secret solo se muestra una vez.** Si se te
   pasa, ve a *Settings* > *API Keys* y pulsalo para regenerarlo.
5. Pegalos en **Render > gymapp-backend > Environment**, uno por uno:
   - Key `CLOUDINARY_CLOUD_NAME`, Value tu cloud name
   - Key `CLOUDINARY_API_KEY`, Value tu api key
   - Key `CLOUDINARY_API_SECRET`, Value tu api secret
6. Render reinicia el servicio solo al guardar. Espera un minuto.
7. **Comprueba** en **Logs**: debe aparecer esta linea
   ```
   FOTOS: guardadas en CLOUDINARY (carpeta "gymapp")
   ```
   Si pone `guardadas en el disco local`, falta alguna de las tres variables.

---

## Parte 4 — Backend en Render

1. Entra en https://render.com y creas cuenta (puedes usar GitHub).
2. **New +** > **Blueprint** > selecciona tu repositorio.
3. Render detectara el `render.yaml` de la raiz y creara el servicio solo.
4. Ve a **Environment** y anade:

```
JWT_SECRET          -> (generala: en tu terminal ejecuta
                        node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
TURSO_DATABASE_URL  -> la URL de Turso
TURSO_AUTH_TOKEN    -> el token de Turso
CLOUDINARY_CLOUD_NAME -> tu cloud name
CLOUDINARY_API_KEY    -> tu api key
CLOUDINARY_API_SECRET -> tu api secret
FRONTEND_URL        -> dejalo vacio por ahora, lo rellenas en el paso 5
```

5. Render te dara una URL tipo `https://gymapp-backend.onrender.com`.
6. **Comprueba** que funciona: abre `https://gymapp-backend.onrender.com/api`
   en el navegador. Debe salir `{"message":"API de Gym funcionando correctamente"}`.
   Tarda un minuto en arrancar la primera vez.

---

## Parte 5 — Frontend en Vercel

1. Entra en https://vercel.com, importa con GitHub.
2. **Project** = el repositorio. En **Settings > General > Root Directory**
   pon `frontend`.
3. En **Environment Variables** anade:

```
VITE_API_URL = https://gymapp-backend.onrender.com
```

4. **Deploy**.
5. Vercel te dara `https://tu-app.vercel.app`.

### Ultimo paso: permitir el CORS

Vuelve a Render > tu servicio > Environment, y pon:

```
FRONTEND_URL = https://tu-app.vercel.app
```

Guarda (Render reinicia el backend solo). Listo.

---

## Comprobacion final

Abre tu app en `https://tu-app.vercel.app`:
1. Registra un usuario.
2. Crea una rutina y anade un ejercicio.
3. Sube una foto de progreso.
4. **Cierra todo y reinicia tu PC.** Abre la misma direccion: los datos y la
   foto seguiran ahi.

Si eso funciona, el despliegue salio bien.

---

## Para actualizar la app en el futuro

Cada vez que cambies el codigo:

```bash
git add .
git commit -m "describe el cambio"
git push
```

Render y Vercel detectan el push y se redespliegan solos en 1-3 minutos.

---

## Problemas frecuentes

**"API de Gym funcionando" pero la app no carga datos**
Revisa que `VITE_API_URL` no tenga `/api` al final. Debe ser solo el dominio.

**Error de CORS en la consola del navegador**
Falta `FRONTEND_URL` en Render, o le sobra la barra final.

**Las fotos no aparecen**
Comprueba que las cuatro variables de Cloudinary estan en Render. Si faltan,
las imagenes se guardan en el disco temporal y desaparecen al reiniciar.

**Los datos desaparecen tras un rato**
Significa que Turso no esta configurado. Revisa `TURSO_DATABASE_URL` y
`TURSO_AUTH_TOKEN` en Render.

**Render pide tarjeta**
El plan gratuito no la pide. Si te aparece, estas creando un servicio de pago
por error: elige el plan **Free**.

---

## Nota sobre los servicios gratuitos

Turso, Cloudinary, Render y Vercel tienen planes gratuitos con limites
generosos, pero pueden cambiar sus condiciones. Con 5 usuarios estas muy
por debajo de cualquier limite. Si en algun momento te cobran, el codigo
sigue siendo el mismo: solo habria que migrar a otro proveedor.