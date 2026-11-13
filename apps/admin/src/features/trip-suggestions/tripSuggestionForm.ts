import type { TripSuggestion, TripSuggestionInput, TripType } from '@/api/types';

export type TripSuggestionFormState = {
  slug: string;
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
  destinationLabel: string;
  providerPlaceId: string;
  latitude: string;
  longitude: string;
  destinationTimezone: string;
  countryCode: string;
  adminArea: string;
  country: string;
  imageUrl: string;
  imageAltVi: string;
  imageAltEn: string;
  tags: string;
  tripType: TripType | '';
  suggestedDurationDays: string;
  sortOrder: string;
};

export type TripSuggestionFormErrors = Record<string, string>;

export function emptyTripSuggestionForm(): TripSuggestionFormState {
  return {
    slug: '', titleVi: '', titleEn: '', summaryVi: '', summaryEn: '', destinationLabel: '',
    providerPlaceId: '', latitude: '', longitude: '', destinationTimezone: '', countryCode: '',
    adminArea: '', country: '', imageUrl: '', imageAltVi: '', imageAltEn: '', tags: '',
    tripType: '', suggestedDurationDays: '3', sortOrder: '0',
  };
}

export function tripSuggestionToForm(value: TripSuggestion): TripSuggestionFormState {
  return {
    slug: value.slug,
    titleVi: value.titleVi,
    titleEn: value.titleEn,
    summaryVi: value.summaryVi,
    summaryEn: value.summaryEn,
    destinationLabel: value.destinationLabel,
    providerPlaceId: value.providerPlaceId ?? '',
    latitude: value.latitude == null ? '' : String(value.latitude),
    longitude: value.longitude == null ? '' : String(value.longitude),
    destinationTimezone: value.destinationTimezone ?? '',
    countryCode: value.countryCode ?? '',
    adminArea: value.adminArea ?? '',
    country: value.country ?? '',
    imageUrl: value.imageUrl,
    imageAltVi: value.imageAltVi,
    imageAltEn: value.imageAltEn,
    tags: value.tags.join(', '),
    tripType: value.tripType ?? '',
    suggestedDurationDays: String(value.suggestedDurationDays),
    sortOrder: String(value.sortOrder),
  };
}

export function validateTripSuggestionForm(form: TripSuggestionFormState): TripSuggestionFormErrors {
  const errors: TripSuggestionFormErrors = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()) || form.slug.trim().length > 100) errors.slug = 'Mã đường dẫn dùng chữ thường, số và dấu gạch ngang; tối đa 100 ký tự.';
  validateText(errors, 'titleVi', form.titleVi, 160, 'Tiêu đề tiếng Việt');
  validateText(errors, 'titleEn', form.titleEn, 160, 'Tiêu đề tiếng Anh');
  validateText(errors, 'summaryVi', form.summaryVi, 500, 'Tóm tắt tiếng Việt');
  validateText(errors, 'summaryEn', form.summaryEn, 500, 'Tóm tắt tiếng Anh');
  validateText(errors, 'destinationLabel', form.destinationLabel, 160, 'Điểm đến');
  validateText(errors, 'imageAltVi', form.imageAltVi, 200, 'Mô tả ảnh tiếng Việt');
  validateText(errors, 'imageAltEn', form.imageAltEn, 200, 'Mô tả ảnh tiếng Anh');
  if (!isHttpUrl(form.imageUrl) || form.imageUrl.trim().length > 500) errors.imageUrl = 'Ảnh cần là đường dẫn http(s) hợp lệ, tối đa 500 ký tự.';

  const latitude = optionalNumber(form.latitude);
  const longitude = optionalNumber(form.longitude);
  if ((latitude === null) !== (longitude === null)) errors.coordinates = 'Vĩ độ và kinh độ phải được nhập cùng nhau.';
  if (form.latitude.trim() && (latitude === null || latitude < -90 || latitude > 90)) errors.latitude = 'Vĩ độ cần nằm trong khoảng -90 đến 90.';
  if (form.longitude.trim() && (longitude === null || longitude < -180 || longitude > 180)) errors.longitude = 'Kinh độ cần nằm trong khoảng -180 đến 180.';
  if (form.countryCode.trim() && !/^[A-Za-z]{2}$/.test(form.countryCode.trim())) errors.countryCode = 'Mã quốc gia cần đúng 2 chữ cái.';

  const duration = integer(form.suggestedDurationDays);
  if (duration === null || duration < 1 || duration > 30) errors.suggestedDurationDays = 'Thời lượng cần là số nguyên từ 1 đến 30 ngày.';
  if (integer(form.sortOrder) === null) errors.sortOrder = 'Thứ tự cần là số nguyên.';
  const tags = parseTags(form.tags);
  if (tags.length > 20) errors.tags = 'Tối đa 20 thẻ phân loại.';
  if (tags.some((tag) => tag.length > 40)) errors.tags = 'Mỗi thẻ phân loại tối đa 40 ký tự.';
  return errors;
}

export function tripSuggestionFormToInput(form: TripSuggestionFormState): TripSuggestionInput {
  return {
    slug: form.slug.trim(),
    titleVi: form.titleVi.trim(), titleEn: form.titleEn.trim(),
    summaryVi: form.summaryVi.trim(), summaryEn: form.summaryEn.trim(),
    destinationLabel: form.destinationLabel.trim(),
    providerPlaceId: form.providerPlaceId.trim() || null,
    latitude: optionalNumber(form.latitude), longitude: optionalNumber(form.longitude),
    destinationTimezone: form.destinationTimezone.trim() || null,
    countryCode: form.countryCode.trim().toUpperCase() || null,
    adminArea: form.adminArea.trim() || null, country: form.country.trim() || null,
    imageUrl: form.imageUrl.trim(), imageAltVi: form.imageAltVi.trim(), imageAltEn: form.imageAltEn.trim(),
    tags: parseTags(form.tags), tripType: form.tripType || null,
    suggestedDurationDays: integer(form.suggestedDurationDays) ?? 3,
    sortOrder: integer(form.sortOrder) ?? 0,
  };
}

export function isTripSuggestionFormDirty(form: TripSuggestionFormState, initial: TripSuggestionFormState): boolean {
  return JSON.stringify(form) !== JSON.stringify(initial);
}

function validateText(errors: TripSuggestionFormErrors, key: string, value: string, max: number, label: string) {
  const length = value.trim().length;
  if (length < 1 || length > max) errors[key] = `${label} cần từ 1 đến ${max} ký tự.`;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}
