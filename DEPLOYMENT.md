# Deployment Checklist — Laravel + React (CSRF & Production)

Use this checklist when deploying to production (e.g. Hostinger with Apache, MySQL).

---

## 1. VerifyCsrfToken middleware (Backend)

**File:** `backend/app/Http/Middleware/VerifyCsrfToken.php`

- API routes are excluded from CSRF verification via `protected $except = ['api/*'];`.
- CSRF is **not** disabled globally; only `api/*` is excluded (Bearer token auth).
- Sanctum uses this middleware in `config/sanctum.php` for stateful frontend requests.

---

## 2. React API client (Frontend)

**File:** `frontend/src/api/client.js`

- `withCredentials: true` — sends cookies with cross-origin requests.
- `X-Requested-With: XMLHttpRequest` — identifies AJAX requests.
- `getCsrfCookie()` — call before login so Laravel can set the CSRF cookie when using stateful Sanctum.

**File:** `frontend/src/context/AuthContext.jsx`

- Login flow calls `getCsrfCookie()` before `api.post('/login', ...)`.

---

## 3. HTTPS (Backend)

**File:** `backend/app/Providers/AppServiceProvider.php`

- In production, `URL::forceScheme('https')` is applied so URLs and cookies use HTTPS.

---

## 4. Backend path (when public is separate from backend)

`public/index.php` resolves the backend directory via `BACKEND_PATH`:

- **Local:** Leave `BACKEND_PATH=` empty in `.env`. The backend is the parent of `public`, so paths like `../vendor/autoload.php` and `../bootstrap/app.php` are used.
- **Production (e.g. Hostinger):** The backend is in a folder like `toro-backend` outside the document root. Set **`BACKEND_PATH` in the server/hosting environment variables** to `toro-backend` (Hostinger: Advanced → Environment variables). The backend’s `.env` is not readable from `public/index.php` in this setup, so the server env is required. Also set `BACKEND_PATH=toro-backend` in the backend’s `.env` for Artisan/CLI.

---

## 5. .env settings (Backend — production)

Set these on the server (e.g. Hostinger):

```env
BACKEND_PATH=toro-backend
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Session (required for Sanctum stateful + CSRF cookie)
SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_DOMAIN=.yourdomain.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

# Sanctum: allow your frontend origin (no trailing slash)
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com

# CORS: frontend origin (used in config/cors.php allowed_origins)
SPA_URL=https://yourdomain.com
```

If frontend and API are on the **same domain** (e.g. `https://yourdomain.com` and `https://yourdomain.com/api`), you can use:

```env
SESSION_DOMAIN=yourdomain.com
```

If frontend is on a subdomain (e.g. `https://app.yourdomain.com`) and API on another (e.g. `https://api.yourdomain.com`), use a leading dot so the cookie is shared:

```env
SESSION_DOMAIN=.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com,api.yourdomain.com
```

Frontend `.env` (or build env):

```env
VITE_API_URL=https://yourdomain.com
# or https://api.yourdomain.com if API is on a subdomain
```

---

## 5. Storage permissions (Backend)

Laravel must be able to write sessions and cache. On the server:

```bash
cd /path/to/backend
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

(Use the user Apache runs as instead of `www-data` if different, e.g. `nobody` or your hosting user.)

---

## 6. Clear caches after deployment (Backend)

Run after every deployment or .env change:

```bash
cd /path/to/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear
# Then optionally:
php artisan config:cache
php artisan route:cache
```

---

## 7. Session and CORS (Backend)

- **Session:** With `SESSION_DRIVER=file`, sessions are stored under `storage/framework/sessions`. Ensure the `storage` and `bootstrap/cache` permissions above so sessions can be written.
- **CORS:** `config/cors.php` already has `'paths' => ['api/*', 'sanctum/csrf-cookie']` and `'supports_credentials' => true`. Set `allowed_origins` (or `.env` like `SPA_URL`) to your frontend URL, e.g. `https://yourdomain.com` or `https://app.yourdomain.com`.

---

## Quick checklist

- [ ] `VerifyCsrfToken` has `api/*` in `$except` and is used in Sanctum config.
- [ ] React client uses `withCredentials: true` and `X-Requested-With: XMLHttpRequest`; login calls `getCsrfCookie()` before `POST /login`.
- [ ] `AppServiceProvider` forces `https` in production.
- [ ] Production `.env`: `APP_URL`, `SESSION_DRIVER`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`, `SANCTUM_STATEFUL_DOMAINS`.
- [ ] `storage` and `bootstrap/cache` are `775` and writable by the web server user.
- [ ] After deploy: `php artisan config:clear` (and other clears); then `config:cache` / `route:cache` if desired.
- [ ] CORS `allowed_origins` (or `SPA_URL`) matches the frontend origin.
