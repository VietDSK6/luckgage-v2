import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="session-state">
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn này không tồn tại trong trang quản trị.</p>
      <Link className="button button--primary" to="/dashboard"><ArrowLeft size={18} /> Về tổng quan</Link>
    </main>
  );
}
