import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleX,
  CloudSun,
  Info,
  Languages,
  Lightbulb,
  ListChecks,
  LogIn,
  LogOut,
  Luggage,
  Map,
  MapPin,
  MoreHorizontal,
  Minus,
  Palette,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Thermometer,
  TicketCheck,
  TriangleAlert,
  UserRound,
  UserPlus,
  UsersRound,
  X,
  Search,
  type LucideIcon,
} from 'lucide-react-native';

const icons = {
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  appearance: Palette,
  bell: Bell,
  book: BookOpen,
  bookmark: Bookmark,
  bookmarkSaved: BookmarkCheck,
  calendar: CalendarDays,
  check: Check,
  checklist: ListChecks,
  chevronRight: ChevronRight,
  close: X,
  create: Plus,
  edit: Pencil,
  error: CircleX,
  group: UsersRound,
  info: Info,
  join: TicketCheck,
  language: Languages,
  lightbulb: Lightbulb,
  login: LogIn,
  logout: LogOut,
  luggage: Luggage,
  map: Map,
  mapPin: MapPin,
  more: MoreHorizontal,
  minus: Minus,
  retry: RotateCcw,
  qr: QrCode,
  search: Search,
  settings: Settings2,
  signUp: UserPlus,
  sliders: SlidersHorizontal,
  temperature: Thermometer,
  user: UserRound,
  warning: TriangleAlert,
  weather: CloudSun,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof icons;

type AppIconProps = {
  name: AppIconName;
  color: string;
  size?: number;
  strokeWidth?: number;
};

export function AppIcon({ color, name, size = 22, strokeWidth = 2.2 }: AppIconProps) {
  const Icon = icons[name];

  return (
    <Icon
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no-hide-descendants"
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
