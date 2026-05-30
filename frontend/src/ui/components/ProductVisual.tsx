import type { CSSProperties } from 'react';
import type { Product } from '@/types';

interface ProductVisualProps {
  product?: Partial<Product>;
  label?: string;
  className?: string;
  imageUrl?: string;
}

export function ProductVisual({ product, label = 'CSM', className = '', imageUrl }: ProductVisualProps) {
  const colors = product?.colors?.length ? product.colors : ['#7a1e1e', '#c4923a', '#0f5b45'];
  const visualUrl = imageUrl || product?.images?.[0];
  const style = {
    '--pv-a': colors[0] || '#7a1e1e',
    '--pv-b': colors[1] || '#c4923a',
    '--pv-c': colors[2] || '#0f5b45',
  } as CSSProperties;

  return (
    <div className={`product-visual ${visualUrl ? 'has-photo' : ''} ${className}`} style={style}>
      {visualUrl ? (
        <img src={visualUrl} alt={product?.name || 'CSM silk textile'} loading="lazy" />
      ) : (
        <>
          <div className="product-visual-weave" />
          <div className="product-visual-fold left" />
          <div className="product-visual-fold right" />
          <div className="product-visual-label">{label}</div>
        </>
      )}
    </div>
  );
}
