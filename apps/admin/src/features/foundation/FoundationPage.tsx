import { ArrowRight, Check, FileKey2, ListChecks, MapPinned, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router';

import { useAdminAuth } from '@/app/auth/AdminAuthProvider';

const workspaces = [
  { icon: UsersRound, label: 'Người dùng', text: 'Trạng thái tài khoản và quyền truy cập.', to: '/users' },
  { icon: ListChecks, label: 'Quy tắc hành lý', text: 'Nội dung deterministic có preview trước publish.', to: '/packing-rules' },
  { icon: MapPinned, label: 'Gợi ý chuyến đi', text: 'Biên tập nội dung song ngữ cho mobile.', to: '/trip-suggestions' },
] as const;

export function FoundationPage() {
  const { user } = useAdminAuth();

  return (
    <div className="foundation-page">
      <section className="foundation-hero" aria-labelledby="foundation-title">
        <div className="foundation-hero__copy">
          <p className="eyebrow">BÀN ĐIỀU PHỐI ĐÃ SẴN SÀNG</p>
          <h2 id="foundation-title">Dữ liệu rõ ràng.<br />Hành trình nhẹ đầu.</h2>
          <p>
            Control desk dùng cùng API với mobile, nhưng giữ một ranh giới riêng cho phiên quản trị,
            quyền truy cập và thay đổi nội dung.
          </p>
        </div>
        <div className="session-ticket">
          <span className="session-ticket__hole" aria-hidden="true" />
          <div>
            <p>PHIÊN HIỆN TẠI</p>
            <strong>{user?.displayName}</strong>
            <span>{user?.email}</span>
          </div>
          <span className="session-ticket__status"><Check size={16} /> Đã xác thực</span>
        </div>
      </section>

      <section className="foundation-grid" aria-label="Trạng thái foundation">
        <div className="readiness-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SYSTEM READINESS</p>
              <h3>Ba lớp đã được khóa</h3>
            </div>
            <span className="readiness-stamp">3 / 3</span>
          </div>
          <ol className="readiness-list">
            <li><span>01</span><div><strong>Admin session</strong><small>HttpOnly cookie, CSRF và khôi phục khi tải lại.</small></div><ShieldCheck size={19} /></li>
            <li><span>02</span><div><strong>API boundary</strong><small>Error code, field error và request ID được chuẩn hóa.</small></div><FileKey2 size={19} /></li>
            <li><span>03</span><div><strong>Protected routing</strong><small>Route yêu cầu phiên ADMIN trước khi render shell.</small></div><Check size={19} /></li>
          </ol>
        </div>

        <aside className="privacy-note">
          <p className="eyebrow eyebrow--light">PRIVACY LINE</p>
          <h3>Quản trị không đồng nghĩa đọc mọi thứ.</h3>
          <p>Checklist chi tiết của người dùng không xuất hiện trong support view mặc định.</p>
        </aside>
      </section>

      <section className="workspace-list" aria-labelledby="workspace-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CONTENT ROUTES</p>
            <h3 id="workspace-title">Các trạm quản trị tiếp theo</h3>
          </div>
          <p>Mỗi module được mở khi có data flow và quality gate tương ứng.</p>
        </div>
        <div className="workspace-list__rows">
          {workspaces.map(({ icon: Icon, label, text, to }, index) => (
            <Link className="workspace-row" key={to} to={to}>
              <span className="workspace-row__index">0{index + 1}</span>
              <Icon aria-hidden="true" size={20} />
              <div><strong>{label}</strong><span>{text}</span></div>
              <ArrowRight aria-hidden="true" size={19} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
