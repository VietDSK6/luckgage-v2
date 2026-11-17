jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    removeItem: jest.fn(async () => undefined),
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
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
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

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('lucide-react-native', () => {
  const MockIcon = () => null;

  return {
    ArrowLeft: MockIcon,
    ArrowRight: MockIcon,
    Bell: MockIcon,
    BookOpen: MockIcon,
    CalendarDays: MockIcon,
    Check: MockIcon,
    ChevronRight: MockIcon,
    CircleX: MockIcon,
    CloudSun: MockIcon,
    Info: MockIcon,
    Languages: MockIcon,
    ListChecks: MockIcon,
    LogIn: MockIcon,
    LogOut: MockIcon,
    Luggage: MockIcon,
    MapPin: MockIcon,
    MoreHorizontal: MockIcon,
    Minus: MockIcon,
    Palette: MockIcon,
    Pencil: MockIcon,
    Plus: MockIcon,
    QrCode: MockIcon,
    RotateCcw: MockIcon,
    Search: MockIcon,
    Settings2: MockIcon,
    SlidersHorizontal: MockIcon,
    Thermometer: MockIcon,
    TicketCheck: MockIcon,
    TriangleAlert: MockIcon,
    UserPlus: MockIcon,
    UserRound: MockIcon,
    UsersRound: MockIcon,
    X: MockIcon,
  };
});

Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  writable: true,
  value: jest.fn(async () => ({ ok: false, status: 500, text: async () => '{}' })),
});
