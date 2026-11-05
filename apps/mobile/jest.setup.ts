import type { ReactNode } from 'react';

jest.mock('expo-sqlite', () => ({
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
}));

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
