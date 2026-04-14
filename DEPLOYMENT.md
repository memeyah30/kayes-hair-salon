# Deployment Guide

## Recommended Structure

Keep this project as one GitHub repository with this layout:

```text
THOLITS SALON/
  backend/
  frontend/
  package.json
```

Do not try to merge the source files from `frontend/` into `backend/`.
For this codebase, the clean deployment approach is:

1. Keep `frontend/` and `backend/` separate in source control.
2. Build the React frontend.
3. Copy the frontend build output into `backend/public/`.
4. Deploy the Laravel app from `backend/`.

That matches the existing Laravel routes, which already serve `backend/public/index.html` for the SPA.

## New Build Command

From the project root, run:

```powershell
npm install
npm run build:deploy
```

What it does:

1. Builds the React app from `frontend/`.
2. Replaces the old generated files in `backend/public/assets/`.
3. Copies the new `frontend/dist` files into `backend/public/`.

After that, Laravel can serve the frontend and backend from one deployment target.

## GitHub Setup

Create one repository for the whole project root.

```powershell
git add .
git commit -m "Prepare project for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

If a remote already exists, check it with:

```powershell
git remote -v
```

## Important Files To Keep Out Of Git

Do not push these:

- `node_modules/`
- `backend/vendor/`
- `.env` files
- generated frontend files in `backend/public/assets/`
- uploaded files in `backend/public/uploads/`
- logs and cache files

The root `.gitignore` now covers these for future work.

## One-Time Cleanup For Already Tracked Generated Files

If Git is already tracking generated files, remove them from Git without deleting them from your computer:

```powershell
git rm -r --cached node_modules
git rm -r --cached frontend/dist
git rm -r --cached backend/public/assets
git rm --cached backend/public/index.html
git rm -r --cached backend/public/uploads
git commit -m "Stop tracking generated deployment files"
```

Only run the commands above after checking that the files are generated or upload files, not source code you want to keep in Git.

## Typical Deploy Flow

For every update:

```powershell
git add .
git commit -m "Your update message"
git push
```

On the server:

```bash
git pull
composer install --no-dev --optimize-autoloader
npm install
npm run build:deploy
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Best Deployment Option For This Project

The easiest deployment path is a single server that supports PHP and Node during build, because:

- Laravel handles the backend and session auth.
- The frontend can be served from the same domain.
- You avoid CORS and cookie problems from separate frontend/backend hosts.

If you deploy frontend and backend separately, you will need extra environment and CORS configuration.
