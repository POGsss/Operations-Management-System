1️⃣ Top-Level Architecture (Mental Model)
COMPANY (System)
│
├── USERS (Global + Branch)
│
├── BRANCHES
│   │
│   ├── CUSTOMERS
│   │   │
│   │   └── JOB ORDERS
│   │   │       │
│   │   │       ├── JOB ASSIGNMENTS (Mechanics)
│   │   │       ├── JOB STATUS HISTORY
│   │   │       ├── ESTIMATES
│   │   │       ├── PARTS USED
│   │   │       └── BILLING / INVOICES
│   │   │
│   │   ├── INVENTORY
│   │   │       ├── STOCK ITEMS
│   │   │       ├── PURCHASE ORDERS
│   │   │       └── INVENTORY LOGS
│   │   │
│   │   ├── SALES
│   │   │
│   │   └── REPORTS
│   │
│   └── AUDIT LOGS (Global)
│
└── WORKFLOW CONFIG / PRICING MATRIX (Global)

2️⃣ ER Diagram (Database View)
USERS
├─ id (PK)
├─ role
├─ branch_id (FK → BRANCHES.id) [NULL for Admin/Executive]
└─ ...

BRANCHES
├─ id (PK)
├─ name
└─ ...

CUSTOMERS
├─ id (PK)
├─ branch_id (FK → BRANCHES.id)
├─ created_by (FK → USERS.id)
└─ ...

JOB_ORDERS
├─ id (PK)
├─ branch_id (FK → BRANCHES.id)
├─ customer_id (FK → CUSTOMERS.id)
├─ created_by (FK → USERS.id)
├─ status
└─ ...

JOB_ASSIGNMENTS
├─ job_id (FK → JOB_ORDERS.id)
├─ mechanic_id (FK → USERS.id)
└─ assigned_at

JOB_STATUS_HISTORY
├─ job_id (FK → JOB_ORDERS.id)
├─ status
├─ changed_by (FK → USERS.id)
└─ timestamp

ESTIMATES
├─ id (PK)
├─ job_id (FK → JOB_ORDERS.id)
├─ total
└─ ...

INVOICES
├─ id (PK)
├─ job_id (FK → JOB_ORDERS.id)
├─ status
└─ ...

PARTS_USED
├─ job_id (FK → JOB_ORDERS.id)
├─ inventory_item_id (FK → INVENTORY_ITEMS.id)
├─ quantity
└─ ...

INVENTORY_ITEMS
├─ id (PK)
├─ branch_id (FK → BRANCHES.id)
├─ name
├─ stock
└─ ...

PURCHASE_ORDERS
├─ id (PK)
├─ branch_id (FK → BRANCHES.id)
├─ created_by (FK → USERS.id)
└─ ...

INVENTORY_LOGS
├─ item_id (FK → INVENTORY_ITEMS.id)
├─ action
├─ quantity
└─ timestamp

AUDIT_LOGS
├─ id (PK)
├─ user_id (FK → USERS.id)
├─ entity_type
├─ entity_id
├─ details
└─ created_at

3️⃣ Role-Based Data Flow Diagram
🧑‍💼 Admin
Admin
│
├── Users (All branches)
├── Branches
├── Workflow Config
├── Pricing Matrix
├── Reports (Global)
└── Audit Logs (Global)

🧑‍🏭 Branch Manager
Branch Manager
│
├── Branch Staff
├── Customers
├── Job Orders
├── Inventory
├── Sales
├── Performance Reports
└── Branch Audit Logs

🧑‍💻 Service Advisor
Service Advisor
│
├── Customers
├── Job Orders
├── Estimates
└── Billing

🧑‍🔧 Mechanic
Mechanic
│
├── Assigned Jobs
├── Job Status Updates
└── Parts Used

📦 Inventory Officer
Inventory Officer
│
├── Stock Levels
├── Purchase Orders
└── Inventory Logs

📊 Executive
Executive
│
├── Global Sales Reports
├── Performance Metrics
└── Audit Logs

4️⃣ System Lifecycle Flow (Real World)
Customer Walks In
│
Service Advisor
├─ Creates Customer
├─ Creates Job Order
├─ Creates Estimate
│
Branch Manager
├─ Approves Job
│
Mechanic
├─ Works Job
├─ Logs Parts Used
├─ Updates Status
│
Inventory Officer
├─ Stock Deducted
│
Service Advisor
├─ Creates Invoice
│
System
└─ Logs Everything → AUDIT_LOGS

5️⃣ Data Ownership Rule (Golden Rule)

Every operational table MUST have:

branch_id uuid references branches(id)


Except:

users

roles

audit_logs

workflow_config

pricing_matrix

6️⃣ Scalable Permission Model

Right now you use:

users.role


Later you can upgrade to:

roles.permissions (jsonb)


Example:

["job.create", "job.approve", "inventory.adjust", "report.view"]

7️⃣ Visual Tree (Clean Overview)
SYSTEM
│
├── AUTH
│   └── USERS
│       └── ROLES
│
├── BRANCHES
│   ├── CUSTOMERS
│   │   └── JOB ORDERS
│   │       ├── ASSIGNMENTS
│   │       ├── STATUS HISTORY
│   │       ├── ESTIMATES
│   │       ├── INVOICES
│   │       └── PARTS USED
│   │
│   ├── INVENTORY
│   │   ├── ITEMS
│   │   ├── PURCHASE ORDERS
│   │   └── LOGS
│   │
│   └── SALES / REPORTS
│
└── AUDIT / CONFIG
    ├── AUDIT LOGS
    ├── WORKFLOW CONFIG
    └── PRICING MATRIX