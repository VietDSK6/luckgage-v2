import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  Clock3,
  Languages,
  LogIn,
  Luggage,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminDataApi } from '@/api/adminDataApi';
import type { UserStatus } from '@/api/types';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';

import { UserStatusDialog } from './UserStatusDialog';
import { formatDateTime, initials, roleLabel, statusLabel } from './userPresentation';
import { useUpdateUserStatus } from './useUpdateUserStatus';

export function UserDetailPage() {
  const { userId = '' } = useParams();
  const { user: currentAdmin } = useAdminAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: ({ signal }) => adminDataApi.getUser(userId, signal),
    enabled: Boolean(userId),
  });
  const statusMutation = useUpdateUserStatus();
  useSessionAwareError(detail.error);

  if (detail.isPending) return <UserDetailSkeleton />;
  if (detail.isError) {
    const apiError = detail.error instanceof ApiError ? detail.error : null;
    return (
      <section className="data-error">
        <CircleAlert aria-hidden="true" size={30} />
        <p className="eyebrow">ACCOUNT LOOKUP</p>
        <h2>Chưa mở được hồ sơ</h2>
        <p>{apiError?.status === 404 ? 'Tài khoản này không còn tồn tại.' : apiError?.detail ?? 'Hãy thử tải lại hồ sơ.'}</p>
        {apiError?.requestId ? <small>Request ID: {apiError.requestId}</small> : null}
        <div className="data-error__actions">
          <Link className="button button--quiet" to="/users"><ArrowLeft size={17} /> Về danh sách</Link>
          <button className="button button--primary" onClick={() => void detail.refetch()} type="button"><RefreshCw size={17} /> Tải lại</button>
        </div>
      </section>
    );
  }

  const managedUser = detail.data;
  const isSelf = managedUser.id === currentAdmin?.id;
  const confirmStatus = (status: UserStatus) => {
    statusMutation.mutate(
      { userId: managedUser.id, status },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setNotice(status === 'SUSPENDED' ? 'Tài khoản đã được tạm khóa.' : 'Tài khoản đã được mở lại.');
        },
      },
    );
  };

  return (
    <div className="user-detail-page">
      <Link className="back-link" to="/users"><ArrowLeft size={17} /> Danh sách người dùng</Link>

      {notice ? <div className="action-notice" role="status"><UserRoundCheck size={19} /><span>{notice}</span><button onClick={() => setNotice(null)} type="button">Đóng</button></div> : null}
      <section className="profile-hero" aria-labelledby="user-detail-title">
        <span className="profile-hero__avatar" aria-hidden="true">{initials(managedUser.displayName)}</span>
        <div className="profile-hero__identity">
          <p className="eyebrow">USER DOSSIER</p>
          <h2 id="user-detail-title">{managedUser.displayName}</h2>
          <a href={`mailto:${managedUser.email}`}>{managedUser.email}</a>
        </div>
        <div className="profile-hero__status">
          <span className={`status-badge status-badge--${managedUser.status.toLowerCase()}`}>
            {managedUser.status === 'ACTIVE' ? <UserRoundCheck size={16} /> : <UserRoundX size={16} />}
            {statusLabel(managedUser.status)}
          </span>
          <button
            className={`button ${managedUser.status === 'ACTIVE' ? 'button--danger' : 'button--primary'}`}
            disabled={isSelf}
            onClick={() => {
              statusMutation.reset();
              setDialogOpen(true);
            }}
            type="button">
            {managedUser.status === 'ACTIVE' ? <UserRoundX size={18} /> : <UserRoundCheck size={18} />}
            {isSelf ? 'Tài khoản đang dùng' : managedUser.status === 'ACTIVE' ? 'Tạm khóa tài khoản' : 'Mở lại tài khoản'}
          </button>
        </div>
      </section>

      <section className="user-detail-grid">
        <div className="profile-facts">
          <div className="section-heading"><div><p className="eyebrow">HỒ SƠ CƠ BẢN</p><h3>Thông tin tài khoản</h3></div></div>
          <dl>
            <div><dt><ShieldCheck size={17} /> Vai trò</dt><dd>{roleLabel(managedUser.role)}</dd></div>
            <div><dt><Languages size={17} /> Ngôn ngữ</dt><dd>{managedUser.locale === 'vi' ? 'Tiếng Việt' : 'English'}</dd></div>
            <div><dt><CalendarDays size={17} /> Ngày tạo</dt><dd>{formatDateTime(managedUser.createdAt)}</dd></div>
            <div><dt><Clock3 size={17} /> Cập nhật gần nhất</dt><dd>{formatDateTime(managedUser.updatedAt)}</dd></div>
            <div><dt><LogIn size={17} /> Đăng nhập gần nhất</dt><dd>{formatDateTime(managedUser.lastLoginAt)}</dd></div>
          </dl>
        </div>

        <aside className="account-scope">
          <p className="eyebrow eyebrow--light">ACCOUNT SCOPE</p>
          <h3>Dữ liệu tổng hợp, không đọc checklist riêng tư.</h3>
          <dl>
            <div><dt><Luggage size={18} /> Chuyến đi sở hữu</dt><dd>{managedUser.ownedTripCount}</dd></div>
            <div><dt><UsersRound size={18} /> Membership đang hoạt động</dt><dd>{managedUser.activeMembershipCount}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="session-strip" aria-labelledby="session-strip-title">
        <div><p className="eyebrow">SESSION METADATA</p><h3 id="session-strip-title">Phiên xác thực</h3></div>
        <div><span>Phiên còn hiệu lực</span><strong>{managedUser.activeSessionCount}</strong></div>
        <div><span>Hoạt động phiên gần nhất</span><strong>{formatDateTime(managedUser.lastSessionActivityAt)}</strong></div>
      </section>

      <UserStatusDialog
        busy={statusMutation.isPending}
        error={mutationError(statusMutation.error)}
        onClose={() => {
          if (!statusMutation.isPending) setDialogOpen(false);
        }}
        onConfirm={confirmStatus}
        open={dialogOpen}
        user={managedUser}
      />
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div aria-label="Đang tải hồ sơ người dùng" className="user-detail-skeleton" role="status">
      <span className="skeleton skeleton--title" /><span className="skeleton skeleton--ledger" /><span className="skeleton" />
    </div>
  );
}

function mutationError(error: Error | null): { detail: string; requestId: string | null } | null {
  if (!error) return null;
  if (error instanceof ApiError) return { detail: error.detail, requestId: error.requestId };
  return { detail: 'Máy chủ chưa hoàn tất được yêu cầu. Hãy thử lại.', requestId: null };
}
