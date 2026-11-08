import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  FilterX,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminDataApi } from '@/api/adminDataApi';
import type { ManagedUser, UsersQuery, UserRole, UserStatus } from '@/api/types';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';

import { UserStatusDialog } from './UserStatusDialog';
import { formatDateTime, initials, roleLabel, statusLabel } from './userPresentation';
import { useUpdateUserStatus } from './useUpdateUserStatus';

const PAGE_SIZE = 20;

export function UsersPage() {
  const { user: currentAdmin } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const filters = readFilters(searchParams);
  const users = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: ({ signal }) => adminDataApi.getUsers(filters, signal),
    placeholderData: keepPreviousData,
  });
  const statusMutation = useUpdateUserStatus();
  useSessionAwareError(users.error);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    updateParams({ search: typeof value === 'string' ? value.trim() || null : null });
  };

  const confirmStatus = (status: UserStatus) => {
    if (!selectedUser) return;
    const target = selectedUser;
    statusMutation.mutate(
      { userId: target.id, status },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setNotice(
            status === 'SUSPENDED'
              ? `Đã tạm khóa ${target.displayName}. Mọi phiên đăng nhập đã bị thu hồi.`
              : `Đã mở lại ${target.displayName}. Tài khoản có thể đăng nhập trở lại.`,
          );
        },
      },
    );
  };

  const hasFilters = Boolean(filters.search || filters.role || filters.status || filters.sort !== '-createdAt');

  return (
    <div className="users-page">
      <section className="page-heading" aria-labelledby="users-title">
        <div>
          <p className="eyebrow">ACCOUNT CONTROL</p>
          <h2 id="users-title">Người dùng</h2>
          <p>Tìm đúng tài khoản, xem đủ metadata và thay đổi trạng thái mà không đụng vào dữ liệu chuyến đi.</p>
        </div>
        <div className="page-heading__count">
          <UsersRound aria-hidden="true" size={20} />
          <strong>{users.data?.totalItems.toLocaleString('vi-VN') ?? '—'}</strong>
          <span>kết quả</span>
        </div>
      </section>

      {notice ? (
        <div className="action-notice" role="status">
          <CircleCheck aria-hidden="true" size={19} />
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} type="button">Đóng</button>
        </div>
      ) : null}

      <section className="user-filters" aria-label="Bộ lọc người dùng">
        <form className="user-search" key={filters.search ?? ''} onSubmit={submitSearch}>
          <label htmlFor="user-search">Tìm theo tên hoặc email</label>
          <div>
            <Search aria-hidden="true" size={19} />
            <input
              defaultValue={filters.search}
              id="user-search"
              name="search"
              placeholder="Ví dụ: mai@example.com"
              type="search"
            />
            <button className="button button--primary" type="submit">Tìm tài khoản</button>
          </div>
        </form>
        <div className="filter-selects">
          <label>
            <span>Trạng thái</span>
            <select
              onChange={(event) => updateParams({ status: event.target.value || null })}
              value={filters.status ?? ''}>
              <option value="">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="SUSPENDED">Tạm khóa</option>
            </select>
          </label>
          <label>
            <span>Vai trò</span>
            <select
              onChange={(event) => updateParams({ role: event.target.value || null })}
              value={filters.role ?? ''}>
              <option value="">Tất cả</option>
              <option value="USER">Người dùng</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>
          <label>
            <span>Sắp xếp</span>
            <select
              onChange={(event) => updateParams({ sort: event.target.value })}
              value={filters.sort}>
              <option value="-createdAt">Mới tạo trước</option>
              <option value="createdAt">Cũ tạo trước</option>
              <option value="email">Email A–Z</option>
              <option value="-email">Email Z–A</option>
            </select>
          </label>
          {hasFilters ? (
            <button
              className="button button--quiet filter-reset"
              onClick={() => setSearchParams({}, { replace: true })}
              type="button">
              <FilterX size={17} /> Xóa bộ lọc
            </button>
          ) : null}
        </div>
      </section>

      {users.isPending ? <UsersTableSkeleton /> : null}
      {users.isError ? (
        <UsersError error={users.error} onRetry={() => void users.refetch()} retrying={users.isFetching} />
      ) : null}
      {users.isSuccess && users.data.items.length === 0 ? (
        <section className="users-empty">
          <Search aria-hidden="true" size={28} />
          <h3>Không có tài khoản phù hợp</h3>
          <p>Thử bớt bộ lọc hoặc dùng email/tên khác.</p>
          <button className="button button--secondary" onClick={() => setSearchParams({}, { replace: true })} type="button">
            Xem toàn bộ người dùng
          </button>
        </section>
      ) : null}
      {users.isSuccess && users.data.items.length > 0 ? (
        <>
          <div className={`users-table-wrap${users.isFetching ? ' users-table-wrap--updating' : ''}`}>
            <table className="users-table">
              <caption>Danh sách tài khoản theo bộ lọc hiện tại</caption>
              <thead>
                <tr>
                  <th scope="col">Tài khoản</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Đăng nhập gần nhất</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col"><span className="visually-hidden">Hành động</span></th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((managedUser) => {
                  const isSelf = managedUser.id === currentAdmin?.id;
                  return (
                    <tr key={managedUser.id}>
                      <td data-label="Tài khoản">
                        <div className="user-identity">
                          <span aria-hidden="true">{initials(managedUser.displayName)}</span>
                          <div><strong>{managedUser.displayName}</strong><small>{managedUser.email}</small></div>
                        </div>
                      </td>
                      <td data-label="Vai trò"><span className="role-label"><ShieldCheck size={15} /> {roleLabel(managedUser.role)}</span></td>
                      <td data-label="Trạng thái"><StatusBadge status={managedUser.status} /></td>
                      <td data-label="Đăng nhập gần nhất"><time dateTime={managedUser.lastLoginAt ?? undefined}>{formatDateTime(managedUser.lastLoginAt)}</time></td>
                      <td data-label="Ngày tạo"><time dateTime={managedUser.createdAt}>{formatDateTime(managedUser.createdAt)}</time></td>
                      <td data-label="Hành động">
                        <div className="row-actions">
                          <Link aria-label={`Xem ${managedUser.displayName}`} className="icon-button" to={`/users/${managedUser.id}`}><Eye size={18} /></Link>
                          <button
                            aria-label={
                              isSelf
                                ? 'Không thể thay đổi trạng thái tài khoản đang đăng nhập'
                                : managedUser.status === 'ACTIVE'
                                  ? `Tạm khóa ${managedUser.displayName}`
                                  : `Mở lại ${managedUser.displayName}`
                            }
                            className={`icon-button${managedUser.status === 'ACTIVE' ? ' icon-button--danger' : ' icon-button--success'}`}
                            disabled={isSelf}
                            onClick={() => {
                              statusMutation.reset();
                              setSelectedUser(managedUser);
                              setDialogOpen(true);
                            }}
                            type="button">
                            {managedUser.status === 'ACTIVE' ? <UserRoundX size={18} /> : <UserRoundCheck size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Phân trang người dùng">
            <button
              className="button button--quiet"
              disabled={filters.page <= 1 || users.isFetching}
              onClick={() => updateParams({ page: String(filters.page - 1) })}
              type="button">
              <ArrowLeft size={17} /> Trang trước
            </button>
            <span>Trang <strong>{users.data.page}</strong> / {Math.max(users.data.totalPages, 1)}</span>
            <button
              className="button button--quiet"
              disabled={filters.page >= users.data.totalPages || users.isFetching}
              onClick={() => updateParams({ page: String(filters.page + 1) })}
              type="button">
              Trang sau <ArrowRight size={17} />
            </button>
          </nav>
        </>
      ) : null}

      <UserStatusDialog
        busy={statusMutation.isPending}
        error={mutationError(statusMutation.error)}
        onClose={() => {
          if (!statusMutation.isPending) {
            setDialogOpen(false);
            setSelectedUser(null);
          }
        }}
        onConfirm={confirmStatus}
        open={dialogOpen}
        user={selectedUser}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {status === 'ACTIVE' ? <UserRoundCheck size={15} /> : <UserRoundX size={15} />}
      {statusLabel(status)}
    </span>
  );
}

function UsersTableSkeleton() {
  return (
    <div aria-label="Đang tải danh sách người dùng" className="users-table-skeleton" role="status">
      <span /><span /><span /><span />
    </div>
  );
}

function UsersError({ error, onRetry, retrying }: { error: Error; onRetry: () => void; retrying: boolean }) {
  const apiError = error instanceof ApiError ? error : null;
  return (
    <section className="data-error data-error--compact">
      <CircleAlert aria-hidden="true" size={26} />
      <h3>Chưa tải được danh sách người dùng</h3>
      <p>{apiError?.detail ?? 'Kiểm tra kết nối API rồi tải lại danh sách.'}</p>
      {apiError?.requestId ? <small>Request ID: {apiError.requestId}</small> : null}
      <button className="button button--primary" disabled={retrying} onClick={onRetry} type="button">
        <RefreshCw size={17} /> {retrying ? 'Đang tải lại…' : 'Tải lại danh sách'}
      </button>
    </section>
  );
}

function readFilters(params: URLSearchParams): UsersQuery {
  const pageValue = Number(params.get('page'));
  const roleValue = params.get('role');
  const statusValue = params.get('status');
  const sortValue = params.get('sort');
  const search = params.get('search')?.trim();
  const role: UserRole | undefined = roleValue === 'USER' || roleValue === 'ADMIN' ? roleValue : undefined;
  const status: UserStatus | undefined =
    statusValue === 'ACTIVE' || statusValue === 'SUSPENDED' ? statusValue : undefined;
  const sort: UsersQuery['sort'] =
    sortValue === 'createdAt' || sortValue === 'email' || sortValue === '-email'
      ? sortValue
      : '-createdAt';
  return {
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    sort,
  };
}

function mutationError(error: Error | null): { detail: string; requestId: string | null } | null {
  if (!error) return null;
  if (error instanceof ApiError) return { detail: error.detail, requestId: error.requestId };
  return { detail: 'Máy chủ chưa hoàn tất được yêu cầu. Hãy thử lại.', requestId: null };
}
