# Quick Start Script for Kaye's Hair Salon Appointment System
# This script helps automate the setup process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kaye's Hair Salon - Quick Start Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if XAMPP MySQL is running
Write-Host "Checking XAMPP MySQL..." -ForegroundColor Yellow
$mysqlProcess = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if (-not $mysqlProcess) {
    Write-Host "WARNING: MySQL doesn't appear to be running!" -ForegroundColor Red
    Write-Host "Please start MySQL from XAMPP Control Panel first." -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Check if Composer is installed
Write-Host "Checking Composer..." -ForegroundColor Yellow
try {
    $composerVersion = composer --version 2>&1
    Write-Host "Composer found: $composerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Composer is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Composer from https://getcomposer.org/" -ForegroundColor Red
    exit
}

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Prerequisites check complete!" -ForegroundColor Green
Write-Host ""

# Get current directory
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

# Step 1: Backend Setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Setting up Backend..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $backendPath

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host ".env file created!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: .env.example not found!" -ForegroundColor Red
    }
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}

# Install Composer dependencies
Write-Host ""
Write-Host "Installing PHP dependencies (this may take a few minutes)..." -ForegroundColor Yellow
composer install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Composer install failed!" -ForegroundColor Red
    exit
}

# Generate app key
Write-Host ""
Write-Host "Generating application key..." -ForegroundColor Yellow
php artisan key:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Key generation failed. You may need to run 'php artisan key:generate' manually." -ForegroundColor Yellow
}

# Run migrations
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Yellow
Write-Host "Make sure you have created the database in phpMyAdmin first!" -ForegroundColor Yellow
$runMigrations = Read-Host "Run migrations now? (y/n)"
if ($runMigrations -eq "y") {
    php artisan migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        $seedData = Read-Host "Seed initial data (admin account, services)? (y/n)"
        if ($seedData -eq "y") {
            php artisan db:seed
        }
    }
}

Write-Host ""
Write-Host "Backend setup complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Frontend Setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Setting up Frontend..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $frontendPath

# Install npm dependencies
Write-Host "Installing Node.js dependencies (this may take a few minutes)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Frontend setup complete!" -ForegroundColor Green
Write-Host ""

# Final Instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure MySQL is running in XAMPP" -ForegroundColor White
Write-Host "2. Create database 'tholits_salon' in phpMyAdmin (if not done)" -ForegroundColor White
Write-Host "3. Update backend/.env with your database credentials" -ForegroundColor White
Write-Host "4. Run migrations: cd backend && php artisan migrate && php artisan db:seed" -ForegroundColor White
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host "  Terminal 1 (Backend):  cd backend && php artisan serve" -ForegroundColor White
Write-Host "  Terminal 2 (Frontend): cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Default Admin Login:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""

Set-Location $projectRoot


