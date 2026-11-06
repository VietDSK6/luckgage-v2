import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CloudSun,
  ListChecks,
  LogIn,
  Luggage,
  MapPin,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  TicketCheck,
  UserPlus,
  UsersRound,
  X,
  Search,
  type LucideIcon,
} from 'lucide-react-native';

const icons = {
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  calendar: CalendarDays,
  check: Check,
  checklist: ListChecks,
  chevronRight: ChevronRight,
  close: X,
  create: Plus,
  edit: Pencil,
  group: UsersRound,
  join: TicketCheck,
  login: LogIn,
  luggage: Luggage,
  mapPin: MapPin,
  minus: Minus,
  retry: RotateCcw,
  search: Search,
  settings: Settings2,
  signUp: UserPlus,
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
