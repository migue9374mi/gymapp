# Genera los iconos de la app Android a partir de un dibujo con GDI+.
#
#   powershell -ExecutionPolicy Bypass -File frontend\herramientas\generar-iconos.ps1
#
# Los ficheros se regeneran siempre desde aqui, asi que si algun dia cambia el
# diseño se edita este script y se vuelve a ejecutar.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$res = Join-Path $PSScriptRoot '..\android\app\src\main\res'
$res = (Resolve-Path $res).Path

# --- Colores de la app ---
$FONDO   = [System.Drawing.Color]::FromArgb(26, 26, 46)    # #1a1a2e
$ACENTO  = [System.Drawing.Color]::FromArgb(230, 57, 70)    # #e63946
$CLARO   = [System.Drawing.Color]::FromArgb(255, 255, 255)

# --- Dibuja una mancuerna centrada en un lienzo de $tam x $tam ---
function Dibujar-Mancuerna {
    param(
        $Graphics,
        [int]$CentroX,
        [int]$CentroY,
        [int]$Largo,
        [System.Drawing.Color]$Color
    )

    $pincel = New-Object System.Drawing.SolidBrush($Color)
    $g = $Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Barra delgada que se ve por encima y por debajo de las placas
    $altoBarra = [Math]::Max(1, [int]($Largo * 0.09))
    $g.FillRectangle($pincel,
        $CentroX - [int]($Largo * 0.42), $CentroY - [int]($altoBarra / 2),
        [int]($Largo * 0.84), $altoBarra)

    # Placas interiores: altas y anchas
    $altoPlaca = [int]($Largo * 0.56)
    $anchoPlaca = [int]($Largo * 0.17)
    $y = $CentroY - [int]($altoPlaca / 2)
    $g.FillRectangle($pincel, $CentroX - [int]($Largo * 0.19), $y, $anchoPlaca, $altoPlaca)
    $g.FillRectangle($pincel, $CentroX + [int]($Largo * 0.19) - $anchoPlaca, $y, $anchoPlaca, $altoPlaca)

    # Placas exteriores: algo mas bajas, dan el aspecto de peso apilado
    $altoExt = [int]($Largo * 0.40)
    $anchoExt = [int]($Largo * 0.12)
    $yExt = $CentroY - [int]($altoExt / 2)
    $g.FillRectangle($pincel, $CentroX - [int]($Largo * 0.38), $yExt, $anchoExt, $altoExt)
    $g.FillRectangle($pincel, $CentroX + [int]($Largo * 0.38) - $anchoExt, $yExt, $anchoExt, $altoExt)

    $pincel.Dispose()
}

function Guardar-Icono {
    param(
        [string]$Ruta,
        [int]$Tam,
        [string]$Modo = 'lapiz'   # lapiz | redondo | splash | aviso
    )

    $bmp = New-Object System.Drawing.Bitmap($Tam, $Tam, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $centro = [int]($Tam / 2)

    switch ($Modo) {
        'lapiz' {
            $g.Clear($FONDO)
            Dibujar-Mancuerna $g $centro $centro ([int]($Tam * 0.62)) $ACENTO
        }
        'redondo' {
            $pincelFondo = New-Object System.Drawing.SolidBrush($FONDO)
            $g.FillEllipse($pincelFondo, 0, 0, $Tam, $Tam)
            $pincelFondo.Dispose()
            Dibujar-Mancuerna $g $centro $centro ([int]($Tam * 0.58)) $ACENTO
        }
        'splash' {
            $g.Clear($FONDO)
            Dibujar-Mancuerna $g $centro $centro ([int]($Tam * 0.45)) $ACENTO
        }
        'aviso' {
            # Los iconos de notificacion deben ser blancos sobre transparente
            Dibujar-Mancuerna $g $centro $centro ([int]($Tam * 0.86)) $CLARO
        }
    }

    $g.Dispose()

    $carpeta = Split-Path $Ruta -Parent
    if (-not (Test-Path $carpeta)) { New-Item -ItemType Directory -Path $carpeta -Force | Out-Null }

    $bmp.Save($Ruta, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "  $Ruta ($Tam x $Tam)"
}

# --- Tamanos de cada densidad ---
# mipmap: icono de la app / icono adaptativo (foreground, 108dp)
$dimensiones = @(
    @{ carpeta = 'mipmap-mdpi';    icono = 48;  fg = 108 },
    @{ carpeta = 'mipmap-hdpi';    icono = 72;  fg = 162 },
    @{ carpeta = 'mipmap-xhdpi';   icono = 96;  fg = 216 },
    @{ carpeta = 'mipmap-xxhdpi';  icono = 144; fg = 324 },
    @{ carpeta = 'mipmap-xxxhdpi'; icono = 192; fg = 432 }
)

Write-Host 'Iconos de la app'
foreach ($d in $dimensiones) {
    $carpeta = Join-Path $res $d.carpeta
    Guardar-Icono (Join-Path $carpeta 'ic_launcher.png') $d.icono 'lapiz'
    Guardar-Icono (Join-Path $carpeta 'ic_launcher_round.png') $d.icono 'redondo'
    Guardar-Icono (Join-Path $carpeta 'ic_launcher_foreground.png') $d.fg 'splash'
}

Write-Host ''
Write-Host 'Icono de las notificaciones'
$avisoTamanos = @(
    @{ carpeta = 'drawable-mdpi';    tam = 24 },
    @{ carpeta = 'drawable-hdpi';    tam = 36 },
    @{ carpeta = 'drawable-xhdpi';   tam = 48 },
    @{ carpeta = 'drawable-xxhdpi';  tam = 72 },
    @{ carpeta = 'drawable-xxxhdpi'; tam = 96 }
)
foreach ($a in $avisoTamanos) {
    Guardar-Icono (Join-Path $res "$($a.carpeta)\ic_stat_icon.png") $a.tam 'aviso'
}

# La pantalla de arranque usa un fondo de color en Android 12+, pero en
# versiones anteriores se dibuja la imagen: se genera en vertical y horizontal
Write-Host ''
Write-Host 'Pantalla de arranque'
$splash = @(
    @{ carpeta = 'drawable';               ancho = 480;  alto = 800 },
    @{ carpeta = 'drawable-port-mdpi';     ancho = 320;  alto = 480 },
    @{ carpeta = 'drawable-port-hdpi';     ancho = 480;  alto = 800 },
    @{ carpeta = 'drawable-port-xhdpi';    ancho = 720;  alto = 1280 },
    @{ carpeta = 'drawable-port-xxhdpi';   ancho = 960;  alto = 1600 },
    @{ carpeta = 'drawable-port-xxxhdpi';  ancho = 1280; alto = 1920 },
    @{ carpeta = 'drawable-land-mdpi';     ancho = 480;  alto = 320 },
    @{ carpeta = 'drawable-land-hdpi';     ancho = 800;  alto = 480 },
    @{ carpeta = 'drawable-land-xhdpi';    ancho = 1280; alto = 720 },
    @{ carpeta = 'drawable-land-xxhdpi';   ancho = 1600; alto = 960 },
    @{ carpeta = 'drawable-land-xxxhdpi';  ancho = 1920; alto = 1280 }
)

foreach ($s in $splash) {
    $bmp = New-Object System.Drawing.Bitmap($s.ancho, $s.alto, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear($FONDO)

    # La mancuerna no debe ocupar mas de la mitad del lado mas corto
    $largo = [int]([Math]::Min($s.ancho, $s.alto) * 0.38)
    Dibujar-Mancuerna $g ([int]($s.ancho / 2)) ([int]($s.alto / 2)) $largo $ACENTO
    $g.Dispose()

    $carpeta = Join-Path $res $s.carpeta
    if (-not (Test-Path $carpeta)) { New-Item -ItemType Directory -Path $carpeta -Force | Out-Null }
    $ruta = Join-Path $carpeta 'splash.png'
    $bmp.Save($ruta, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "  $ruta ($($s.ancho) x $($s.alto))"
}

Write-Host ''
Write-Host 'Iconos generados.'