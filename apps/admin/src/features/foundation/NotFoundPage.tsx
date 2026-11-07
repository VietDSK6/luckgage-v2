import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="session-state">
      <p className="eyebrow">404 · SAI CHẶNG</p>
      <h1>Không tìm thấy trang này</h1>
      <p>Đường dẫn không thuộc control desk hiện tại.</p>
      <Link className="button button--primary" to="/dashboard"><ArrowLeft size={18} /> Về tổng quan</Link>
    </main>
  );
}
