export const moneyMinorValidator = {
  validator: Number.isSafeInteger,
  message: '{PATH} must be an integer amount in minor currency units.',
};

export function coordinateValidator(value) {
  return value == null || (Number.isFinite(value) && value >= -90 && value <= 90);
}

export function longitudeValidator(value) {
  return value == null || (Number.isFinite(value) && value >= -180 && value <= 180);
}

export function uniqueObjectIds(values) {
  return values.length === new Set(values.map((value) => String(value))).size;
}

export const currencyField = {
  type: String,
  required: true,
  uppercase: true,
  match: /^[A-Z]{3}$/,
  default: 'CAD',
};
