@echo off
title Allow Windows Firewall for PR Attendance System (Port 3000)
echo ===================================================================
echo   PR Attendance System - Windows Firewall Inbound Port Configuration
echo ===================================================================
echo.
echo Checking for Administrator permissions...

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Administrator permissions required to open port 3000 in Windows Firewall.
    echo Prompting for elevation...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo Adding inbound Windows Firewall rule for Port 3000 (TCP)...
netsh advfirewall firewall delete rule name="PR Attendance System Port 3000" >nul 2>&1
netsh advfirewall firewall add rule name="PR Attendance System Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any

echo.
echo ===================================================================
echo  SUCCESS: Windows Firewall has allowed inbound traffic on port 3000!
echo  Mobile phones on the same Wi-Fi / Hotspot can now connect freely.
echo ===================================================================
echo.
pause
