import { Sparkles } from 'lucide-react';

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark-wrap ${compact ? 'compact' : ''}`}>
      <div className="brand-mark" aria-hidden="true">
        <Sparkles size={compact ? 15 : 18} strokeWidth={2.4} />
      </div>
      {!compact && (
        <div>
          <div className="brand-name">CSM Silks</div>
          <div className="brand-sub">Kanchipuram since 1987</div>
        </div>
      )}
    </div>
  );
}
