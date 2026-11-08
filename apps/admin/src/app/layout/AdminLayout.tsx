import {
  BookOpenText,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPinned,
  Menu,
  Plane,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminConfig } from '@/app/config';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';
import { BrandMark } from '@/design/BrandMark';

const navigation: Array<{ icon: LucideIcon; label: string; to: string }> = [
  { icon: LayoutDashboard, label: 'Tổng quan', to: '/dashboard' },
  { icon: UsersRound, label: 'Người dùng', to: '/users' },
  { icon: ListChecks, label: 'Quy tắc hành lý', to: '/packing-rules' },
  { icon: MapPinned, label: 'Gợi ý chuyến đi', to: '/trip-suggestions' },
  { icon: Plane, label: 'Chuyến đi', to: '/trips' },
];

const routeTitles: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'CONTROL DESK', title: 'Tổng quan' },
  '/users': { eyebrow: 'ACCOUNT CONTROL', title: 'Người dùng' },
  '/packing-rules': { eyebrow: 'PACKING CONTENT', title: 'Quy tắc hành lý' },
  '/trip-suggestions': { eyebrow: 'EDITORIAL DESK', title: 'Gợi ý chuyến đi' },
  '/trips': { eyebrow: 'SUPPORT VIEW', title: 'Chuyến đi' },
};

export function AdminLayout() {
  const { logout, user } = useAdminAuth();
  const location = useLocation();
  const isNarrow = useMediaQuery('(max-width: 56rem)');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<ApiError | null>(null);
  const route = useMemo(() => resolveRouteTitle(location.pathname), [location.pathname]);

  const submitLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch (error) {
      setLogoutError(
        error instanceof ApiError
          ? error
          : new ApiError({ code: 'LOGOUT_FAILED', detail: 'Chưa đóng được phiên quản trị.', status: 0 }),
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">Bỏ qua điều hướng</a>
      {isNarrow && menuOpen ? (
        <button
          aria-label="Đóng menu"
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}
      <aside
        aria-hidden={isNarrow && !menuOpen}
        className={`sidebar${menuOpen ? ' sidebar--open' : ''}`}
        inert={isNarrow && !menuOpen ? true : undefined}>
        <div className="sidebar__top">
          <BrandMark />
          <button
            aria-label="Đóng menu"
            className="icon-button sidebar__close"
            onClick={() => setMenuOpen(false)}
            type="button">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Điều hướng quản trị">
          <p className="sidebar__label">KHÔNG GIAN LÀM VIỆC</p>
          {navigation.map(({ icon: Icon, label, to }) => (
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
              key={to}
              onClick={() => setMenuOpen(false)}
              to={to}>
              <Icon aria-hidden="true" size={19} />
              <span>{label}</span>
              <ChevronRight aria-hidden="true" className="nav-item__arrow" size={16} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__note">
          <BookOpenText aria-hidden="true" size={18} />
          <div>
            <strong>Quyền riêng tư trước tiên</strong>
            <span>Admin chỉ thấy dữ liệu hỗ trợ và tổng hợp cần thiết.</span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar__title">
            <button
              aria-expanded={menuOpen}
              aria-label="Mở menu"
              className="icon-button topbar__menu"
              onClick={() => setMenuOpen(true)}
              type="button">
              <Menu size={21} />
            </button>
            <div>
              <p className="eyebrow">{route.eyebrow}</p>
              <h1>{route.title}</h1>
            </div>
          </div>
          <div className="topbar__account">
            <span className={`environment environment--${adminConfig.environment}`}>
              <span aria-hidden="true" />
              {environmentLabel(adminConfig.environment)}
            </span>
            <div className="account-copy">
              <strong>{user?.displayName}</strong>
              <span>{user?.email}</span>
            </div>
            <span className="account-avatar" aria-hidden="true">
              <CircleUserRound size={22} />
            </span>
            <button
              className="button button--quiet topbar__logout"
              disabled={isLoggingOut}
              onClick={() => void submitLogout()}
              type="button">
              <LogOut size={17} />
              {isLoggingOut ? 'Đang đóng…' : 'Đăng xuất'}
            </button>
          </div>
        </header>

        {logoutError ? (
          <div className="workspace-alert" role="alert">
            <strong>Chưa đóng được phiên.</strong> {logoutError.detail}
            {logoutError.requestId ? <small>Request ID: {logoutError.requestId}</small> : null}
          </div>
        ) : null}

        <main className="workspace__main" id="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function environmentLabel(environment: string): string {
  return {
    local: 'LOCAL',
    demo: 'DEMO',
    staging: 'STAGING',
    production: 'PRODUCTION',
  }[environment] ?? environment.toUpperCase();
}

function resolveRouteTitle(pathname: string): { eyebrow: string; title: string } {
  if (pathname.startsWith('/users/')) return { eyebrow: 'ACCOUNT DOSSIER', title: 'Chi tiết người dùng' };
  return routeTitles[pathname] ?? { eyebrow: 'LUCKGAGE ADMIN', title: 'Không gian quản trị' };
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
