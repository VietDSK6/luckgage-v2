import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CircleAlert, MapPinned, RefreshCw, Search, UsersRound } from 'lucide-react';
import { type FormEvent } from 'react';
import { useSearchParams } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminTripsApi } from '@/api/adminTripsApi';
import type { AdminTripsQuery } from '@/api/types';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';

const PAGE_SIZE = 20;

export function TripsSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const trips = useQuery({
    queryKey: ['admin', 'trips', filters],
    queryFn: ({ signal }) => adminTripsApi.list(filters, signal),
    placeholderData: keepPreviousData,
  });
  useSessionAwareError(trips.error);

  const update = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    update({ search: typeof value === 'string' ? value.trim() || null : null });
  };

  return (
    <div className="trips-support-page">
      <section className="page-heading">
        <div>
          <h2>Chuyến đi</h2>
        </div>
        <div className="page-heading__count">
          <MapPinned aria-hidden="true" size={18} />
          <strong>{trips.data?.totalItems.toLocaleString('vi-VN') ?? '—'}</strong>
          <span>chuyến đi</span>
        </div>
      </section>

      <section className="trip-support-filters">
        <form className="user-search" key={filters.search ?? ''} onSubmit={search}>
          <label htmlFor="trip-support-search">Tìm theo tên, điểm đến hoặc chủ chuyến đi</label>
          <div>
            <Search size={18} />
            <input
              defaultValue={filters.search}
              id="trip-support-search"
              name="search"
              placeholder="Ví dụ: Đà Lạt hoặc Mai"
              type="search"
            />
            <button className="button button--primary" type="submit">Tìm chuyến đi</button>
          </div>
        </form>
        <label>
          <span>Thời gian</span>
          <select onChange={(event) => update({ status: event.target.value || null })} value={filters.status ?? ''}>
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang diễn ra</option>
            <option value="UPCOMING">Sắp tới</option>
            <option value="PAST">Đã qua</option>
          </select>
        </label>
      </section>

      {trips.isPending ? <div className="rules-skeleton"><span /><span /><span /></div> : null}
      {trips.isError ? <TripSupportError error={trips.error} onRetry={() => void trips.refetch()} /> : null}
      {trips.isSuccess && trips.data.items.length === 0 ? (
        <section className="users-empty">
          <Search size={26} />
          <h3>Không có chuyến đi phù hợp</h3>
          <p>Thử đổi từ khóa hoặc mốc thời gian.</p>
          <button className="button button--secondary" onClick={() => setSearchParams({}, { replace: true })} type="button">
            Xóa bộ lọc
          </button>
        </section>
      ) : null}
      {trips.isSuccess && trips.data.items.length ? (
        <div className={`trip-support-table-wrap${trips.isFetching ? ' trip-support-table-wrap--updating' : ''}`}>
          <table className="trip-support-table">
            <caption>Danh sách chuyến đi</caption>
            <thead>
              <tr>
                <th>Chuyến đi</th>
                <th>Chủ sở hữu</th>
                <th>Thời gian</th>
                <th>Thành viên</th>
                <th>Tiến độ đồ đạc</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {trips.data.items.map((trip) => (
                <tr key={trip.id}>
                  <td data-label="Chuyến đi">
                    <strong>{trip.name}</strong>
                    <small>{trip.destinationLabel}</small>
                    <code>{trip.id}</code>
                  </td>
                  <td data-label="Chủ sở hữu">{trip.ownerDisplayName}</td>
                  <td data-label="Thời gian">
                    <span className={`timeline-status timeline-status--${trip.timelineStatus.toLowerCase()}`}>
                      {timelineLabel(trip.timelineStatus)}
                    </span>
                    <small>{trip.startDate} → {trip.endDate}</small>
                  </td>
                  <td data-label="Thành viên">
                    <span className="member-count"><UsersRound size={15} /> {trip.memberCount}</span>
                  </td>
                  <td data-label="Tiến độ đồ đạc">
                    <div className="checklist-meter">
                      <span><i style={{ width: `${trip.checklistProgress.percentage}%` }} /></span>
                      <strong>{trip.checklistProgress.packedItems}/{trip.checklistProgress.totalItems}</strong>
                      <small>{trip.checklistProgress.percentage}%</small>
                    </div>
                  </td>
                  <td data-label="Cập nhật"><time dateTime={trip.updatedAt}>{formatDate(trip.updatedAt)}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {trips.isSuccess && trips.data.totalPages > 1 ? (
        <nav className="pagination" aria-label="Phân trang chuyến đi">
          <button
            className="button button--quiet"
            disabled={filters.page <= 1 || trips.isFetching}
            onClick={() => update({ page: String(filters.page - 1) })}
            type="button">
            <ArrowLeft size={16} /> Trang trước
          </button>
          <span>Trang <strong>{trips.data.page}</strong> / {trips.data.totalPages}</span>
          <button
            className="button button--quiet"
            disabled={filters.page >= trips.data.totalPages || trips.isFetching}
            onClick={() => update({ page: String(filters.page + 1) })}
            type="button">
            Trang sau <ArrowRight size={16} />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function TripSupportError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  return (
    <section className="data-error data-error--compact">
      <CircleAlert size={26} />
      <h3>Chưa tải được danh sách chuyến đi</h3>
      <p>{apiError?.detail ?? 'Kiểm tra kết nối rồi thử lại.'}</p>
      {apiError?.requestId ? <small>Mã yêu cầu: {apiError.requestId}</small> : null}
      <button className="button button--primary" onClick={onRetry} type="button">
        <RefreshCw size={16} /> Tải lại
      </button>
    </section>
  );
}

function timelineLabel(value: 'UPCOMING' | 'ACTIVE' | 'PAST') {
  return { UPCOMING: 'Sắp tới', ACTIVE: 'Đang diễn ra', PAST: 'Đã qua' }[value];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function readFilters(params: URLSearchParams): AdminTripsQuery {
  const page = Number(params.get('page'));
  const status = params.get('status');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZE,
    ...(params.get('search')?.trim() ? { search: params.get('search')!.trim() } : {}),
    ...(status === 'UPCOMING' || status === 'ACTIVE' || status === 'PAST' ? { status } : {}),
  };
}
