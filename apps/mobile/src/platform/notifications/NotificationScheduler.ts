import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export type LocalNotificationRequest = {
  date: Date;
  title: string;
  body: string;
  data: Record<string, string>;
};

export interface NotificationScheduler {
  getPermission(): Promise<NotificationPermission>;
  requestPermission(): Promise<NotificationPermission>;
  schedule(request: LocalNotificationRequest): Promise<string>;
  cancel(identifier: string): Promise<void>;
  cancelAll(): Promise<void>;
}

const CHANNEL_ID = 'packing-reminders';

export class ExpoNotificationScheduler implements NotificationScheduler {
  async getPermission(): Promise<NotificationPermission> {
    const permission = await Notifications.getPermissionsAsync();
    return permission.granted ? 'granted' : permission.status;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Packing reminders',
        importance: AndroidImportance.DEFAULT,
      });
    }
    const existing = await this.getPermission();
    if (existing === 'granted' || existing === 'denied') return existing;
    const permission = await Notifications.requestPermissionsAsync();
    return permission.granted ? 'granted' : permission.status;
  }

  schedule(request: LocalNotificationRequest): Promise<string> {
    configureNotificationHandling();
    return Notifications.scheduleNotificationAsync({
      content: {
        title: request.title,
        body: request.body,
        data: request.data,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: request.date,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
  }

  cancel(identifier: string): Promise<void> {
    return Notifications.cancelScheduledNotificationAsync(identifier);
  }

  cancelAll(): Promise<void> {
    return Notifications.cancelAllScheduledNotificationsAsync();
  }
}

let isNotificationHandlerConfigured = false;

export function configureNotificationHandling(): void {
  if (isNotificationHandlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  isNotificationHandlerConfigured = true;
}
