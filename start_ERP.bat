@echo off
title PR ERP Server

echo =====================================
echo      Starting PR ERP Server
echo =====================================
echo.

REM Go to the actual project folder
cd /d E:\ERP\pr-erp

echo Project folder:
echo %CD%
echo.

REM Activate the correct Python environment
call E:\ERP\pr-erp\pr_auto\Scripts\activate.bat

echo.
echo Python being used:
where python
python --version

echo.
echo Backend folder:
cd /d E:\ERP\pr-erp\backend
echo %CD%

echo.
echo Starting PR ERP Backend...
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000

pause
