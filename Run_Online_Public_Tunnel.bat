@echo off
title PR Attendance System - Public Online Tunnel
echo ===================================================================
echo   PR Attendance System - Public Online Tunnel (Mobile 4G/5G Access)
echo ===================================================================
echo.
echo Starting secure public tunnel for students on mobile data...
echo (Make sure Run_Server.bat is running on your laptop!)
echo.
echo When the public HTTPS link appears below (e.g. https://xxxx.lhr.life),
echo enter that domain into your Teacher Portal using the "Change IP" button,
echo and all student mobile phones can scan the QR code from anywhere!
echo.
echo Connecting...
echo.
ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run
pause
