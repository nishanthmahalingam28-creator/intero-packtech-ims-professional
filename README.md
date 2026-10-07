# Intero Packtech - Inventory Management System

Role-based inventory and sales-request system.
**React + Vite + Tailwind CSS (client)  -  Node.js + Express + Mongoose (server)  -  MongoDB Atlas (database).**

```
LOGIN -> AUTHENTICATION -> ROLE -> DASHBOARD -> INVENTORY -> SALES REQUEST
      -> PENDING -> APPROVE / CANCEL -> STOCK UPDATE -> REPORTS
```

---

## 1. Architecture

```
Browser (React + Vite + Tailwind)
   |  pages -> hooks (useApi) -> services -> api.js  (fetch + "Authorization: Bearer <token>")
   v
Express API  (src)
   |-- middleware/authenticate   "WHO are you?"      verify token, load user + role from MongoDB, reject inactive users
   |-- middleware/authorize      "ARE you allowed?"  permit('sales:process') ... (utils/permissions.js)
   |-- controllers/              thin: read request -> call service -> send JSON
   |-- services/                 ALL business rules: validation, warehouse scoping, stock, transactions
   v
Mongoose models  ->  MongoDB Atlas
   users, warehouses, products, subproducts, consumables, salesrequests, stocktransactions, settings, counters
```

**Authentication vs Authorization**

| | Question | Where |
|---|---|---|
| Authentication | "Who is the user?" | `POST /api/auth/login` (bcrypt password check, signed JWT), `middleware/authenticate.js` |
| Authorization | "What may this user do?" | `utils/permissions.js` + `middleware/authorize.js` + row-level checks in `services/` |

The React app hides buttons/menus using a copy of the permission table, **but that is only for convenience.
Every rule is enforced again on the server**, so calling the API directly (Postman, browser dev-tools) gets the same 403.

The role is **not** stored in the token. It is re-read from MongoDB on every request, so deactivating a user or
changing a role takes effect immediately.

## 2. Folder structure

```
intero-packtech-ims/
|-- package.json              helper scripts (install:all, seed:demo, test, build)
|-- server/
|   |-- .env.example
|   |-- src/
|   |   |-- server.js  app.js              start-up, security middleware (helmet, cors, rate limits)
|   |   |-- config/    env.js db.js
|   |   |-- models/    User Warehouse Product SubProduct Consumable SalesRequest StockTransaction Setting Counter
|   |   |-- middleware/ authenticate.js authorize.js errorHandler.js
|   |   |-- routes/    index.js            <- the access-control table, one line per endpoint
|   |   |-- controllers/                   thin HTTP layer
|   |   |-- services/  salesService.js ... all business logic
|   |   |-- utils/     permissions.js validate.js scope.js transaction.js AppError.js ...
|   |   `-- scripts/   seed.js
|   `-- tests/         permissions.test.js validate.test.js workflow.integration.test.js
`-- client/
    `-- src/
        |-- App.jsx                route table (ProtectedRoute = login, RoleRoute = permission)
        |-- context/   AuthContext ThemeContext ToastContext
        |-- hooks/     useApi (load + auto refresh)  useData (one hook per resource)  useAction
        |-- services/  api.js (the only fetch code) + one small file per resource
        |-- layouts/ components/ pages/ utils/ styles/
```

## 3. Role / permission matrix

| Capability | Super Admin | Admin | Manager | Sales |
|---|:-:|:-:|:-:|:-:|
| Warehouses: create / read / update / delete | yes | yes | - | - |
| Users: create / read / update / delete / (de)activate | all roles | Manager + Sales of **own warehouse** | - | - |
| Products, price, sub-products, consumables: CRUD | all warehouses | **own warehouse** | - | - |
| Stock: add / remove / set (always logged) | yes | own warehouse | - | - |
| Low-stock threshold | yes | yes | read | read |
| Inventory + stock history | yes | own warehouse | own warehouse | - |
| Sales reports + stock reports (view, CSV, print) | yes | own warehouse | own warehouse | - |
| View sales requests | all (read only) | own warehouse | own warehouse | **own requests only** |
| Create sales request | - | - | - | yes |
| **Approve / cancel Pending requests** | **NO** | yes | yes | NO |

Rules: nobody can change their own role or deactivate/delete themselves; a Sales user can never process a request.

## 4. Database design (MongoDB)

| Collection | Purpose | Key fields | Relationships / safety |
|---|---|---|---|
| `users` | Login accounts | name, email (unique), passwordHash (bcrypt, never returned), role, warehouseId, status | `warehouseId` -> warehouses. Super Admin has none. |
| `warehouses` | Locations | code (unique, e.g. WH-01), name, location, phone, email, description, status | Cannot be deleted while products / consumables / users / pending requests exist. |
| `products` | A product stocked in one warehouse | code (PRD-0001), name, category, description, price, **stockQuantity**, warehouseId, status | Stock changes only via stock adjustment or approved sale. |
| `subproducts` | Parts belonging to a product | name, parentProductId, parentProductName, warehouseId (copied from parent), quantity, price, status | Parent name kept in sync on rename. |
| `consumables` | Glue, tape, bands... | name, warehouseId, quantity, price, description, status | |
| `salesrequests` | Sales requests | requestNo (SR-000001), salesUser*, warehouse*, product*, quantity, price, totalAmount, status, notes, processedBy*, processedAt | Names + price are **snapshots**, so old reports stay correct. |
| `stocktransactions` | Append-only stock ledger | type (INITIAL / ADJUSTMENT / SALE), quantityChange, balanceAfter, requestId, performedBy* | No update/delete endpoint exists. **Unique index: one SALE row per request.** |
| `settings` | System settings | lowStockThreshold | single document `inventory` |
| `counters` | Supporting data | `_id` = prefix, seq | Atomic `$inc` -> unique, readable codes. |

## 5. How the critical business rules are enforced

All in `src/modules/sales/services/salesService.js`:

1. **Create** (Sales only): status is always `Pending`; price/product/warehouse are read from the database, not trusted from the browser; stock is **not** touched.
2. **Approve** runs as ONE MongoDB transaction:
   1. *Claim:* `findOneAndUpdate({_id, status:'Pending', warehouse: mine}, {status:'Approved', processedBy, processedAt})`.
      Only one caller can ever win this, so a request cannot be approved twice, and two managers pressing Approve at the same moment cannot both succeed.
   2. *Take stock:* `findOneAndUpdate({_id: product, stockQuantity: {$gte: qty}}, {$inc: {stockQuantity: -qty}})`.
      If not enough stock, nothing matches -> `"Insufficient stock available."` -> the transaction is aborted and the request stays Pending. Stock can never go negative.
   3. *Ledger:* one `SALE` row (`quantityChange -100`, `balanceAfter 400`). A unique index makes a 2nd row for the same request impossible.
   If any step fails, **all** steps are undone (no "stock deducted but status not updated").
3. **Cancel:** one atomic update Pending -> Cancelled with who/when. Stock untouched.
4. **Super Admin** has no `sales:process` permission -> 403 `"Super Admin cannot approve or cancel sales requests."`.
5. **Own request / other warehouse:** a user cannot process their own request, nor requests of another warehouse (looks like 404).

Other protections: input whitelisting + type validation (blocks NoSQL injection and mass assignment), bcrypt hashing,
login rate limit (10 failed tries / 15 min), helmet headers, CORS limited to your front-end, generic 500 messages
(no stack traces or database details are ever sent to the browser).

## 6. API summary (all under `/api`, JSON, `Authorization: Bearer <token>`)

| Method + path | Who |
|---|---|
| `POST /auth/login`, `GET /auth/me` | public / any signed-in user |
| `GET /warehouses` | any signed-in user |
| `POST/PATCH/DELETE /warehouses[/:id]` | Super Admin, Admin |
| `GET/POST/PATCH/DELETE /users[/:id]` | Super Admin, Admin (scoped) |
| `GET /products` | any role (own warehouse; Sales: active only) |
| `POST/PATCH/DELETE /products[/:id]`, `POST /products/:id/stock` | Super Admin, Admin |
| `/sub-products`, `/consumables` (CRUD) | Super Admin, Admin |
| `GET /stock-transactions` | Super Admin, Admin, Manager |
| `GET /sales-requests` | any role (scoped) |
| `POST /sales-requests` | Sales |
| `POST /sales-requests/:id/approve`, `/cancel` | Admin, Manager |
| `GET /settings`, `PUT /settings` | any / Super Admin + Admin |

## 7. Setup on Windows

### 7.1 Install tools
1. Install **Node.js LTS (20 or 22)** from https://nodejs.org (accept the defaults). Open a NEW PowerShell and check: `node -v` and `npm -v`.
2. (Optional) Install VS Code and Git.

### 7.2 Create the free MongoDB Atlas database
1. Sign up at https://www.mongodb.com/cloud/atlas and create a **free M0** cluster.
2. **Database Access** -> *Add New Database User* -> username + password (use letters/numbers only to avoid URL-encoding problems).
3. **Network Access** -> *Add IP Address* -> *Add current IP address* (for a quick demo you may use `0.0.0.0/0`; do not do that in production).
4. **Database -> Connect -> Drivers** -> copy the connection string. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`.
   Insert the database name before the `?` -> `.../intero_ims?retryWrites=true&w=majority`.

Atlas is a replica set, which is what MongoDB transactions (used for approvals) require.

### 7.3 Start the API
```powershell
cd intero-packtech-ims\server
npm install
copy .env.example .env
notepad .env
```
In `.env` set `MONGODB_URI` (from 7.2) and `JWT_SECRET` (generate one with
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). Then:
```powershell
npm run seed:demo      # creates the Super Admin + demo warehouses/products/users/requests
npm run dev            # API on http://localhost:5000/api   (check http://localhost:5000/api/health)
```

### 7.4 Start the React app (second PowerShell window)
```powershell
cd intero-packtech-ims\client
npm install
npm run dev            # http://localhost:5173
```
Leave `.env` absent in development: Vite forwards `/api` to port 5000 automatically.

### 7.5 Development accounts  (**development only - delete/replace in production**)

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@interopacktech.demo` (from `.env`) | `ChangeMe@12345` (from `.env`) |
| Admin | `admin@interopacktech.demo` | `Demo@12345` |
| Manager | `manager@interopacktech.demo` | `Demo@12345` |
| Sales | `sales@interopacktech.demo` | `Demo@12345` |

These share well-known passwords. In production run only `npm run seed` (Super Admin only) with a strong password
from `.env`, then create real users in the Users page.

### 7.6 Production build
```powershell
cd client
copy .env.example .env     # set VITE_API_URL=https://YOUR-API-URL/api
npm run build              # output in client\dist
npm run preview            # optional: test the build locally
```

## 8. Deployment (free-tier example)

**API on Render** - New Web Service -> root directory `server` -> build `npm install` -> start `npm start`.
Environment: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (32+ chars), `CLIENT_ORIGIN=https://your-frontend-url`.
In Atlas Network Access allow Render's outbound IPs (or `0.0.0.0/0` with a strong DB password).
**Front-end on Netlify or Vercel** - root `client`, build `npm run build`, publish `dist`, env `VITE_API_URL=https://your-api.onrender.com/api`.
(`public/_redirects` and `vercel.json` already make page refreshes work.)

## 9. Tests

```powershell
cd server
npm test
```
* `permissions.test.js`, `validate.test.js` - pure logic (permission matrix incl. "Super Admin cannot approve", quantity/price/email rules, injection-safe validators).
* `workflow.integration.test.js` - boots the real API on an in-memory MongoDB replica set and checks: valid/invalid login, every role's forbidden endpoints,
  500 -> 400 stock after approving 100, double approval, **5 simultaneous approvals deducting once**, insufficient stock, negative-stock prevention,
  cancel does not change stock, warehouse scoping, deactivated users locked out, validation of quantity/price. The first run downloads a MongoDB binary (needs internet).

### Manual test checklist (browser)
1. Wrong password -> friendly error. Right password -> role dashboard. Refresh page -> still signed in. Logout -> back to login.
2. Sign in as **Sales**: sidebar shows only Dashboard + Sales Requests. Create a request for 100 boxes -> Pending, stock unchanged (Inventory as Admin).
3. Sign in as **Super Admin**: open Sales Requests -> no Approve/Cancel buttons. (Calling the API directly returns 403.)
4. Sign in as **Manager**: Approve the request -> status Approved, stock 500 -> 400, a SALE row appears in Inventory -> Stock history. Reports show it.
5. Create a request larger than the remaining stock, try to approve -> "Insufficient stock available.", stays Pending.
6. Admin: CRUD for warehouse, user, product, sub-product, consumable; deleting a warehouse that has products is refused.
7. Reports: filters, sorting, **CSV download**, **Print / PDF** (browser print dialog -> Save as PDF).
8. Resize to phone width: sidebar becomes a drawer, tables scroll sideways, cards stack. Toggle dark mode.

## 10. Design decisions you should know about
* **Admin and warehouses:** the brief gives Admin full warehouse CRUD, so an Admin may create/edit/delete **any** warehouse, while users/products/stock/approvals stay limited to their own. To restrict it, change `warehouse:manage` handling in `warehouseService.js`.
* **Token storage:** the JWT is in `localStorage` (simple, survives refresh). Production hardening: httpOnly cookie + CSRF protection.
* **"Live" screens:** the API is request/response, so lists refresh right after your own changes, when you return to the tab, and every 20 s (so a Manager sees new requests without refreshing).
* **Reports** are built in the browser from the API's (already permission-scoped) data; the API returns the newest 2000 sales requests.
* **Deleting** records is a hard delete with guards (e.g. a product with pending requests or sub-products cannot be deleted). Stock ledger rows and old requests keep their own copy of names.
* **Super Admin** can *view* all sales requests (read-only) but never process them.
* **Passwords:** minimum 8 characters, bcrypt-hashed. Admin/Super Admin can reset a user's password in the Edit dialog.


## Professional unified structure

This project uses a single application source tree organized by business modules. Frontend and backend code are grouped under the same feature modules instead of separate client/server directories.

- `src/modules/*/pages` and `components` contain React UI.
- `src/modules/*/controllers`, `services`, `models`, and `validation` contain server-side feature logic.
- `src/components`, `src/hooks`, `src/context`, `src/services`, and `src/utils` contain shared frontend infrastructure.
- `src/middleware`, `src/config`, and `src/database` contain shared server infrastructure.
- `src/app` contains application/bootstrap and API route registration.
