@echo off
chcp 65001 >nul
title pacta.ia - Servidor de desarrollo
color 0D
setlocal

echo.
echo   ============================================
echo      pacta.ia  -  Iniciando la aplicacion
echo   ============================================
echo.

REM Asegura que Node y pnpm esten en el PATH de esta ventana
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

REM Ubica la carpeta de la app web
cd /d "%~dp0apps\platform"

REM Instala dependencias la primera vez (si hiciera falta)
if not exist "node_modules" (
  echo   Instalando dependencias por primera vez, puede tardar unos minutos...
  call pnpm install
  echo.
)

echo   Iniciando el servidor en http://localhost:3000 ...
echo   El navegador se abrira automaticamente cuando este listo.
echo.
echo   Para DETENER la app: cerra esta ventana o presiona Ctrl + C
echo   (Dejala abierta/minimizada mientras uses la app)
echo.

REM Abre el navegador recien cuando el puerto 3000 responde (no antes)
start "" powershell -NoProfile -WindowStyle Hidden -Command "$ok=$false; for($i=0;$i -lt 60 -and -not $ok;$i++){ try { Invoke-WebRequest -Uri 'http://localhost:3000/' -UseBasicParsing -TimeoutSec 2 | Out-Null; $ok=$true } catch { Start-Sleep -Milliseconds 800 } }; if($ok){ Start-Process 'http://localhost:3000' }"

REM Levanta el servidor de desarrollo (queda corriendo en esta ventana)
node "node_modules\vite\bin\vite.js" dev --port 3000

endlocal
pause
