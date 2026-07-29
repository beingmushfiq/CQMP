<div align="center">

<img src="frontend/public/favicon.svg" alt="CQMP" width="88" height="88"/>

# Clinic Queue Management Platform

### **CQMP** — Real-time patient queue management for modern clinics

[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![WebSockets](https://img.shields.io/badge/WebSockets-Reverb-8B5CF6?style=for-the-badge&logo=laravel&logoColor=white)](https://reverb.laravel.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

*Register patients · Manage queues · Display live status · All in real-time*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Real-time Events](#-real-time-events-websocket)
- [API Reference](#-api-reference)
- [User Roles & Panels](#-user-roles--panels)
- [Keyboard Shortcuts](#%EF%B8%8F-keyboard-shortcuts)
- [PWA Support](#-pwa-support)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running Tests](#-running-tests)
- [Admin Panel](#-admin-panel-filament)
- [Contributing](#-contributing)

---

## 🏥 Overview

**CQMP** is a full-stack, real-time clinic queue management system that eliminates the chaos of paper-based patient queuing. It connects **receptionists**, **doctors**, and **waiting patients** through a live-updating dashboard — ensuring smooth patient flow, minimal wait-time confusion, and a professional clinic experience.

Built on **Laravel 13** + **Laravel Reverb** (WebSockets) on the backend, and **React 19** + **Zustand** + **TypeScript** on the frontend, the system delivers sub-second queue updates to all connected screens simultaneously.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🟢 **Live Queue Board** | Patient queue updates in real-time via WebSockets — no page refresh needed |
| 🚨 **Emergency Insert** | Instantly push an emergency patient to the front, with automatic serial renumbering |
| 🔢 **Serial Reordering** | Move any patient to any position by entering a target serial number |
| 🖨️ **Thermal Slip Printing** | One-click print of a formatted receipt with serial and estimated wait |
| ⏸️ **Queue Freeze / Resume** | Pause walk-in registrations while keeping the existing queue intact |
| ⏱️ **Estimated Wait Times** | Auto-calculated from average consultation time + doctor delay |
| 📺 **TV Display Mode** | Full-screen patient-facing display showing live serial numbers |
| 🔒 **Role-Based Access** | Doctor, Receptionist, and Admin roles via Spatie Permission |
| 📋 **Audit Trail** | Every action (call, complete, skip, emergency, reinsert, delete) is logged |
| 🌙 **Dark / Light Mode** | System-aware theme with instant toggle, persisted to `localStorage` |
| ⌨️ **Full Keyboard Control** | Every core action has a single-key hotkey — no mouse required |
| 📱 **PWA Installable** | Install as a native-like app on Android, iOS, or desktop |
| 🔔 **Doctor Delay Tracking** | Doctors can log delays; wait times auto-update for all waiting patients |
| 🌐 **Visitor Self-Booking** | Public booking form (no login) — name only, phone optional |
| 🛡️ **Admin Panel** | Filament-powered admin for managing clinics, doctors, and patients |

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **PHP** | 8.3+ | Runtime |
| **Laravel** | 13.x | Application framework |
| **Laravel Reverb** | 1.x | Native WebSocket server |
| **Laravel Sanctum** | 4.x | API token authentication |
| **Laravel Filament** | 5.x | Admin panel UI |
| **Spatie Permission** | 8.x | Role & permission management |
| **SQLite / MySQL** | — | Database (SQLite by default in dev) |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.x | UI framework |
| **TypeScript** | 6.x | Type safety |
| **Vite** | 8.x | Build tool & dev server |
| **Zustand** | 5.x | Global state management |
| **Laravel Echo** | 2.x | WebSocket client |
| **Pusher JS** | 8.x | WebSocket transport adapter |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **Lucide React** | — | Icon library |
| **vite-plugin-pwa** | — | Service Worker & PWA manifest |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CQMP Architecture                           │
├────────────────┬──────────────────────────┬─────────────────────────┤
│    Frontend    │       Backend API         │     WebSocket Layer      │
│  React 19 + TS │   Laravel 13 REST API    │    Laravel Reverb        │
├────────────────┤                          │                          │
│ LoginForm      │  POST  /queue/open        │  ws://host:8080/app/..   │
│ Receptionist   │  GET   /queue/today       │                          │
│  Dashboard     │  POST  /queue/create      │  Channels:               │
│ Doctor         │  POST  /queue/call-next   │  ├─ queue.{queueDayId}   │
│  Dashboard     │  POST  /queue/complete    │  └─ doctor-queue.{docId} │
│ TV Display     │  POST  /queue/skip        │                          │
│ Visitor        │  POST  /queue/reinsert    │  Events Fired:           │
│  Booking       │  POST  /queue/emergency   │  ├─ QueueCreated         │
├────────────────┤  POST  /queue/freeze      │  ├─ QueueUpdated         │
│  State (Zustand│  DELETE /queue/:id        │  ├─ QueueCompleted       │
│  stores)       │  POST  /doctor/delay      │  ├─ QueueDeleted         │
│  ├─ useQueue   │                           │  ├─ EmergencyInserted     │
│  ├─ useAuth    │  Admin Panel:             │  ├─ QueueFrozen          │
│  └─ useTheme   │  /admin  (Filament)       │  ├─ QueueResumed         │
│                │                           │  └─ EstimatedTimeUpdated │
└────────────────┴───────────────────────────┴──────────────────────────┘
```

### Request Flow (Walk-in Registration)

```
Receptionist types name → clicks "Add Queue" [R]
          │
          ▼
React → POST /api/v1/patients  (create / find patient)
          │
          ▼
React → POST /api/v1/queue/create
          │
          ▼
QueueController → QueueEngine::createWalkIn()
          │ (DB transaction with row-level lock)
          ▼
QueueItem saved → broadcast(QueueCreated)
          │
          ▼
Laravel Reverb → WebSocket → All subscribers on queue.{id}
          │
          ▼
useQueueStore listener → state.items updated
          │
          ▼
React re-renders: Doctor Dashboard + TV Display (instantly)
```

---

## 📁 Project Structure

```
Clinic Queue Management Platform (CQMP)/
│
├── backend/                              # Laravel 13 API + Admin
│   ├── app/
│   │   ├── Events/                       # 9 WebSocket broadcast events
│   │   │   ├── QueueCreated.php
│   │   │   ├── QueueUpdated.php
│   │   │   ├── QueueCompleted.php
│   │   │   ├── QueueDeleted.php
│   │   │   ├── EmergencyInserted.php
│   │   │   ├── QueueFrozen.php
│   │   │   ├── QueueResumed.php
│   │   │   ├── QueueOpened.php
│   │   │   └── EstimatedTimeUpdated.php
│   │   │
│   │   ├── Filament/Resources/           # Admin panel CRUD resources
│   │   │   ├── Clinics/
│   │   │   ├── Doctors/
│   │   │   ├── Patients/
│   │   │   └── Appointments/
│   │   │
│   │   ├── Http/Controllers/Api/
│   │   │   ├── AuthController.php        # Login / logout / me
│   │   │   ├── PatientController.php     # Patient CRUD (phone optional)
│   │   │   └── QueueController.php       # All queue operations + public booking
│   │   │
│   │   ├── Models/                       # 11 Eloquent models
│   │   │   ├── Clinic.php
│   │   │   ├── Doctor.php
│   │   │   ├── DoctorDelay.php
│   │   │   ├── Patient.php
│   │   │   ├── QueueDay.php
│   │   │   ├── QueueItem.php
│   │   │   ├── Appointment.php
│   │   │   ├── Announcement.php
│   │   │   ├── AuditLog.php
│   │   │   ├── Receptionist.php
│   │   │   └── User.php
│   │   │
│   │   └── Services/
│   │       ├── QueueEngine.php           # Core queue business logic
│   │       └── AuditService.php          # Action audit logging
│   │
│   ├── database/migrations/              # 16 migrations
│   ├── routes/api.php                    # All API routes under /api/v1
│   └── tests/Feature/
│       └── QueueApiTest.php              # Feature tests for queue operations
│
└── frontend/                             # React 19 + TypeScript SPA
    ├── public/
    │   ├── favicon.svg                   # Browser tab icon (queue + cross mark)
    │   ├── logo.svg                      # Full horizontal wordmark
    │   ├── icon-192.svg                  # PWA home screen icon
    │   ├── icon-512.svg                  # PWA splash / store icon
    │   └── manifest.json                 # Web App Manifest
    │
    └── src/
        ├── components/
        │   ├── LoginForm.tsx             # Auth screen with branded logo
        │   ├── ReceptionistDashboard.tsx # Patient registration + queue management
        │   ├── DoctorDashboard.tsx       # Doctor's call / complete / skip panel
        │   ├── TvDisplay.tsx             # Public-facing live TV board
        │   └── VisitorBooking.tsx        # Self-service booking (no login, name only)
        │
        ├── hooks/
        │   └── useKeyboardShortcut.ts   # Global hotkey system (auto-disabled in inputs)
        │
        ├── store/
        │   ├── useQueueStore.ts         # Queue state + WebSocket subscriptions
        │   ├── useAuthStore.ts          # Auth token + user state
        │   └── useThemeStore.ts         # Dark / light theme
        │
        └── utils/
            ├── api.ts                   # Axios instance + Bearer token interceptor
            └── echo.ts                  # Laravel Echo + Reverb WebSocket config
```

---

## 🗄 Database Schema

```
clinics
  id | name | address | phone | timestamps

doctors
  id | user_id | clinic_id | name | specialization
     | average_consultation_time | is_available | timestamps

patients
  id | name | phone (nullable) | notes | is_blocked
     | blocked_reason | qr_identifier | timestamps

queue_days
  id | doctor_id | clinic_id | date | status (opened|paused|closed)
     | opened_by | opened_at | closed_at | timestamps

queue_items
  id | queue_day_id | patient_id | serial_no | appointment_type
     | status (Waiting|Called|Completed|Skipped)
     | priority (Normal|Emergency) | estimated_wait
     | called_at | completed_at | timestamps

appointments
  id | patient_id | doctor_id | scheduled_at | status | notes | timestamps

doctor_delays
  id | doctor_id | delay_minutes | reason | start_time | end_time | timestamps

audit_logs
  id | user_id | action | target_patient_id | details
     | ip_address | user_agent | created_at

announcements
  id | clinic_id | message | is_active | timestamps
```

---

## ⚡ Real-time Events (WebSocket)

All events are broadcast over **Laravel Reverb** and received by **Laravel Echo** on the frontend.

| Event | Channel | Key Payload | Trigger |
|---|---|---|---|
| `QueueCreated` | `queue.{id}` | `queue_item` | New patient registered |
| `QueueUpdated` | `queue.{id}` | `queue_item` | Patient reordered / called |
| `QueueCompleted` | `queue.{id}` | `queue_item_id` | Doctor marks done |
| `QueueDeleted` | `queue.{id}` | `queue_item_id`, `doctor_id` | Entry removed |
| `EmergencyInserted` | `queue.{id}` | `queue_item` | Emergency patient added |
| `QueueFrozen` | `queue.{id}` | `queue_day` | Queue paused |
| `QueueResumed` | `queue.{id}` | `queue_day` | Queue unpaused |
| `QueueOpened` | `doctor-queue.{docId}` | `queue_day` | New queue day opened |
| `EstimatedTimeUpdated` | `queue.{id}` | `wait_times: {id: minutes}` | Any status change |

---

## 🔌 API Reference

All routes are prefixed `/api/v1`. Protected routes require `Authorization: Bearer {token}`.

### Authentication

```http
POST   /api/v1/login              Body: { email, password }
POST   /api/v1/logout             Revokes current Sanctum token
GET    /api/v1/me                 Returns current user profile
```

### Patients

```http
GET    /api/v1/patients           ?search=name_or_phone → paginated list
POST   /api/v1/patients           { name, phone? }  — phone is optional
GET    /api/v1/patients/{id}
PUT    /api/v1/patients/{id}
DELETE /api/v1/patients/{id}
```

### Queue Operations

```http
GET    /api/v1/queue/today        ?doctor_id=1 → { queue_day, items[] }
POST   /api/v1/queue/open         { doctor_id, date? }
POST   /api/v1/queue/create       { queue_day_id, patient_id, serial_no? }
POST   /api/v1/queue/call-next    { queue_day_id }
POST   /api/v1/queue/complete     { queue_item_id }
POST   /api/v1/queue/skip         { queue_item_id }
POST   /api/v1/queue/reinsert     { queue_item_id, position }
POST   /api/v1/queue/emergency    { queue_day_id, patient_id }
POST   /api/v1/queue/freeze       { queue_day_id }
POST   /api/v1/queue/resume       { queue_day_id }
DELETE /api/v1/queue/{queueItem}
```

### Doctor Panel

```http
POST   /api/v1/doctor/delay       { doctor_id, delay_minutes, reason }
```

### Public (No Auth Required)

```http
GET    /api/v1/public/doctors     List of available doctors
POST   /api/v1/public/book        { name, phone?, doctor_id }  — self-booking
```

---

## 👥 User Roles & Panels

### 🏥 Receptionist Dashboard

- Type patient **name** (phone is optional) and register instantly
- Look up existing patients by phone to auto-fill name
- Set a custom serial position or let the system assign one
- Insert **emergency** patients — all other serials shift automatically
- View live waiting list, current patient in chamber, skipped, and completed
- **Reorder** any patient: enter a target serial number to move them
- Print thermal receipt slips with serial number and wait estimate
- Delete queue entries

### 👨‍⚕️ Doctor Dashboard

- Open a new queue day for the current session
- **Call next** patient — highest priority first, lowest serial within priority
- Mark the current patient as **Completed** or **Skipped**
- **Freeze / Resume** the queue (pauses new walk-in registrations)
- Log a **delay** in minutes — all waiting patient wait times update immediately
- View the full waiting list with live estimated times

### 📺 TV Display

- No login required — publicly accessible
- Full-screen animated board showing the current serial number being called
- Doctor name, clinic name, and waiting count visible at a glance
- Designed for a wall-mounted screen in the waiting room

### 🌐 Visitor Self-Booking

- No login required — accessed from the portal home screen
- Patient enters their **name** only (phone is optional)
- Selects a doctor and receives a serial number on screen
- Informs the patient to monitor the TV display for their turn

### 🔧 Admin Panel (Filament)

- Accessible at `/admin` with admin credentials
- Full CRUD for Clinics, Doctors, Patients, and Appointments
- Search, filter, and manage all records
- Role and permission assignment per user

---

## ⌨️ Keyboard Shortcuts

> All shortcuts are automatically disabled when the cursor is inside any `<input>` or `<textarea>`.

### Login Screen

| Key | Action |
|---|---|
| `V` | Open Visitor Booking form |

### Receptionist — Doctor Selection

| Key | Action |
|---|---|
| `1` `2` `3` | Select doctor by position in list |
| `B` / `Esc` | Go back to portal |
| `Q` | Sign out |
| `T` | Toggle dark / light theme |

### Receptionist — Queue Management

| Key | Action |
|---|---|
| `N` | Focus **Name** field (primary input) |
| `F` | Focus **Phone** field (lookup) |
| `S` | Focus **Custom Serial** field |
| `R` | Register patient (normal queue) |
| `E` | Register patient (emergency — front of queue) |
| `B` / `Esc` | Back to doctor selection |
| `Q` | Sign out |
| `T` | Toggle theme |

### Doctor Dashboard — Queue Control

| Key | Action |
|---|---|
| `1` `2` `3` | Select doctor (on selection screen) |
| `O` | Open queue (new day) |
| `N` | Call next patient |
| `C` | Complete current patient |
| `S` | Skip current patient |
| `P` | Pause / Resume queue |
| `D` | Focus delay input |
| `B` / `Esc` | Back to portal |
| `Q` | Sign out |
| `T` | Toggle theme |

### Visitor Booking

| Key | Action |
|---|---|
| `1` `2` `3` | Select doctor |
| `N` | Focus name field |
| `F` | Focus phone field |
| `S` | Submit booking |
| `B` / `Esc` | Back to login |

---

## 📱 PWA Support

CQMP is a fully installable Progressive Web App.

| Feature | Detail |
|---|---|
| **Service Worker** | Workbox-generated via `vite-plugin-pwa` |
| **Offline Caching** | All static assets cached; API calls are `NetworkOnly` |
| **Auto-update** | New SW activates immediately (`skipWaiting + clientsClaim`) |
| **App Shortcuts** | Long-press icon → jump to Receptionist Desk or Doctor Dashboard |
| **Theme Color** | Indigo `#6366F1` (light) / Navy `#0F172A` (dark) |

**Install:**
- **Android** → Chrome menu → *Add to Home Screen*
- **iOS** → Safari Share → *Add to Home Screen*
- **Desktop** → Chrome/Edge address bar → install icon

---

## 🚀 Getting Started

### Prerequisites

- **PHP** 8.4.1+
- **Composer** 2.x
- **Node.js** 18+ with **npm** 9+
- SQLite (bundled) *or* MySQL / PostgreSQL

---

### ⚡ Quick Start (All-in-One)

```bash
git clone https://github.com/beingmushfiq/cqmp.git
cd cqmp/backend

# Install deps, generate key, run migrations
composer setup

# Start all services in one terminal
composer dev
```

`composer dev` starts four processes concurrently with color-coded output:

| Process | Port | Description |
|---|---|---|
| `php artisan serve` | 8000 | Laravel API |
| `php artisan reverb:start` | 8080 | WebSocket server |
| `php artisan queue:listen` | — | Background job worker |
| `npm run dev` (Vite) | 5173 | React frontend |

---

### 🔧 Manual Setup

```bash
# ── Backend ─────────────────────────────────────────────────────────
cd backend

composer install
php -r "file_exists('.env') || copy('.env.example', '.env');"
php artisan key:generate

# SQLite (default)
php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
php artisan migrate --seed

# Start each in a separate terminal
php artisan serve           # Terminal 1
php artisan reverb:start    # Terminal 2
php artisan queue:listen    # Terminal 3

# ── Frontend ────────────────────────────────────────────────────────
cd ../frontend
npm install
npm run dev
```

---

### 🌐 Access Points

| URL | Description |
|---|---|
| `http://localhost:5173` | React SPA (main app) |
| `http://localhost:5173/tv` | TV Display (public, no login) |
| `http://localhost:8000/api/v1` | REST API base |
| `ws://localhost:8080` | WebSocket server (Reverb) |
| `http://localhost:8000/admin` | Filament Admin Panel |

---

### 🔑 Default Dev Credentials

> For local development only. Change all passwords before deploying.

| Role | Email | Password |
|---|---|---|
| Receptionist | `receptionist@cqmp.local` | `password` |
| Doctor | `doctor@cqmp.local` | `password` |
| Admin | `admin@cqmp.local` | `password` |

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

```env
APP_NAME="Clinic Queue Management Platform"
APP_ENV=local
APP_URL=http://localhost:8000

# Database — SQLite (default) or switch to MySQL
DB_CONNECTION=sqlite
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=cqmp
# DB_USERNAME=root
# DB_PASSWORD=secret

# WebSocket via Laravel Reverb
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=cqmp-local
REVERB_APP_KEY=cqmp-reverb-key
REVERB_APP_SECRET=cqmp-reverb-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

# Passed to Vite (frontend reads these)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
php artisan test

# Run only queue API tests
php artisan test --filter=QueueApiTest

# Verbose output
php artisan test --filter=QueueApiTest --verbose
```

### Test Coverage

The `QueueApiTest` suite covers:

| Test Case | What It Verifies |
|---|---|
| Open queue | Queue day created for a doctor |
| Walk-in registration | Serial assigned, broadcast fired |
| Custom serial | Patient placed at specified position |
| Emergency insert | Patient jumps to front, others shift |
| Call next | Correct priority + serial ordering |
| Skip patient | Status changes, wait times recalc |
| Reinsert patient | Moved to target position, all serials corrected |
| Queue freeze | New walk-ins rejected with 422 |
| Queue resume | Walk-ins accepted again |
| Delete entry | Removed from DB, recalc triggered |

---

## 🛡 Admin Panel (Filament)

Visit `http://localhost:8000/admin` — log in with admin credentials.

| Section | Features |
|---|---|
| **Clinics** | Create, edit, view clinic profiles |
| **Doctors** | Assign to clinics, set consultation time, toggle availability |
| **Patients** | Search, block / unblock, view history |
| **Appointments** | Overview of all bookings and their current status |

---

## 🔬 Core Business Logic — `QueueEngine`

The `QueueEngine` service is the heart of the system. All write operations run inside **database transactions** with row-level locking to prevent race conditions.

```php
QueueEngine::openQueue()             // Start a new queue day (idempotent)
QueueEngine::createWalkIn()          // Atomic serial assignment with DB lock
QueueEngine::callNext()              // Highest priority → lowest serial
QueueEngine::complete()              // Mark done, recalculate wait times
QueueEngine::skip()                  // Move to Skipped, recalculate
QueueEngine::reinsert()              // Move to target position, bump others
QueueEngine::insertEmergency()       // Front of queue, all others shift +1
QueueEngine::freeze()                // Block new walk-ins
QueueEngine::resume()                // Re-enable walk-ins
QueueEngine::recalculateWaitTimes()  // EWT = avg_time × position + delay
QueueEngine::deleteItem()            // Remove and recalculate
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

```bash
# 1. Fork and create a feature branch
git checkout -b feature/your-feature-name

# 2. Make changes — backend and frontend are separate directories

# 3. Run backend tests
cd backend && php artisan test

# 4. Type-check the frontend
cd frontend && npx tsc -b --noEmit

# 5. Format PHP code
./vendor/bin/pint

# 6. Open a pull request with a clear description
```

### Code Standards

| Language | Tool | Command |
|---|---|---|
| PHP | Laravel Pint (PSR-12) | `./vendor/bin/pint` |
| TypeScript | OxLint | `npm run lint` |
| Commits | Conventional Commits | `feat:`, `fix:`, `docs:`, `refactor:` |

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for efficient, humane healthcare**

[Report a Bug](https://github.com/your-org/cqmp/issues) · [Request a Feature](https://github.com/your-org/cqmp/issues) · [Documentation](https://github.com/your-org/cqmp/wiki)

</div>
