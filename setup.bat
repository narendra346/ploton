@echo off
echo 🎬 Setting up Ploton...
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Install from https://nodejs.org
    pause
    exit /b 1
)

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Install from https://python.org
    pause
    exit /b 1
)

echo ✅ Node.js and Python found!
echo.

:: Install Remotion deps
echo 📦 Installing Remotion dependencies...
cd remotion
npm install
cd ..

:: Install Python deps
echo 📦 Installing Python dependencies...
cd backend
pip install -r requirements.txt
cd ..

:: Create renders folder
if not exist renders mkdir renders

echo.
echo ✅ Ploton is ready!
echo.
echo Run these in separate terminals:
echo.
echo   Terminal 1: cd backend ^&^& python main.py
echo   Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Then open: http://localhost:3000
echo.
pause
