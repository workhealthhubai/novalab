export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  DOCUMENTS: 'documents',
  SCHEDULED_JOBS: 'scheduled-jobs',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const QUEUE_NAMES: readonly QueueName[] = Object.values(QUEUES);

export const JOBS = {
  SEND_NOTIFICATION: 'send-notification',
  GENERATE_EMPLOYEE_REPORT: 'generate-employee-report',
  PROCESS_UPLOADED_DOCUMENT: 'process-uploaded-document',
  EXAMINATION_DUE_REMINDERS: 'examination-due-reminders',
  PACS_RECONCILIATION: 'pacs-reconciliation',
} as const;
