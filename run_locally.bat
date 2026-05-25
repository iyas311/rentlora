@echo off
echo ===================================================
echo Starting Rentlora Local Development Environment
echo ===================================================

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 goto NODOCKER

rem Check if Docker postgres container is already running
docker ps -q -f name=rentlora-db >nul 2>&1
if %errorlevel% equ 0 goto DBALREADYRUNNING

docker ps -a -q -f name=rentlora-db >nul 2>&1
if %errorlevel% equ 0 goto DBSTOPPED

echo Creating and starting new 'rentlora-db' container...
docker run -d --name rentlora-db -p 5432:5432 -e POSTGRES_DB=rentlora -e POSTGRES_PASSWORD=password -e POSTGRES_USER=postgres postgres:16
echo Waiting for database to initialize (5s)...
timeout /t 5 >nul
echo Importing schema.sql...
docker exec -i rentlora-db psql -U postgres -d rentlora < schema.sql
goto LAUNCHSERVICES

:DBALREADYRUNNING
echo [OK] PostgreSQL container 'rentlora-db' is already running.
goto LAUNCHSERVICES

:DBSTOPPED
echo Starting existing 'rentlora-db' container...
docker start rentlora-db
goto LAUNCHSERVICES

:NODOCKER
echo [WARNING] Docker is not running or not installed.
echo Make sure you have a PostgreSQL database running locally on port 5432.
echo Press any key to continue running backend/frontend services anyway...
pause >nul
goto LAUNCHSERVICES

:LAUNCHSERVICES
echo.
echo ===================================================
echo Starting Backend Services...
echo ===================================================

:: Launch Property Service in a new cmd window
echo [INFO] Starting Property Service on port 8001...
start "Property Service" cmd /k "cd property-service && if not exist .venv python -m venv .venv && call .venv\Scripts\activate && pip install -r requirements.txt && set DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/rentlora&&set JWT_SECRET=dev-secret&&set S3_BUCKET_NAME=rentlora-assets&&set AWS_DEFAULT_REGION=us-east-1&&uvicorn main:app --reload --port 8001"

:: Launch Booking Service in a new cmd window
echo [INFO] Starting Booking Service on port 8002...
start "Booking Service" cmd /k "cd booking-service && if not exist .venv python -m venv .venv && call .venv\Scripts\activate && pip install -r requirements.txt && set DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/rentlora&&set JWT_SECRET=dev-secret&&set AWS_DEFAULT_REGION=us-east-1&&uvicorn main:app --reload --port 8002"

echo.
echo ===================================================
echo Starting Frontend Service...
echo ===================================================

:: Launch Frontend Service in a new cmd window
echo [INFO] Starting Frontend Dev Server on port 5173...
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ===================================================
echo Opening web application in browser...
echo ===================================================
timeout /t 7 >nul
start http://localhost:5173

echo.
echo All services started! Keep the open terminal windows running.
echo To stop, close the spawned command prompt windows.
pause
