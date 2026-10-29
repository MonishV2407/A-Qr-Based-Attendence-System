@echo off
title PR Attendance System - Teacher OnlyPr
cd /d "%~dp0"
echo ===================================================================
echo   PR Attendance System - Teacher OnlyPr Portal
echo ===================================================================
echo.
echo Starting PR Attendance server on port 3000...
echo.
echo  * Localhost portal:  http://localhost:3000
echo  * If mobile phone cannot connect over Wi-Fi:
echo    1. Run "Allow_Firewall_Port_3000.bat" once as Administrator
echo    2. Or connect laptop and phone to your Phone Mobile Hotspot
echo    3. Or run "Run_Online_Public_Tunnel.bat" for 4G/5G mobile access
echo.
start http://localhost:3000
node Server\Server.js
pause
