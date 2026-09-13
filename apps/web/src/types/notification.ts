export interface AppNotification {
  id: string;
  template: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
