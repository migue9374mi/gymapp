# Compila el APK de la app Android.
#
#   powershell -ExecutionPolicy Bypass -File frontend\herramientas\compilar-apk.ps1
#
# Se ocupa de dejar el entorno listo (Java, Android SDK) antes de compilar,
# para que no haya que acordarse de exportar variables a mano.
#
# La primera vez descarga casi un gigabyte. Las siguientes tardan poco.

$ErrorActionPreference = 'Stop'

$raiz     = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontend = $raiz
$sdk      = "$env:LOCALAPPDATA\Android\Sdk"
$jdk21    = "$env:LOCALAPPDATA\Java\jdk-21"

function Escribir-Titulo($texto) {
    Write-Host ''
    Write-Host "=== $texto ===" -ForegroundColor Cyan
}

# ---------------------------------------------------------------- Java
Escribir-Titulo 'Java'

# Gradle 8.14 no se lleva bien con el Java 26 que trae Windows de serie:
# hace falta un JDK 17 o 21. Se busca en varios sitios antes de rendirse.
$candidatos = @(
    $jdk21,
    "$env:ProgramFiles\Java\jdk-21",
    "$env:ProgramFiles\Java\jdk-17",
    "$env:ProgramFiles\Eclipse Adoptium\jdk-21.0.5.11-hotspot"
)

$javaHome = $candidatos | Where-Object { Test-Path "$_\bin\java.exe" } | Select-Object -First 1

if (-not $javaHome) {
    Write-Host "  No encuentro un JDK 17 o 21" -ForegroundColor Red
    Write-Host ''
    Write-Host '  Descarga el JDK 21 de Adoptium y descomprimelo en:'
    Write-Host "    $jdk21"
    Write-Host ''
    Write-Host '  https://adoptium.net/temurin/releases/?version=21'
    Write-Host '  Elige Windows y el paquete .zip (no hace falta instalarlo,'
    Write-Host '  descomprimirlo en esa carpeta es suficiente).'
    exit 1
}

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"
Write-Host "  JAVA_HOME = $javaHome"

# ---------------------------------------------------------------- Android SDK
Escribir-Titulo 'Android SDK'

if (-not (Test-Path $sdk)) {
    Write-Host "  No encuentro el SDK en $sdk" -ForegroundColor Red
    Write-Host ''
    Write-Host '  Descarga las herramientas de linea de comandos de Android y'
    Write-Host '  dejalas en esa carpeta dentro de una subcarpeta "latest".'
    Write-Host '  Ver APP-ANDROID.md para el paso a paso.'
    exit 1
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
Write-Host "  ANDROID_HOME = $sdk"

# --------------------------------------------------------- Comprobar piezas
Escribir-Titulo 'Comprobando lo que hace falta'

$sdkmanager = "$sdk\cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $sdkmanager)) {
    Write-Host "  Falta sdkmanager en $sdkmanager" -ForegroundColor Red
    exit 1
}

$plataforma = Test-Path "$sdk\platforms\android-36"
$buildTools = Test-Path "$sdk\build-tools\36.0.0"

if (-not ($plataforma -and $buildTools)) {
    Write-Host '  Faltan componentes del SDK, instalando (puede tardar)...'

    # Las licencias se aceptan a base de "y": es un menu interactivo
    (1..30 | ForEach-Object { 'y' }) | & $sdkmanager --licenses | Out-Null

    & $sdkmanager --install 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  La instalacion del SDK fallo (codigo $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "  platform android-36  $(if ($plataforma) { 'instalado' } else { 'recien instalado' })"
Write-Host "  build-tools 36.0.0   $(if ($buildTools) { 'instalado' } else { 'recien instalado' })"

# ---------------------------------------------------------------- Web
Escribir-Titulo 'Compilando la web'

Push-Location $frontend
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'La compilacion de la web fallo' }

    Write-Host ''
    Write-Host '  Volcando los ficheros al proyecto de Android'
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'El volcado a Android fallo' }
}
finally {
    Pop-Location
}

# ---------------------------------------------------------------- APK
Escribir-Titulo 'Compilando el APK'
Write-Host '  La primera vez Gradle baja su motor y todas las librerias.'
Write-Host '  Puede tardar bastante.'

$gradle = Join-Path $frontend 'android\gradlew.bat'
Push-Location (Join-Path $frontend 'android')
try {
    & $gradle assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Gradle fallo con codigo $LASTEXITCODE" }
}
finally {
    Pop-Location
}

# ---------------------------------------------------------------- Resultado
$apk = Join-Path $frontend 'android\app\build\outputs\apk\debug\app-debug.apk'

Escribir-Titulo 'Listo'

if (Test-Path $apk) {
    $tam = [math]::Round((Get-Item $apk).Length / 1MB, 1)
    Write-Host "  APK: $apk ($tam MB)" -ForegroundColor Green
    Write-Host ''
    Write-Host '  Pasalo al telefono y abrilo para instalarlo.'
    Write-Host '  Android pedira permiso para instalar apps de origen desconocido.'
    Write-Host '  Es normal: la app la has hecho tu.'
}
else {
    Write-Host "  No encuentro el APK en $apk" -ForegroundColor Red
    exit 1
}