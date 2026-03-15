# RBAC Architecture – Textile Weaving Management

## 1. Roles & Permissions

| Role        | Capabilities |
|------------|--------------|
| **SuperAdmin** | Full system access; create Admin/SuperAdmin/User; edit/delete any user; assign roles; view analytics & activity logs. |
| **Admin**      | Create and edit Users only; assign Users to modules; cannot create SuperAdmin; cannot delete or edit SuperAdmin. |
| **User**       | Access only assigned modules; no admin panel; view/enter production data only. |

---

## 2. Database Schema

### `users`
| Column   | Type         | Notes |
|----------|--------------|-------|
| id       | bigint PK    | |
| name     | string       | |
| email    | string unique| |
| password | string (hashed) | bcrypt |
| role     | string(32)   | `super_admin`, `admin`, `user` |
| status   | string(20)   | `active`, `disabled` |
| created_at, updated_at | timestamps | |

### `roles`
| Column     | Type   | Notes |
|------------|--------|-------|
| id         | bigint PK | |
| role_name  | string unique | `super_admin`, `admin`, `user` |
| permissions| json   | Array of permission keys |
| created_at, updated_at | timestamps | |

### `user_activity_logs`
| Column    | Type   | Notes |
|-----------|--------|-------|
| id        | bigint PK | |
| user_id   | FK nullable | Who performed the action |
| action    | string | e.g. `user.created`, `user.updated` |
| model_type, model_id | nullable | Polymorphic target |
| meta      | json   | Extra data |
| ip_address| string nullable | |
| created_at, updated_at | timestamps | |

---

## 3. Backend API Structure

### Folder structure (Laravel)

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php      # login, register, logout, user
│   │   │   ├── UserController.php      # CRUD + resetPassword
│   │   │   ├── RoleController.php      # index (list roles)
│   │   │   └── ActivityLogController.php # index (SuperAdmin only)
│   │   └── Middleware/
│   │       └── CheckRole.php            # requireRole("super_admin", "admin")
│   ├── Models/
│   │   ├── User.php
│   │   ├── Role.php
│   │   └── UserActivityLog.php
│   └── Http/Resources/
│       └── UserResource.php
├── database/
│   ├── migrations/
│   │   ├── 0001_01_01_000000_create_users_table.php
│   │   ├── 2025_02_23_000001_add_rbac_to_users_and_roles.php  # status, role string
│   │   ├── 2025_02_23_000002_create_roles_table.php
│   │   └── 2025_02_23_000003_create_user_activity_logs_table.php
│   └── seeders/
│       ├── RolesSeeder.php
│       └── DatabaseSeeder.php
└── routes/
    └── api.php
```

### Authentication

- **Mechanism:** Laravel Sanctum (token-based). Passwords hashed with bcrypt (Laravel default).
- **Login:** `POST /api/login` → `{ "email", "password" }` → returns `{ "user", "token", "token_type": "Bearer" }`.
- **Protected routes:** `Authorization: Bearer {token}`. Disabled users (`status !== active`) cannot log in.
- **Middleware:** `auth:sanctum` (require auth), `role:super_admin,admin` (require one of these roles).

### Example API endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST   | /api/login | no | - | Login |
| POST   | /api/register | no | - | Register (creates User role) |
| GET    | /api/user | yes | any | Current user |
| GET    | /api/users | yes | super_admin, admin | List users (Admin sees non–SuperAdmin only) |
| POST   | /api/users | yes | super_admin, admin | Create user (role rules in controller) |
| GET    | /api/users/{id} | yes | super_admin, admin | Show user |
| PUT    | /api/users/{id} | yes | super_admin, admin | Update (Admin cannot edit SuperAdmin) |
| DELETE | /api/users/{id} | yes | super_admin, admin | Delete (Admin cannot delete SuperAdmin) |
| POST   | /api/users/{id}/reset-password | yes | super_admin, admin | Reset password |
| GET    | /api/roles | yes | super_admin, admin | List roles & permissions |
| GET    | /api/activity-logs | yes | super_admin | Activity logs |

---

## 4. Middleware (RBAC)

- **requireAuth:** Use Laravel `auth:sanctum` on the route group.
- **requireRole:** `CheckRole` middleware — e.g. `->middleware('role:super_admin,admin')`.
- **Business rules in controller:**  
  - SuperAdmin: full access.  
  - Admin: can create only `user`; can edit/delete only non–SuperAdmin users.  
  - User: no access to admin routes (frontend redirect + backend 403).

---

## 5. Frontend Structure

```
frontend/src/
├── context/
│   └── AuthContext.jsx          # user, hasRole('super_admin'|'admin'|'user'), login, logout
├── components/
│   └── Layout.jsx               # Sidebar: Dashboard, Production, Admin Panel, Settings
├── pages/
│   ├── Admin/
│   │   ├── index.js
│   │   ├── AdminCreateUser.jsx  # Name, Email, Password, Role, Status
│   │   ├── AdminUserList.jsx    # Table + Edit, Disable, Delete, Reset Password
│   │   ├── AdminRoles.jsx       # Roles & permissions (read-only)
│   │   └── AdminActivityLogs.jsx
│   └── Settings/
│       └── Profile
└── App.jsx                      # ProtectedRoute by roles; /admin/* routes
```

### Admin Panel menu (sidebar)

- **Dashboard** — all roles (with access to dashboard).
- **Production, Inventory, Loom, Reports** — as per existing module access.
- **Admin Panel** (visible to SuperAdmin & Admin):
  - Create User (SuperAdmin, Admin)
  - Manage Users (SuperAdmin, Admin)
  - Roles & Permissions (SuperAdmin only)
  - Activity Logs (SuperAdmin only)
- **Settings → Profile** — all authenticated.

### Security (frontend)

- `ProtectedRoute` with `roles={['super_admin', 'admin']}` blocks `User` from `/admin/*`.
- Create User: Role dropdown shows only “User” for Admin; SuperAdmin sees SuperAdmin, Admin, User.
- Manage Users: Admin cannot edit/delete SuperAdmin rows; actions hidden or disabled.

---

## 6. Running the project

**Backend (first time / after pull):**

```bash
cd backend
php artisan migrate
php artisan db:seed
```

**Default seeded users (after RBAC migration + seed):**

- superadmin@toroproduction.com / password — SuperAdmin  
- admin@toroproduction.com / password — Admin  
- user@toroproduction.com / password — User  

(Existing owner/accountant/supervisor/data_entry users are migrated to super_admin/admin/user as per migration mapping.)

---

## 7. Optional: user_permissions

If you need per-user overrides on top of role permissions, add:

- **user_permissions:** `user_id`, `permission_key`, `allowed` (boolean).  
- In middleware or policy: resolve role permissions, then check `user_permissions` for overrides.

Current design uses only role-based permissions stored in the `roles` table; controllers enforce SuperAdmin vs Admin vs User rules in code.
