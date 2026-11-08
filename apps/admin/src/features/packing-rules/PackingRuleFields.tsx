import { CopyPlus, Minus, PackagePlus } from 'lucide-react';

import type { PackingRuleFormErrors, PackingRuleFormState, PackingRuleItemForm } from './packingRuleForm';
import { emptyPackingRuleItem } from './packingRuleForm';
import { tripTypeOptions } from './packingRulePresentation';

type PackingRuleFieldsProps = {
  disabled: boolean;
  errors: PackingRuleFormErrors;
  form: PackingRuleFormState;
  keyLocked: boolean;
  onChange: (form: PackingRuleFormState) => void;
};

export function PackingRuleFields({ disabled, errors, form, keyLocked, onChange }: PackingRuleFieldsProps) {
  const update = <Key extends keyof PackingRuleFormState>(key: Key, value: PackingRuleFormState[Key]) => {
    onChange({ ...form, [key]: value });
  };
  const updateItem = (clientId: string, updates: Partial<PackingRuleItemForm>) => {
    update('items', form.items.map((item) => item.clientId === clientId ? { ...item, ...updates } : item));
  };

  return (
    <div className="rule-form-sections">
      <fieldset className="rule-section" disabled={disabled}>
        <legend><span>01</span><div><small>IDENTITY</small>Rule identity</div></legend>
        <p>Rule key gom các revision cùng một dòng lịch sử. Sau khi tạo, key được khóa.</p>
        <div className="rule-fields rule-fields--identity">
          <RuleField error={errors.key} label="Rule key" hint="chữ thường, số và dấu gạch ngang">
            <input
              aria-invalid={Boolean(errors.key)}
              disabled={keyLocked || disabled}
              onChange={(event) => update('key', event.target.value)}
              placeholder="rainy-weather"
              value={form.key}
            />
          </RuleField>
          <RuleField error={errors.name} label="Tên nội bộ">
            <input aria-invalid={Boolean(errors.name)} onChange={(event) => update('name', event.target.value)} placeholder="Đồ dùng khi trời mưa" value={form.name} />
          </RuleField>
          <RuleField error={errors.priority} label="Priority" hint="số nhỏ chạy trước">
            <input aria-invalid={Boolean(errors.priority)} inputMode="numeric" min="0" onChange={(event) => update('priority', event.target.value)} type="number" value={form.priority} />
          </RuleField>
        </div>
      </fieldset>

      <fieldset className="rule-section" disabled={disabled}>
        <legend><span>02</span><div><small>MATCH CONDITIONS</small>Khi nào rule chạy?</div></legend>
        <p>Để trống điều kiện không cần thiết. Một chuyến đi phải thỏa tất cả điều kiện đã nhập.</p>
        <div className="rule-fields rule-fields--conditions">
          <RuleField label="Loại chuyến đi">
            <select onChange={(event) => update('tripType', event.target.value as PackingRuleFormState['tripType'])} value={form.tripType}>
              <option value="">Mọi loại chuyến đi</option>
              {tripTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </RuleField>
          <RuleField error={errors.minDays} label="Số ngày tối thiểu">
            <input aria-invalid={Boolean(errors.minDays)} inputMode="numeric" min="1" onChange={(event) => update('minDays', event.target.value)} type="number" value={form.minDays} />
          </RuleField>
          <RuleField error={errors.maxDays} label="Số ngày tối đa">
            <input aria-invalid={Boolean(errors.maxDays)} inputMode="numeric" min="1" onChange={(event) => update('maxDays', event.target.value)} type="number" value={form.maxDays} />
          </RuleField>
          <RuleField error={errors.minTempC} label="Nhiệt độ thấp nhất (°C)">
            <input aria-invalid={Boolean(errors.minTempC)} inputMode="decimal" onChange={(event) => update('minTempC', event.target.value)} type="number" value={form.minTempC} />
          </RuleField>
          <RuleField error={errors.maxTempC} label="Nhiệt độ cao nhất (°C)">
            <input aria-invalid={Boolean(errors.maxTempC)} inputMode="decimal" onChange={(event) => update('maxTempC', event.target.value)} type="number" value={form.maxTempC} />
          </RuleField>
          <RuleField error={errors.minRainPercent} label="Khả năng mưa tối thiểu (%)">
            <input aria-invalid={Boolean(errors.minRainPercent)} inputMode="numeric" max="100" min="0" onChange={(event) => update('minRainPercent', event.target.value)} type="number" value={form.minRainPercent} />
          </RuleField>
          <RuleField error={errors.activityKey} label="Activity key" hint="khớp một hoạt động trong chuyến đi">
            <input aria-invalid={Boolean(errors.activityKey)} onChange={(event) => update('activityKey', event.target.value)} placeholder="hiking" value={form.activityKey} />
          </RuleField>
        </div>
      </fieldset>

      <fieldset className="rule-section" disabled={disabled}>
        <legend><span>03</span><div><small>EXPLANATION</small>Vì sao được gợi ý?</div></legend>
        <p>Người dùng nhìn thấy lý do này trong preview. Hai ngôn ngữ là bắt buộc.</p>
        <div className="rule-fields rule-fields--copy">
          <RuleField error={errors.reasonVi} label="Lý do tiếng Việt">
            <textarea aria-invalid={Boolean(errors.reasonVi)} maxLength={240} onChange={(event) => update('reasonVi', event.target.value)} rows={3} value={form.reasonVi} />
          </RuleField>
          <RuleField error={errors.reasonEn} label="Reason in English">
            <textarea aria-invalid={Boolean(errors.reasonEn)} maxLength={240} onChange={(event) => update('reasonEn', event.target.value)} rows={3} value={form.reasonEn} />
          </RuleField>
        </div>
      </fieldset>

      <fieldset className="rule-section rule-section--output" disabled={disabled}>
        <legend><span>04</span><div><small>OUTPUT ITEMS</small>Rule thêm gì?</div></legend>
        <div className="rule-section__intro">
          <p>Thứ tự bên dưới cũng là thứ tự hiển thị trong preview. Category key + item key phải duy nhất.</p>
          <button className="button button--secondary" disabled={disabled || form.items.length >= 50} onClick={() => update('items', [...form.items, emptyPackingRuleItem()])} type="button">
            <PackagePlus size={17} /> Thêm vật dụng
          </button>
        </div>
        {errors.items ? <span className="rule-field__error" role="alert">{errors.items}</span> : null}
        <div className="rule-items">
          {form.items.map((item, index) => (
            <article className="rule-item" key={item.clientId}>
              <header>
                <div><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.itemNameVi.trim() || 'Vật dụng chưa đặt tên'}</strong></div>
                <div>
                  <button
                    aria-label={`Nhân bản vật dụng ${index + 1}`}
                    className="icon-button"
                    disabled={disabled || form.items.length >= 50}
                    onClick={() => {
                      const clone = { ...item, clientId: emptyPackingRuleItem().clientId, itemKey: `${item.itemKey}-copy` };
                      const items = [...form.items];
                      items.splice(index + 1, 0, clone);
                      update('items', items);
                    }}
                    type="button"><CopyPlus size={18} /></button>
                  <button aria-label={`Xóa vật dụng ${index + 1}`} className="icon-button icon-button--danger" disabled={disabled} onClick={() => update('items', form.items.filter((entry) => entry.clientId !== item.clientId))} type="button"><Minus size={18} /></button>
                </div>
              </header>
              <div className="rule-fields rule-fields--item">
                <RuleField error={errors[`items.${index}.categoryKey`]} label="Category key">
                  <input aria-invalid={Boolean(errors[`items.${index}.categoryKey`])} onChange={(event) => updateItem(item.clientId, { categoryKey: event.target.value })} placeholder="weather" value={item.categoryKey} />
                </RuleField>
                <RuleField error={errors[`items.${index}.itemKey`]} label="Item key">
                  <input aria-invalid={Boolean(errors[`items.${index}.itemKey`])} onChange={(event) => updateItem(item.clientId, { itemKey: event.target.value })} placeholder="rain-jacket" value={item.itemKey} />
                </RuleField>
                <RuleField error={errors[`items.${index}.categoryNameVi`]} label="Tên nhóm · VI">
                  <input aria-invalid={Boolean(errors[`items.${index}.categoryNameVi`])} onChange={(event) => updateItem(item.clientId, { categoryNameVi: event.target.value })} value={item.categoryNameVi} />
                </RuleField>
                <RuleField error={errors[`items.${index}.categoryNameEn`]} label="Category name · EN">
                  <input aria-invalid={Boolean(errors[`items.${index}.categoryNameEn`])} onChange={(event) => updateItem(item.clientId, { categoryNameEn: event.target.value })} value={item.categoryNameEn} />
                </RuleField>
                <RuleField error={errors[`items.${index}.itemNameVi`]} label="Tên vật dụng · VI">
                  <input aria-invalid={Boolean(errors[`items.${index}.itemNameVi`])} onChange={(event) => updateItem(item.clientId, { itemNameVi: event.target.value })} value={item.itemNameVi} />
                </RuleField>
                <RuleField error={errors[`items.${index}.itemNameEn`]} label="Item name · EN">
                  <input aria-invalid={Boolean(errors[`items.${index}.itemNameEn`])} onChange={(event) => updateItem(item.clientId, { itemNameEn: event.target.value })} value={item.itemNameEn} />
                </RuleField>
                <RuleField label="Cách tính số lượng">
                  <select onChange={(event) => updateItem(item.clientId, { quantityMode: event.target.value as PackingRuleItemForm['quantityMode'] })} value={item.quantityMode}>
                    <option value="FIXED">Cố định</option>
                    <option value="PER_DAY">Theo số ngày</option>
                  </select>
                </RuleField>
                <RuleField error={errors[`items.${index}.baseQuantity`]} label="Số lượng cơ sở">
                  <input aria-invalid={Boolean(errors[`items.${index}.baseQuantity`])} inputMode="numeric" max="99" min="1" onChange={(event) => updateItem(item.clientId, { baseQuantity: event.target.value })} type="number" value={item.baseQuantity} />
                </RuleField>
                <RuleField error={errors[`items.${index}.noteVi`]} label="Ghi chú · VI" optional>
                  <textarea aria-invalid={Boolean(errors[`items.${index}.noteVi`])} maxLength={500} onChange={(event) => updateItem(item.clientId, { noteVi: event.target.value })} rows={2} value={item.noteVi} />
                </RuleField>
                <RuleField error={errors[`items.${index}.noteEn`]} label="Note · EN" optional>
                  <textarea aria-invalid={Boolean(errors[`items.${index}.noteEn`])} maxLength={500} onChange={(event) => updateItem(item.clientId, { noteEn: event.target.value })} rows={2} value={item.noteEn} />
                </RuleField>
              </div>
            </article>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function RuleField({
  children,
  error,
  hint,
  label,
  optional = false,
}: {
  children: React.ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  label: string;
  optional?: boolean;
}) {
  return (
    <label className="rule-field">
      <span>{label}{optional ? <small>Không bắt buộc</small> : null}</span>
      {children}
      {error ? <em className="rule-field__error">{error}</em> : hint ? <small className="rule-field__hint">{hint}</small> : null}
    </label>
  );
}
