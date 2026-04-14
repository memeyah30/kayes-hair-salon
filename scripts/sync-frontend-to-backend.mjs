import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const frontendDistDir = path.join(rootDir, 'frontend', 'dist');
const backendPublicDir = path.join(rootDir, 'backend', 'public');
const backendAssetsDir = path.join(backendPublicDir, 'assets');
const backendIndexHtml = path.join(backendPublicDir, 'index.html');

if (!existsSync(frontendDistDir)) {
  console.error('Frontend build not found at frontend/dist.');
  console.error('Run "npm --prefix frontend run build" first.');
  process.exit(1);
}

mkdirSync(backendPublicDir, { recursive: true });

rmSync(backendAssetsDir, { recursive: true, force: true });
rmSync(backendIndexHtml, { force: true });

cpSync(frontendDistDir, backendPublicDir, {
  recursive: true,
  force: true,
});

console.log('Frontend build synced to backend/public successfully.');
