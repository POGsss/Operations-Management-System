# Phase 2 — Job Orders System

This phase implements the **core operational engine** of the Business Operation Management System. It connects customers, staff, inventory, billing, and audit logging into a single, controlled workflow.

---

## 1. Objectives

By the end of Phase 2, your system will support:

* Branch-isolated job orders
* Role-based job visibility
* Mechanic assignment
* Workflow state machine
* Estimate → Approval → Work → Billing → Release
* Inventory reservation & deduction
* Full audit trail

---

## 2. Workflow State Machine

### Status Flow

```
DRAFT
  ↓
ESTIMATED
  ↓
APPROVED
  ↓
IN_PROGRESS
  ↓
QUALITY_CHECK
  ↓
BILLED
  ↓
RELEASED
```

### Role Permissions

| Role              | Allowed Actions                                |
| ----------------- | ---------------------------------------------- |
| Service Advisor   | Create job, add estimates, submit for approval |
| Branch Manager    | Approve / Reject                               |
| Mechanic          | Start job, update status, log parts            |
| Inventory Officer | Confirm stock usage                            |
| Admin             | Full override                                  |
| Executive         | Read-only                                      |

---

## 3. Database Design

### 3.1 Job Orders Table

```sql
create table public.job_orders (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null references public.branches(id),
  customer_id uuid not null references public.customers(id),

  status text not null default 'DRAFT',

  vehicle_plate text,
  vehicle_vin text,
  odometer integer,

  created_by uuid references public.users(id),
  approved_by uuid references public.users(id),

  total_estimated numeric(10,2) default 0,
  total_final numeric(10,2) default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

### 3.2 Job Assignments (Mechanics)

```sql
create table public.job_assignments (
  id uuid primary key default gen_random_uuid(),

  job_id uuid not null references public.job_orders(id) on delete cascade,
  mechanic_id uuid not null references public.users(id),

  assigned_by uuid references public.users(id),
  assigned_at timestamptz default now()
);
```

---

### 3.3 Job Status History

```sql
create table public.job_status_history (
  id uuid primary key default gen_random_uuid(),

  job_id uuid not null references public.job_orders(id) on delete cascade,
  old_status text,
  new_status text not null,

  changed_by uuid references public.users(id),
  changed_at timestamptz default now()
);
```

---

### 3.4 Job Estimates

```sql
create table public.job_estimates (
  id uuid primary key default gen_random_uuid(),

  job_id uuid not null references public.job_orders(id) on delete cascade,

  item_name text not null,
  item_type text not null check (item_type in ('LABOR','PART','PACKAGE')),

  quantity integer default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,

  created_at timestamptz default now()
);
```

---

### 3.5 Parts Used (Inventory Integration)

```sql
create table public.job_parts_used (
  id uuid primary key default gen_random_uuid(),

  job_id uuid not null references public.job_orders(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),

  quantity integer not null,
  reserved boolean default true,

  used_at timestamptz default now()
);
```

---

## 4. Row Level Security (RLS)

### Enable RLS

```sql
alter table public.job_orders enable row level security;
alter table public.job_assignments enable row level security;
alter table public.job_status_history enable row level security;
alter table public.job_estimates enable row level security;
alter table public.job_parts_used enable row level security;
```

---

### Branch Isolation Policy

```sql
create policy "Branch Access - Jobs"
on public.job_orders
for select
using (
  branch_id = (
    select branch_id from public.users
    where id = auth.uid()
  )
  or
  (select role from public.users where id = auth.uid()) in ('admin','executive')
);
```

---

## 5. Audit Logging Trigger

```sql
create or replace function public.log_job_changes()
returns trigger as $$
begin
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    details
  )
  values (
    coalesce(auth.uid(), (select id from public.users where role = 'admin' limit 1)),
    tg_op,
    'JOB_ORDER',
    coalesce(new.id, old.id),
    coalesce(new.status, old.status),
    jsonb_build_object(
      'old', to_jsonb(old),
      'new', to_jsonb(new)
    )
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger job_audit_trigger
after insert or update or delete
on public.job_orders
for each row
execute procedure public.log_job_changes();
```

---

## 6. Backend API Design (Express)

### Routes Structure

```
/routes/jobOrders.js
```

### Endpoints

| Method | Endpoint               | Description                 |
| ------ | ---------------------- | --------------------------- |
| POST   | /api/jobs              | Create job                  |
| GET    | /api/jobs              | List jobs (branch filtered) |
| GET    | /api/jobs/:id          | Job details                 |
| POST   | /api/jobs/:id/assign   | Assign mechanic             |
| POST   | /api/jobs/:id/status   | Change status               |
| POST   | /api/jobs/:id/estimate | Add estimate item           |
| POST   | /api/jobs/:id/parts    | Log parts used              |

---

### Create Job Example

```js
router.post('/', async (req, res) => {
  const { customer_id, vehicle_plate, odometer } = req.body;

  const { data, error } = await supabase
    .from('job_orders')
    .insert([
      {
        customer_id,
        vehicle_plate,
        odometer
      }
    ])
    .select()
    .single();

  if (error) return res.status(400).json(error);
  res.json(data);
});
```

---

## 7. Frontend Structure

### Pages

```
/pages/dashboards/branch-manager/JobOrders.jsx
/pages/dashboards/service-advisor/JobOrders.jsx
/pages/dashboards/mechanic/MyJobs.jsx
```

---

## 8. UI Components

### Job Board

```
[ Job #1023 ]  | IN_PROGRESS | Mechanic: Juan
[ Job #1024 ]  | ESTIMATED   | Waiting Approval
```

### Job View

```
Customer Info
Vehicle Info
Estimate Items
Assigned Mechanics
Parts Used
Status Timeline
Actions
```

---

## 9. Status Control Logic

```js
const allowedTransitions = {
  DRAFT: ['ESTIMATED'],
  ESTIMATED: ['APPROVED'],
  APPROVED: ['IN_PROGRESS'],
  IN_PROGRESS: ['QUALITY_CHECK'],
  QUALITY_CHECK: ['BILLED'],
  BILLED: ['RELEASED']
};
```

---

## 10. Inventory Integration

### Reserve Stock

```sql
update public.inventory_items
set stock = stock - NEW.quantity
where id = NEW.inventory_item_id;
```

Attach this to a trigger on `job_parts_used`

---

## 11. Performance Metrics

### Example View

```sql
create view job_performance as
select
  mechanic_id,
  count(*) as jobs_completed,
  avg(extract(epoch from (max(changed_at) - min(changed_at))) / 3600) as avg_hours
from job_status_history
where new_status = 'RELEASED'
group by mechanic_id;
```

---

## 12. Development Timeline

| Day | Task                  |
| --- | --------------------- |
| 1   | Create tables         |
| 2   | RLS + audit triggers  |
| 3   | API routes            |
| 4   | Service Advisor UI    |
| 5   | Mechanic UI           |
| 6   | Branch Manager UI     |
| 7   | Inventory integration |
| 8   | Reports & metrics     |

---

## 13. Production Checklist

* Branch RLS tested
* Status transitions enforced
* Inventory sync verified
* Audit logs complete
* Role routes protected

---

## 14. What This Unlocks

Once this is done, your system becomes:

* Franchise-ready
* Multi-branch scalable
* ERP-grade
* SaaS-capable

---

If you want, I can continue with:

> **Phase 3 — Inventory & Purchasing Engine**

This will give you:

* Supplier system
* Auto-reorder logic
* Stock forecasting
* Financial reporting

Just say the word 🚀
