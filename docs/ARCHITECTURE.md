# Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Application                         │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  BrowserRouter (AppRoutes.jsx)                  │ │ │
│  │  │  ┌────────────────────────────────────────────┐ │ │ │
│  │  │  │  AuthProvider (Context)                   │ │ │ │
│  │  │  │  ┌──────────────────────────────────────┐ │ │ │ │
│  │  │  │  │  App.jsx                            │ │ │ │ │
│  │  │  │  │  ├─ Routes                          │ │ │ │ │
│  │  │  │  │  │  ├─ /login → Login.jsx          │ │ │ │ │
│  │  │  │  │  │  └─ /dashboard → Protected:     │ │ │ │ │
│  │  │  │  │  │     └─ Dashboard.jsx             │ │ │ │ │
│  │  │  │  │  └─ ProtectedRoute checks auth    │ │ │ │ │
│  │  │  │  └──────────────────────────────────────┘ │ │ │ │
│  │  │  └────────────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          │
          ├─ localStorage (user, role)
          └─ Tailwind CSS (styling)
```

## Authentication Flow

```
START
  │
  ├─→ Check localStorage
  │   ├─ Yes: Load user & role → Go to Dashboard
  │   └─ No: Go to Login
  │
  └─→ Login Page
      │
      ├─→ User enters:
      │   ├─ Email
      │   ├─ Password
      │   └─ Role
      │
      ├─→ Validation
      │   ├─ Email check
      │   └─ Password check
      │
      ├─→ AuthContext.login()
      │   ├─ Create user object
      │   ├─ Save to localStorage
      │   └─ Update context
      │
      └─→ Navigate to Dashboard
          │
          ├─→ ProtectedRoute checks:
          │   ├─ isAuthenticated() → true/false
          │   ├─ Yes: Load Dashboard
          │   └─ No: Redirect to Login
          │
          └─→ Dashboard.jsx
              ├─ Sidebar (role-specific menu)
              ├─ Topbar (search, profile)
              └─ Role Dashboard (content)
```

## Component Hierarchy Tree

```
AppRoutes
└── BrowserRouter
    └── AuthProvider
        └── Routes
            ├── Route: /login
            │   └── Login (public)
            │
            └── Route: /dashboard
                └── ProtectedRoute
                    └── Dashboard (protected)
                        ├── Sidebar
                        │   ├── Logo
                        │   ├── UserInfo
                        │   ├── MenuItems (×6-8 role-based)
                        │   └── LogoutBtn
                        │
                        ├── Topbar
                        │   ├── SearchBar
                        │   ├── NotificationBell
                        │   └── UserProfile
                        │
                        └── MainContent
                            ├── AdminDashboard
                            ├── ManagerDashboard
                            ├── AdvisorDashboard
                            ├── MechanicDashboard
                            ├── InventoryDashboard
                            └── ExecutiveDashboard
                                ├── Welcome
                                ├── MetricCard (×8)
                                ├── ActivityTable
                                └── ChartArea
```

## Data Flow Diagram

```
User Input
    │
    ├─→ Login.jsx
    │   ├─ Form submission
    │   ├─ Validation
    │   └─ useAuth().login()
    │
    └─→ AuthContext
        ├─ Process credentials
        ├─ Create user object
        ├─ Update state
        ├─ Save to localStorage
        └─ Return success
            │
            └─→ Navigate to /dashboard
                │
                └─→ Dashboard.jsx
                    ├─ Sidebar reads from useAuth()
                    ├─ Topbar reads from useAuth()
                    └─ DashboardComponent reads from useAuth()
                        │
                        └─→ Render role-specific content
                            ├─ MetricCard (gets data)
                            ├─ ActivityTable (displays data)
                            └─ ChartArea (placeholder)
```

## URL Routing Map

```
/
├─ (redirect to /dashboard)
│
/login
├─ Public route
├─ Login.jsx component
└─ Anyone can access
│
/dashboard
├─ Protected route
├─ Dashboard.jsx wrapper
├─ Loads role-specific dashboard
└─ Redirects to /login if not authenticated
│
/dashboard/admin
├─ Optional role-specific URL
│
/dashboard/manager
├─ Optional role-specific URL
│
... (advisor, mechanic, inventory, executive)
│
/* (404)
└─ Redirect to /login
```

## State Management

```
AuthContext (Global State)
├─ user: {
│   ├─ id: string
│   ├─ name: string
│   ├─ email: string
│   ├─ role: 'admin'|'branch_manager'|'service_advisor'|'mechanic'|'inventory_officer'|'executive'
│   └─ avatar: string
│ }
├─ role: string
├─ loading: boolean
├─ Functions:
│  ├─ login(email, password, role)
│  ├─ logout()
│  ├─ getRole()
│  ├─ getUser()
│  └─ isAuthenticated()
└─ Persistence:
   └─ localStorage { role, user }

Component Local State:
├─ Login.jsx:
│  ├─ email
│  ├─ password
│  ├─ selectedRole
│  ├─ showPassword
│  ├─ error
│  └─ loading
├─ Sidebar.jsx:
│  ├─ isOpen (mobile)
│  └─ activeMenu
├─ Topbar.jsx:
│  └─ searchQuery
└─ Dashboard.jsx:
   └─ (no local state - uses context)
```

## Responsive Design Breakpoints

```
Mobile (< 768px)
├─ Sidebar: Collapsible hamburger menu
├─ Topbar: Full width, condensed
├─ Content: Single column
├─ Grid: grid-cols-1
└─ Padding: px-4

Tablet (768px - 1024px)
├─ Sidebar: Toggle visible/hidden
├─ Topbar: Normal layout
├─ Content: Two columns
├─ Grid: md:grid-cols-2
└─ Padding: px-6

Desktop (> 1024px)
├─ Sidebar: Always visible (fixed width: 256px)
├─ Topbar: Full width
├─ Content: Three-four columns
├─ Grid: lg:grid-cols-3 or lg:grid-cols-4
└─ Padding: px-8
```

## Color Flow

```
Tailwind Config
│
├─ Primary: Black (#000000)
│  ├─ Used for: Buttons, text, borders
│  └─ Hover: gray-800
│
├─ Secondary: White (#FFFFFF)
│  ├─ Used for: Backgrounds, text on dark
│  └─ Hover: gray-100
│
├─ Neutral: Gray-50 to Gray-900
│  ├─ gray-50: Lightest (page background)
│  ├─ gray-100-300: Light borders
│  ├─ gray-400-500: Medium text
│  ├─ gray-600-700: Dark text
│  ├─ gray-800: Dark hover
│  └─ gray-900: Darkest (near black)
│
└─ Usage:
   ├─ Sidebar: bg-black text-white
   ├─ Topbar: bg-white border-gray-200
   ├─ Cards: bg-white border-gray-200
   ├─ Input: border-gray-300 focus:ring-black
   └─ Text: text-black, text-gray-600, etc.
```

## Role-Based Menu Configuration

```
menuConfig = {
  admin: [
    Overview, Users, Branches, Workflow Config,
    Pricing Matrix, Audit Logs, Reports, Settings
  ],
  
  branch_manager: [
    Overview, Job Orders, Inventory, Sales,
    Staff Performance, Reports
  ],
  
  service_advisor: [
    Overview, Customers, Job Orders, Estimates, Billing
  ],
  
  mechanic: [
    My Jobs, Job Status, Parts Used, Inventory
  ],
  
  inventory_officer: [
    Stock Levels, Purchase Orders, Inventory Logs
  ],
  
  executive: [
    Company Dashboard, Sales Reports,
    Performance Analytics, Audit Logs
  ]
}
```

## Metrics System

```
Dashboard Metrics Grid:
├─ Row 1: 4 MetricCard components
│  ├─ MetricCard {title, value, trend, icon, isPositive}
│  └─ Responsive: 1 col mobile, 2 col tablet, 4 col desktop
├─ Row 2: 4 MetricCard components
│  └─ Same responsive layout
└─ Content sections below: Tables, charts, lists

MetricCard Props:
├─ title: 'Total Sales'
├─ value: '$24,500'
├─ trend: '15%'
├─ icon: '💰'
└─ isPositive: true/false (for color coding)
```

## File Dependencies Graph

```
App.jsx
  └─→ AppRoutes.jsx
      ├─→ AuthProvider
      │   └─→ AuthContext.jsx
      ├─→ ProtectedRoute.jsx
      │   └─→ AuthContext.jsx (useAuth)
      ├─→ Login.jsx
      │   ├─→ AuthContext.jsx (useAuth)
      │   └─→ react-router-dom (useNavigate)
      └─→ Dashboard.jsx
          ├─→ Sidebar.jsx
          │   ├─→ AuthContext.jsx (useAuth)
          │   └─→ react-router-dom (useNavigate)
          ├─→ Topbar.jsx
          │   └─→ AuthContext.jsx (useAuth)
          ├─→ AdminDashboard.jsx
          │   ├─→ AuthContext.jsx (useAuth)
          │   └─→ MetricCard.jsx
          ├─→ ManagerDashboard.jsx
          ├─→ AdvisorDashboard.jsx
          ├─→ MechanicDashboard.jsx
          ├─→ InventoryDashboard.jsx
          └─→ ExecutiveDashboard.jsx
              └─→ MetricCard.jsx (×8)

tailwind.config.js
  └─→ Applied to all JSX files via index.css
```

## Security & Access Control

```
Public Routes:
├─ /login (anyone can access)
└─ /register (if implemented)

Protected Routes:
├─ /dashboard (requires authentication)
├─ /dashboard/* (requires authentication)
└─ All other routes (require authentication)

Access Control:
├─ ProtectedRoute wrapper
│  ├─ Check: localStorage.role exists?
│  ├─ Check: AuthContext.isAuthenticated() true?
│  ├─ Yes: Allow access
│  └─ No: Redirect to /login
│
└─ Role-Based:
   ├─ Sidebar menu based on role
   ├─ Dashboard content based on role
   └─ (Future: API endpoint restrictions)
```

---

**All diagrams represent the production architecture implemented.**
