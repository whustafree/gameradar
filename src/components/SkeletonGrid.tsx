export default function SkeletonGrid() {
  return (
    <div className="skeleton-grid">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-img" />
          <div className="skeleton-body">
            <div className="skeleton-line" style={{ width: '70%' }} />
            <div className="skeleton-line" />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
