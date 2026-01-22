# Business Operations Management System - Frontend

## Project Overview

A production-ready, enterprise-grade frontend for a Business Operations Management System built with React, Tailwind CSS, and React Router v6. Features a comprehensive role-based access control system with dedicated dashboards for 6 different user roles.

## 🎯 Key Features

### ✅ Authentication & Authorization
- **Secure Login System** with split-screen layout (image + form)
- **LocalStorage-based Session Management** for demo purposes
- **Protected Routes** that redirect unauthorized users to login
- **Role-based Access Control** with 6 predefined user roles
- **Password Toggle** and form validation

### ✅ Role-Based Dashboards
- **Admin Dashboard** - System oversight, user management, audit logs
- **Branch Manager Dashboard** - Job orders, inventory, sales, staff performance
- **Service Advisor Dashboard** - Customer management, estimates, billing
- **Mechanic Dashboard** - Job assignments, parts tracking, time logs
- **Inventory Officer Dashboard** - Stock management, purchase orders
- **Executive Dashboard** - Business analytics, performance metrics

### ✅ Enterprise UI Components
- **Responsive Sidebar** with collapsible navigation (mobile-friendly)
- **Topbar/Header** with search, notifications, and user profile
- **MetricCard Component** for KPI displays (reusable across all dashboards)
- **Activity Feeds** and status indicators
- **Mock Charts** and data visualizations

### ✅ Design & Styling
- **Tailwind CSS** for all styling (no CSS files except config)
- **Grayscale Color Scheme** (black, white, and gray-50 to gray-900)
- **Responsive Design** - Mobile, tablet, and desktop optimized
- **Enterprise Look & Feel** with clean spacing and subtle shadows
- **Accessibility** - Semantic HTML, ARIA labels, keyboard navigation

## 📁 Project Structure

```
/frontend
├── src/
│   ├── pages/
│   │   ├── Login.jsx                    # Split-screen login page
│   │   ├── Dashboard.jsx                # Main dashboard layout container
│   │   └── dashboards/
│   │       ├── AdminDashboard.jsx
│   │       ├── ManagerDashboard.jsx
│   │       ├── AdvisorDashboard.jsx
│   │       ├── MechanicDashboard.jsx
│   │       ├── InventoryDashboard.jsx
│   │       └── ExecutiveDashboard.jsx
│   │
│   ├── components/
│   │   ├── Sidebar.jsx                  # Navigation sidebar
│   │   ├── Topbar.jsx                   # Header with search & user info
│   │   ├── MetricCard.jsx               # Reusable KPI card
│   │   └── ProtectedRoute.jsx           # Protected route wrapper
│   │
│   ├── context/
│   │   └── AuthContext.jsx              # Auth state management
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx                # Central route configuration
│   │
│   ├── App.jsx                          # Main app component
│   ├── App.css                          # (Tailwind directives only)
│   ├── index.css                        # (Tailwind directives only)
│   └── main.jsx                         # React entry point
│
├── tailwind.config.js                   # Tailwind configuration
├── postcss.config.js                    # PostCSS configuration
├── vite.config.js                       # Vite configuration
├── package.json                         # Dependencies
└── index.html                           # HTML template
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Modern web browser

### Installation

1. **Install Dependencies**
```bash
cd frontend
npm install
# or
yarn install
```

2. **Configure Tailwind CSS** (already included)
   - `tailwind.config.js` is configured for grayscale theme
   - `postcss.config.js` is configured with Tailwind
   - `src/index.css` includes Tailwind directives

3. **Start Development Server**
```bash
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:5173`

4. **Build for Production**
```bash
npm run build
# or
yarn build
```

## 🔐 Authentication Flow

### Login Page
```
Email: demo@example.com (any email format works)
Password: password123 (any non-empty password)
Role: Select from dropdown (admin, branch_manager, etc.)
```

### After Login
1. User credentials and role are saved to `localStorage`
2. User is redirected to `/dashboard`
3. Dashboard dynamically renders based on user's role
4. Sidebar menu items are role-specific
5. Logout clears localStorage and returns to login

### Protected Routes
- Any attempt to access `/dashboard` without authentication redirects to `/login`
- Route protection is handled by `ProtectedRoute` component
- Loading state shows spinner while checking authentication

## 👥 User Roles & Permissions

### 1. **Admin**
- System management and oversight
- User and branch management
- Audit logs and reports
- Workflow configuration
- Pricing matrix management

### 2. **Branch Manager**
- Local branch operations oversight
- Job order management
- Inventory control
- Sales tracking
- Staff performance monitoring

### 3. **Service Advisor**
- Customer relationship management
- Service estimates and job orders
- Billing and invoicing
- Customer interaction tracking

### 4. **Mechanic**
- Personal job assignments
- Job status updates
- Parts and tools management
- Time tracking

### 5. **Inventory Officer**
- Stock level monitoring
- Purchase order management
- Inventory logging
- Warehouse management

### 6. **Executive**
- High-level business analytics
- Revenue and profit tracking
- Growth metrics
- Performance analytics

## 🎨 Design System

### Color Palette
- **Primary**: Pure Black (#000000)
- **Secondary**: Pure White (#FFFFFF)
- **Neutrals**: Gray-50 to Gray-900

### Component Patterns
- **MetricCard** - KPI displays with trend indicators
- **Activity Lists** - Transactions and recent activities
- **Status Indicators** - Operational status with colored dots
- **Tables** - Structured data presentation
- **Charts** - Placeholder divs for chart integration

### Typography
- **Headings**: Bold, large font sizes
- **Body Text**: Regular weight, readable size
- **Captions**: Small, muted gray color

### Spacing & Layout
- **Mobile**: 1 column, full width (px-4)
- **Tablet**: 2 columns (md:grid-cols-2)
- **Desktop**: 3-4 columns (lg:grid-cols-3/4)

## 🔧 Key Components

### AuthContext
```javascript
const { user, role, login, logout, isAuthenticated, getRole, getUser } = useAuth();
```

### MetricCard Props
```javascript
<MetricCard
  title="Total Sales"
  value="$24,500"
  trend="15%"
  icon="💰"
  isPositive={true}
/>
```

### Protected Route
```javascript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

## 📊 Dashboard Features

### Common Across All Dashboards
- Welcome header with user greeting
- 4-8 metric cards showing KPIs
- Activity feed or status table
- Chart placeholder for analytics
- Responsive grid layout

### Role-Specific Metrics
- Admin: Users, uptime, audit logs
- Manager: Jobs, sales, inventory
- Advisor: Customers, estimates, revenue
- Mechanic: Assigned jobs, parts used
- Inventory: Stock levels, orders
- Executive: Revenue, profit, growth

## 🌐 Routing

```
/login                  → Login page (public)
/dashboard              → Main dashboard (protected, role-based)
/dashboard/admin        → Admin dashboard
/dashboard/manager      → Manager dashboard
/dashboard/advisor      → Advisor dashboard
/dashboard/mechanic     → Mechanic dashboard
/dashboard/inventory    → Inventory dashboard
/dashboard/executive    → Executive dashboard
/                       → Redirects to /dashboard
```

## 📱 Responsive Design

- **Mobile** (< 768px): Single column, collapsible sidebar
- **Tablet** (768px - 1024px): Two columns, toggle sidebar
- **Desktop** (> 1024px): Full layout, permanent sidebar

## ♿ Accessibility

- Semantic HTML structure
- Focus states on all interactive elements
- ARIA labels on icons
- Keyboard navigation support
- Color contrast meets WCAG standards

## 🔄 State Management

### Context API for Auth
```javascript
<AuthProvider>
  <AppRoutes />
</AuthProvider>
```

No Redux needed - Context API handles authentication state across the app.

## 🎯 Future Enhancements

1. **API Integration**
   - Replace localStorage with backend API calls
   - Real user authentication with JWT tokens
   - API calls for dashboard data

2. **Charts & Analytics**
   - Integrate Chart.js or Recharts
   - Real-time data visualization
   - Interactive analytics

3. **Additional Features**
   - User profile page
   - Settings/preferences
   - Notifications system
   - Multi-language support
   - Theme customization

4. **Performance**
   - Code splitting by route
   - Image optimization
   - Lazy loading components
   - Service workers for offline support

## 🛠️ Available Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## 📦 Dependencies

### Core
- **react** ^19.2.0 - UI library
- **react-dom** ^19.2.0 - React DOM rendering
- **react-router-dom** ^6.20.0 - Client-side routing

### Dev
- **tailwindcss** ^4.0.0 - Utility-first CSS framework
- **postcss** ^8.4.31 - CSS processor
- **autoprefixer** ^10.4.16 - CSS vendor prefixer
- **vite** ^7.2.4 - Build tool
- **@vitejs/plugin-react** ^5.1.1 - React plugin for Vite

## 📝 Code Quality

- Functional components only (no class components)
- Proper separation of concerns
- Centralized role-based menu configuration
- Clear comments on major sections
- Consistent naming conventions
- Responsive design patterns

## 🤝 Contributing

1. Follow the existing code structure
2. Use Tailwind utilities only for styling
3. Keep components focused and reusable
4. Comment complex logic
5. Test responsiveness on multiple devices

## 📄 License

This project is part of the Business Operations Management System and follows the organization's license terms.

## 📞 Support

For issues or questions:
1. Check the project structure and component examples
2. Review Tailwind documentation: https://tailwindcss.com
3. Review React Router documentation: https://reactrouter.com
4. Check component prop patterns in source files

---

**Built with ❤️ using React, Tailwind CSS, and modern web standards.**
