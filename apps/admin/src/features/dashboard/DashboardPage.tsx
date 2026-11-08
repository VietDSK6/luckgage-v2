import { useQuery } from '@tanstack/react-query';
import {
  BookOpenCheck,
  CalendarCheck2,
  CircleAlert,
  CircleCheck,
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
          <p className="eyebrow">NHỊP VẬN HÀNH</p>
          <h2 id="dashboard-title">Một lượt nhìn.<br />Đủ để điều phối.</h2>
        </div>
        <div className="dashboard-freshness">
          <span><CircleCheck aria-hidden="true" size={17} /> Dữ liệu trực tiếp từ server</span>
          <time dateTime={data.generatedAt}>Cập nhật {formatDateTime(data.generatedAt)}</time>
          <button
            aria-label="Làm mới dashboard"
            className="button button--quiet"
            disabled={summary.isFetching}
            onClick={() => void summary.refetch()}
            type="button">
            <RefreshCw className={summary.isFetching ? 'spin' : undefined} size={17} />
            Làm mới
          </button>
        </div>
      </section>

      <section className="dashboard-ledger" aria-label="Chỉ số vận hành">
        <div className="ledger-lead">
          <span className="ledger-lead__index">01</span>
          <div>
            <p>TÀI KHOẢN</p>
            <strong>{data.totalUsers.toLocaleString('vi-VN')}</strong>
            <span>người dùng trong hệ thống</span>
          </div>
          <UsersRound aria-hidden="true" size={30} />
        </div>
        <div className="ledger-details">
          <MetricLine icon={UserRoundCheck} label="Đang hoạt động" value={data.activeUsers} />
          <MetricLine icon={UserRoundX} label="Đang tạm khóa" value={data.suspendedUsers} tone="danger" />
          <Link className="ledger-link" to="/users">Quản lý người dùng <Route size={17} /></Link>
        </div>
      </section>

      <section className="operations-grid" aria-label="Chuyến đi và nội dung">
        <div className="operations-section">
          <div className="operations-section__heading">
            <span>02</span>
            <div><p className="eyebrow">CHUYẾN ĐI</p><h3>Hoạt động hôm nay</h3></div>
          </div>
          <dl className="operations-list">
            <MetricDefinition icon={MapPinned} label="Tổng chuyến đi" value={data.totalTrips} />
            <MetricDefinition icon={CalendarCheck2} label="Đang diễn ra" value={data.activeTrips} />
            <MetricDefinition icon={Route} label="Lượt tham gia 7 ngày" value={data.joinsLast7Days} />
          </dl>
        </div>

        <div className="operations-section operations-section--ink">
          <div className="operations-section__heading">
            <span>03</span>
            <div><p className="eyebrow eyebrow--light">NỘI DUNG ĐÃ XUẤT BẢN</p><h3>Sẵn sàng cho mobile</h3></div>
          </div>
          <dl className="operations-list">
            <MetricDefinition icon={ListChecks} label="Bộ quy tắc hành lý" value={data.publishedPackingRules} />
            <MetricDefinition icon={BookOpenCheck} label="Gợi ý chuyến đi" value={data.publishedTripSuggestions} />
          </dl>
          <p className="operations-note">Nội dung draft không được tính vào số liệu này.</p>
        </div>
      </section>
    </div>
  );
}

function MetricLine({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof UserRoundCheck;
  label: string;
  tone?: 'danger';
  value: number;
}) {
  return (
    <div className={`metric-line${tone ? ` metric-line--${tone}` : ''}`}>
      <Icon aria-hidden="true" size={20} />
      <span>{label}</span>
      <strong>{value.toLocaleString('vi-VN')}</strong>
    </div>
  );
}

function MetricDefinition({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPinned;
  label: string;
  value: number;
}) {
  return (
    <div>
      <dt><Icon aria-hidden="true" size={18} /> {label}</dt>
      <dd>{value.toLocaleString('vi-VN')}</dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-label="Đang tải dashboard" className="dashboard-skeleton" role="status">
      <span className="skeleton skeleton--title" />
      <span className="skeleton skeleton--ledger" />
      <div><span className="skeleton" /><span className="skeleton" /></div>
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
      <CircleAlert aria-hidden="true" size={30} />
      <p className="eyebrow">DASHBOARD TẠM GIÁN ĐOẠN</p>
      <h2 id="dashboard-error-title">Chưa đọc được nhịp vận hành</h2>
      <p>{apiError?.detail ?? 'Máy chủ chưa trả được dữ liệu dashboard. Hãy thử lại.'}</p>
      {apiError?.requestId ? <small>Request ID: {apiError.requestId}</small> : null}
      <button className="button button--primary" disabled={isRetrying} onClick={onRetry} type="button">
        <RefreshCw size={18} /> {isRetrying ? 'Đang tải lại…' : 'Tải lại dashboard'}
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
