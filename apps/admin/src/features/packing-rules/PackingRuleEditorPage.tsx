import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  FilePenLine,
  RefreshCw,
  Rocket,
  Save,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminPackingRulesApi } from '@/api/adminPackingRulesApi';
import type { PackingRule } from '@/api/types';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';
import { useUnsavedLinkGuard } from '@/app/useUnsavedLinkGuard';

import {
  emptyPackingRuleForm,
  isPackingRuleFormDirty,
  packingRuleFormToInput,
  packingRuleFormToUpdateInput,
  packingRuleToForm,
  type PackingRuleFormErrors,
  type PackingRuleFormState,
  validatePackingRuleForm,
} from './packingRuleForm';
import { PackingRuleFields } from './PackingRuleFields';
import { PackingRulePreview } from './PackingRulePreview';
import { contentStatusLabel, formatRuleDate } from './packingRulePresentation';
import { RuleActionDialog } from './RuleActionDialog';

type DialogAction = 'archive' | 'discard' | 'publish' | null;

export function PackingRuleEditorPage() {
  const { ruleId } = useParams();
  const detail = useQuery({
    queryKey: ['admin', 'packing-rule', ruleId],
    queryFn: ({ signal }) => adminPackingRulesApi.get(ruleId ?? '', signal),
    enabled: Boolean(ruleId),
  });
  useSessionAwareError(detail.error);

  if (!ruleId) return <PackingRuleWorkbench key="new" initialRule={null} />;
  if (detail.isPending) return <EditorSkeleton />;
  if (detail.isError) return <EditorError error={detail.error} onRetry={() => void detail.refetch()} />;
  return <PackingRuleWorkbench initialRule={detail.data} key={detail.data.id} />;
}
function PackingRuleWorkbench({ initialRule }: { initialRule: PackingRule | null }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { csrfToken } = useAdminAuth();
  const [rule, setRule] = useState(initialRule);
  const [initialForm, setInitialForm] = useState<PackingRuleFormState>(() => initialRule ? packingRuleToForm(initialRule) : emptyPackingRuleForm());
  const [form, setForm] = useState<PackingRuleFormState>(initialForm);
  const [errors, setErrors] = useState<PackingRuleFormErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const dirty = isPackingRuleFormDirty(form, initialForm);
  const archived = rule?.status === 'ARCHIVED';

  useUnsavedLinkGuard(dirty, (path) => {
    setPendingPath(path);
    setDialogAction('discard');
  });

  const saveRule = useMutation({
    mutationFn: () => {
      if (!csrfToken) throw new Error('Admin session is missing a CSRF token.');
      return rule
        ? adminPackingRulesApi.update(rule.id, packingRuleFormToUpdateInput(form), csrfToken)
        : adminPackingRulesApi.create(packingRuleFormToInput(form), csrfToken);
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['admin', 'packing-rule', saved.id], saved);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'packing-rules'] });
      if (!rule || saved.id !== rule.id) {
        void navigate(`/packing-rules/${saved.id}`, { replace: true });
        return;
      }
      const savedForm = packingRuleToForm(saved);
      setRule(saved);
      setForm(savedForm);
      setInitialForm(savedForm);
      setNotice('Đã lưu bản nháp. Khung xem trước đã cập nhật dữ liệu mới nhất.');
    },
  });
  useSessionAwareError(saveRule.error);

  const publishRule = useMutation({
    mutationFn: () => {
      if (!rule || !csrfToken) throw new Error('Rule or CSRF token is missing.');
      return adminPackingRulesApi.publish(rule.id, csrfToken);
    },
    onSuccess: async (published) => {
      setRule(published);
      const nextForm = packingRuleToForm(published);
      setForm(nextForm);
      setInitialForm(nextForm);
      setDialogAction(null);
      setNotice(`Phiên bản v${published.version} đã xuất bản và đang áp dụng trên ứng dụng.`);
      queryClient.setQueryData(['admin', 'packing-rule', published.id], published);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'packing-rules'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
  });
  useSessionAwareError(publishRule.error);

  const archiveRule = useMutation({
    mutationFn: () => {
      if (!rule || !csrfToken) throw new Error('Rule or CSRF token is missing.');
      return adminPackingRulesApi.archive(rule.id, csrfToken);
    },
    onSuccess: async (archivedRule) => {
      setRule(archivedRule);
      const nextForm = packingRuleToForm(archivedRule);
      setForm(nextForm);
      setInitialForm(nextForm);
      setDialogAction(null);
      setNotice(`Phiên bản v${archivedRule.version} đã được lưu trữ.`);
      queryClient.setQueryData(['admin', 'packing-rule', archivedRule.id], archivedRule);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'packing-rules'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
  });
  useSessionAwareError(archiveRule.error);

  const handleSave = () => {
    setNotice(null);
    saveRule.reset();
    const nextErrors = validatePackingRuleForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    saveRule.mutate();
  };

  const closeDialog = () => {
    if (publishRule.isPending || archiveRule.isPending) return;
    setDialogAction(null);
    setPendingPath(null);
    publishRule.reset();
    archiveRule.reset();
  };

  const confirmDialog = () => {
    if (dialogAction === 'publish') publishRule.mutate();
    if (dialogAction === 'archive') archiveRule.mutate();
    if (dialogAction === 'discard' && pendingPath) {
      const path = pendingPath;
      setDialogAction(null);
      setPendingPath(null);
      void navigate(path);
    }
  };

  const previewDisabledReason = !rule
    ? 'Lưu bản nháp trước khi chạy xem trước.'
    : dirty
      ? 'Có thay đổi chưa lưu. Hãy lưu bản nháp để xem trước phiên bản mới nhất.'
      : saveRule.isPending
        ? 'Đang lưu phiên bản.'
        : null;

  return (
    <div className="rule-editor-page">
      <div className="rule-editor-toolbar">
        <Link className="back-link" to="/packing-rules"><ArrowLeft size={17} /> Quy tắc hành lý</Link>
        <div className="rule-editor-toolbar__actions">
          {rule && rule.status !== 'ARCHIVED' ? (
            <button className="button button--quiet" disabled={dirty || saveRule.isPending} onClick={() => setDialogAction('archive')} type="button"><Archive size={17} /> Lưu trữ</button>
          ) : null}
          {rule?.status === 'DRAFT' ? (
            <button className="button button--secondary" disabled={dirty || saveRule.isPending} onClick={() => setDialogAction('publish')} type="button"><Rocket size={17} /> Xuất bản</button>
          ) : null}
          {!archived ? (
            <button className="button button--primary" disabled={!dirty || saveRule.isPending || !csrfToken} onClick={handleSave} type="button"><Save size={17} /> {saveRule.isPending ? 'Đang lưu…' : rule?.status === 'PUBLISHED' ? 'Lưu thành phiên bản mới' : 'Lưu bản nháp'}</button>
          ) : null}
        </div>
      </div>

      <header className="rule-editor-hero">
        <div>
          <h2>{form.name.trim() || 'Quy tắc chưa đặt tên'}</h2>
          {rule ? <p>{`Mã: ${rule.key} · Phiên bản v${rule.version} · Cập nhật ${formatRuleDate(rule.updatedAt)}`}</p> : null}
        </div>
        <div className="rule-editor-state">
          <span className={`rule-status rule-status--${(rule?.status ?? 'DRAFT').toLowerCase()}`}>
            {rule?.status === 'PUBLISHED' ? <Rocket size={15} /> : rule?.status === 'ARCHIVED' ? <Archive size={15} /> : <FilePenLine size={15} />}
            {rule ? contentStatusLabel(rule.status) : 'Bản nháp mới'}
          </span>
          <span className={dirty ? 'dirty-state dirty-state--active' : 'dirty-state'}>{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span>
        </div>
      </header>

      {rule?.status === 'PUBLISHED' ? <div className="rule-version-note"><Rocket size={18} /><div><strong>Phiên bản này đang áp dụng trên ứng dụng.</strong><span>Khi chỉnh sửa và lưu, hệ thống sẽ tạo một bản nháp mới; bản đang xuất bản không bị thay đổi.</span></div></div> : null}
      {archived ? <div className="rule-version-note rule-version-note--muted"><Archive size={18} /><div><strong>Phiên bản chỉ đọc.</strong><span>Bản đã lưu trữ không thể chỉnh sửa hoặc xuất bản lại.</span></div></div> : null}
      {notice ? <div className="action-notice" role="status"><CircleCheck size={19} /><span>{notice}</span><button onClick={() => setNotice(null)} type="button">Đóng</button></div> : null}
      {saveRule.error ? <MutationError error={saveRule.error} title="Chưa lưu được phiên bản" /> : null}
      {Object.keys(errors).length > 0 ? <div className="form-summary-error" role="alert"><CircleAlert size={18} /><div><strong>Cần kiểm tra lại biểu mẫu.</strong><span>{Object.keys(errors).length} trường hoặc nhóm dữ liệu chưa hợp lệ.</span></div></div> : null}

      <div className="rule-workbench">
        <PackingRuleFields
          disabled={archived}
          errors={errors}
          form={form}
          keyLocked={Boolean(rule)}
          onChange={(nextForm) => {
            setForm(nextForm);
            setErrors({});
            setNotice(null);
            saveRule.reset();
          }}
        />
        <PackingRulePreview csrfToken={csrfToken ?? ''} disabledReason={previewDisabledReason} ruleId={rule?.id ?? null} />
      </div>

      <RuleActionDialog
        action={dialogAction}
        busy={publishRule.isPending || archiveRule.isPending}
        error={dialogAction === 'publish' ? mutationDetails(publishRule.error) : dialogAction === 'archive' ? mutationDetails(archiveRule.error) : null}
        onClose={closeDialog}
        onConfirm={confirmDialog}
        ruleName={dialogAction === 'discard' ? undefined : `${form.name || form.key} · v${rule?.version ?? 'new'}`}
      />
    </div>
  );
}

function MutationError({ error, title }: { error: Error; title: string }) {
  const details = mutationDetails(error);
  return <div className="form-summary-error" role="alert"><CircleAlert size={18} /><div><strong>{title}</strong><span>{details?.detail}</span>{details?.requestId ? <small>Mã yêu cầu: {details.requestId}</small> : null}</div></div>;
}

function EditorSkeleton() {
  return <div aria-label="Đang tải quy tắc" className="rule-editor-skeleton" role="status"><span className="skeleton skeleton--title" /><span className="skeleton skeleton--ledger" /></div>;
}

function EditorError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  return (
    <section className="data-error">
      <CircleAlert aria-hidden="true" size={30} />
      <h2>Chưa mở được quy tắc</h2>
      <p>{apiError?.status === 404 ? 'Phiên bản này không còn tồn tại.' : apiError?.detail ?? 'Máy chủ chưa trả được dữ liệu quy tắc.'}</p>
      {apiError?.requestId ? <small>Mã yêu cầu: {apiError.requestId}</small> : null}
      <div className="data-error__actions"><Link className="button button--quiet" to="/packing-rules"><ArrowLeft size={17} /> Về quy tắc hành lý</Link><button className="button button--primary" onClick={onRetry} type="button"><RefreshCw size={17} /> Tải lại</button></div>
    </section>
  );
}

function mutationDetails(error: Error | null): { detail: string; requestId: string | null } | null {
  if (!error) return null;
  if (error instanceof ApiError) return { detail: error.detail, requestId: error.requestId };
  return { detail: 'Máy chủ chưa hoàn tất được yêu cầu. Hãy thử lại.', requestId: null };
}
