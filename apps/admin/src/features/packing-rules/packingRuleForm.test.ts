import { describe, expect, it } from 'vitest';

import {
  emptyPackingRuleForm,
  packingRuleFormToInput,
  validatePackingRuleForm,
} from './packingRuleForm';

function validForm() {
  const form = emptyPackingRuleForm();
  form.key = 'rainy-weather';
  form.name = 'Đồ dùng khi trời mưa';
  form.reasonVi = 'Dự báo có mưa trong chuyến đi.';
  form.reasonEn = 'Rain is expected during the trip.';
  form.items[0] = {
    ...form.items[0]!,
    categoryKey: 'weather',
    categoryNameVi: 'Thời tiết',
    categoryNameEn: 'Weather',
    itemKey: 'rain-jacket',
    itemNameVi: 'Áo mưa',
    itemNameEn: 'Rain jacket',
  };
  return form;
}

describe('packingRuleForm', () => {
  it('normalizes a valid bilingual rule into the API payload', () => {
    const form = validForm();
    form.tripType = 'HIKING';
    form.minDays = '2';
    form.maxDays = '7';
    form.items[0]!.quantityMode = 'PER_DAY';

    expect(validatePackingRuleForm(form)).toEqual({});
    expect(packingRuleFormToInput(form)).toMatchObject({
      key: 'rainy-weather',
      minDays: 2,
      maxDays: 7,
      tripType: 'HIKING',
      items: [{ itemKey: 'rain-jacket', position: 0, quantityMode: 'PER_DAY' }],
    });
  });

  it('rejects reversed ranges, blank integers and duplicate output keys', () => {
    const form = validForm();
    form.priority = '';
    form.minDays = '8';
    form.maxDays = '3';
    form.items.push({ ...form.items[0]!, clientId: 'duplicate' });

    const errors = validatePackingRuleForm(form);

    expect(errors.priority).toBeDefined();
    expect(errors.maxDays).toContain('không được nhỏ hơn');
    expect(errors['items.1.itemKey']).toContain('không được trùng');
  });

  it('requires localized names and explanations', () => {
    const form = validForm();
    form.reasonEn = '';
    form.items[0]!.categoryNameEn = '';
    form.items[0]!.itemNameVi = '';

    const errors = validatePackingRuleForm(form);

    expect(errors.reasonEn).toBeDefined();
    expect(errors['items.0.categoryNameEn']).toBeDefined();
    expect(errors['items.0.itemNameVi']).toBeDefined();
  });
});
