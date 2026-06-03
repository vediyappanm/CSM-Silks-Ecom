import { useEffect, useRef, useState } from 'react';
import { connectCatalogRealtime, type CatalogRealtimeMessage, type RealtimeStatus } from '@/lib/realtime';
import type { Product } from '@/types';

type CatalogLiveOptions = {
  enabled?: boolean;
  gender?: Product['gender'];
  productId?: number;
  slug?: string;
  delayMs?: number;
  onUpdate: (message: CatalogRealtimeMessage) => void;
};

export function useCatalogLiveRefresh({
  enabled = true,
  gender,
  productId,
  slug,
  delayMs = 350,
  onUpdate,
}: CatalogLiveOptions) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const onUpdateRef = useRef(onUpdate);
  const timerRef = useRef(0);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const disconnect = connectCatalogRealtime({
      onStatus: setStatus,
      onMessage: message => {
        if (message.type === 'connection' || message.type === 'pong') return;
        const messageGender = message.product?.gender || message.gender;
        const matchesGender = !gender || !messageGender || messageGender === gender || messageGender === 'unisex';
        const matchesProduct = !productId && !slug
          ? true
          : (Boolean(productId) && message.product_id === productId)
            || (Boolean(productId) && message.product?.id === productId)
            || (Boolean(slug) && message.slug === slug)
            || (Boolean(slug) && message.product?.slug === slug);

        if (!matchesGender || !matchesProduct) return;
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => onUpdateRef.current(message), delayMs);
      },
    });

    return () => {
      window.clearTimeout(timerRef.current);
      disconnect();
    };
  }, [delayMs, enabled, gender, productId, slug]);

  return enabled ? status : 'unavailable';
}
