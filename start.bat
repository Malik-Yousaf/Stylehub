@echo off
echo ===============================================
echo   StyleHub - Setting up and starting the site
echo ===============================================
echo.

cd client
echo Installing dependencies (first time only, this can take a few minutes)...
call npm install
if errorlevel 1 (
    echo.
    echo Something went wrong during npm install. Scroll up to see the error.
    pause
    exit /b 1
)

echo.
echo Building the website...
call npm run build
if errorlevel 1 (
    echo.
    echo Something went wrong during the build. Scroll up to see the error.
    pause
    exit /b 1
)

cd ..
echo.
echo ===============================================
echo   Starting the server...
echo   Storefront:  http://localhost:3000
echo   Admin panel: http://localhost:3000/admin
echo   Press Ctrl+C in this window to stop the server.
echo ===============================================
echo.
node server.js

pause
