@echo off
title R.O.K. - Visor Chiara 3D
cd /d "%~dp0"
echo.
echo Iniciando visor 3D...
echo Esta ventana debe permanecer abierta mientras uses el visor.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0INICIAR_VISOR.ps1"
echo.
echo El visor se detuvo o hubo un error. Lee el mensaje anterior.
pause
