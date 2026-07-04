const STORAGE_KEY = 'csm_delivery_pin';
const DEFAULT_PIN = '600001';
export const DELIVERY_PIN_EVENT = 'csm:delivery-pin';

export function normalizeDeliveryPin(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function isValidDeliveryPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export function getDeliveryPin() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeDeliveryPin(stored) : DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setDeliveryPin(pin: string) {
  const normalized = normalizeDeliveryPin(pin);
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // Ignore storage failures in private mode.
  }
  window.dispatchEvent(new CustomEvent(DELIVERY_PIN_EVENT, { detail: normalized }));
  return normalized;
}
