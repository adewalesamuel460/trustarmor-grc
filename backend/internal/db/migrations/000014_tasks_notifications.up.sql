-- Global Task/Remediation Queue
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'in_review', 'done'
    priority VARCHAR(50) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    related_entity_type VARCHAR(100), -- e.g., 'control', 'risk', 'vendor_document', 'access_review'
    related_entity_id UUID, -- The ID of the failing control, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE -- Used to calculate MTTR (Mean Time To Remediate)
);

-- Rules for automated alerting
CREATE TABLE notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    trigger_event VARCHAR(100) NOT NULL, -- e.g., 'control.failed', 'vendor.document_expiring', 'task.overdue'
    action_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'webhook'
    target_destination VARCHAR(255) NOT NULL, -- Email address, Slack channel ID, or Webhook URL
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id, status);
CREATE INDEX idx_notification_rules_trigger ON notification_rules(workspace_id, trigger_event);
