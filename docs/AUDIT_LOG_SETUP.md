# Audit Log System Setup Guide

## Overview

The Audit Log system maintains a comprehensive record of all system transactions including user logins, data creation, modification, and deletion events. This ensures accountability and traceability across the entire application.

## Database Schema

### Table: `audit_logs`

Create this table in Supabase with the following structure:

```sql
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  status VARCHAR(20) DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(created_at DESC, user_id);
```

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the audit log entry |
| `user_id` | UUID | ID of the user performing the action |
| `action` | VARCHAR | Type of action (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXPORT, etc.) |
| `entity_type` | VARCHAR | Type of entity affected (USER, BRANCH, JOB_ORDER, INVENTORY, etc.) |
| `entity_id` | UUID | ID of the entity being modified (optional) |
| `entity_name` | VARCHAR | Name/display value of the entity (for readability) |
| `details` | JSONB | Additional details as JSON (e.g., old values, new values, field changes) |
| `ip_address` | VARCHAR | IP address of the requester (for security tracking) |
| `status` | VARCHAR | Status of the action (SUCCESS, FAILED) |
| `error_message` | TEXT | Error message if action failed |
| `created_at` | TIMESTAMP | When the action occurred |

## Supported Actions

- **Authentication**: `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`
- **User Management**: `CREATE`, `UPDATE`, `DELETE`
- **Data Operations**: `CREATE`, `UPDATE`, `DELETE`, `EXPORT`, `IMPORT`
- **System**: `CONFIG_CHANGE`, `SETTINGS_UPDATE`

## Supported Entity Types

- `USER`
- `BRANCH`
- `JOB_ORDER`
- `INVENTORY`
- `CUSTOMER`
- `REPORT`
- `SYSTEM_CONFIG`

## Backend Implementation

### 1. Create Audit Log Service

**File**: `backend/src/utils/auditLog.js`

The audit logging service provides a centralized way to log all system events.

### 2. Update Auth Routes

The auth routes have been updated to automatically log:
- User login attempts (success and failure)
- User logout events

### 3. Integration Points

To log events from other parts of the application:

```javascript
import { logAuditEvent } from '../utils/auditLog.js';

// Log a user creation
await logAuditEvent({
  userId: 'user-id',
  action: 'CREATE',
  entityType: 'USER',
  entityId: 'new-user-id',
  entityName: 'john.doe@example.com',
  details: { role: 'mechanic', email: 'john.doe@example.com' },
  status: 'SUCCESS'
});

// Log a user deletion
await logAuditEvent({
  userId: 'admin-id',
  action: 'DELETE',
  entityType: 'USER',
  entityId: 'deleted-user-id',
  entityName: 'jane.doe@example.com',
  details: { reason: 'User requested deletion' },
  status: 'SUCCESS'
});

// Log a failed action
await logAuditEvent({
  userId: 'user-id',
  action: 'CREATE',
  entityType: 'JOB_ORDER',
  entityId: null,
  entityName: null,
  details: { error_details: 'Invalid customer ID' },
  status: 'FAILED',
  errorMessage: 'Invalid customer reference'
});
```

## Frontend Implementation

### 1. Audit Logs Page

The `AuditLogs.jsx` page displays all audit logs with:
- Real-time data fetching from Supabase
- Filtering by action, entity type, and user
- Date range filtering
- Search functionality
- Pagination with customizable page size
- Status indicators (SUCCESS/FAILED)
- Detailed view with JSON expansion

### 2. Features

✅ Display all audit logs in a sortable table
✅ Filter by action type
✅ Filter by entity type
✅ Filter by user
✅ Date range filtering
✅ Search by entity name
✅ Pagination (10, 25, 50 per page)
✅ Expandable details to view JSON data
✅ Status indicators with color coding
✅ Export functionality (optional)

## Current Integration

### Login Logging

Login attempts are automatically logged in the auth routes:

```javascript
// Successful login logs:
{
  action: 'LOGIN',
  entityType: 'AUTHENTICATION',
  entityName: 'user@example.com',
  status: 'SUCCESS'
}

// Failed login logs:
{
  action: 'LOGIN',
  entityType: 'AUTHENTICATION',
  entityName: 'user@example.com',
  status: 'FAILED',
  errorMessage: 'Invalid credentials'
}
```

### User Management Logging

When users are created or deleted through the Users Management page:

```javascript
// User creation:
{
  action: 'CREATE',
  entityType: 'USER',
  entityName: 'new.user@example.com',
  status: 'SUCCESS'
}

// User deletion:
{
  action: 'DELETE',
  entityType: 'USER',
  entityName: 'deleted.user@example.com',
  status: 'SUCCESS'
}
```

## Best Practices

1. **Always log important events** - User actions, data changes, system configuration changes
2. **Include context** - Use the `details` field to store relevant context
3. **Log both success and failure** - Even failed attempts should be logged
4. **Protect audit logs** - Only admins should be able to view audit logs
5. **Retention policy** - Consider archiving old logs (recommended: keep for 90 days)
6. **Performance** - Use indexes for common queries

## Security Considerations

- Audit logs should be immutable (no updates/deletes)
- Access should be restricted to administrators
- Sensitive data (passwords, tokens) should NOT be logged in details
- IP addresses help track suspicious activity
- Consider adding encryption for sensitive log entries

## Next Steps

1. Execute the SQL to create the `audit_logs` table in Supabase
2. Deploy the audit log service (`utils/auditLog.js`)
3. Update auth routes to use audit logging
4. Update Users management page to log create/delete events
5. Navigate to Admin Dashboard → Audit Logs to view entries
6. Gradually add logging to other parts of the application

## Troubleshooting

**No logs appearing?**
- Verify the table was created in Supabase
- Check backend console for any errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`

**Performance issues?**
- Check that indexes were created
- Consider implementing log archival
- Optimize query filters

**Missing logs for certain actions?**
- Verify the action is being logged in the code
- Check that the audit log function is being called
- Review error logs for failures
