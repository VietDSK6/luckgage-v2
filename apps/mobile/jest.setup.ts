import type { ReactNode } from 'react';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'trip-1'),
}));

jest.mock('expo-sqlite', () => {
  const database = {
    execAsync: jest.fn(async () => undefined),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 })),
    withTransactionAsync: jest.fn(async (operation: () => Promise<void>) => operation()),
  };

  return {
    __mockDatabase: database,
    SQLiteProvider: ({
      children,
      onError,
      useSuspense,
    }: {
      children: ReactNode;
      onError?: (error: Error) => void;
      useSuspense?: boolean;
    }) => {
      if (onError && useSuspense) {
        throw new Error('Cannot use onError with useSuspense');
      }

      return children;
    },
    useSQLiteContext: () => database,
  };
});

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'notification-1'),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => undefined),
}));

Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  writable: true,
  value: jest.fn(async () => ({ ok: false, status: 500, text: async () => '{}' })),
});
