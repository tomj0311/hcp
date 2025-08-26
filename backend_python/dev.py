#!/usr/bin/env python3
"""
Development server startup script for the FastAPI backend
"""
import sys
import os
import subprocess

def main():
    """Run the development server"""
    
    # Check if virtual environment exists
    venv_path = os.path.join(os.path.dirname(__file__), 'venv')
    if not os.path.exists(venv_path):
        print("Creating virtual environment...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
        
        # Activate and install requirements
        if os.name == 'nt':  # Windows
            pip_path = os.path.join(venv_path, 'Scripts', 'pip.exe')
        else:  # Unix/Linux/macOS
            pip_path = os.path.join(venv_path, 'bin', 'pip')
        
        print("Installing requirements...")
        subprocess.run([pip_path, 'install', '-r', 'requirements.txt'], check=True)
    
    # Run the development server
    if os.name == 'nt':  # Windows
        python_path = os.path.join(venv_path, 'Scripts', 'python.exe')
    else:  # Unix/Linux/macOS
        python_path = os.path.join(venv_path, 'bin', 'python')
    
    print("Starting FastAPI development server...")
    subprocess.run([python_path, '-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '4000'])

if __name__ == '__main__':
    main()
