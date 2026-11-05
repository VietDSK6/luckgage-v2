import type { AppLanguage } from '@/platform/preferences/preferences';

const vi = {
  phaseLabel: 'PHASE 1A · FOUNDATION',
  title: 'luckgage v2',
  subtitle: 'Nền tảng mobile đã sẵn sàng cho những chuyến đi tiếp theo.',
  routerReady: 'Expo Router',
  typescriptReady: 'TypeScript strict',
  databaseReady: 'SQLite local foundation',
  settingsTitle: 'Tùy chỉnh nền tảng',
  themeLabel: 'Giao diện',
  themeSystem: 'Hệ thống',
  themeLight: 'Sáng',
  themeDark: 'Tối',
  languageLabel: 'Ngôn ngữ',
  languageVietnamese: 'Tiếng Việt',
  languageEnglish: 'English',
  note: 'Phase 1B Trips chưa bắt đầu. Backend và admin vẫn nằm ngoài phạm vi hiện tại.',
  loading: 'Đang chuẩn bị luckgage…',
} as const;

export type MessageKey = keyof typeof vi;

const en: Record<MessageKey, string> = {
  phaseLabel: 'PHASE 1A · FOUNDATION',
  title: 'luckgage v2',
  subtitle: 'The mobile foundation is ready for the journeys ahead.',
  routerReady: 'Expo Router',
  typescriptReady: 'Strict TypeScript',
  databaseReady: 'Local SQLite foundation',
  settingsTitle: 'Foundation preferences',
  themeLabel: 'Appearance',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  languageLabel: 'Language',
  languageVietnamese: 'Tiếng Việt',
  languageEnglish: 'English',
  note: 'Phase 1B Trips has not started. Backend and admin remain out of scope.',
  loading: 'Preparing luckgage…',
};

export const messages: Record<AppLanguage, Record<MessageKey, string>> = { vi, en };

export function translate(language: AppLanguage, key: MessageKey): string {
  return messages[language][key];
}
