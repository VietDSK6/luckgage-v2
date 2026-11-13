import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  CircleAlert,
  FilePenLine,
  FilterX,
  ListChecks,
  Plus,
  RefreshCw,
  Rocket,
  Search,
} from 'lucide-react';
import { type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { adminPackingRulesApi } from '@/api/adminPackingRulesApi';
import type { ContentStatus, PackingRule } from '@/api/types';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';

import {
  contentStatusLabel,
  formatRuleDate,
  packingRuleConditionSummary,
} from './packingRulePresentation';

export function PackingRulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim().toLocaleLowerCase('vi') ?? '';
  const status = readStatus(searchParams.get('status'));
  const rules = useQuery({
    queryKey: ['admin', 'packing-rules'],
    queryFn: ({ signal }) => adminPackingRulesApi.list(signal),
  });
  useSessionAwareError(rules.error);

  const visibleRules = (rules.data?.items ?? []).filter((rule) => {
    const matchesSearch =
      !search ||
      rule.name.toLocaleLowerCase('vi').includes(search) ||
      rule.key.toLocaleLowerCase('vi').includes(search);
    return matchesSearch && (!status || rule.status === status);
  });

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    updateParams({ search: typeof value === 'string' ? value.trim() || null : null });
  };

  return (
    <div className="packing-rules-page">
      <section className="page-heading" aria-labelledby="packing-rules-title">
        <div>
          <h2 id="packing-rules-title">Quy tắc hành lý</h2>
        </div>
        <Link className="button button--primary" to="/packing-rules/new"><Plus size={18} /> Tạo quy tắc</Link>
      </section>

      <section className="rule-filters" aria-label="Bộ lọc quy tắc hành lý">
        <form className="user-search" key={search} onSubmit={submitSearch}>
          <label htmlFor="rule-search">Tìm theo tên hoặc mã quy tắc</label>
          <div>
            <Search aria-hidden="true" size={19} />
            <input defaultValue={search} id="rule-search" name="search" placeholder="Ví dụ: rainy-weather" type="search" />
            <button className="button button--primary" type="submit">Tìm kiếm</button>
          </div>
        </form>
        <label className="rule-status-filter">
          <span>Trạng thái</span>
          <select onChange={(event) => updateParams({ status: event.target.value || null })} value={status ?? ''}>
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
        </label>
        {search || status ? (
          <button className="button button--quiet" onClick={() => setSearchParams({}, { replace: true })} type="button">
            <FilterX size={17} /> Xóa bộ lọc
          </button>
        ) : null}
      </section>

      {rules.isPending ? <RulesSkeleton /> : null}
      {rules.isError ? <RulesError error={rules.error} onRetry={() => void rules.refetch()} /> : null}
      {rules.isSuccess && visibleRules.length === 0 ? (
        <section className="users-empty">
          <ListChecks aria-hidden="true" size={30} />
          <h3>{rules.data.items.length === 0 ? 'Chưa có quy tắc hành lý' : 'Không có quy tắc phù hợp'}</h3>
          <p>{rules.data.items.length === 0 ? 'Tạo quy tắc đầu tiên để thử nghiệm với chuyến đi mẫu.' : 'Thử xóa bộ lọc hoặc tìm bằng từ khóa khác.'}</p>
          {rules.data.items.length === 0 ? (
            <Link className="button button--primary" to="/packing-rules/new"><Plus size={17} /> Tạo quy tắc</Link>
          ) : (
            <button className="button button--secondary" onClick={() => setSearchParams({}, { replace: true })} type="button">Xem toàn bộ</button>
          )}
        </section>
      ) : null}
      {rules.isSuccess && visibleRules.length > 0 ? <RulesLedger rules={visibleRules} /> : null}
    </div>
  );
}

function RulesLedger({ rules }: { rules: PackingRule[] }) {
  return (
    <section className="rule-ledger" aria-label="Danh sách phiên bản quy tắc">
      <div className="rule-ledger__head" aria-hidden="true">
        <span>Quy tắc</span><span>Điều kiện</span><span>Đầu ra</span><span>Cập nhật</span><span />
      </div>
      {rules.map((rule) => (
        <article className="rule-ledger__row" key={rule.id}>
          <div className="rule-ledger__identity">
            <span className={`rule-status rule-status--${rule.status.toLowerCase()}`}>
              {rule.status === 'PUBLISHED' ? <Rocket size={14} /> : rule.status === 'ARCHIVED' ? <Archive size={14} /> : <FilePenLine size={14} />}
              {contentStatusLabel(rule.status)} · v{rule.version}
            </span>
            <strong>{rule.name}</strong>
            <code>{rule.key}</code>
          </div>
          <p data-label="Điều kiện">{packingRuleConditionSummary(rule)}</p>
          <p data-label="Đầu ra"><strong>{rule.items.length}</strong> vật dụng · ưu tiên {rule.priority}</p>
          <p data-label="Cập nhật"><time dateTime={rule.updatedAt}>{formatRuleDate(rule.updatedAt)}</time>{rule.publishedAt ? <small>Xuất bản {formatRuleDate(rule.publishedAt)}</small> : null}</p>
          <Link aria-label={`Mở ${rule.name} phiên bản ${rule.version}`} className="button button--quiet" to={`/packing-rules/${rule.id}`}>Chỉnh sửa</Link>
        </article>
      ))}
    </section>
  );
}

function RulesSkeleton() {
  return <div aria-label="Đang tải quy tắc hành lý" className="rules-skeleton" role="status"><span /><span /><span /></div>;
}

function RulesError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  return (
    <section className="data-error data-error--compact">
      <CircleAlert aria-hidden="true" size={30} />
      <h3>Chưa tải được danh sách quy tắc</h3>
      <p>{apiError?.detail ?? 'Máy chủ chưa trả được danh sách quy tắc.'}</p>
      {apiError?.requestId ? <small>Mã yêu cầu: {apiError.requestId}</small> : null}
      <button className="button button--primary" onClick={onRetry} type="button"><RefreshCw size={17} /> Tải lại</button>
    </section>
  );
}

function readStatus(value: string | null): ContentStatus | null {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED' ? value : null;
}
