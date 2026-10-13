# Guia de la app de Android

La app se construye con [Capacitor](https://capacitorjs.com): envuelve la web
que ya tienes y genera un `.apk`. No se reescribe ninguna pantalla.

Todo lo que sigue se hace en el **backend** y el **frontend** ya estan
configurados. La app es una copia mas de la web, no la sustituye: puedes usar
las dos.

## 1. Abrir el backend al origen de la app

Un APK no es un navegador: dentro de la app, las peticiones salen con el
origen `https://localhost`. Si el backend no lo tiene en su lista de
permitidos, **toda peticion falla** y no se puede ni iniciar sesion.

En Render:

1. `gymapp-backend` > **Environment**
2. Edita `FRONTEND_URL` y dejalo asi:

```
https://gymapp-peach-rho.vercel.app,https://localhost
```

Sin comillas, sin espacios, separado solo por la coma.

> Ojo: si ya tienes `http://localhost` o `capacitor://localhost` de una
> prueba anterior, puedes quitarlo. Con `https://localhost` basta.

## 2. Compilar el APK

Desde la carpeta `frontend`:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

El fichero sale en:

```
frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

### El primer compilado descarga casi un gigabyte

Gradle baja su propio motor, el SDK de Android y todas las librerias. Tarda
la primera vez y las siguientes van rapido. Necesitas en el ordenador:

- **JDK 21** (Gradle 8.14 no funciona con el Java 26 que trae el sistema)
- **Android SDK** en `%LOCALAPPDATA%\Android\Sdk`, con las herramientas de
  linea de comandos. Define `ANDROID_HOME` apuntando ahi.

## 3. Instalar en el telefono

1. En Ajustes > Apps > acceso especial > **Instalar apps desconocidas**
2. Activalo para la app que va a abrir el `.apk` (normalmente Archivos o
   Chrome)
3. Abre el `.apk` en el telefono y acepta

Google mostrara un aviso de que la app no viene de una tienda. Es normal:
esta firmada con una clave de pruebas, y por eso se puede instalar a mano sin
pagar nada.

## 4. Cada cambio

El `.apk` no se actualiza solo. Cuando cambie el codigo:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Y en el telefono: instalar el `.apk` nuevo encima del viejo. Se conservan los
datos porque la cuenta esta en Turso, no dentro de la app.

## Que hace la app y que no

| | |
|---|---|
| Icono propio y pantalla completa | Si |
| Camara para las fotos de progreso | Si, nativa |
| Avisos a la hora exacta, sin internet | Si, programados en el telefono |
| Avisos cuando cambias el plan | Se actualizan al abrir la app |
| Anotar pesos sin cobertura | **No** (es la Fase 2) |
| Publicarse en Play Store | No, y no hace falta |

## Avisos

Se programan dentro del telefono, asi que suenan aunque no haya cobertura y
aunque el servidor este apagado. No hace falta ningun servicio de push.

Se ajustan en **Plan** > *Avisos de entrenamiento*, donde eliges la hora.
Android pide permiso la primera vez; si lo niegas, hay que ir a Ajustes del
sistema > Apps > GymApp > Avisos.

## Nota sobre los datos

La app es el mismo frontend y el mismo backend: un login en el movil vale
para la web y al reves. Las fotos se suben a Cloudinary desde el movil
igual que desde el navegador.