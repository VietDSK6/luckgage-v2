import type { UserRole, UserStatus } from '@/api/types';

export function formatDateTime(value: string | null): string {
  if (!value) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function initials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase('vi-VN') ?? '')
    .join('');
}

export function roleLabel(role: UserRole): string {
  return role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng';
}

export function statusLabel(status: UserStatus): string {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa';
}
