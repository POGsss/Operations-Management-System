import { supabaseAdmin } from '../db/index.js';

/**
 * Log an audit event to the database
 * @param {Object} auditData - Audit log data
 * @param {string} auditData.userId - ID of the user performing the action
 * @param {string} auditData.action - Type of action (LOGIN, CREATE, UPDATE, DELETE, etc.)
 * @param {string} auditData.entityType - Type of entity affected (USER, BRANCH, etc.)
 * @param {string} [auditData.entityId] - ID of the entity being modified
 * @param {string} [auditData.entityName] - Name/display value of the entity
 * @param {Object} [auditData.details] - Additional details as JSON
 * @param {string} [auditData.ipAddress] - IP address of the requester
 * @param {string} [auditData.status='SUCCESS'] - Status of the action (SUCCESS, FAILED)
 * @param {string} [auditData.errorMessage] - Error message if action failed
 * @returns {Promise<Object>} - The created audit log entry
 */
export const logAuditEvent = async ({
  userId,
  action,
  entityType,
  entityId = null,
  entityName = null,
  details = {},
  status = 'SUCCESS',
  errorMessage = null,
}) => {
  try {
    console.log('Attempting to log audit event:', { action, entityType, userId });

    // Build the audit log object
    const auditLog = {
      user_id: userId, // Allow null for failed login attempts
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
      status,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    };

    // Use upsert to handle any constraint issues
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert([auditLog])
      .select();

    if (error) {
      console.error('Audit log error:', error.message);
      console.error('Full error details:', error);
      return false;
    }

    console.log('Audit event logged successfully:', {
      id: data[0]?.id,
      action,
      entityType,
      status,
      timestamp: data[0]?.created_at,
    });

    return true;
  } catch (error) {
    console.error('Exception in logAuditEvent:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
};

/**
 * Fetch audit logs with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} [filters.userId] - Filter by user ID
 * @param {string} [filters.action] - Filter by action
 * @param {string} [filters.entityType] - Filter by entity type
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @param {string} [filters.status] - Filter by status (SUCCESS, FAILED)
 * @param {number} [filters.limit=100] - Number of records to fetch
 * @param {number} [filters.offset=0] - Pagination offset
 * @returns {Promise<Array>} - Array of audit log entries
 */
export const fetchAuditLogs = async (filters = {}, pagination = {}) => {
  try {
    const { action, entityType, status, search, startDate, endDate } = filters;
    const { page = 1, pageSize = 10 } = pagination;

    let query = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });

    // Apply filters
    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (status) query = query.eq('status', status);

    if (search) {
      query = query.or(
        `entity_name.ilike.%${search}%,error_message.ilike.%${search}%`
      );
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDateTime.toISOString());
    }

    // Add ordering and pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Fetch audit logs error:', error);
      return { logs: [], total: 0, error: error.message };
    }

    return { logs: data, total: count || 0 };
  } catch (error) {
    console.error('Exception in fetchAuditLogs:', error.message);
    return { logs: [], total: 0, error: error.message };
  }
};

/**
 * Get audit log statistics
 * @returns {Promise<Object>} - Statistics about audit logs
 */
export const getAuditLogStats = async () => {
  try {
    // Get total logs
    const { count: totalLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    // Get actions breakdown
    const { data: actionBreakdown } = await supabaseAdmin
      .from('audit_logs')
      .select('action')
      .order('action');

    // Count by action
    const actionCounts = {};
    if (actionBreakdown) {
      actionBreakdown.forEach((log) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });
    }

    // Get failed logs count
    const { count: failedLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'FAILED');

    return {
      totalLogs,
      failedLogs,
      actionCounts,
      successRate: totalLogs > 0 ? (((totalLogs - failedLogs) / totalLogs) * 100).toFixed(2) : 100,
    };
  } catch (error) {
    console.error('Error getting audit log stats:', error.message);
    return { totalLogs: 0, failedLogs: 0, actionCounts: {}, successRate: 0 };
  }
};
