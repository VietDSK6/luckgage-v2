import { ArrowLeft, Construction } from 'lucide-react';
import { Link, useLocation } from 'react-router';

const modules: Record<string, { body: string; title: string }> = {
  '/users': { title: 'Người dùng', body: 'Danh sách, tìm kiếm và kiểm soát trạng thái tài khoản sẽ được triển khai tại đây.' },
  '/packing-rules': { title: 'Quy tắc hành lý', body: 'Editor, preview và vòng đời publish của packing rule sẽ được triển khai tại đây.' },
  '/trip-suggestions': { title: 'Gợi ý chuyến đi', body: 'Nội dung song ngữ, destination và preview mobile sẽ được triển khai tại đây.' },
  '/trips': { title: 'Chuyến đi', body: 'Support view chỉ hiển thị metadata và aggregate cần thiết sẽ được triển khai tại đây.' },
};

export function ModulePlaceholderPage() {
  const location = useLocation();
  const module = modules[location.pathname] ?? { title: 'Module', body: 'Không gian này chưa được mở.' };
  return (
    <section className="module-placeholder" aria-labelledby="module-title">
      <div className="module-placeholder__mark" aria-hidden="true"><Construction size={28} /></div>
      <p className="eyebrow">ROUTE ĐÃ ĐƯỢC BẢO VỆ</p>
      <h2 id="module-title">{module.title}</h2>
      <p>{module.body}</p>
      <Link className="button button--secondary" to="/dashboard"><ArrowLeft size={18} /> Về tổng quan</Link>
    </section>
  );
}
