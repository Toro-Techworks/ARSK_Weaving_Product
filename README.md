# Toro Production

Weaving production management software – full-stack ERP for textile units.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios, Lucide Icons, React Hot Toast
- **Backend:** Laravel 11, API, Laravel Sanctum
- **Database:** MySQL

## Setup

### Backend (Laravel)

1. From project root:
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   ```

2. Configure `.env`:
   - Set `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` for MySQL
   - Set `SPA_URL=http://localhost:5173` and add to `SANCTUM_STATEFUL_DOMAINS` if needed

3. Run migrations and seed:
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

4. Start API server:
   ```bash
   php artisan serve
   ```
   API: http://localhost:8000

### Frontend (React)

1. From project root:
   ```bash
   cd frontend
   npm install
   ```

2. Optional: create `frontend/.env` with:
   ```
   VITE_API_URL=http://localhost:8000
   ```
   If omitted, the app uses `http://localhost:8000` by default.

3. Start dev server:
   ```bash
   npm run dev
   ```
   App: http://localhost:5173

### Default logins (after `php artisan db:seed`)

| Role        | Username     | Password |
|-------------|--------------|----------|
| Super Admin | `superadmin` | password |
| Admin       | `admin`      | password |
| User        | `user`       | password |

Log in with **username** (not email). Menus and permissions are seeded by `MenusSeeder`.

## Features

- **Dashboard:** Today’s production, active looms, pending payments, GST payable, running orders, daily production bar chart
- **Companies:** CRUD, GST number, address, contact, payment terms
- **Orders (DC):** Auto DC number (DC-YYYY-0001), company, fabric, quantity, rate, loom, delivery date, status; auto total, GST, grand total
- **Looms:** Loom number, location, status (Active/Inactive)
- **Loom Daily Entry:** Loom, date, shift, meters produced/rejected, operator; net production and efficiency
- **Payments:** Company, optional order, date, amount, mode (Cash/Bank/UPI), reference
- **Expenses:** Category (Electricity/Labour/Maintenance/Yarn), amount, date, notes
- **GST In:** Vendor/purchase entries with taxable value and GST %
- **GST Out:** Generated from completed orders; dynamic GST %
- **Reports:** GST Summary, Order Summary, Loom Efficiency
- **Settings:** User Management (owner only), Profile
- **Auth:** Email/password, role-based access (Owner, Accountant, Supervisor, Data Entry)
- **UI:** Collapsible sidebar (#312E81), cards, tables, toasts, loading states, pagination

## API (REST)

- `POST /api/login` – login
- `GET /api/user` – current user (auth)
- `GET /api/dashboard` – dashboard stats
- `GET|POST|GET /api/companies` – list, create; `GET|PUT|DELETE /api/companies/{id}`
- `GET /api/companies-list` – all companies (for dropdowns)
- `GET|POST|... /api/looms`, `GET /api/looms-list`
- `GET|POST|... /api/orders`, `POST /api/orders/{id}/gst-out`
- `GET|POST|... /api/loom-entries`
- `GET|POST|... /api/payments`, `GET|POST|... /api/expenses`
- `GET|POST|... /api/gst-records`
- `GET /api/reports/gst-summary`, `order-summary`, `loom-efficiency`
- `GET|POST|... /api/users` (owner only)

All authenticated routes use `Authorization: Bearer {token}`.

## License

MIT
