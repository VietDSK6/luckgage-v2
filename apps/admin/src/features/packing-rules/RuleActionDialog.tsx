import { Archive, CircleAlert, Rocket, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

type RuleAction = 'archive' | 'discard' | 'publish';

type RuleActionDialogProps = {
  action: RuleAction | null;
  busy?: boolean;
  error?: { detail: string; requestId: string | null } | null;
  onClose: () => void;
  onConfirm: () => void;
  ruleName?: string | undefined;
};

const copy: Record<RuleAction, { title: string; description: string; confirm: string }> = {
  publish: {
    title: 'Xuất bản phiên bản này?',
    description:
      'Phiên bản đang xuất bản của cùng mã quy tắc sẽ được lưu trữ. Ứng dụng sẽ áp dụng phiên bản này ngay sau khi xuất bản.',
    confirm: 'Xuất bản phiên bản',
  },
  archive: {
    title: 'Lưu trữ phiên bản này?',
    description:
      'Phiên bản này sẽ ngừng dùng để tạo gợi ý hành lý. Danh sách đồ đã áp dụng trước đó không bị thay đổi.',
    confirm: 'Lưu trữ phiên bản',
  },
  discard: {
    title: 'Rời khỏi trình chỉnh sửa?',
    description: 'Mọi chỉnh sửa kể từ lần lưu gần nhất sẽ bị hủy. Bản đã lưu trên hệ thống không bị ảnh hưởng.',
    confirm: 'Bỏ thay đổi và rời đi',
  },
};

export function RuleActionDialog({
  action,
  busy = false,
  error,
  onClose,
  onConfirm,
  ruleName,
}: RuleActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (action && !dialog.open) dialog.showModal();
    if (!action && dialog.open) dialog.close();
  }, [action]);

  if (!action) return null;
  const selected = copy[action];
  const destructive = action !== 'publish';
  const Icon = action === 'publish' ? Rocket : action === 'archive' ? Archive : CircleAlert;

  return (
    <dialog
      aria-describedby="rule-action-description"
      aria-labelledby="rule-action-title"
      className="status-dialog rule-action-dialog"
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={onClose}
      ref={dialogRef}>
      <div className={`status-dialog__mark${destructive ? ' status-dialog__mark--danger' : ''}`}>
        <Icon size={26} />
      </div>
      <button
        aria-label="Đóng xác nhận"
        className="icon-button status-dialog__close"
        disabled={busy}
        onClick={() => dialogRef.current?.close()}
        type="button">
        <X size={20} />
      </button>
      <h2 id="rule-action-title">{selected.title}</h2>
      <p id="rule-action-description">{selected.description}</p>
      {ruleName ? <div className="status-dialog__user"><strong>{ruleName}</strong></div> : null}
      {error ? (
        <div className="status-dialog__error" role="alert">
          <strong>Chưa hoàn tất được thao tác.</strong>
          <span>{error.detail}</span>
          {error.requestId ? <small>Mã yêu cầu: {error.requestId}</small> : null}
        </div>
      ) : null}
      <div className="status-dialog__actions">
        <button className="button button--quiet" disabled={busy} onClick={() => dialogRef.current?.close()} type="button">
          {action === 'discard' ? 'Tiếp tục chỉnh sửa' : 'Giữ nguyên phiên bản'}
        </button>
        <button
          className={`button ${destructive ? 'button--danger' : 'button--primary'}`}
          disabled={busy}
          onClick={onConfirm}
          type="button">
          <Icon size={18} /> {busy ? 'Đang xử lý…' : selected.confirm}
        </button>
      </div>
    </dialog>
  );
}
