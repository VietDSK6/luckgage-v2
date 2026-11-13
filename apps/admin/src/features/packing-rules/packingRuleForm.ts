import type {
  PackingRule,
  PackingRuleInput,
  QuantityMode,
  TripType,
} from '@/api/types';

export type PackingRuleItemForm = {
  clientId: string;
  categoryKey: string;
  categoryNameVi: string;
  categoryNameEn: string;
  itemKey: string;
  itemNameVi: string;
  itemNameEn: string;
  quantityMode: QuantityMode;
  baseQuantity: string;
  noteVi: string;
  noteEn: string;
};

export type PackingRuleFormState = {
  key: string;
  name: string;
  priority: string;
  tripType: TripType | '';
  minDays: string;
  maxDays: string;
  minTempC: string;
  maxTempC: string;
  minRainPercent: string;
  activityKey: string;
  reasonVi: string;
  reasonEn: string;
  items: PackingRuleItemForm[];
};

export type PackingRuleFormErrors = Record<string, string>;

let nextClientId = 0;

export function emptyPackingRuleForm(): PackingRuleFormState {
  return {
    key: '',
    name: '',
    priority: '100',
    tripType: '',
    minDays: '',
    maxDays: '',
    minTempC: '',
    maxTempC: '',
    minRainPercent: '',
    activityKey: '',
    reasonVi: '',
    reasonEn: '',
    items: [emptyPackingRuleItem()],
  };
}

export function emptyPackingRuleItem(): PackingRuleItemForm {
  nextClientId += 1;
  return {
    clientId: `rule-item-${nextClientId}`,
    categoryKey: '',
    categoryNameVi: '',
    categoryNameEn: '',
    itemKey: '',
    itemNameVi: '',
    itemNameEn: '',
    quantityMode: 'FIXED',
    baseQuantity: '1',
    noteVi: '',
    noteEn: '',
  };
}

export function packingRuleToForm(rule: PackingRule): PackingRuleFormState {
  return {
    key: rule.key,
    name: rule.name,
    priority: String(rule.priority),
    tripType: rule.conditions.tripType ?? '',
    minDays: stringValue(rule.conditions.minDays),
    maxDays: stringValue(rule.conditions.maxDays),
    minTempC: stringValue(rule.conditions.minTempC),
    maxTempC: stringValue(rule.conditions.maxTempC),
    minRainPercent: stringValue(rule.conditions.minRainPercent),
    activityKey: rule.conditions.activityKey ?? '',
    reasonVi: rule.reasonVi,
    reasonEn: rule.reasonEn,
    items: rule.items.map((item) => {
      nextClientId += 1;
      return {
        clientId: `rule-item-${nextClientId}`,
        categoryKey: item.categoryKey,
        categoryNameVi: item.categoryNameVi,
        categoryNameEn: item.categoryNameEn,
        itemKey: item.itemKey,
        itemNameVi: item.itemNameVi,
        itemNameEn: item.itemNameEn,
        quantityMode: item.quantityMode,
        baseQuantity: String(item.baseQuantity),
        noteVi: item.noteVi ?? '',
        noteEn: item.noteEn ?? '',
      };
    }),
  };
}

export function validatePackingRuleForm(form: PackingRuleFormState): PackingRuleFormErrors {
  const errors: PackingRuleFormErrors = {};
  if (!/^[a-z0-9-]{1,80}$/.test(form.key.trim())) {
    errors.key = 'Mã quy tắc dùng 1–80 ký tự thường, số hoặc dấu gạch ngang.';
  }
  if (!withinLength(form.name, 1, 120)) errors.name = 'Tên quy tắc cần từ 1 đến 120 ký tự.';

  const priority = parseInteger(form.priority);
  if (priority === null || priority < 0 || priority > 10_000) {
    errors.priority = 'Độ ưu tiên cần là số nguyên từ 0 đến 10.000.';
  }

  validateOptionalRange(errors, 'minDays', form.minDays, 1, Number.MAX_SAFE_INTEGER, true);
  validateOptionalRange(errors, 'maxDays', form.maxDays, 1, Number.MAX_SAFE_INTEGER, true);
  validateOptionalNumber(errors, 'minTempC', form.minTempC);
  validateOptionalNumber(errors, 'maxTempC', form.maxTempC);
  validateOptionalRange(errors, 'minRainPercent', form.minRainPercent, 0, 100, true);
  if (form.activityKey.trim().length > 60) errors.activityKey = 'Mã hoạt động tối đa 60 ký tự.';

  const minDays = parseOptionalNumber(form.minDays);
  const maxDays = parseOptionalNumber(form.maxDays);
  if (minDays !== null && maxDays !== null && minDays > maxDays) {
    errors.maxDays = 'Số ngày tối đa không được nhỏ hơn số ngày tối thiểu.';
  }
  const minTemp = parseOptionalNumber(form.minTempC);
  const maxTemp = parseOptionalNumber(form.maxTempC);
  if (minTemp !== null && maxTemp !== null && minTemp > maxTemp) {
    errors.maxTempC = 'Nhiệt độ tối đa không được nhỏ hơn nhiệt độ tối thiểu.';
  }

  if (!withinLength(form.reasonVi, 1, 240)) errors.reasonVi = 'Lý do tiếng Việt cần từ 1 đến 240 ký tự.';
  if (!withinLength(form.reasonEn, 1, 240)) errors.reasonEn = 'Lý do tiếng Anh cần từ 1 đến 240 ký tự.';
  if (form.items.length === 0) errors.items = 'Thêm ít nhất một vật dụng đầu ra.';
  if (form.items.length > 50) errors.items = 'Mỗi quy tắc có tối đa 50 vật dụng.';

  const itemKeys = new Set<string>();
  form.items.forEach((item, index) => {
    const prefix = `items.${index}`;
    validateStableKey(errors, `${prefix}.categoryKey`, item.categoryKey, 80, 'Mã nhóm');
    validateStableKey(errors, `${prefix}.itemKey`, item.itemKey, 100, 'Mã vật dụng');
    validateText(errors, `${prefix}.categoryNameVi`, item.categoryNameVi, 80, 'Tên nhóm tiếng Việt');
    validateText(errors, `${prefix}.categoryNameEn`, item.categoryNameEn, 80, 'Tên nhóm tiếng Anh');
    validateText(errors, `${prefix}.itemNameVi`, item.itemNameVi, 120, 'Tên vật dụng tiếng Việt');
    validateText(errors, `${prefix}.itemNameEn`, item.itemNameEn, 120, 'Tên vật dụng tiếng Anh');
    const quantity = parseInteger(item.baseQuantity);
    if (quantity === null || quantity < 1 || quantity > 99) {
      errors[`${prefix}.baseQuantity`] = 'Số lượng cần là số nguyên từ 1 đến 99.';
    }
    if (item.noteVi.trim().length > 500) errors[`${prefix}.noteVi`] = 'Ghi chú tối đa 500 ký tự.';
    if (item.noteEn.trim().length > 500) errors[`${prefix}.noteEn`] = 'Ghi chú tối đa 500 ký tự.';

    const combinedKey = `${item.categoryKey.trim()}:${item.itemKey.trim()}`;
    if (itemKeys.has(combinedKey)) {
      errors[`${prefix}.itemKey`] = 'Mã nhóm và mã vật dụng không được trùng trong cùng quy tắc.';
    }
    itemKeys.add(combinedKey);
  });
  return errors;
}

export function packingRuleFormToInput(form: PackingRuleFormState): PackingRuleInput {
  return {
    key: form.key.trim(),
    name: form.name.trim(),
    priority: parseInteger(form.priority) ?? 100,
    tripType: form.tripType || null,
    minDays: parseOptionalNumber(form.minDays),
    maxDays: parseOptionalNumber(form.maxDays),
    minTempC: parseOptionalNumber(form.minTempC),
    maxTempC: parseOptionalNumber(form.maxTempC),
    minRainPercent: parseOptionalNumber(form.minRainPercent),
    activityKey: form.activityKey.trim() || null,
    reasonVi: form.reasonVi.trim(),
    reasonEn: form.reasonEn.trim(),
    items: form.items.map((item, index) => ({
      categoryKey: item.categoryKey.trim(),
      categoryNameVi: item.categoryNameVi.trim(),
      categoryNameEn: item.categoryNameEn.trim(),
      itemKey: item.itemKey.trim(),
      itemNameVi: item.itemNameVi.trim(),
      itemNameEn: item.itemNameEn.trim(),
      quantityMode: item.quantityMode,
      baseQuantity: parseInteger(item.baseQuantity) ?? 1,
      noteVi: item.noteVi.trim() || null,
      noteEn: item.noteEn.trim() || null,
      position: index,
    })),
  };
}

export function packingRuleFormToUpdateInput(
  form: PackingRuleFormState,
): Omit<PackingRuleInput, 'key'> {
  const input = packingRuleFormToInput(form);
  return {
    name: input.name,
    priority: input.priority,
    tripType: input.tripType ?? null,
    minDays: input.minDays ?? null,
    maxDays: input.maxDays ?? null,
    minTempC: input.minTempC ?? null,
    maxTempC: input.maxTempC ?? null,
    minRainPercent: input.minRainPercent ?? null,
    activityKey: input.activityKey ?? null,
    reasonVi: input.reasonVi,
    reasonEn: input.reasonEn,
    items: input.items,
  };
}

export function isPackingRuleFormDirty(
  form: PackingRuleFormState,
  initial: PackingRuleFormState,
): boolean {
  return JSON.stringify(form) !== JSON.stringify(initial);
}

function validateStableKey(
  errors: PackingRuleFormErrors,
  field: string,
  value: string,
  max: number,
  label: string,
): void {
  if (!new RegExp(`^[a-z0-9-]{1,${max}}$`).test(value.trim())) {
    errors[field] = `${label} dùng chữ thường, số hoặc dấu gạch ngang.`;
  }
}

function validateText(
  errors: PackingRuleFormErrors,
  field: string,
  value: string,
  max: number,
  label: string,
): void {
  if (!withinLength(value, 1, max)) errors[field] = `${label} cần từ 1 đến ${max} ký tự.`;
}

function validateOptionalNumber(
  errors: PackingRuleFormErrors,
  field: string,
  value: string,
): void {
  if (value.trim() && parseOptionalNumber(value) === null) errors[field] = 'Nhập một giá trị số hợp lệ.';
}

function validateOptionalRange(
  errors: PackingRuleFormErrors,
  field: string,
  value: string,
  min: number,
  max: number,
  integer: boolean,
): void {
  if (!value.trim()) return;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed)) || parsed < min || parsed > max) {
    errors[field] = `Giá trị cần nằm trong khoảng ${min}–${max === Number.MAX_SAFE_INTEGER ? '∞' : max}.`;
  }
}

function parseInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function withinLength(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

function stringValue(value: number | null): string {
  return value === null ? '' : String(value);
}
