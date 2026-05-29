export function Ticker() {
  const items = [
    'Pure Kanjivaram silk',
    'Bridal collections',
    'Handcrafted zari',
    'Free blouse on sarees',
    "Men's silk dhotis",
    'Pan-India shipping',
    'GST invoice',
    '15-day returns',
  ];
  const loop = [...items, ...items];

  return (
    <div className="ticker">
      <div className="ticker-inner">
        {loop.map((item, index) => (
          <div key={`${item}-${index}`} className="ti">
            {item}
            <div className="ti-dot" />
          </div>
        ))}
      </div>
    </div>
  );
}
