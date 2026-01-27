# Audit Log Integration Guide

## Overview

This guide shows you how to integrate audit logging into different parts of your application.

## Backend Integration

### 1. Import the Audit Log Service

```javascript
import { logAuditEvent } from '../utils/auditLog.js';
```

### 2. Supported Actions

| Action | Description | Entity Types |
|--------|-------------|--------------|
| `LOGIN` | User login attempt | AUTHENTICATION |
| `LOGOUT` | User logout | AUTHENTICATION |
| `CREATE` | Create new entity | USER, BRANCH, JOB_ORDER, INVENTORY |
| `UPDATE` | Update existing entity | USER, BRANCH, JOB_ORDER, INVENTORY |
| `DELETE` | Delete entity | USER, BRANCH, JOB_ORDER, INVENTORY |
| `EXPORT` | Export data | REPORT, USER, JOB_ORDER |
| `IMPORT` | Import data | USER, JOB_ORDER, INVENTORY |
| `PASSWORD_CHANGE` | User changed password | USER |
| `CONFIG_CHANGE` | System config changed | SYSTEM_CONFIG |

### 3. API Reference

#### logAuditEvent(auditData)

Logs an audit event to the database.

**Parameters:**
```javascript
{
  userId: string (required),           // UUID of user performing action
  action: string (required),           // Type of action
  entityType: string (required),       // Type of entity affected
  entityId?: string,                   // UUID of entity (optional)
  entityName?: string,                 // Name/display value (optional)
  details?: object,                    // Additional JSON details
  ipAddress?: string,                  // IP address (optional)
  status?: 'SUCCESS' | 'FAILED',      // Status (default: SUCCESS)
  errorMessage?: string                // Error message if failed
}
```

**Returns:** Promise<Object|null> - Created audit log entry or null on error

---

## Usage Examples

### Example 1: Log User Creation

**Location:** `backend/src/routes/auth.js` (Register endpoint)

```javascript
// After successfully creating a user
await logAuditEvent({
  userId: adminUserId,           // Who performed the action
  action: 'CREATE',              // What action
  entityType: 'USER',            // What entity type
  entityId: newUser.id,          // ID of new user
  entityName: newUser.email,     // Display value
  details: {
    email: newUser.email,
    role: newUser.role,
    fullName: newUser.full_name
  },
  status: 'SUCCESS'
});
```

### Example 2: Log User Deletion

**Location:** `backend/src/routes/auth.js` (Delete endpoint)

```javascript
// Before deleting user
await logAuditEvent({
  userId: adminUserId,
  action: 'DELETE',
  entityType: 'USER',
  entityId: userToDelete.id,
  entityName: userToDelete.email,
  details: {
    reason: req.body.reason || 'Admin deletion',
    deletedRole: userToDelete.role
  },
  status: 'SUCCESS'
});
```

### Example 3: Log Failed Action

```javascript
// When an action fails
await logAuditEvent({
  userId: currentUserId,
  action: 'CREATE',
  entityType: 'JOB_ORDER',
  entityId: null,
  entityName: null,
  details: {
    validation_errors: ['Invalid customer ID', 'Invalid date format']
  },
  status: 'FAILED',
  errorMessage: 'Validation failed: Invalid customer ID'
});
```

### Example 4: Log Password Change

```javascript
await logAuditEvent({
  userId: userId,
  action: 'PASSWORD_CHANGE',
  entityType: 'USER',
  entityId: userId,
  entityName: userEmail,
  details: {
    method: 'user-initiated',
    timestamp: new Date().toISOString()
  },
  status: 'SUCCESS'
});
```

### Example 5: Log Data Export

```javascript
await logAuditEvent({
  userId: currentUserId,
  action: 'EXPORT',
  entityType: 'REPORT',
  entityId: reportId,
  entityName: `${reportType}_${dateRange}`,
  details: {
    reportType: 'job_orders_summary',
    dateRange: `${startDate} to ${endDate}`,
    format: 'CSV',
    recordCount: 250
  },
  status: 'SUCCESS'
});
```

---

## Frontend Integration

### Creating New Users (Already Integrated)

The Users Management page (`frontend/src/pages/dashboards/admin/Users.jsx`) already logs:
- ✅ User creation
- ✅ User deletion
- ✅ Login/logout events

### Adding Logging to Custom Features

To add audit logging to a new feature:

1. **Create an audit logging endpoint in your backend:**

```javascript
// backend/src/routes/example.js
import { logAuditEvent } from '../utils/auditLog.js';

router.post('/api/example/create', async (req, res) => {
  try {
    const { userId, data } = req.body;
    
    // Your business logic here
    const result = await createSomething(data);
    
    // Log the event
    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'EXAMPLE',
      entityId: result.id,
      entityName: result.name,
      details: data,
      status: 'SUCCESS'
    });
    
    res.json(result);
  } catch (error) {
    // Log the failed action
    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'EXAMPLE',
      status: 'FAILED',
      errorMessage: error.message
    });
    
    res.status(400).json({ error: error.message });
  }
});
```

2. **Call the endpoint from your frontend component:**

```javascript
const handleCreate = async (userId, data) => {
  try {
    const response = await fetch('/api/example/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, data })
    });
    
    if (!response.ok) throw new Error('Failed to create');
    return await response.json();
  } catch (error) {
    // Error is logged on backend automatically
    throw error;
  }
};
```

---

## Getting Audit Logs

### Fetch Logs with Filters

```javascript
import { fetchAuditLogs } from '../utils/auditLog.js';

// Fetch all logs
const { data: allLogs, count } = await fetchAuditLogs();

// Fetch with filters
const { data: loginLogs } = await fetchAuditLogs({
  action: 'LOGIN',
  status: 'SUCCESS',
  limit: 50,
  offset: 0
});

// Fetch by date range
const { data: recentLogs } = await fetchAuditLogs({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  limit: 100
});

// Search logs
const { data: userLogs } = await fetchAuditLogs({
  search: 'john@example.com',
  limit: 50
});
```

### Get Statistics

```javascript
import { getAuditLogStats } from '../utils/auditLog.js';

const stats = await getAuditLogStats();
// Returns: {
//   totalLogs: 1250,
//   failedLogs: 15,
//   actionCounts: {
//     LOGIN: 500,
//     CREATE: 300,
//     DELETE: 50,
//     ...
//   },
//   successRate: "98.80"
// }
```

---

## Best Practices

### 1. Always Log Important Actions
```javascript
// ✅ Good - log this
await logAuditEvent({...});

// ❌ Avoid - don't log this
// Calling a function that modifies data without logging
```

### 2. Include Meaningful Details
```javascript
// ✅ Good - rich details
details: {
  action_type: 'modify_role',
  old_role: 'mechanic',
  new_role: 'branch_manager',
  reason: 'Promotion'
}

// ❌ Avoid - minimal details
details: {}
```

### 3. Never Log Sensitive Data
```javascript
// ✅ Good - secure
details: { email: 'user@example.com' }

// ❌ Avoid - insecure
details: { 
  password: 'secret123',
  apiToken: 'sk_live_xxx'
}
```

### 4. Log Both Success and Failure
```javascript
// ✅ Good - log both cases
if (success) {
  await logAuditEvent({...status: 'SUCCESS'});
} else {
  await logAuditEvent({...status: 'FAILED', errorMessage});
}

// ❌ Avoid - only logging success
await logAuditEvent({...});
```

### 5. Include Context
```javascript
// ✅ Good - provides context
details: {
  initiator: 'admin_dashboard',
  trigger: 'manual_user_action',
  approver_id: 'admin123'
}

// ❌ Avoid - no context
details: { /* nothing */ }
```

---

## Filtering by Date Range

The Audit Logs dashboard supports date filtering. To programmatically fetch logs from a specific date:

```javascript
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date();
endOfDay.setHours(23, 59, 59, 999);

const { data: todayLogs } = await fetchAuditLogs({
  startDate: startOfDay,
  endDate: endOfDay
});
```

---

## Common Integration Points

### User Management
- ✅ User creation
- ✅ User deletion
- User role updates (ready for integration)
- Password resets (ready for integration)

### Job Orders
- Job order creation (ready for integration)
- Job order status updates (ready for integration)
- Job order deletion (ready for integration)

### Inventory
- Stock adjustments (ready for integration)
- Inventory imports (ready for integration)
- Inventory exports (ready for integration)

### Reports
- Report generation (ready for integration)
- Report exports (ready for integration)
- Report scheduling (ready for integration)

---

## Viewing Audit Logs

Navigate to: **Admin Dashboard → Audit Logs**

Features:
- Real-time filtering by action, entity type, status
- Date range selection
- Search by email or entity name
- Expandable rows with full details
- JSON view of log details
- Error message display
- Pagination with customizable page size

---

## Troubleshooting

**Q: Audit log not appearing after I perform an action?**
A: 
1. Verify the `logAuditEvent()` call is being executed
2. Check backend console for any errors
3. Verify the user ID is being passed correctly
4. Ensure the `audit_logs` table exists in Supabase

**Q: How do I test if audit logging is working?**
A:
1. Login to the application
2. Go to Audit Logs dashboard
3. You should see a LOGIN entry for yourself

**Q: Can I delete audit logs?**
A: Not recommended. Audit logs should be immutable for security. Consider setting up RLS (Row Level Security) to prevent deletion.

---

**For more information, see:**
- [AUDIT_LOG_SETUP.md](./AUDIT_LOG_SETUP.md) - Full setup guide
- [AUDIT_LOG_QUICK_START.md](./AUDIT_LOG_QUICK_START.md) - Quick start guide
