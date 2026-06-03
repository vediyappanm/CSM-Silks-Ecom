export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="pg skeleton-grid" aria-label="Loading products">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="product-skeleton">
          <div className="product-skeleton-media" />
          <div className="product-skeleton-line wide" />
          <div className="product-skeleton-line" />
          <div className="product-skeleton-bottom">
            <div className="product-skeleton-line price" />
            <div className="product-skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  );
}
