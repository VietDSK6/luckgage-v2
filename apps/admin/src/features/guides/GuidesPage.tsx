import { useQuery } from '@tanstack/react-query';
import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { adminGuidesApi } from '@/api/adminGuidesApi';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';
import { ContentImage } from '@/features/content/ContentImage';

export function GuidesPage() {
  const [params, setParams] = useSearchParams();
  const query = useQuery({ queryKey: ['admin', 'guides'], queryFn: ({ signal }) => adminGuidesApi.list(signal) });
  useSessionAwareError(query.error);
  const search = params.get('search')?.trim().toLocaleLowerCase('vi') ?? '';
  const status = params.get('status') ?? '';
  const items = (query.data?.items ?? []).filter((item) => (!search || `${item.titleVi} ${item.titleEn} ${item.slug}`.toLocaleLowerCase('vi').includes(search)) && (!status || item.status === status));
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  return <div className="guides-page">
    <section className="page-heading"><h2>Cẩm nang từ Luki</h2><Link className="button button--primary" to="/guides/new"><Plus size={18} /> Tạo bài viết</Link></section>
    <section className="guide-filters" aria-label="Lọc bài viết">
      <label>Tìm bài viết<input onChange={(event) => update('search', event.target.value)} placeholder="Tiêu đề hoặc slug" type="search" value={params.get('search') ?? ''} /></label>
      <label>Trạng thái<select onChange={(event) => update('status', event.target.value)} value={status}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option><option value="ARCHIVED">Đã lưu trữ</option></select></label>
    </section>
    {query.isPending ? <div className="rules-skeleton" role="status" aria-label="Đang tải bài viết"><span /><span /></div> : null}
    {query.isError ? <section className="data-error"><h3>Chưa tải được bài viết</h3><button className="button button--primary" onClick={() => void query.refetch()} type="button"><RefreshCw size={17} /> Thử lại</button></section> : null}
    {query.isSuccess && items.length === 0 ? <section className="users-empty"><BookOpen size={30} /><h3>{query.data.items.length ? 'Không có bài phù hợp' : 'Chưa có bài viết'}</h3><p>{query.data.items.length ? 'Đổi bộ lọc để xem bài khác.' : 'Tạo bài đầu tiên để hiển thị trên ứng dụng.'}</p></section> : null}
    <div className="guide-list">{items.map((item) => <article className="guide-list__item" key={item.id}><ContentImage alt={item.coverAltVi} className="guide-list__image" src={item.coverUrl} /><div><span className={`rule-status rule-status--${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span><h3><Link to={`/guides/${item.id}`}>{item.titleVi}</Link></h3><p>{item.summaryVi}</p><small>{item.sectionsVi.length} mục · {item.slug}</small></div><Link className="button button--quiet" to={`/guides/${item.id}`}>Mở bài</Link></article>)}</div>
  </div>;
}
function statusLabel(status: string) { return status === 'PUBLISHED' ? 'Đã xuất bản' : status === 'ARCHIVED' ? 'Đã lưu trữ' : 'Bản nháp'; }
