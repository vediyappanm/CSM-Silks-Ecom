export function Ticker() {
  const items = [
    '🪡 Pure Kanjivaram Silk', '💍 Bridal Collections', '✨ Handcrafted Zari',
    '🏷 Free Blouse Included', '👔 Men\'s Silk Dhotis', '🚚 Pan India Shipping',
    '📄 GST Invoice Provided', '⭐ GI Tagged Authentic', '🔄 15-Day Easy Returns',
    '🪡 Pure Kanjivaram Silk', '💍 Bridal Collections', '✨ Handcrafted Zari',
    '🏷 Free Blouse Included', '👔 Men\'s Silk Dhotis', '🚚 Pan India Shipping',
    '📄 GST Invoice Provided', '⭐ GI Tagged Authentic', '🔄 15-Day Easy Returns',
  ];
  return (
    <div className="ticker">
      <div className="ticker-inner">
        {items.map((item, i) => (
          <div key={i} className="ti">
            {item}
            <div className="ti-dot" />
          </div>
        ))}
      </div>
    </div>
  );
}
