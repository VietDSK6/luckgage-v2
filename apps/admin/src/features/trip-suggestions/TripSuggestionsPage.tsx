import { useQuery } from '@tanstack/react-query';
import { Archive, CircleAlert, FilePenLine, MapPinned, Plus, RefreshCw, Rocket, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminTripSuggestionsApi } from '@/api/adminTripSuggestionsApi';
import type { ContentStatus } from '@/api/types';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';
import { ContentImage } from '@/features/content/ContentImage';

export function TripSuggestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim().toLocaleLowerCase('vi') ?? '';
  const status = readStatus(searchParams.get('status'));
  const suggestions = useQuery({ queryKey: ['admin', 'trip-suggestions'], queryFn: ({ signal }) => adminTripSuggestionsApi.list(signal) });
  useSessionAwareError(suggestions.error);
  const visible = (suggestions.data?.items ?? []).filter((item) =>
    (!search || [item.titleVi, item.titleEn, item.destinationLabel, item.slug].some((value) => value.toLocaleLowerCase('vi').includes(search))) &&
    (!status || item.status === status),
  );

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="suggestions-page">
      <section className="page-heading" aria-labelledby="suggestions-title">
        <div><h2 id="suggestions-title">Gợi ý chuyến đi</h2></div>
        <Link className="button button--primary" to="/trip-suggestions/new"><Plus size={18} /> Tạo gợi ý</Link>
      </section>

      <section className="suggestion-filters" aria-label="Bộ lọc gợi ý chuyến đi">
        <label><span>Tìm nội dung</span><div><Search size={18} /><input aria-label="Tìm nội dung" onChange={(event) => update('search', event.target.value)} placeholder="Tiêu đề, điểm đến hoặc mã đường dẫn" type="search" value={search} /></div></label>
        <label><span>Trạng thái</span><select onChange={(event) => update('status', event.target.value)} value={status ?? ''}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option><option value="ARCHIVED">Đã lưu trữ</option></select></label>
      </section>

      {suggestions.isPending ? <div className="suggestion-grid suggestion-grid--loading"><span /><span /><span /></div> : null}
      {suggestions.isError ? <SuggestionListError error={suggestions.error} onRetry={() => void suggestions.refetch()} /> : null}
      {suggestions.isSuccess && visible.length === 0 ? <section className="users-empty"><MapPinned size={30} /><h3>{suggestions.data.items.length ? 'Không có nội dung phù hợp' : 'Chưa có gợi ý chuyến đi'}</h3><p>{suggestions.data.items.length ? 'Đổi từ khóa hoặc trạng thái để xem nội dung khác.' : 'Tạo gợi ý đầu tiên để hiển thị trên ứng dụng di động.'}</p><Link className="button button--primary" to="/trip-suggestions/new"><Plus size={17} /> Tạo gợi ý</Link></section> : null}
      {visible.length ? (
        <section className="suggestion-grid" aria-label="Danh sách gợi ý chuyến đi">
          {visible.map((item) => (
            <article className="suggestion-card" key={item.id}>
              <Link aria-label={`Mở ${item.titleVi}`} className="suggestion-card__image" to={`/trip-suggestions/${item.id}`}><ContentImage alt={item.imageAltVi} className="suggestion-card__media" src={item.imageUrl} /></Link>
              <div className="suggestion-card__body">
                <span className={`rule-status rule-status--${item.status.toLowerCase()}`}>{item.status === 'PUBLISHED' ? <Rocket size={14} /> : item.status === 'ARCHIVED' ? <Archive size={14} /> : <FilePenLine size={14} />}{statusLabel(item.status)}</span>
                <p className="eyebrow">{item.destinationLabel}</p>
                <h3><Link to={`/trip-suggestions/${item.id}`}>{item.titleVi}</Link></h3>
                <p>{item.summaryVi}</p>
                <div className="suggestion-card__meta"><code>{item.slug}</code><span>{item.suggestedDurationDays} ngày · thứ tự {item.sortOrder}</span></div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function SuggestionListError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  return <section className="data-error data-error--compact"><CircleAlert size={30} /><h3>Chưa đọc được nội dung</h3><p>{apiError?.detail ?? 'Máy chủ chưa trả được danh sách gợi ý.'}</p>{apiError?.requestId ? <small>Mã yêu cầu: {apiError.requestId}</small> : null}<button className="button button--primary" onClick={onRetry} type="button"><RefreshCw size={17} /> Tải lại</button></section>;
}

function readStatus(value: string | null): ContentStatus | null { return value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED' ? value : null; }
function statusLabel(value: ContentStatus): string { return { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }[value]; }
