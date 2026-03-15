# Dynamic RBAC & Menu System

## 1. Database schema

### roles
| Column      | Type         |
|------------|--------------|
| id         | bigint PK    |
| role_name  | string(64) unique |
| description| text nullable |
| permissions| json nullable (legacy) |
| created_at, updated_at | timestamps |

### users
| Column   | Type    |
|----------|---------|
| id       | bigint PK |
| name     | string  |
| email    | string unique |
| password | string  |
| role_id  | FK roles(id) |
| status   | string (active/disabled) |
| created_at, updated_at | timestamps |

### menus
| Column     | Type    |
|------------|--------|
| id         | bigint PK |
| menu_name  | string(128) |
| menu_key   | string(64) unique |
| route_path | string(255) nullable |
| icon       | string(64) nullable |
| parent_id  | FK menus(id) nullable |
| sort_order | smallint default 0 |
| status     | string (active/inactive) |
| created_at, updated_at | timestamps |

### role_menu_permissions
| Column    | Type    |
|-----------|--------|
| id        | bigint PK |
| role_id   | FK roles(id) |
| menu_id   | FK menus(id) |
| can_view  | boolean default true |
| can_create| boolean default false |
| can_edit  | boolean default false |
| can_delete| boolean default false |
| created_at, updated_at | timestamps |
| unique(role_id, menu_id) |

---

## 2. API structure

### Auth & menus
- **POST /api/login** – Authenticate; returns user + token. Frontend then calls GET /menus/user.
- **GET /api/user** – Current user (with role).
- **GET /api/menus/user** – Menus allowed for current user (tree, based on role_menu_permissions where can_view = true). Ancestor menus are included so the tree renders correctly.

### Admin (role: super_admin, admin)
- **GET /api/admin/menus** – All menus as tree.
- **GET /api/admin/menus/flat** – All menus flat (for dropdowns and tables).
- **POST /api/admin/menus** – Create menu (menu_name, menu_key, route_path, icon, parent_id, sort_order, status).
- **PUT /api/admin/menus/{menu}** – Update menu.
- **GET /api/admin/role-menu-permissions** – List permissions; optional query `role_id` to filter by role.
- **POST /api/admin/assign-menu** – Assign one menu to a role (role_id, menu_id, can_view, can_create, can_edit, can_delete).
- **POST /api/admin/assign-menu-bulk** – Assign many (role_id, permissions: [{ menu_id, can_view, can_create, can_edit, can_delete }]).

### Middleware
- **auth:sanctum** – Require authenticated user.
- **role:super_admin,admin** – Require one of these roles (uses user role_name from role relation).
- **menu.permission:menu_key,action** – Optional; check role_menu_permissions for menu_key and action (view/create/edit/delete). SuperAdmin bypasses.

---

## 3. Login flow

1. User submits login → **POST /api/login**.
2. Backend validates credentials, checks user is active, returns user (with role) + token.
3. Frontend stores token and user, then calls **GET /api/menus/user**.
4. Backend resolves user’s role_id, gets menu IDs from role_menu_permissions (can_view = true), includes ancestor menu IDs, builds tree, returns JSON.
5. Frontend stores menus in AuthContext and renders sidebar from this list (no hardcoded menu items).

---

## 4. Dynamic sidebar (frontend)

- **AuthContext** holds `user` and `menus`. After login (and on fetchUser), it calls GET /menus/user and sets `menus`.
- **Layout** reads `menus` from context. Each item has `menu_name`, `menu_key`, `route_path`, `icon`, `children` (nested). Layout maps icon string to Lucide component via `iconsMap.js` and renders:
  - Items with `route_path` and no children → single NavLink.
  - Items with `children` → SidebarGroup (expandable) with child links.
- If `menus` is empty (e.g. API error), fallback: show only Dashboard link.

---

## 5. Admin UI

- **Menu Management** (`/admin/menus`) – List all menus (flat table). Form to create menu: name, key, route, icon, parent, sort_order, status. SuperAdmin only.
- **Assign Menu to Role** (`/admin/assign-menu`) – Select role; table of all menus with checkboxes for View / Create / Edit / Delete. Save calls POST /admin/assign-menu-bulk. SuperAdmin only.

---

## 6. Role permission rules

- **SuperAdmin** – All menus, full CRUD in role_menu_permissions (seeded).
- **Admin** – Operational modules + Admin Panel (Create User, Manage Users). No Roles & Permissions, Activity Logs, Menu Management, Assign Menu (or grant only to SuperAdmin in seed).
- **User** – Only operational modules (Dashboard, GST, Companies, Orders, Loom Production, Finance, Reports, Profile). No Admin Panel.

Seeding is in `MenusSeeder` and `RoleMenuPermissionSeeder`; adjust there to change default access.

---

## 7. File structure

**Backend**
- `app/Models/Role.php`, `User.php`, `Menu.php`, `RoleMenuPermission.php`
- `app/Services/MenuService.php` – getMenusForUser, buildTree, includeAncestors
- `app/Http/Controllers/Api/MenuController.php` – userMenus
- `app/Http/Controllers/Api/Admin/AdminMenuController.php` – index, store, update, listFlat
- `app/Http/Controllers/Api/Admin/RoleMenuPermissionController.php` – index, assign, assignBulk
- `app/Http/Middleware/CheckRole.php`, `CheckMenuPermission.php`
- `database/seeders/MenusSeeder.php`, `RoleMenuPermissionSeeder.php`

**Frontend**
- `src/context/AuthContext.jsx` – user, menus, fetchUser + GET /menus/user, login/logout
- `src/components/Layout.jsx` – Renders sidebar from `menus` (dynamic)
- `src/components/iconsMap.js` – Map icon name → Lucide component
- `src/pages/Admin/AdminMenus.jsx` – Menu CRUD UI
- `src/pages/Admin/AdminAssignMenu.jsx` – Role–menu permission matrix
