export const required = (v) => String(v ?? '').trim().length > 0;
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
export const isPositiveInt = (v) => String(v ?? '').trim() !== '' && Number.isInteger(Number(v)) && Number(v) > 0;
export const isNonNegativeInt = (v) => String(v ?? '').trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= 0;
export const isNonNegativeNumber = (v) => String(v ?? '').trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0;
