<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'CQMP') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:300,400,500,600,700,800,900|instrument-sans:400,500,600,700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --indigo: #6366f1; --emerald: #10b981; --slate-50: #f8fafc;
            --slate-100: #f1f5f9; --slate-200: #e2e8f0; --slate-300: #cbd5e1;
            --slate-400: #94a3b8; --slate-500: #64748b; --slate-600: #475569;
            --slate-700: #334155; --slate-800: #1e293b; --slate-900: #0f172a;
            --slate-950: #020617;
        }
        body {
            font-family: 'Inter', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        /* Animated background */
        .bg-mesh {
            position: fixed; inset: 0; z-index: 0; overflow: hidden;
        }
        .bg-mesh::before {
            content: '';
            position: absolute; top: -50%; left: -50%;
            width: 200%; height: 200%;
            background: radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.1) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 60%);
            animation: meshFloat 20s ease-in-out infinite;
        }
        @keyframes meshFloat {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(2%, -3%) rotate(1deg); }
            66% { transform: translate(-1%, 2%) rotate(-0.5deg); }
        }

        /* Grid pattern overlay */
        .grid-pattern {
            position: fixed; inset: 0; z-index: 0;
            background-image:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 60px 60px;
        }

        .container { position: relative; z-index: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        /* Header */
        header { padding: 24px 0; }
        .header-inner { display: flex; align-items: center; justify-content: space-between; }
        .logo-group { display: flex; align-items: center; gap: 12px; }
        .logo-icon {
            width: 44px; height: 44px; border-radius: 12px;
            background: linear-gradient(135deg, #6366f1, #10b981);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 20px rgba(99,102,241,0.3);
        }
        .logo-icon svg { width: 24px; height: 24px; color: white; }
        .logo-text {
            font-size: 22px; font-weight: 800; letter-spacing: -0.5px;
            background: linear-gradient(135deg, #f8fafc, #94a3b8);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .header-actions { display: flex; align-items: center; gap: 12px; }
        .btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 10px 24px; border-radius: 10px; font-size: 14px;
            font-weight: 600; text-decoration: none; transition: all 0.2s;
            cursor: pointer; border: none;
        }
        .btn-ghost {
            background: rgba(255,255,255,0.05); color: #cbd5e1;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); color: #f8fafc; border-color: rgba(255,255,255,0.2); }
        .btn-primary {
            background: linear-gradient(135deg, #6366f1, #818cf8);
            color: white; box-shadow: 0 4px 15px rgba(99,102,241,0.4);
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.5); }

        /* Hero */
        .hero {
            text-align: center; padding: 80px 0 60px;
        }
        .badge {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 16px; border-radius: 20px; font-size: 12px;
            font-weight: 600; margin-bottom: 24px;
            background: rgba(99,102,241,0.1); color: #818cf8;
            border: 1px solid rgba(99,102,241,0.2);
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .hero h1 {
            font-size: clamp(36px, 6vw, 72px); font-weight: 900; line-height: 1.05;
            letter-spacing: -2px; margin-bottom: 20px;
        }
        .hero h1 .gradient {
            background: linear-gradient(135deg, #6366f1, #10b981, #8b5cf6);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-size: 200% 200%;
            animation: gradientShift 4s ease-in-out infinite;
        }
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .hero p {
            font-size: 18px; color: #94a3b8; max-width: 600px; margin: 0 auto 36px;
            line-height: 1.7;
        }
        .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-lg { padding: 14px 32px; font-size: 16px; border-radius: 12px; }
        .btn-outline {
            background: transparent; color: #f8fafc;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .btn-outline:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); }

        /* Feature cards */
        .features {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px; padding: 40px 0 60px;
        }
        .feature-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 16px; padding: 28px;
            transition: all 0.3s;
        }
        .feature-card:hover {
            background: rgba(255,255,255,0.06);
            border-color: rgba(99,102,241,0.3);
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .feature-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 16px; font-size: 24px;
        }
        .feature-icon.blue { background: rgba(99,102,241,0.15); color: #818cf8; }
        .feature-icon.green { background: rgba(16,185,129,0.15); color: #34d399; }
        .feature-icon.purple { background: rgba(139,92,246,0.15); color: #a78bfa; }
        .feature-icon.amber { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .feature-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
        .feature-card p { font-size: 13px; color: #94a3b8; line-height: 1.6; }

        /* Stats */
        .stats {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px; padding: 40px 0;
        }
        .stat-card {
            text-align: center; padding: 24px 16px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
        }
        .stat-value {
            font-size: 36px; font-weight: 900;
            background: linear-gradient(135deg, #6366f1, #10b981);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }

        /* Roles */
        .roles { padding: 40px 0; }
        .roles h2 { font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 32px; letter-spacing: -0.5px; }
        .role-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .role-card {
            display: flex; align-items: center; gap: 16px;
            padding: 20px; border-radius: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            transition: all 0.2s;
        }
        .role-card:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
        .role-avatar {
            width: 44px; height: 44px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; flex-shrink: 0;
        }
        .role-avatar.r1 { background: rgba(99,102,241,0.15); }
        .role-avatar.r2 { background: rgba(16,185,129,0.15); }
        .role-avatar.r3 { background: rgba(245,158,11,0.15); }
        .role-avatar.r4 { background: rgba(139,92,246,0.15); }
        .role-card h4 { font-size: 14px; font-weight: 700; }
        .role-card p { font-size: 12px; color: #64748b; margin-top: 2px; }

        /* Footer */
        footer {
            margin-top: auto; padding: 32px 0;
            border-top: 1px solid rgba(255,255,255,0.05);
            text-align: center; color: #475569; font-size: 13px;
        }
        footer a { color: #6366f1; text-decoration: none; }
        footer a:hover { text-decoration: underline; }

        /* Animations */
        .fade-up {
            opacity: 0; transform: translateY(20px);
            animation: fadeUp 0.6s ease forwards;
        }
        .fade-up.d1 { animation-delay: 0.1s; }
        .fade-up.d2 { animation-delay: 0.2s; }
        .fade-up.d3 { animation-delay: 0.3s; }
        .fade-up.d4 { animation-delay: 0.4s; }
        @keyframes fadeUp {
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
            .hero { padding: 48px 0 32px; }
            .hero h1 { letter-spacing: -1px; }
            .hero p { font-size: 15px; }
            .header-actions .btn span { display: none; }
        }
    </style>
</head>
<body>
    <div class="bg-mesh"></div>
    <div class="grid-pattern"></div>

    <div class="container">
        <header class="fade-up">
            <div class="header-inner">
                <div class="logo-group">
                    <div class="logo-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                    </div>
                    <span class="logo-text">CQMP</span>
                </div>
                <div class="header-actions">
                    @if (Route::has('login'))
                        @auth
                            <a href="{{ url('/dashboard') }}" class="btn btn-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                                <span>Dashboard</span>
                            </a>
                        @else
                            <a href="{{ route('login') }}" class="btn btn-ghost">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                <span>Log in</span>
                            </a>
                            @if (Route::has('register'))
                                <a href="{{ route('register') }}" class="btn btn-primary">
                                    <span>Get Started</span>
                                </a>
                            @endif
                        @endauth
                    @endif
                </div>
            </div>
        </header>

        <section class="hero">
            <div class="badge fade-up d1">
                <span class="badge-dot"></span>
                Clinic Queue Management Platform
            </div>
            <h1 class="fade-up d2">
                Manage Patient<br>
                <span class="gradient">Queues Smartly</span>
            </h1>
            <p class="fade-up d3">
                A modern, real-time queue management system for clinics and hospitals.
                Streamline patient flow, reduce wait times, and enhance the care experience.
            </p>
            <div class="hero-actions fade-up d4">
                @if (Route::has('login'))
                    @auth
                        <a href="{{ url('/dashboard') }}" class="btn btn-primary btn-lg">
                            Open Dashboard
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </a>
                    @else
                        <a href="{{ route('login') }}" class="btn btn-primary btn-lg">
                            Sign In to Portal
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </a>
                    @endauth
                @endif
                <a href="#features" class="btn btn-outline btn-lg">Learn More</a>
            </div>
        </section>

        <section class="stats fade-up d3">
            <div class="stat-card">
                <div class="stat-value">4</div>
                <div class="stat-label">Role Panels</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">2</div>
                <div class="stat-label">Languages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">RT</div>
                <div class="stat-label">Live Queue</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">PWA</div>
                <div class="stat-label">Installable</div>
            </div>
        </section>

        <section id="features" class="features">
            <div class="feature-card fade-up d1">
                <div class="feature-icon blue">🏥</div>
                <h3>Reception Desk</h3>
                <p>Register patients, manage the queue in real-time, print receipts, and handle walk-in or reserved appointments seamlessly.</p>
            </div>
            <div class="feature-card fade-up d2">
                <div class="feature-icon green">🩺</div>
                <h3>Doctor Chamber</h3>
                <p>View your patient queue, call the next patient, complete or skip visits with keyboard shortcuts for speed.</p>
            </div>
            <div class="feature-card fade-up d3">
                <div class="feature-icon purple">📺</div>
                <h3>TV Display</h3>
                <p>Live queue display for the waiting area with bilingual audio announcements. Supports single doctor or all-doctor lobby view.</p>
            </div>
            <div class="feature-card fade-up d4">
                <div class="feature-icon amber">⚙️</div>
                <h3>Admin Settings</h3>
                <p>Customize site title, logo, doctor info, and branding. Full control over platform configuration from the settings panel.</p>
            </div>
        </section>

        <section class="roles">
            <h2 class="fade-up">Built for Every Role</h2>
            <div class="role-grid">
                <div class="role-card fade-up d1">
                    <div class="role-avatar r1">👑</div>
                    <div>
                        <h4>Super Admin</h4>
                        <p>Full access to all panels and settings</p>
                    </div>
                </div>
                <div class="role-card fade-up d2">
                    <div class="role-avatar r2">📋</div>
                    <div>
                        <h4>Receptionist</h4>
                        <p>Register patients and manage the queue</p>
                    </div>
                </div>
                <div class="role-card fade-up d3">
                    <div class="role-avatar r3">🩺</div>
                    <div>
                        <h4>Doctor</h4>
                        <p>View and manage your patient queue</p>
                    </div>
                </div>
                <div class="role-card fade-up d4">
                    <div class="role-avatar r4">📺</div>
                    <div>
                        <h4>TV Display</h4>
                        <p>Live queue display for waiting area</p>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <footer>
        <div class="container">
            <p>
                {{ config('app.name', 'CQMP') }} &mdash; Clinic Queue Management Platform
                &middot; Built with Laravel &amp; React
            </p>
        </div>
    </footer>
</body>
</html>
