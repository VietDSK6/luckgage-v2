import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, CircleAlert, CircleCheck, Image, MapPin, RefreshCw, Rocket, Save, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminTripSuggestionsApi } from '@/api/adminTripSuggestionsApi';
import type { AdminLocation, TripSuggestion } from '@/api/types';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';
import { useUnsavedLinkGuard } from '@/app/useUnsavedLinkGuard';
import { tripTypeOptions } from '@/features/packing-rules/packingRulePresentation';

import { emptyTripSuggestionForm, isTripSuggestionFormDirty, tripSuggestionFormToInput, tripSuggestionToForm, type TripSuggestionFormErrors, type TripSuggestionFormState, validateTripSuggestionForm } from './tripSuggestionForm';

type DialogAction = 'archive' | 'discard' | 'publish' | null;

export function TripSuggestionEditorPage() {
  const { suggestionId } = useParams();
  const detail = useQuery({ queryKey: ['admin', 'trip-suggestion', suggestionId], queryFn: ({ signal }) => adminTripSuggestionsApi.get(suggestionId ?? '', signal), enabled: Boolean(suggestionId) });
  useSessionAwareError(detail.error);
  if (!suggestionId) return <SuggestionWorkbench initialSuggestion={null} key="new" />;
  if (detail.isPending) return <div aria-label="Đang tải editorial workbench" className="rule-editor-skeleton" role="status"><span className="skeleton skeleton--title" /><span className="skeleton skeleton--ledger" /></div>;
  if (detail.isError) return <EditorError error={detail.error} onRetry={() => void detail.refetch()} />;
  return <SuggestionWorkbench initialSuggestion={detail.data} key={detail.data.id} />;
}

function SuggestionWorkbench({ initialSuggestion }: { initialSuggestion: TripSuggestion | null }) {
  const { csrfToken } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [suggestion, setSuggestion] = useState(initialSuggestion);
  const [initialForm, setInitialForm] = useState(() => initialSuggestion ? tripSuggestionToForm(initialSuggestion) : emptyTripSuggestionForm());
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<TripSuggestionFormErrors>({});
  const [previewLocale, setPreviewLocale] = useState<'vi' | 'en'>('vi');
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const dirty = isTripSuggestionFormDirty(form, initialForm);
  const archived = suggestion?.status === 'ARCHIVED';
  useUnsavedLinkGuard(dirty, (path) => { setPendingPath(path); setDialogAction('discard'); });

  const save = useMutation({
    mutationFn: () => {
      if (!csrfToken) throw new Error('Missing CSRF token.');
      const input = tripSuggestionFormToInput(form);
      return suggestion ? adminTripSuggestionsApi.update(suggestion.id, input, csrfToken) : adminTripSuggestionsApi.create(input, csrfToken);
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['admin', 'trip-suggestion', saved.id], saved);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'trip-suggestions'] });
      if (!suggestion) { void navigate(`/trip-suggestions/${saved.id}`, { replace: true }); return; }
      const next = tripSuggestionToForm(saved);
      setSuggestion(saved); setForm(next); setInitialForm(next);
      setNotice(saved.status === 'PUBLISHED' ? 'Nội dung đã lưu và cập nhật trực tiếp trên ứng dụng.' : 'Đã lưu bản nháp.');
    },
  });
  const publish = useMutation({ mutationFn: () => {
    if (!suggestion || !csrfToken) throw new Error('Missing suggestion or CSRF token.');
    return adminTripSuggestionsApi.publish(suggestion.id, csrfToken);
  }, onSuccess: async (saved) => { setSuggestion(saved); setDialogAction(null); setNotice('Gợi ý đã xuất bản và hiển thị ngay trên ứng dụng.'); queryClient.setQueryData(['admin', 'trip-suggestion', saved.id], saved); await Promise.all([queryClient.invalidateQueries({ queryKey: ['admin', 'trip-suggestions'] }), queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })]); } });
  const archive = useMutation({ mutationFn: () => {
    if (!suggestion || !csrfToken) throw new Error('Missing suggestion or CSRF token.');
    return adminTripSuggestionsApi.archive(suggestion.id, csrfToken);
  }, onSuccess: async (saved) => { setSuggestion(saved); setDialogAction(null); setNotice('Gợi ý đã được lưu trữ và ẩn khỏi ứng dụng.'); queryClient.setQueryData(['admin', 'trip-suggestion', saved.id], saved); await Promise.all([queryClient.invalidateQueries({ queryKey: ['admin', 'trip-suggestions'] }), queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })]); } });
  const locationSearch = useMutation({ mutationFn: (search: string) => adminTripSuggestionsApi.searchLocations(search) });
  useSessionAwareError(save.error ?? publish.error ?? archive.error ?? locationSearch.error);

  const update = <Key extends keyof TripSuggestionFormState>(key: Key, value: TripSuggestionFormState[Key]) => { setForm((current) => ({ ...current, [key]: value })); setErrors({}); setNotice(null); save.reset(); };
  const submitSave = () => { const nextErrors = validateTripSuggestionForm(form); setErrors(nextErrors); if (Object.keys(nextErrors).length) { window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return; } save.mutate(); };
  const selectLocation = (location: AdminLocation) => { setForm((current) => ({ ...current, destinationLabel: location.label, providerPlaceId: location.id, latitude: String(location.latitude), longitude: String(location.longitude), destinationTimezone: location.timezone, countryCode: location.countryCode ?? '', adminArea: location.adminArea ?? '', country: location.country ?? '' })); locationSearch.reset(); setErrors({}); };
  const closeDialog = () => { if (publish.isPending || archive.isPending) return; setDialogAction(null); setPendingPath(null); publish.reset(); archive.reset(); };
  const confirmDialog = () => { if (dialogAction === 'publish') publish.mutate(); if (dialogAction === 'archive') archive.mutate(); if (dialogAction === 'discard' && pendingPath) { setDialogAction(null); void navigate(pendingPath); } };

  return (
    <div className="suggestion-editor-page">
      <div className="rule-editor-toolbar"><Link className="back-link" to="/trip-suggestions"><ArrowLeft size={17} /> Gợi ý chuyến đi</Link><div className="rule-editor-toolbar__actions">{suggestion && suggestion.status !== 'ARCHIVED' ? <button className="button button--quiet" disabled={dirty} onClick={() => setDialogAction('archive')} type="button"><Archive size={17} /> Lưu trữ</button> : null}{suggestion?.status === 'DRAFT' ? <button className="button button--secondary" disabled={dirty} onClick={() => setDialogAction('publish')} type="button"><Rocket size={17} /> Xuất bản</button> : null}{!archived ? <button className="button button--primary" disabled={!dirty || save.isPending || !csrfToken} onClick={submitSave} type="button"><Save size={17} /> {save.isPending ? 'Đang lưu…' : 'Lưu nội dung'}</button> : null}</div></div>
      <header className="suggestion-editor-hero"><div><h2>{form.titleVi.trim() || 'Gợi ý chuyến đi mới'}</h2>{suggestion ? <p>{`Mã đường dẫn: ${suggestion.slug}`}</p> : null}</div><div><span className={`rule-status rule-status--${(suggestion?.status ?? 'DRAFT').toLowerCase()}`}>{suggestion?.status === 'PUBLISHED' ? <Rocket size={15} /> : suggestion?.status === 'ARCHIVED' ? <Archive size={15} /> : <Image size={15} />}{suggestion?.status === 'PUBLISHED' ? 'Đã xuất bản' : suggestion?.status === 'ARCHIVED' ? 'Đã lưu trữ' : 'Bản nháp'}</span><span className={dirty ? 'dirty-state dirty-state--active' : 'dirty-state'}>{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span></div></header>
      {suggestion?.status === 'PUBLISHED' ? <div className="rule-version-note"><Rocket size={18} /><div><strong>Nội dung đang hiển thị trên ứng dụng.</strong><span>Thao tác lưu sẽ cập nhật trực tiếp bản đang xuất bản.</span></div></div> : null}
      {notice ? <div className="action-notice" role="status"><CircleCheck size={19} /><span>{notice}</span><button onClick={() => setNotice(null)} type="button">Đóng</button></div> : null}
      {save.error ? <MutationError error={save.error} /> : null}
      {Object.keys(errors).length ? <div className="form-summary-error" role="alert"><CircleAlert size={18} /><div><strong>Cần kiểm tra lại nội dung.</strong><span>{Object.keys(errors).length} trường chưa hợp lệ.</span></div></div> : null}

      <div className="suggestion-workbench">
        <div className="suggestion-form">
          <fieldset className="editorial-section" disabled={archived}><legend>Tiêu đề và lời dẫn</legend><div className="editorial-fields editorial-fields--three"><Field error={errors.slug} label="Mã đường dẫn (slug)"><input aria-invalid={Boolean(errors.slug)} onChange={(e) => update('slug', e.target.value)} value={form.slug} /></Field><Field error={errors.titleVi} label="Tiêu đề · VI"><input aria-invalid={Boolean(errors.titleVi)} onChange={(e) => update('titleVi', e.target.value)} value={form.titleVi} /></Field><Field error={errors.titleEn} label="Tiêu đề · EN"><input aria-invalid={Boolean(errors.titleEn)} onChange={(e) => update('titleEn', e.target.value)} value={form.titleEn} /></Field></div><div className="editorial-fields editorial-fields--two"><Field error={errors.summaryVi} label="Tóm tắt · VI"><textarea aria-invalid={Boolean(errors.summaryVi)} maxLength={500} onChange={(e) => update('summaryVi', e.target.value)} rows={5} value={form.summaryVi} /></Field><Field error={errors.summaryEn} label="Tóm tắt · EN"><textarea aria-invalid={Boolean(errors.summaryEn)} maxLength={500} onChange={(e) => update('summaryEn', e.target.value)} rows={5} value={form.summaryEn} /></Field></div></fieldset>
          <fieldset className="editorial-section" disabled={archived}><legend>Điểm đến và thông tin khởi tạo</legend><div className="destination-lookup"><Field error={errors.destinationLabel} label="Điểm đến"><input aria-invalid={Boolean(errors.destinationLabel)} onChange={(e) => update('destinationLabel', e.target.value)} value={form.destinationLabel} /></Field><button className="button button--secondary" disabled={form.destinationLabel.trim().length < 2 || locationSearch.isPending} onClick={() => locationSearch.mutate(form.destinationLabel.trim())} type="button">{locationSearch.isPending ? <RefreshCw className="spin" size={17} /> : <Search size={17} />} Tìm tọa độ & múi giờ</button></div>{locationSearch.data?.items.length ? <div className="location-results">{locationSearch.data.items.map((location) => <button key={location.id} onClick={() => selectLocation(location)} type="button"><MapPin size={17} /><span><strong>{location.label}</strong><small>{[location.adminArea, location.country].filter(Boolean).join(' · ')}</small></span></button>)}</div> : null}{locationSearch.isSuccess && locationSearch.data.items.length === 0 ? <p className="editorial-hint">Không tìm thấy địa điểm. Bạn vẫn có thể nhập tọa độ và múi giờ thủ công.</p> : null}<div className="editorial-fields editorial-fields--three"><Field error={errors.latitude ?? errors.coordinates} label="Vĩ độ"><input aria-invalid={Boolean(errors.latitude ?? errors.coordinates)} inputMode="decimal" onChange={(e) => update('latitude', e.target.value)} type="number" value={form.latitude} /></Field><Field error={errors.longitude ?? errors.coordinates} label="Kinh độ"><input aria-invalid={Boolean(errors.longitude ?? errors.coordinates)} inputMode="decimal" onChange={(e) => update('longitude', e.target.value)} type="number" value={form.longitude} /></Field><Field label="Múi giờ"><input onChange={(e) => update('destinationTimezone', e.target.value)} placeholder="Asia/Ho_Chi_Minh" value={form.destinationTimezone} /></Field><Field error={errors.countryCode} label="Mã quốc gia"><input aria-invalid={Boolean(errors.countryCode)} maxLength={2} onChange={(e) => update('countryCode', e.target.value)} value={form.countryCode} /></Field><Field label="Tỉnh / vùng"><input onChange={(e) => update('adminArea', e.target.value)} value={form.adminArea} /></Field><Field label="Quốc gia"><input onChange={(e) => update('country', e.target.value)} value={form.country} /></Field></div><div className="editorial-fields editorial-fields--three"><Field label="Loại chuyến đi"><select onChange={(e) => update('tripType', e.target.value as TripSuggestionFormState['tripType'])} value={form.tripType}><option value="">Khác / chưa chốt</option>{tripTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field error={errors.suggestedDurationDays} label="Thời lượng gợi ý"><input aria-invalid={Boolean(errors.suggestedDurationDays)} min="1" max="30" onChange={(e) => update('suggestedDurationDays', e.target.value)} type="number" value={form.suggestedDurationDays} /></Field><Field error={errors.sortOrder} label="Thứ tự hiển thị"><input aria-invalid={Boolean(errors.sortOrder)} onChange={(e) => update('sortOrder', e.target.value)} type="number" value={form.sortOrder} /></Field></div></fieldset>
          <fieldset className="editorial-section" disabled={archived}><legend>Hình ảnh và thẻ phân loại</legend><div className="editorial-fields"><Field error={errors.imageUrl} label="Đường dẫn ảnh (URL)"><input aria-invalid={Boolean(errors.imageUrl)} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…" type="url" value={form.imageUrl} /></Field></div><div className="editorial-fields editorial-fields--two"><Field error={errors.imageAltVi} label="Mô tả ảnh · VI"><input aria-invalid={Boolean(errors.imageAltVi)} onChange={(e) => update('imageAltVi', e.target.value)} value={form.imageAltVi} /></Field><Field error={errors.imageAltEn} label="Mô tả ảnh · EN"><input aria-invalid={Boolean(errors.imageAltEn)} onChange={(e) => update('imageAltEn', e.target.value)} value={form.imageAltEn} /></Field></div><div className="editorial-fields"><Field error={errors.tags} label="Thẻ phân loại" hint="Cách nhau bằng dấu phẩy"><input aria-invalid={Boolean(errors.tags)} onChange={(e) => update('tags', e.target.value)} placeholder="weekend, mountain, food" value={form.tags} /></Field></div></fieldset>
        </div>
        <aside className="mobile-card-preview"><div className="mobile-card-preview__toolbar"><div><h3>Xem trước thẻ hiển thị</h3></div><div><button className={previewLocale === 'vi' ? 'active' : ''} onClick={() => setPreviewLocale('vi')} type="button">VI</button><button className={previewLocale === 'en' ? 'active' : ''} onClick={() => setPreviewLocale('en')} type="button">EN</button></div></div><div className="mobile-card-preview__frame">{form.imageUrl ? <img alt={previewLocale === 'vi' ? form.imageAltVi : form.imageAltEn} src={form.imageUrl} /> : <div className="mobile-card-preview__placeholder"><Image size={30} />Ảnh sẽ xuất hiện ở đây</div>}<div className="mobile-card-preview__copy"><p>{form.destinationLabel || 'Điểm đến'}</p><h4>{(previewLocale === 'vi' ? form.titleVi : form.titleEn) || 'Tiêu đề gợi ý'}</h4><span>{(previewLocale === 'vi' ? form.summaryVi : form.summaryEn) || 'Tóm tắt giúp người dùng hiểu vì sao chuyến đi này đáng cân nhắc.'}</span><div>{form.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 3).map((tag) => <small key={tag}>#{tag}</small>)}</div><strong><MapPin size={16} /> Dùng để tạo chuyến đi · {form.suggestedDurationDays || '—'} ngày</strong></div></div></aside>
      </div>
      <SuggestionActionDialog action={dialogAction} busy={publish.isPending || archive.isPending} error={dialogAction === 'publish' ? errorDetails(publish.error) : dialogAction === 'archive' ? errorDetails(archive.error) : null} onClose={closeDialog} onConfirm={confirmDialog} title={form.titleVi} />
    </div>
  );
}

function Field({ children, error, hint, label }: { children: React.ReactNode; error?: string | undefined; hint?: string; label: string }) { return <label className="rule-field"><span>{label}</span>{children}{error ? <em className="rule-field__error">{error}</em> : hint ? <small className="rule-field__hint">{hint}</small> : null}</label>; }
function MutationError({ error }: { error: Error }) { const detail = errorDetails(error); return <div className="form-summary-error" role="alert"><CircleAlert size={18} /><div><strong>Chưa lưu được nội dung.</strong><span>{detail?.detail}</span>{detail?.requestId ? <small>Mã yêu cầu: {detail.requestId}</small> : null}</div></div>; }
function errorDetails(error: Error | null) { if (!error) return null; return error instanceof ApiError ? { detail: error.detail, requestId: error.requestId } : { detail: 'Máy chủ chưa hoàn tất được yêu cầu.', requestId: null }; }

function SuggestionActionDialog({ action, busy, error, onClose, onConfirm, title }: { action: DialogAction; busy: boolean; error: { detail: string; requestId: string | null } | null; onClose: () => void; onConfirm: () => void; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (action && !dialog.open) dialog.showModal(); if (!action && dialog.open) dialog.close(); }, [action]);
  if (!action) return null;
  const publish = action === 'publish';
  const discard = action === 'discard';
  return <dialog aria-labelledby="suggestion-dialog-title" className="status-dialog" onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={onClose} ref={ref}><div className={`status-dialog__mark${publish ? '' : ' status-dialog__mark--danger'}`}>{publish ? <Rocket size={26} /> : <Archive size={26} />}</div><button aria-label="Đóng xác nhận" className="icon-button status-dialog__close" disabled={busy} onClick={() => ref.current?.close()} type="button"><X size={20} /></button><h2 id="suggestion-dialog-title">{publish ? 'Xuất bản gợi ý này?' : discard ? 'Rời trình chỉnh sửa?' : 'Lưu trữ gợi ý này?'}</h2><p>{publish ? 'Nội dung sẽ xuất hiện cho người dùng theo đúng ngôn ngữ ứng dụng.' : discard ? 'Mọi chỉnh sửa kể từ lần lưu gần nhất sẽ bị hủy.' : 'Nội dung sẽ ẩn khỏi ứng dụng nhưng vẫn được giữ trong trang quản trị.'}</p>{!discard ? <div className="status-dialog__user"><strong>{title}</strong></div> : null}{error ? <div className="status-dialog__error" role="alert"><strong>Chưa hoàn tất được thao tác.</strong><span>{error.detail}</span>{error.requestId ? <small>Mã yêu cầu: {error.requestId}</small> : null}</div> : null}<div className="status-dialog__actions"><button className="button button--quiet" disabled={busy} onClick={() => ref.current?.close()} type="button">{discard ? 'Tiếp tục chỉnh sửa' : 'Giữ nguyên nội dung'}</button><button className={`button ${publish ? 'button--primary' : 'button--danger'}`} disabled={busy} onClick={onConfirm} type="button">{busy ? 'Đang xử lý…' : publish ? 'Xuất bản gợi ý' : discard ? 'Bỏ thay đổi và rời đi' : 'Lưu trữ gợi ý'}</button></div></dialog>;
}

function EditorError({ error, onRetry }: { error: Error; onRetry: () => void }) { const apiError = error instanceof ApiError ? error : null; return <section className="data-error"><CircleAlert size={30} /><h2>Chưa mở được nội dung</h2><p>{apiError?.status === 404 ? 'Gợi ý này không còn tồn tại.' : apiError?.detail ?? 'Máy chủ chưa trả được nội dung.'}</p>{apiError?.requestId ? <small>Mã yêu cầu: {apiError.requestId}</small> : null}<div className="data-error__actions"><Link className="button button--quiet" to="/trip-suggestions"><ArrowLeft size={17} /> Về gợi ý chuyến đi</Link><button className="button button--primary" onClick={onRetry} type="button"><RefreshCw size={17} /> Tải lại</button></div></section>; }
