import { Eye, EyeOff, KeyRound, LogIn, Route, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';
import { BrandMark } from '@/design/BrandMark';

type FormErrors = { email?: string; password?: string };

export function LoginPage() {
  const { login } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login({ email, password });
      void navigate(readReturnPath(location.state), { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setSubmitError(apiError);
      setErrors(fieldErrors(apiError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="login-story-title">
        <BrandMark />
        <div className="login-story__content">
          <h1 id="login-story-title">Quản trị hệ thống luckgage</h1>
          <p>Quản lý tài khoản, quy tắc gợi ý hành lý và điểm đến xuất bản trên ứng dụng.</p>
        </div>
        <ul className="route-manifest" aria-label="Bảo mật phiên quản trị">
          <li>
            <span><KeyRound size={17} /></span>
            <div><strong>Cookie bảo mật</strong><small>Không lưu mã xác thực dài hạn trong trình duyệt.</small></div>
          </li>
          <li>
            <span><ShieldCheck size={17} /></span>
            <div><strong>Phân quyền tại máy chủ</strong><small>Mọi thao tác đều yêu cầu quyền quản trị viên hợp lệ.</small></div>
          </li>
          <li>
            <span><Route size={17} /></span>
            <div><strong>Đối soát bằng mã yêu cầu</strong><small>Mọi lỗi phản hồi đều kèm mã truy vết.</small></div>
          </li>
        </ul>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel__inner">
          <h2 id="login-title">Đăng nhập quản trị</h2>
          <p className="login-panel__lead">Sử dụng tài khoản quản trị viên.</p>

          {submitError ? (
            <div className="form-alert" role="alert">
              <strong>{loginErrorTitle(submitError)}</strong>
              <span>{loginErrorMessage(submitError)}</span>
              {submitError.requestId ? <small>Mã yêu cầu: {submitError.requestId}</small> : null}
            </div>
          ) : null}

          <form className="login-form" noValidate onSubmit={(event) => void submit(event)}>
            <div className="field">
              <label htmlFor="email">Email quản trị</label>
              <input
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={Boolean(errors.email)}
                autoCapitalize="none"
                autoComplete="username"
                id="email"
                inputMode="email"
                onBlur={() => setErrors((current) => replaceFieldError(current, 'email', validateEmail(email)))}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@luckgage.app"
                type="email"
                value={email}
              />
              {errors.email ? <span className="field__error" id="email-error">{errors.email}</span> : null}
            </div>

            <div className="field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-field">
                <input
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="current-password"
                  id="password"
                  onBlur={() =>
                    setErrors((current) =>
                      replaceFieldError(current, 'password', validatePassword(password)),
                    )
                  }
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="icon-button"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password ? <span className="field__error" id="password-error">{errors.password}</span> : null}
            </div>

            <button className="button button--primary button--wide" disabled={isSubmitting} type="submit">
              <LogIn size={18} />
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function validate(email: string, password: string): FormErrors {
  return { ...validateEmail(email), ...validatePassword(password) };
}

function validateEmail(email: string): FormErrors {
  if (!email.trim()) return { email: 'Nhập email quản trị để tiếp tục.' };
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return { email: 'Email cần đúng định dạng, ví dụ admin@luckgage.app.' };
  }
  return {};
}

function validatePassword(password: string): FormErrors {
  return password ? {} : { password: 'Nhập mật khẩu quản trị để tiếp tục.' };
}

function replaceFieldError(
  current: FormErrors,
  field: keyof FormErrors,
  validation: FormErrors,
): FormErrors {
  const next = { ...current };
  delete next[field];
  return { ...next, ...validation };
}

function fieldErrors(error: ApiError): FormErrors {
  return Object.fromEntries(
    error.fieldErrors
      .filter(({ field }) => field === 'email' || field === 'password')
      .map(({ field, message }) => [field, message]),
  );
}

function loginErrorTitle(error: ApiError): string {
  if (error.code === 'RATE_LIMITED') return 'Thử đăng nhập quá nhiều lần';
  if (error.code === 'NETWORK_ERROR') return 'Chưa kết nối được API';
  return 'Chưa đăng nhập được';
}

function loginErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email hoặc mật khẩu chưa đúng. Kiểm tra lại rồi thử lần nữa.';
    case 'ADMIN_ROLE_REQUIRED':
      return 'Tài khoản này không có quyền quản trị. Hãy dùng tài khoản ADMIN.';
    case 'ACCOUNT_SUSPENDED':
      return 'Tài khoản đang bị tạm khóa. Liên hệ người quản trị hệ thống.';
    case 'RATE_LIMITED':
      return 'Chờ một chút trước khi thử đăng nhập lại.';
    default:
      return error.detail;
  }
}

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError({ code: 'UNKNOWN_ERROR', detail: 'Chưa hoàn tất được đăng nhập.', status: 0 });
}

function readReturnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null) return '/dashboard';
  const from = (state as Record<string, unknown>).from;
  return typeof from === 'string' && from.startsWith('/') ? from : '/dashboard';
}
