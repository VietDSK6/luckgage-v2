import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { adminGuidesApi } from '@/api/adminGuidesApi';
import { adminTripSuggestionsApi } from '@/api/adminTripSuggestionsApi';
import type { Guide, GuideInput, GuideSection } from '@/api/types';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';
import { useUnsavedLinkGuard } from '@/app/useUnsavedLinkGuard';

const blank: GuideInput = { slug: '', titleVi: '', titleEn: '', summaryVi: '', summaryEn: '', coverUrl: '', coverAltVi: '', coverAltEn: '', tags: [], sectionsVi: [], sectionsEn: [], tripSuggestionId: null, sortOrder: 0 };
type Locale = 'vi' | 'en';
type Action = 'publish' | 'archive' | 'delete' | 'discard' | null;

export function GuideEditorPage() {
  const { guideId } = useParams();
  const detail = useQuery({ queryKey: ['admin', 'guide', guideId], queryFn: ({ signal }) => adminGuidesApi.get(guideId ?? '', signal), enabled: Boolean(guideId) });
  useSessionAwareError(detail.error);
  if (!guideId) return <Workbench key="new" initial={null} />;
  if (detail.isPending) return <div className="rules-skeleton" role="status" aria-label="Đang tải bài viết"><span /><span /></div>;
  if (detail.isError) return <section className="data-error"><h2>Chưa mở được bài viết</h2><button className="button button--primary" onClick={() => void detail.refetch()} type="button">Thử lại</button></section>;
  return <Workbench key={detail.data.id} initial={detail.data} />;
}

function Workbench({ initial }: { initial: Guide | null }) {
  const { csrfToken } = useAdminAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [guide, setGuide] = useState(initial);
  const [savedForm, setSavedForm] = useState<GuideInput>(initial ?? blank);
  const [form, setForm] = useState<GuideInput>(savedForm);
  const [locale, setLocale] = useState<Locale>('vi');
  const [action, setAction] = useState<Action>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const archived = guide?.status === 'ARCHIVED';
  const suggestions = useQuery({ queryKey: ['admin', 'trip-suggestions'], queryFn: ({ signal }) => adminTripSuggestionsApi.list(signal) });
  useSessionAwareError(suggestions.error);
  useUnsavedLinkGuard(dirty, (path) => { setPendingPath(path); setAction('discard'); });

  const save = useMutation({ mutationFn: () => {
    if (!csrfToken) throw new Error('Phiên quản trị chưa sẵn sàng.');
    return guide ? adminGuidesApi.update(guide.id, form, csrfToken) : adminGuidesApi.create(form, csrfToken);
  }, onSuccess: async (result) => {
    setGuide(result); setSavedForm(toInput(result)); setForm(toInput(result)); setError('');
    setNotice(result.status === 'PUBLISHED' ? 'Nội dung đã cập nhật trên ứng dụng.' : 'Đã lưu bản nháp.');
    cache.setQueryData(['admin', 'guide', result.id], result);
    await cache.invalidateQueries({ queryKey: ['admin', 'guides'] });
    if (!guide) void navigate(`/guides/${result.id}`, { replace: true });
  } });
  const publish = useMutation({ mutationFn: () => adminGuidesApi.publish(guide!.id, csrfToken!), onSuccess: async (result) => { setGuide(result); setAction(null); setNotice('Bài viết đã xuất bản.'); cache.setQueryData(['admin', 'guide', result.id], result); await cache.invalidateQueries({ queryKey: ['admin', 'guides'] }); } });
  const archive = useMutation({ mutationFn: () => adminGuidesApi.archive(guide!.id, csrfToken!), onSuccess: async (result) => { setGuide(result); setAction(null); setNotice('Bài viết đã lưu trữ.'); cache.setQueryData(['admin', 'guide', result.id], result); await cache.invalidateQueries({ queryKey: ['admin', 'guides'] }); } });
  const remove = useMutation({ mutationFn: () => adminGuidesApi.delete(guide!.id, csrfToken!), onSuccess: async () => { setAction(null); await cache.invalidateQueries({ queryKey: ['admin', 'guides'] }); void navigate('/guides', { replace: true }); } });
  useSessionAwareError(save.error ?? publish.error ?? archive.error ?? remove.error);
  const set = <K extends keyof GuideInput>(key: K, value: GuideInput[K]) => { setForm((current) => ({ ...current, [key]: value })); setError(''); setNotice(''); };
  const sectionsKey = locale === 'vi' ? 'sectionsVi' : 'sectionsEn';
  const sections = form[sectionsKey];
  const replaceSection = (index: number, section: GuideSection) => set(sectionsKey, sections.map((value, position) => position === index ? section : value));
  const addSection = (type: GuideSection['type']) => set(sectionsKey, [...sections, type === 'image' ? { type, url: '', alt: '' } : type === 'bulletList' ? { type, items: [''] } : { type, text: '' }]);
  const submit = () => { const problem = validate(form); if (problem) { setError(problem); return; } save.mutate(); };
  const confirm = () => { if (action === 'discard' && pendingPath) { setAction(null); void navigate(pendingPath); } else if (action === 'publish') publish.mutate(); else if (action === 'archive') archive.mutate(); else if (action === 'delete') remove.mutate(); };
  return <div className="guide-editor">
    <div className="rule-editor-toolbar"><Link className="back-link" to="/guides"><ArrowLeft size={17} /> Cẩm nang</Link><div className="rule-editor-toolbar__actions">
      {guide?.status === 'DRAFT' && !dirty ? <button className="button button--secondary" onClick={() => setAction('publish')} type="button">Xuất bản</button> : null}
      {guide && !archived && !dirty ? <button className="button button--quiet" onClick={() => setAction('archive')} type="button">Lưu trữ</button> : null}
      {guide && guide.status !== 'PUBLISHED' && !dirty ? <button className="button button--quiet" onClick={() => setAction('delete')} type="button">Xóa bài</button> : null}
      {!archived ? <button className="button button--primary" disabled={!dirty || save.isPending || !csrfToken} onClick={submit} type="button"><Save size={17} /> {save.isPending ? 'Đang lưu…' : 'Lưu nội dung'}</button> : null}
    </div></div>
    <header className="guide-editor__heading"><div><h2>{form.titleVi || 'Bài viết mới'}</h2><p>{guide?.status === 'PUBLISHED' ? 'Bản đang xuất bản. Lưu sẽ cập nhật nội dung trên ứng dụng.' : archived ? 'Bài đã lưu trữ, chỉ có thể xem.' : 'Biên tập hai ngôn ngữ trước khi xuất bản.'}</p></div><span className={`rule-status rule-status--${(guide?.status ?? 'DRAFT').toLowerCase()}`}>{guide?.status === 'PUBLISHED' ? 'Đã xuất bản' : archived ? 'Đã lưu trữ' : 'Bản nháp'}</span></header>
    {notice ? <p className="action-notice" role="status">{notice}</p> : null}
    {error || save.error ? <p className="form-summary-error" role="alert">{error || save.error?.message}</p> : null}
    <div className="guide-editor__columns"><div className="guide-editor__form">
      <fieldset disabled={archived} className="editorial-section"><legend>Thông tin bài viết</legend><div className="guide-fields">
        <Field label="Slug"><input value={form.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
        <Field label="Thứ tự"><input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} /></Field>
        <Field label="Tiêu đề · VI"><input value={form.titleVi} onChange={(e) => set('titleVi', e.target.value)} /></Field>
        <Field label="Tiêu đề · EN"><input value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} /></Field>
        <Field label="Tóm tắt · VI"><textarea value={form.summaryVi} onChange={(e) => set('summaryVi', e.target.value)} /></Field>
        <Field label="Tóm tắt · EN"><textarea value={form.summaryEn} onChange={(e) => set('summaryEn', e.target.value)} /></Field>
        <Field label="Ảnh bìa URL"><input type="url" value={form.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} /></Field>
        <Field label="Mô tả ảnh · VI"><input value={form.coverAltVi} onChange={(e) => set('coverAltVi', e.target.value)} /></Field>
        <Field label="Mô tả ảnh · EN"><input value={form.coverAltEn} onChange={(e) => set('coverAltEn', e.target.value)} /></Field>
        <Field label="Tags, cách nhau bằng dấu phẩy"><input value={form.tags.join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} /></Field>
        <Field label="Gợi ý chuyến đi liên quan"><select value={form.tripSuggestionId ?? ''} onChange={(e) => set('tripSuggestionId', e.target.value || null)}><option value="">Không liên kết</option>{suggestions.data?.items.filter((item) => item.status === 'PUBLISHED' || item.id === form.tripSuggestionId).map((item) => <option disabled={item.status !== 'PUBLISHED'} key={item.id} value={item.id}>{item.titleVi}{item.status !== 'PUBLISHED' ? ' · không còn xuất bản' : ''}</option>)}</select></Field>
      </div></fieldset>
      <fieldset disabled={archived} className="editorial-section"><legend>Nội dung theo mục</legend><div className="guide-locale"><button className={locale === 'vi' ? 'active' : ''} onClick={() => setLocale('vi')} type="button">Tiếng Việt</button><button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')} type="button">English</button></div>
        {sections.map((section, index) => <div className="guide-section-edit" key={`${locale}-${index}`}><div className="guide-section-edit__head"><strong>{index + 1}. {sectionLabel(section.type)}</strong><div><button aria-label="Di chuyển lên" disabled={index === 0} onClick={() => { const next = [...sections]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; set(sectionsKey, next); }} type="button"><ArrowUp size={16} /></button><button aria-label="Di chuyển xuống" disabled={index === sections.length - 1} onClick={() => { const next = [...sections]; [next[index], next[index + 1]] = [next[index + 1]!, next[index]!]; set(sectionsKey, next); }} type="button"><ArrowDown size={16} /></button><button aria-label="Xóa mục" onClick={() => set(sectionsKey, sections.filter((_, at) => at !== index))} type="button"><Trash2 size={16} /></button></div></div>
          {section.type === 'image' ? <div className="guide-fields"><Field label="URL ảnh"><input value={section.url} onChange={(e) => replaceSection(index, { ...section, url: e.target.value })} /></Field><Field label="Mô tả ảnh"><input value={section.alt} onChange={(e) => replaceSection(index, { ...section, alt: e.target.value })} /></Field></div> : section.type === 'bulletList' ? <Field label="Mỗi dòng là một ý"><textarea value={section.items.join('\n')} onChange={(e) => replaceSection(index, { ...section, items: e.target.value.split('\n') })} /></Field> : <Field label="Nội dung"><textarea value={section.text} onChange={(e) => replaceSection(index, { ...section, text: e.target.value })} /></Field>}
        </div>)}
        <div className="guide-add">{(['heading', 'paragraph', 'image', 'bulletList', 'callout'] as const).map((type) => <button className="button button--quiet" disabled={sections.length >= 30} key={type} onClick={() => addSection(type)} type="button"><Plus size={16} /> {sectionLabel(type)}</button>)}</div>
      </fieldset>
    </div><aside className="guide-preview"><div className="guide-preview__bar"><h3>Xem trước bài viết</h3><span>{locale === 'vi' ? 'VI' : 'EN'}</span></div>{form.coverUrl ? <img src={form.coverUrl} alt={locale === 'vi' ? form.coverAltVi : form.coverAltEn} /> : null}<div className="guide-preview__body"><h4>{(locale === 'vi' ? form.titleVi : form.titleEn) || 'Tiêu đề bài viết'}</h4><p>{locale === 'vi' ? form.summaryVi : form.summaryEn}</p>{sections.map((section, index) => <PreviewSection key={index} section={section} />)}</div></aside></div>
    <GuideDialog action={action} busy={publish.isPending || archive.isPending || remove.isPending} error={(publish.error ?? archive.error ?? remove.error)?.message ?? null} onClose={() => setAction(null)} onConfirm={confirm} />
  </div>;
}

function GuideDialog({ action, busy, error, onClose, onConfirm }: { action: Action; busy: boolean; error: string | null; onClose: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (action && !dialog.open) dialog.showModal(); if (!action && dialog.open) dialog.close(); }, [action]);
  if (!action) return <dialog ref={ref} />;
  return <dialog aria-labelledby="guide-dialog-title" className="guide-dialog" onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={onClose} ref={ref}>
    <h2 id="guide-dialog-title">{action === 'discard' ? 'Bỏ thay đổi?' : action === 'publish' ? 'Xuất bản bài viết?' : action === 'archive' ? 'Lưu trữ bài viết?' : 'Xóa bài viết?'}</h2>
    <p>{action === 'publish' ? 'Bài viết sẽ hiển thị trên ứng dụng.' : action === 'archive' ? 'Bài viết sẽ ẩn khỏi ứng dụng, kể cả danh sách đã lưu.' : action === 'delete' ? 'Bài viết và các lượt lưu sẽ bị xóa vĩnh viễn.' : 'Những chỉnh sửa chưa lưu sẽ bị hủy.'}</p>
    {error ? <p role="alert">{error}</p> : null}
    <div><button className="button button--quiet" disabled={busy} onClick={() => ref.current?.close()} type="button">Hủy</button><button className="button button--primary" disabled={busy} onClick={onConfirm} type="button">Xác nhận</button></div>
  </dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="guide-field"><span>{label}</span>{children}</label>; }
function sectionLabel(type: GuideSection['type']) { return { heading: 'Tiêu đề mục', paragraph: 'Đoạn văn', image: 'Ảnh', bulletList: 'Danh sách', callout: 'Ghi chú' }[type]; }
function PreviewSection({ section }: { section: GuideSection }) { if (section.type === 'heading') return <h5>{section.text}</h5>; if (section.type === 'paragraph') return <p>{section.text}</p>; if (section.type === 'callout') return <blockquote>{section.text}</blockquote>; if (section.type === 'image') return <img src={section.url} alt={section.alt} />; if (section.type === 'bulletList') return <ul>{section.items.map((item, index) => <li key={index}>{item}</li>)}</ul>; return null; }
function toInput(guide: Guide): GuideInput { return { slug: guide.slug, titleVi: guide.titleVi, titleEn: guide.titleEn, summaryVi: guide.summaryVi, summaryEn: guide.summaryEn, coverUrl: guide.coverUrl, coverAltVi: guide.coverAltVi, coverAltEn: guide.coverAltEn, tags: guide.tags, sectionsVi: guide.sectionsVi, sectionsEn: guide.sectionsEn, tripSuggestionId: guide.tripSuggestionId, sortOrder: guide.sortOrder }; }
function validate(form: GuideInput): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) || form.slug.length > 100) return 'Kiểm tra slug: dùng chữ thường, số và dấu gạch ngang.';
  if ([form.titleVi, form.titleEn, form.summaryVi, form.summaryEn, form.coverAltVi, form.coverAltEn].some((value) => !value.trim())) return 'Điền đủ tiêu đề, tóm tắt và mô tả ảnh ở cả hai ngôn ngữ.';
  try { const url = new URL(form.coverUrl); if (!['http:', 'https:'].includes(url.protocol)) return 'Ảnh bìa cần URL http(s).'; } catch { return 'Ảnh bìa cần URL hợp lệ.'; }
  if (!form.sectionsVi.length || !form.sectionsEn.length) return 'Thêm nội dung cho cả tiếng Việt và tiếng Anh.';
  for (const section of [...form.sectionsVi, ...form.sectionsEn]) { if (section.type === 'image' ? !section.url.trim() || !section.alt.trim() : section.type === 'bulletList' ? !section.items.length || section.items.some((item) => !item.trim()) : !section.text.trim()) return 'Kiểm tra các mục nội dung còn trống.'; }
  return null;
}
