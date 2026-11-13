import { LoaderCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { useAdminAuth } from './AdminAuthProvider';

export function RequireAdmin() {
  const auth = useAdminAuth();
  const location = useLocation();

  if (auth.status === 'loading') return <SessionLoading />;
  if (auth.status === 'error') return <SessionRecovery />;
  if (auth.status !== 'authenticated') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  return <Outlet />;
}

export function AnonymousOnly() {
  const auth = useAdminAuth();
  if (auth.status === 'loading') return <SessionLoading />;
  if (auth.status === 'authenticated') return <Navigate replace to="/dashboard" />;
  return <Outlet />;
}

function SessionLoading() {
  return (
    <main className="session-state" aria-live="polite">
      <div className="session-state__mark" aria-hidden="true">
        <LoaderCircle className="spin" size={24} />
      </div>
      <h1>Đang kiểm tra phiên…</h1>
    </main>
  );
}

function SessionRecovery() {
  const { error, retrySession } = useAdminAuth();
  return (
    <main className="session-state" aria-labelledby="session-error-title">
      <div className="session-state__mark session-state__mark--danger" aria-hidden="true">
        <ShieldAlert size={24} />
      </div>
      <h1 id="session-error-title">Không thể kiểm tra phiên</h1>
      <p>{error?.detail ?? 'Kiểm tra kết nối API rồi thử lại.'}</p>
      {error?.requestId ? <p className="request-id">Request ID: {error.requestId}</p> : null}
      <button className="button button--primary" onClick={() => void retrySession()} type="button">
        <RotateCcw size={18} />
        Thử lại
      </button>
    </main>
  );
}
