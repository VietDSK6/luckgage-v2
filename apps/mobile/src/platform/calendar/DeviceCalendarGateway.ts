import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import type { CalendarEventDetails, CalendarGateway } from '@/data/repositories/CalendarRepository';

// The legacy API is used because the newer object API is not available in Expo Go.
export class DeviceCalendarGateway implements CalendarGateway {
  readonly platform = Platform.OS === 'android' ? 'android' : 'ios';

  async requestPermission(): Promise<boolean> {
    const current = await Calendar.getCalendarPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Calendar.requestCalendarPermissionsAsync()).granted;
  }

  async findWritableCalendarId(): Promise<string | null> {
    if (Platform.OS === 'ios') {
      const calendar = await Calendar.getDefaultCalendarAsync();
      return calendar.allowsModifications ? calendar.id : null;
    }
    const calendars = (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).filter(
      (calendar) => calendar.allowsModifications && calendar.isVisible !== false,
    );
    return (calendars.find((calendar) => calendar.isPrimary) ?? calendars[0])?.id ?? null;
  }

  createEvent(calendarId: string, details: CalendarEventDetails): Promise<string> {
    return Calendar.createEventAsync(calendarId, details);
  }

  async updateEvent(eventId: string, details: CalendarEventDetails): Promise<void> {
    await Calendar.updateEventAsync(eventId, details);
  }

  deleteEvent(eventId: string): Promise<void> {
    return Calendar.deleteEventAsync(eventId);
  }
}
