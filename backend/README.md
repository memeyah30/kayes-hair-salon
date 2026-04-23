# Laravel Backend

## Railway Deployment

This backend is prepared for Railway with:

- a dedicated pre-deploy script at `railway/pre-deploy.sh`
- a queue worker runner at `railway/run-worker.sh`
- a scheduler runner at `railway/run-scheduler.sh`
- Railway-focused env defaults in `.env.railway.example`
- trusted proxy support enabled in `bootstrap/app.php`

### Recommended Railway services

1. `web`
   Root directory: `backend`
   Use Railway's Laravel / PHP detection for the web start command.

2. `worker`
   Root directory: `backend`
   Start command:
   ```bash
   bash railway/run-worker.sh
   ```

3. `scheduler`
   Root directory: `backend`
   Start command:
   ```bash
   bash railway/run-scheduler.sh
   ```

### Pre-deploy command

For the `web` service, set:

```bash
bash railway/pre-deploy.sh
```

### Minimum Railway variables

```env
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:...
APP_URL=https://your-domain.up.railway.app

LOG_CHANNEL=stderr
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_URL=${{MySQL.MYSQL_URL}}

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

FRONTEND_URL=https://your-frontend.vercel.app
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

ADMIN_LOGIN=admin
ADMIN_NAME="Owner"
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_FORCE_PASSWORD=true

UPLOADS_DISK=public
```

If `ADMIN_PASSWORD` is set, Railway pre-deploy will automatically run
`php artisan admin:ensure-from-env`.
Use `ADMIN_FORCE_PASSWORD=true` when you want deployment to refresh the admin
password from the environment value.

### Persistent uploads

Railway containers use ephemeral local storage. If you need uploaded media to
survive redeploys, point uploads at object storage:

```env
UPLOADS_DISK=s3
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=...
AWS_BUCKET=...
AWS_URL=...
AWS_ENDPOINT=...
AWS_USE_PATH_STYLE_ENDPOINT=false
```

### Important note about the frontend bundle

This backend serves the SPA from `backend/public/index.html`.
If the frontend changes, rebuild it and sync the latest `frontend/dist` into
`backend/public` before deploying the backend service.

### Health check

Use:

```text
/up
```
