@echo off
title Stop PR ERP

echo Stopping ERP Server...

taskkill /F /IM python.exe

echo.
echo ERP Server Stopped.
pause