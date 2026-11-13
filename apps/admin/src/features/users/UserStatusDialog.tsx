import { CircleCheck, ShieldAlert, UserRoundCheck, UserRoundX, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { ManagedUser, UserStatus } from '@/api/types';

type UserStatusDialogProps = {
  busy: boolean;
  error?: { detail: string; requestId: string | null } | null;
  onClose: () => void;
  onConfirm: (status: UserStatus) => void;
  open: boolean;
  user: ManagedUser | null;
};

export function UserStatusDialog({ busy, error, onClose, onConfirm, open, user }: UserStatusDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!user) return null;
  const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const suspending = nextStatus === 'SUSPENDED';

  return (
    <dialog
      aria-describedby="status-dialog-description"
      aria-labelledby="status-dialog-title"
      className="status-dialog"
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={onClose}
      ref={dialogRef}>
      <div className={`status-dialog__mark${suspending ? ' status-dialog__mark--danger' : ''}`}>
        {suspending ? <ShieldAlert size={22} /> : <CircleCheck size={22} />}
      </div>
      <button
        aria-label="Đóng xác nhận"
        className="icon-button status-dialog__close"
        disabled={busy}
        onClick={() => dialogRef.current?.close()}
        type="button">
        <X size={18} />
      </button>
      <h2 id="status-dialog-title">
        {suspending ? 'Tạm khóa tài khoản này?' : 'Mở lại tài khoản này?'}
      </h2>
      <p id="status-dialog-description">
        {suspending
          ? `${user.displayName} sẽ bị đăng xuất khỏi mọi phiên. Dữ liệu chuyến đi vẫn giữ nguyên.`
          : `${user.displayName} có thể đăng nhập trở lại ngay sau khi mở khóa.`}
      </p>
      <div className="status-dialog__user">
        <strong>{user.displayName}</strong>
        <span>{user.email}</span>
      </div>
      {error ? (
        <div className="status-dialog__error" role="alert">
          <strong>Chưa thay đổi được trạng thái.</strong>
          <span>{error.detail}</span>
          {error.requestId ? <small>Request ID: {error.requestId}</small> : null}
        </div>
      ) : null}
      <div className="status-dialog__actions">
        <button
          className="button button--quiet"
          disabled={busy}
          onClick={() => dialogRef.current?.close()}
          type="button">
          Hủy
        </button>
        <button
          className={`button ${suspending ? 'button--danger' : 'button--primary'}`}
          disabled={busy}
          onClick={() => onConfirm(nextStatus)}
          type="button">
          {suspending ? <UserRoundX size={16} /> : <UserRoundCheck size={16} />}
          {busy ? 'Đang cập nhật…' : suspending ? 'Tạm khóa tài khoản' : 'Mở lại tài khoản'}
        </button>
      </div>
    </dialog>
  );
}
