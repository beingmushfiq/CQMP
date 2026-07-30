# Software Delivery & Handover Document

**Project Name:** CQMP - Clinic Queue Management Platform  
**Target Domain:** `ferozamedicinecorner.com`  
**Delivery Date:** July 30, 2026  
**Document Version:** 1.0 Final  

---

## 1. Executive Summary

This document serves as the official Software Delivery and Handover Document for the **Clinic Queue Management Platform (CQMP)**. The application is a real-time, multi-user clinic queue management system built to streamline patient registration, walk-in booking, live queue progression, doctor consultation management, and real-time waiting room TV display broadcasts.

---

## 2. System Architecture & Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend UI** | React 18 (TypeScript), Vite, Tailwind CSS | High-performance SPA with optimistic UI updates and real-time state management |
| **Backend API** | Laravel 11 (PHP 8.2+) | RESTful API architecture with Sanctum authentication & Spatie RBAC |
| **Real-time WebSockets** | Laravel Reverb | Low-latency WebSockets for live queue broadcast to TV displays and dashboards |
| **Database** | MySQL 8.0+ | Relational data store for clinics, doctors, patients, queue logs, and audit trails |
| **Hosting Platform** | cPanel / Shared / VPS Hosting | Managed web server with SSL termination and cron process execution |

---

## 3. Core System Functions & Roles

### 3.1 Public Visitor Booking (`/book`)
* **Self-Service Appointment Booking:** Patients can select a doctor, view available consultation days, and request a serial number online without logging in.
* **Live Queue Status Check:** Patients can track their estimated wait time and live serial position from their mobile devices.

### 3.2 Receptionist Dashboard (`/reception`)
* **Walk-In Registration:** Register new patients or search existing records by phone/name.
* **Queue Item Management:** Add walk-ins, reinsert skipped patients at specific positions, insert emergency cases at the front of the queue, or delete invalid entries.
* **Real-time Synchronization:** Instantly reflects doctor activity (calling next, completing, or marking delay).

### 3.3 Doctor Consultation Panel (`/doctor`)
* **Queue Control:** Call Next Patient, Complete Consultation, Skip Patient (No-show), or Flag Emergency.
* **Active Delay Notification:** Broadcast custom delay announcements (e.g., "Delayed by 15 mins due to emergency procedure").
* **Patient History:** Quick view of patient details and consultation history.

### 3.4 Waiting Room TV Display (`/tv` & `/tv?doctor_id=X`)
* **Live Audio-Visual Broadcast:** Fullscreen display for waiting room TVs featuring current serial called, upcoming numbers, doctor details, and audio chime alerts on call-next.
* **Multi-Doctor & Direct TV View:** Direct access via dedicated TV routes without auto-redirecting to login/booking pages.

### 3.5 System Administration (`/admin`)
* **Role-Based Access Control (RBAC):** Manage Super Admin, Admin, Receptionist, Doctor, and TV accounts.
* **Clinic & Doctor Setup:** Manage doctor schedules, average consultation times, and serial prefix/padding settings.
* **Audit Logs:** Full logging of all queue modifications for operational accountability.

---

## 4. Application Access URLs & System Credentials

> [!IMPORTANT]
> **Security Requirement:** Please change all default passwords immediately after completing your initial login.

### 4.1 Web Access URLs

| Portal / Module | URL | Access Level |
| :--- | :--- | :--- |
| **Public Visitor Booking** | `https://ferozamedicinecorner.com/book` | Public (No Login Required) |
| **Public Live Queue TV** | `https://ferozamedicinecorner.com/tv` | Public / TV Display |
| **Staff & Admin Login** | `https://ferozamedicinecorner.com/login` | Authenticated Staff |
| **Backend API Root** | `https://api.ferozamedicinecorner.com/api/v1` | Secure REST API |

---

### 4.2 System Access Credentials

| Role | Username / Email | Default Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@gmail.com` | `12345678` | Full administrative control, system settings, user management |
| **Doctor** | `doctor@gmail.com` | `12345678` | Doctor Panel (`/doctor`), consultation queue control |
| **Receptionist** | `receptionist@gmail.com` | `12345678` | Reception Dashboard (`/reception`), patient registration |
| **TV Display** | `tv@gmail.com` | `12345678` | Public TV Display Mode (`/tv`) |

---

## 5. Server Configuration & Maintenance

### 5.1 Real-Time WebSocket Cron Job (cPanel)

To maintain uninterrupted real-time updates for TV displays and reception panels, the Laravel Reverb process monitor **must run every minute** via cPanel Cron Jobs.

**Cron Command:**
```cron
* * * * * pgrep -f "[r]everb:start" > /dev/null || (cd /home/httpferozamedici/public_html/api.ferozamedicinecorner.com && nohup /usr/local/bin/php artisan reverb:start --port=8080 > /dev/null 2>&1 &)
```

---

### 5.2 Laravel Maintenance Commands

When making configuration changes or updating environment settings, run the following commands via terminal or cPanel Cron (one-time):

```bash
# Clear and rebuild configuration caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart real-time socket server
pkill -f "reverb:start"
```

---

## 6. Handover Checklist & Security Steps

- [x] API 500 error resolution and route middleware verification completed.
- [x] TV display auto-redirection fix applied (`/tv` opens live queue directly).
- [x] Real-time broadcasting via Laravel Reverb verified.
- [ ] **Client Action:** Change default passwords for all seeded accounts (`admin@gmail.com`, `doctor@gmail.com`, etc.).
- [ ] **Client Action:** Configure SSL certificate auto-renewal in cPanel.
- [ ] **Client Action:** Set up automated daily database backups in cPanel MySQL Backup tool.

---

*Handover Accepted By:* __________________________  
*Date:* ____________________
