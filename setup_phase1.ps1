# Setup directories
New-Item -ItemType Directory -Force -Path "database/seed", "docs", "scripts"

# Frontend setup
Write-Host "Setting up frontend..."
npx -y create-vite@latest frontend --template react-ts
Set-Location frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install axios react-router-dom lucide-react recharts
Set-Location ..

# Backend setup
Write-Host "Setting up backend..."
New-Item -ItemType Directory -Force -Path "backend"
Set-Location backend
npm init -y
npm install express cors dotenv prisma @prisma/client zod axios
npm install -D typescript @types/node @types/express @types/cors ts-node nodemon
npx tsc --init
npx prisma init
Set-Location ..

# ML Service setup
Write-Host "Setting up ML service..."
New-Item -ItemType Directory -Force -Path "ml-service"
Set-Location ml-service
New-Item -ItemType Directory -Force -Path "app", "data", "models", "training", "tests"
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn pydantic scikit-learn pandas numpy joblib
pip freeze > requirements.txt
Set-Location ..

Write-Host "Phase 1 directory setup complete."
