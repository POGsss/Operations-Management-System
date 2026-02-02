You are a senior full-stack engineer completing a production-grade Business Operations Management System built with:
- PERN stack (PostgreSQL via Supabase, Express, React, Node)
- Supabase Auth, RLS, Audit Logging
- Tailwind CSS frontend
- Role-based dashboards and branch-based data isolation

Context:
This workspace is already connected to Supabase via MCP servers and contains full backend and frontend project context. Existing tables include:
users, roles, branches, customers, job_orders, job_order_items, inventory_items, purchase_requests, purchase_request_items, suppliers, audit_logs

Current feature status:
Admin:
- Overview (mock)
- Users (functional)
- Branches (functional)
- Workflow Config (not functional)
- Pricing Matrix (not functional)
- Audit Logs (functional)
- Reports (not functional)
- Settings (not functional)

Branch Manager:
- Overview (mock)
- Job Orders (functional)
- Inventory (not functional)
- Sales (not functional)
- Performance (not functional)
- Reports (not functional)

Service Advisor:
- Overview (mock)
- Customers (functional)
- Job Orders (functional)
- Estimates (not functional)
- Billing (not functional)

Mechanic:
- My Jobs (functional)
- Job Status (not functional)
- Parts Used (not functional)
- Inventory (not functional)

Inventory Officer:
- Stock Levels (functional)
- Purchase Orders (functional)
- Inventory Logs (functional)

Executive:
- Overview (mock)
- Sales Reports (not functional)
- Performance (not functional)
- Audit Logs (not functional)

Your Mission:
Complete ALL remaining features from Admin to Executive while preserving architectural quality, scalability, and consistent UI/UX.

Hard Requirements:
1. Maintain strict role-based access at BOTH:
   - Frontend routing level
   - Supabase RLS and backend middleware
2. Enforce branch-level data isolation for all operational data
3. Every mutation must log into audit_logs
4. UI must remain visually consistent across all dashboards:
   - Same layout grid system
   - Same typography scale
   - Same spacing rules
   - Same card, table, modal, and form patterns
5. No hardcoded business rules — all workflow, pricing, and permissions must be configurable via Admin UI

Phase Implementation Order:
1. Workflow Engine
   - Create workflow_steps and workflow_transitions tables
   - Admin UI for configuring status flow per job type
   - Enforce transitions at API + RLS level

2. Pricing System
   - Create service_packages, labor_rates, pricing_rules
   - Admin UI for branch-based pricing matrix
   - Auto-calculation service for estimates and billing

3. Estimates System
   - Create estimates, estimate_items
   - Service Advisor UI: Draft → Approve → Convert to Job Order
   - Snapshot pricing at approval time

4. Billing & Sales
   - Create invoices, invoice_items, payments
   - Service Advisor billing UI
   - Branch Manager sales dashboard
   - Executive sales reporting

5. Performance Tracking
   - Create job_assignments, job_status_logs
   - Mechanic job timers
   - Branch + Executive performance dashboards

6. Reports Engine
   - PDF/CSV export support
   - Filters by date, branch, role, and status
   - Summary + detailed views

Backend Instructions:
- Implement RESTful Express routes for every module
- Validate role + branch access on every request
- Use Supabase service role for protected operations
- Wrap all writes in transactions
- Add centralized audit logging middleware

Frontend Instructions:
- Use reusable components for:
  - Tables
  - Modals
  - Forms
  - Status badges
  - Metric cards
- All dashboards must share:
  - Header layout
  - Sidebar behavior
  - Spacing + typography tokens
- Implement loading states, error states, and empty states everywhere

Security Rules:
- No user can read or write outside their assigned branch
- Only Admin can modify:
  - Pricing
  - Workflow
  - Roles
- Executives are read-only
- Mechanics cannot modify job pricing or billing

Quality Bar:
- Clean, typed, readable code
- No duplicated business logic
- Scalable query patterns
- Proper indexing where needed
- Defensive UI validation
- Production-ready structure

Execution Rules:
- Before coding each module:
  - Inspect existing schema and routes
  - Extend instead of replacing
- If schema changes are needed:
  - Create migration SQL
  - Add RLS policies
  - Add audit triggers
- Maintain consistent naming conventions across DB, API, and UI

Final Deliverable:
A fully functional, enterprise-grade, role-based, multi-branch Business Operations Management System with:
- Configurable workflows
- Dynamic pricing engine
- Estimate-to-invoice pipeline
- Inventory integration
- Performance analytics
- Executive reporting
- Full audit trail
- Clean, consistent UI across all roles

Work incrementally and do not skip validation, security, or UI consistency steps.