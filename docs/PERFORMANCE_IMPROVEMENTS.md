# Performance Improvement Summary

## 1. Database query optimizations

### SELECT * replaced with specific columns
- **MenuService**: `Menu::active()->select(['id', 'menu_name', 'menu_key', 'route_path', 'icon', 'parent_id', 'sort_order'])` for getMenusForUser and getAllMenusTree; `select(['id', 'parent_id'])` in includeAncestors.
- **PermissionController**: `User::active()->select(['id', 'name', 'email', 'role_id', 'status'])` for users; `UserMenuPermission::select([...])` for userMenu.
- **CompanyController::list()**: `Company::select(['id', 'company_name'])` for dropdown (reduced payload).
- **LoomController::list()**: `Loom::select(['id', 'loom_number'])` for dropdown.
- **ReportController::orderSummary**: `Order::select(['id', 'status', 'grand_total', 'created_at'])` and `limit(5000)`.
- **ReportController::loomEfficiency**: `LoomEntry::with('loom:id,loom_number')->select(['id', 'loom_id', 'date', 'meters_produced', 'rejected_meters', 'net_production'])`.

### N+1 and query consolidation
- **YarnOrderController::entry()**: Replaced three separate queries with `YarnOrder::load(['yarnReceipts', 'fabrics', 'yarnRequirements'])` (eager loading).
- **DashboardController**: Pending payments now use a single subquery: `Payment::whereIn('company_id', Order::select('company_id')->whereIn(...))->sum('amount')` instead of pluck + whereIn.

---

## 2. Database indexes (migration `2026_02_23_100009_add_performance_indexes`)

Indexes added for frequently filtered/sorted columns:

| Table | Index name | Column(s) |
|-------|------------|-----------|
| orders | idx_orders_status | status |
| orders | idx_orders_created_at | created_at |
| fabrics | idx_fabrics_yarn_order_id | yarn_order_id |
| yarn_receipts | idx_yarn_receipts_date | date |
| yarn_requirements | idx_yarn_requirements_yarn_order_id | yarn_order_id |
| loom_entries | idx_loom_entries_date | date |
| user_menu_permissions | idx_user_menu_permissions_user_id | user_id |
| user_menu_permissions | idx_user_menu_permissions_menu_id | menu_id |
| gst_records | idx_gst_records_type | type |
| gst_records | idx_gst_records_date | date |
| payments | idx_payments_payment_date | payment_date |
| expenses | idx_expenses_category | category |
| expenses | idx_expenses_date | date |
| companies | idx_companies_company_name | company_name |
| looms | idx_looms_status | status |
| menus | idx_menus_status | status |
| menus | idx_menus_sort_order | sort_order |

Run: `php artisan migrate`

---

## 3. Pagination

- **OrderController**, **CompanyController**, **LoomController**, **GstRecordController**, **PaymentController**, **ExpenseController**, **UserController**, **YarnOrderController**, **LoomEntryController**: Already use `paginate(per_page)`.
- **ReportController::orderSummary**: Limited to 5000 rows to avoid unbounded load.

---

## 4. Reduced API calls / combined endpoint

- **GET /yarn-orders/{id}/entry** already returns order + receipts + fabrics + yarn_requirements in one response; optimized with eager loading and no extra queries.

---

## 5. Laravel response-time optimizations

### Caching
- **MenuController::userMenus()**: Response cached per user with `Cache::remember('user_menus_' . $user->id, 3600, ...)`. Cache is cleared when permissions are saved (PermissionController::save clears all user menu caches).

### Compression
- **CompressResponseMiddleware**: Applied to API. Gzips JSON (and text) responses when `Accept-Encoding: gzip` is sent and content length ≥ 512 bytes.

### Performance logging
- **PerformanceLogMiddleware**: Logs method, URI, status, and duration_ms for each API request to the default log channel.

---

## 6. React optimizations

### Component rendering
- **Table**: Wrapped in `React.memo(TableComponent)` to avoid unnecessary re-renders when parent updates but props are unchanged.

### Lazy loading
- **YarnStockList**, **YarnStockEntry**, **AdminUserList**, **AdminPermissionMatrix**: Loaded via `React.lazy()` with `Suspense` and `PageLoader` fallback for code splitting and smaller initial bundle.

### Loading states
- Existing loading spinners retained on list/dashboard pages.
- Table already shows a spinner when `isLoading` is true.
- PageLoader used as Suspense fallback for lazy routes.

---

## 7. API payload size

- List/dropdown endpoints return only needed fields (see §1).
- Menu and permission payloads are cached and trimmed to required columns.

---

## 8. Files changed (summary)

**Backend**
- `database/migrations/2026_02_23_100009_add_performance_indexes.php` (new)
- `app/Services/MenuService.php` (select columns)
- `app/Http/Controllers/Api/MenuController.php` (cache)
- `app/Http/Controllers/Api/CompanyController.php` (list select)
- `app/Http/Controllers/Api/LoomController.php` (list select)
- `app/Http/Controllers/Api/PermissionController.php` (select, cache clear)
- `app/Http/Controllers/Api/ReportController.php` (select, limit)
- `app/Http/Controllers/Api/YarnOrderController.php` (eager load in entry)
- `app/Http/Controllers/Api/DashboardController.php` (subquery for payments)
- `app/Http/Middleware/PerformanceLogMiddleware.php` (new)
- `app/Http/Middleware/CompressResponseMiddleware.php` (new)
- `bootstrap/app.php` (register middleware)

**Frontend**
- `src/components/Table.jsx` (React.memo)
- `src/App.jsx` (lazy routes + Suspense + PageLoader)

---

## 9. Recommended next steps

1. Run the new migration: `php artisan migrate`.
2. Ensure frontend sends `Accept-Encoding: gzip` (browser and axios usually do).
3. Monitor `storage/logs/laravel.log` for "API performance" entries.
4. If menu/permission data changes outside PermissionController, clear user menu cache as needed (e.g. `Cache::forget('user_menus_' . $userId)`).
5. Consider Redis for cache driver in production for faster cache and optional cache tags.
