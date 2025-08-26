@echo off
echo Starting FastAPI development server...

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    
    echo Installing requirements...
    venv\Scripts\pip install -r requirements.txt
)

echo Starting server on port 4000...
venv\Scripts\python -m uvicorn main:app --reload --host 0.0.0.0 --port 4000
