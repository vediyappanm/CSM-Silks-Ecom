import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  DELIVERY_PIN_EVENT,
  getDeliveryPin,
  isValidDeliveryPin,
  normalizeDeliveryPin,
  setDeliveryPin,
} from '@/lib/deliveryPin';
import type { DeliveryCheck } from '@/types';

type DeliveryStatus = 'idle' | 'checking' | 'ready' | 'error';

type UseDeliveryCheckOptions = {
  enabled?: boolean;
  debounceMs?: number;
};

export function useDeliveryCheck(slug?: string, options: UseDeliveryCheckOptions = {}) {
  const { enabled = true, debounceMs = 450 } = options;
  const [pinCode, setPinCodeState] = useState(getDeliveryPin);
  const [delivery, setDelivery] = useState<DeliveryCheck | null>(null);
  const [status, setStatus] = useState<DeliveryStatus>('idle');
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const skipDebounceRef = useRef(false);

  const setPinCode = useCallback((value: string) => {
    const next = normalizeDeliveryPin(value);
    setPinCodeState(next);
    setDeliveryPin(next);
  }, []);

  const runCheck = useCallback(async (targetPin: string) => {
    if (!slug || !enabled) return null;

    if (!isValidDeliveryPin(targetPin)) {
      setDelivery(null);
      setStatus('idle');
      setError(targetPin ? 'Enter a valid 6-digit Indian PIN code' : 'Enter your 6-digit PIN code');
      return null;
    }

    const requestId = ++requestIdRef.current;
    setStatus('checking');
    setError('');

    try {
      const result = await api.products.delivery(slug, targetPin);
      if (requestId !== requestIdRef.current) return null;
      setDelivery(result);
      setStatus('ready');
      return result;
    } catch (err) {
      if (requestId !== requestIdRef.current) return null;
      setDelivery(null);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to check delivery right now');
      return null;
    }
  }, [enabled, slug]);

  useEffect(() => {
    if (!enabled || !slug) return undefined;
    const delay = skipDebounceRef.current ? 0 : debounceMs;
    skipDebounceRef.current = false;
    const timer = window.setTimeout(() => {
      void runCheck(pinCode);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [debounceMs, enabled, pinCode, runCheck, slug]);

  const checkDelivery = useCallback(() => {
    skipDebounceRef.current = true;
    return runCheck(pinCode);
  }, [pinCode, runCheck]);

  useEffect(() => {
    const onPinChange = (event: Event) => {
      const next = normalizeDeliveryPin((event as CustomEvent<string>).detail || getDeliveryPin());
      setPinCodeState(next);
    };
    window.addEventListener(DELIVERY_PIN_EVENT, onPinChange);
    return () => window.removeEventListener(DELIVERY_PIN_EVENT, onPinChange);
  }, []);

  return {
    pinCode,
    setPinCode,
    delivery,
    status,
    error,
    checkDelivery,
    isChecking: status === 'checking',
  };
}

export function formatDeliveryEta(delivery: DeliveryCheck | null) {
  if (!delivery?.serviceable || !delivery.eta_min || !delivery.eta_max) return '';
  const min = new Date(delivery.eta_min);
  const max = new Date(delivery.eta_max);
  if (Number.isNaN(min.getTime()) || Number.isNaN(max.getTime())) return '';
  const minLabel = min.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const maxLabel = max.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${minLabel} - ${maxLabel}`;
}
