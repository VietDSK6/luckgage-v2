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
