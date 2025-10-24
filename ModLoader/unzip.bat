@echo off
setlocal

rem aktuelles Verzeichnis holen
set "DIR=%~dp0"
set "ZIP=%DIR%update.zip"
set "EXE=%DIR%DCTS.exe"

echo Unzipping "%ZIP%" to "%DIR%"...
timeout /t 2 /nobreak >nul

if exist "%ZIP%" (
    powershell -NoLogo -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%DIR%' -Force"
    del "%ZIP%"
    echo Update extracted.
) else (
    echo update.zip not found in "%DIR%"
)

if exist "%EXE%" (
    start "" "%EXE%" --register-uri
    echo Restarted "%EXE%"
) else (
    echo Could not find "%EXE%" to restart.
)

exit
