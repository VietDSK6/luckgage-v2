import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck2,
  CircleAlert,
  ListChecks,
  MapPinned,
  RefreshCw,
  Route,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminDataApi } from '@/api/adminDataApi';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';

export function DashboardPage() {
  const summary = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: ({ signal }) => adminDataApi.getDashboard(signal),
  });
  useSessionAwareError(summary.error);

  if (summary.isPending) return <DashboardSkeleton />;
  if (summary.isError) {
    return (
      <DashboardError
        error={summary.error}
        isRetrying={summary.isFetching}
        onRetry={() => void summary.refetch()}
      />
    );
  }

  const data = summary.data;
  return (
    <div className="dashboard-page">
      <section className="dashboard-intro" aria-labelledby="dashboard-title">
        <div>
          <h2 id="dashboard-title">Tổng quan hệ thống</h2>
          <p className="dashboard-timestamp">
            Cập nhật <time dateTime={data.generatedAt}>{formatDateTime(data.generatedAt)}</time>
          </p>
        </div>
        <button
          aria-label="Làm mới dashboard"
          className="button button--quiet"
          disabled={summary.isFetching}
          onClick={() => void summary.refetch()}
          type="button">
          <RefreshCw className={summary.isFetching ? 'spin' : undefined} size={16} />
          Làm mới
        </button>
      </section>

      <section className="dashboard-grid" aria-label="Chỉ số hệ thống">
        <article className="dashboard-card">
          <header className="dashboard-card__header">
            <div>
              <h3>Người dùng</h3>
              <strong>{data.totalUsers.toLocaleString('vi-VN')}</strong>
            </div>
            <span className="dashboard-card__icon" aria-hidden="true">
              <UsersRound size={20} />
            </span>
          </header>
          <dl className="operations-list">
            <MetricDefinition icon={UserRoundCheck} label="Đang hoạt động" value={data.activeUsers} />
            <MetricDefinition
              icon={UserRoundX}
              label="Đang tạm khóa"
              tone={data.suspendedUsers > 0 ? 'danger' : undefined}
              value={data.suspendedUsers}
            />
          </dl>
          <Link className="dashboard-card__link" to="/users">
            Quản lý người dùng <ArrowRight size={16} />
          </Link>
        </article>

        <article className="dashboard-card">
          <header className="dashboard-card__header">
            <div>
              <h3>Chuyến đi</h3>
              <strong>{data.totalTrips.toLocaleString('vi-VN')}</strong>
            </div>
            <span className="dashboard-card__icon" aria-hidden="true">
              <MapPinned size={20} />
            </span>
          </header>
          <dl className="operations-list">
            <MetricDefinition icon={CalendarCheck2} label="Đang diễn ra" value={data.activeTrips} />
            <MetricDefinition icon={Route} label="Tham gia 7 ngày qua" value={data.joinsLast7Days} />
          </dl>
          <Link className="dashboard-card__link" to="/trips">
            Xem chuyến đi <ArrowRight size={16} />
          </Link>
        </article>

        <article className="dashboard-card">
          <header className="dashboard-card__header">
            <div>
              <h3>Nội dung đã xuất bản</h3>
              <strong>{(data.publishedPackingRules + data.publishedTripSuggestions).toLocaleString('vi-VN')}</strong>
            </div>
            <span className="dashboard-card__icon" aria-hidden="true">
              <ListChecks size={20} />
            </span>
          </header>
          <dl className="operations-list">
            <MetricDefinition icon={ListChecks} label="Quy tắc hành lý" value={data.publishedPackingRules} />
            <MetricDefinition icon={BookOpenCheck} label="Gợi ý chuyến đi" value={data.publishedTripSuggestions} />
          </dl>
          <div className="dashboard-card__links">
            <Link className="dashboard-card__link" to="/packing-rules">
              Quy tắc hành lý <ArrowRight size={16} />
            </Link>
            <Link className="dashboard-card__link" to="/trip-suggestions">
              Gợi ý chuyến đi <ArrowRight size={16} />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricDefinition({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof MapPinned;
  label: string;
  tone?: 'danger' | undefined;
  value: number;
}) {
  return (
    <div className={tone ? `metric-row metric-row--${tone}` : 'metric-row'}>
      <dt><Icon aria-hidden="true" size={16} /> {label}</dt>
      <dd>{value.toLocaleString('vi-VN')}</dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-label="Đang tải dashboard" className="dashboard-skeleton" role="status">
      <span className="skeleton skeleton--title" />
      <div className="dashboard-grid">
        <span className="skeleton skeleton--ledger" />
        <span className="skeleton skeleton--ledger" />
        <span className="skeleton skeleton--ledger" />
      </div>
    </div>
  );
}

function DashboardError({
  error,
  isRetrying,
  onRetry,
}: {
  error: Error;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  const apiError = error instanceof ApiError ? error : null;
  return (
    <section className="data-error" aria-labelledby="dashboard-error-title">
      <CircleAlert aria-hidden="true" size={28} />
      <h2 id="dashboard-error-title">Chưa tải được dữ liệu tổng quan</h2>
      <p>{apiError?.detail ?? 'Kiểm tra kết nối rồi thử lại.'}</p>
      {apiError?.requestId ? <small>Request ID: {apiError.requestId}</small> : null}
      <button className="button button--primary" disabled={isRetrying} onClick={onRetry} type="button">
        <RefreshCw size={16} /> {isRetrying ? 'Đang tải lại…' : 'Tải lại'}
      </button>
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
