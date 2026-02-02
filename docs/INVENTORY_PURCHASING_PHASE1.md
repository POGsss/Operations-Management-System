🏗️ PHASE 3 — INVENTORY & PURCHASING ENGINE

This phase will let your system:

Track real stock per branch

Auto-deduct parts when jobs are completed

Alert when stock is low

Create Purchase Requests → Purchase Orders

Track suppliers and deliveries

Keep everything audit-logged

🧠 SYSTEM DESIGN OVERVIEW

You now have:

users

roles

branches

customers

job_orders

inventory_items

Now we add operational tables — not just catalogs.

🧩 PHASE 3 TABLE FLOW
inventory_items
      ↓
inventory_stock (per branch)
      ↓
job_order_parts (deducts stock)
      ↓
purchase_requests
      ↓
purchase_orders
      ↓
goods_receipts (stock in)
      ↓
audit_logs (tracks everything)


This is the same flow used in SAP, Oracle NetSuite, and Odoo — you’re building real ERP architecture here 💼

🗃️ STEP 1 — INVENTORY STOCK (Per-Branch Quantities)

This is the most important table in Phase 3

What it Does

Tracks how many of each part exists in each branch

Powers:

Low stock alerts

Auto-deductions

Reordering logic

Transfer between branches (future-proof)

📦 Table Design
Columns
Column	Purpose
id	Primary key
branch_id	Which branch owns this stock
item_id	Which inventory item
quantity	Current stock
min_stock	Alert threshold
max_stock	Optional reorder cap
last_updated_by	User who changed it
updated_at	Timestamp
✅ STEP 1 — CREATE TABLE (Paste into Supabase SQL Editor)
-- =========================
-- INVENTORY STOCK TABLE
-- =========================
create table public.inventory_stock (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null references public.branches(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,

  quantity integer not null default 0,
  min_stock integer default 5,
  max_stock integer default 100,

  last_updated_by uuid references public.users(id),

  updated_at timestamp with time zone default now(),

  unique(branch_id, item_id)
);

🔄 UPDATED_AT TRIGGER
create or replace function public.update_inventory_stock_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger inventory_stock_updated_at_trigger
before update on public.inventory_stock
for each row
execute procedure public.update_inventory_stock_updated_at();

🔐 RLS SECURITY MODEL
Enable RLS
alter table public.inventory_stock enable row level security;

Policies
Everyone can view stock in their branch
create policy "View branch stock"
on public.inventory_stock
for select
using (
  exists (
    select 1 from public.users
    where id = auth.uid()
    and branch_id = inventory_stock.branch_id
  )
);

Inventory + Admin can modify stock
create policy "Modify stock"
on public.inventory_stock
for update
using (
  exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('admin', 'inventory_officer')
  )
);

Only Admin can create stock records
create policy "Create stock rows"
on public.inventory_stock
for insert
with check (
  exists (
    select 1 from public.users
    where id = auth.uid()
    and role = 'admin'
  )
);

🧪 TEST DATA
insert into public.inventory_stock (
  branch_id,
  item_id,
  quantity,
  min_stock
)
select
  b.id,
  i.id,
  20,
  5
from public.branches b, public.inventory_items i
limit 1;

🔗 WHAT YOU UNLOCKED

You now have:

Feature	Status
Per-branch stock	✅
Low stock detection	Ready
Auto job deduction	Ready
Purchase requests	Ready
Full audit chain	Ready
🚀 NEXT STEP — PURCHASE REQUEST SYSTEM

This is where your system becomes business-critical software

Step 2 will build:

purchase_requests

This lets:

Branch Managers request parts

Admin approve or reject

System auto-suggest based on low stock

🧠 ENTERPRISE TIP

You are now building a mini ERP
This architecture can scale to:

Warehouses

Transfers

Multi-company

Supplier contracts

Cost accounting

👉 Say:

"Phase 3 Step 2"

And I’ll build your Purchase Requests System — full SQL, RLS, audit logging, and workflow