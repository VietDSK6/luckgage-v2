import { useMutation } from '@tanstack/react-query';
import { Beaker, CircleAlert, CloudRain, PackageCheck, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ApiError } from '@/api/ApiClient';
import { adminPackingRulesApi } from '@/api/adminPackingRulesApi';
import type { PackingRuleSample, TripType } from '@/api/types';
import { useSessionAwareError } from '@/app/auth/useSessionAwareError';

import { tripTypeOptions } from './packingRulePresentation';

type SampleForm = {
  activities: string;
  durationDays: string;
  highTemperatureCelsius: string;
  locale: 'vi' | 'en';
  lowTemperatureCelsius: string;
  rainChancePercent: string;
  tripType: TripType;
};

const defaultSample: SampleForm = {
  activities: '',
  durationDays: '4',
  highTemperatureCelsius: '28',
  locale: 'vi',
  lowTemperatureCelsius: '18',
  rainChancePercent: '60',
  tripType: 'LEISURE',
};

export function PackingRulePreview({
  csrfToken,
  disabledReason,
  ruleId,
}: {
  csrfToken: string;
  disabledReason: string | null;
  ruleId: string | null;
}) {
  const [sample, setSample] = useState(defaultSample);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const preview = useMutation({
    mutationFn: (input: PackingRuleSample) => {
      if (!ruleId) throw new Error('Rule must be saved before preview.');
      return adminPackingRulesApi.preview(ruleId, input, csrfToken);
    },
  });
  useSessionAwareError(preview.error);

  const update = <Key extends keyof SampleForm>(key: Key, value: SampleForm[Key]) => {
    setSample((current) => ({ ...current, [key]: value }));
    preview.reset();
  };

  const runPreview = () => {
    const durationDays = Number(sample.durationDays);
    const rain = optionalNumber(sample.rainChancePercent);
    const lowTemperature = optionalNumber(sample.lowTemperatureCelsius);
    const highTemperature = optionalNumber(sample.highTemperatureCelsius);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) {
      setSampleError('Thời lượng mẫu cần là số nguyên từ 1 đến 30 ngày.');
      return;
    }
    if (rain !== undefined && (!Number.isInteger(rain) || rain < 0 || rain > 100)) {
      setSampleError('Khả năng mưa mẫu cần từ 0 đến 100%.');
      return;
    }
    setSampleError(null);
    preview.mutate({
      tripType: sample.tripType,
      durationDays,
      activities: sample.activities.split(',').map((value) => value.trim()).filter(Boolean),
      ...(lowTemperature === undefined ? {} : { lowTemperatureCelsius: lowTemperature }),
      ...(highTemperature === undefined ? {} : { highTemperatureCelsius: highTemperature }),
      ...(rain === undefined ? {} : { rainChancePercent: rain }),
      locale: sample.locale,
    });
  };

  return (
    <aside className="rule-preview" aria-labelledby="rule-preview-title">
      <div className="rule-preview__heading">
        <span><Beaker size={19} /></span>
        <div><p className="eyebrow">SAFE SANDBOX</p><h3 id="rule-preview-title">Preview một chuyến đi mẫu</h3></div>
      </div>
      <p className="rule-preview__lead">Preview chỉ đọc revision đang lưu, không ghi vào checklist thật.</p>

      <div className="preview-sample">
        <label><span>Loại chuyến đi</span><select onChange={(event) => update('tripType', event.target.value as TripType)} value={sample.tripType}>{tripTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Số ngày</span><input inputMode="numeric" max="30" min="1" onChange={(event) => update('durationDays', event.target.value)} type="number" value={sample.durationDays} /></label>
        <label className="preview-sample__wide"><span>Hoạt động <small>cách nhau bằng dấu phẩy</small></span><input onChange={(event) => update('activities', event.target.value)} placeholder="hiking, swimming" value={sample.activities} /></label>
        <label><span>Nhiệt độ thấp (°C)</span><input inputMode="decimal" onChange={(event) => update('lowTemperatureCelsius', event.target.value)} type="number" value={sample.lowTemperatureCelsius} /></label>
        <label><span>Nhiệt độ cao (°C)</span><input inputMode="decimal" onChange={(event) => update('highTemperatureCelsius', event.target.value)} type="number" value={sample.highTemperatureCelsius} /></label>
        <label><span>Khả năng mưa (%)</span><input inputMode="numeric" max="100" min="0" onChange={(event) => update('rainChancePercent', event.target.value)} type="number" value={sample.rainChancePercent} /></label>
        <label><span>Ngôn ngữ kết quả</span><select onChange={(event) => update('locale', event.target.value as 'vi' | 'en')} value={sample.locale}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
      </div>

      {disabledReason ? <p className="preview-note"><CircleAlert size={16} /> {disabledReason}</p> : null}
      {sampleError ? <p className="preview-note preview-note--danger" role="alert"><CircleAlert size={16} /> {sampleError}</p> : null}
      {preview.error ? <PreviewError error={preview.error} /> : null}
      <button className="button button--primary button--wide" disabled={Boolean(disabledReason) || preview.isPending} onClick={runPreview} type="button">
        {preview.isPending ? <RefreshCw className="spin" size={18} /> : <Beaker size={18} />}
        {preview.isPending ? 'Đang chạy mẫu…' : 'Chạy preview'}
      </button>

      {preview.data ? (
        <div className="preview-result" aria-live="polite">
          <header>
            <div><p className="eyebrow">KẾT QUẢ</p><strong>{preview.data.categories.reduce((total, category) => total + category.items.length, 0)} vật dụng</strong></div>
            <span><CloudRain size={15} /> {weatherStatus(preview.data.weatherStatus)}</span>
          </header>
          {preview.data.categories.length === 0 ? (
            <div className="preview-result__empty"><PackageCheck size={24} /><strong>Rule không khớp mẫu này</strong><p>Điều chỉnh điều kiện mẫu hoặc kiểm tra lại điều kiện rule.</p></div>
          ) : preview.data.categories.map((category) => (
            <section className="preview-category" key={category.clientKey}>
              <h4>{category.name}</h4>
              {category.items.map((item) => (
                <div className="preview-item" key={item.clientKey}>
                  <span>{item.quantity}×</span>
                  <div><strong>{item.name}</strong><small>{item.reason}</small>{item.note ? <small>{item.note}</small> : null}</div>
                  <code>v{item.matchedRules.map((rule) => rule.version).join(', ')}</code>
                </div>
              ))}
            </section>
          ))}
          <small className="preview-result__source">{preview.data.sourceLabel}</small>
        </div>
      ) : null}
    </aside>
  );
}

function PreviewError({ error }: { error: Error }) {
  const apiError = error instanceof ApiError ? error : null;
  return (
    <div className="preview-error" role="alert">
      <strong>Preview chưa chạy được.</strong>
      <span>{apiError?.detail ?? 'Máy chủ chưa tạo được kết quả mẫu.'}</span>
      {apiError?.requestId ? <small>Request ID: {apiError.requestId}</small> : null}
    </div>
  );
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function weatherStatus(status: 'FRESH' | 'CACHED' | 'UNAVAILABLE'): string {
  return { FRESH: 'Có dữ liệu thời tiết', CACHED: 'Thời tiết cache', UNAVAILABLE: 'Không dùng thời tiết' }[status];
}
