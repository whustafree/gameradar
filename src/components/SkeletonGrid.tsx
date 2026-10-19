export default function SkeletonGrid() {
  const shimmerStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s ease-in-out infinite',
  };

  const shimmerStyle2: React.CSSProperties = {
    backgroundImage: 'linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2.2s ease-in-out infinite',
  };

  return (
    <>
      {/* Hero skeleton */}
      <div
        style={{
          position: 'relative',
          marginBottom: '1.25rem',
          borderRadius: '22px',
          minHeight: '200px',
          overflow: 'hidden',
          backgroundColor: 'var(--card-bg)',
          border: '0.5px solid var(--card-border)',
        }}
      >
        <div style={{ width: '100%', height: '200px', ...shimmerStyle2 }} />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '.5rem',
          }}
        >
          <div style={{ display: 'flex', gap: '.35rem', marginBottom: '.25rem' }}>
            <div style={{ width: 70, height: 18, borderRadius: 9, ...shimmerStyle }} />
            <div style={{ width: 50, height: 18, borderRadius: 9, ...shimmerStyle }} />
          </div>
          <div style={{ width: '70%', height: 22, borderRadius: 6, ...shimmerStyle2 }} />
          <div style={{ width: '45%', height: 10, borderRadius: 4, ...shimmerStyle }} />
          <div style={{ width: '30%', height: 10, borderRadius: 4, ...shimmerStyle }} />
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.35rem' }}>
            <div style={{ width: 100, height: 32, borderRadius: 16, ...shimmerStyle }} />
            <div style={{ width: 100, height: 32, borderRadius: 16, ...shimmerStyle }} />
          </div>
        </div>
        {/* Dots */}
        <div style={{ position: 'absolute', bottom: '.55rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '.35rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === 0 ? 20 : 6,
              height: 6,
              borderRadius: i === 0 ? 3 : '50%',
              ...shimmerStyle,
            }} />
          ))}
        </div>
      </div>

      {/* Skeleton horizontal section: Trending */}
      <div style={{ marginBottom: '1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem .1rem .35rem' }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, ...shimmerStyle }} />
          <div style={{ height: 12, width: '30%', borderRadius: 4, ...shimmerStyle }} />
          <div style={{ height: 8, width: '20%', borderRadius: 4, marginLeft: 'auto', ...shimmerStyle }} />
        </div>
        <div style={{ display: 'flex', gap: '.65rem', overflow: 'hidden', paddingBottom: '.3rem' }}>
          {[0, 1, 2, 3, 4].map(cardIdx => (
            <div key={cardIdx} style={{
              minWidth: 180, flexShrink: 0,
              backgroundColor: 'var(--card-bg)',
              border: '0.5px solid var(--card-border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{ width: '100%', paddingBottom: '56.25%', height: 0, ...shimmerStyle, backgroundColor: 'transparent' }} />
              <div style={{ padding: '.5rem .6rem .6rem', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                <div style={{ height: 9, width: '85%', borderRadius: 3, ...shimmerStyle }} />
                <div style={{ height: 9, width: '55%', borderRadius: 3, ...shimmerStyle }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.15rem', paddingTop: '.25rem', borderTop: '0.5px solid var(--skeleton-base)' }}>
                  <div style={{ height: 9, width: '35%', borderRadius: 3, ...shimmerStyle }} />
                  <div style={{ display: 'flex', gap: '.2rem' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', ...shimmerStyle }} />
                    <div style={{ width: 50, height: 22, borderRadius: 11, ...shimmerStyle }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton horizontal section: Timeline */}
      <div style={{ marginBottom: '1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem .1rem .35rem' }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, ...shimmerStyle }} />
          <div style={{ height: 12, width: '35%', borderRadius: 4, ...shimmerStyle }} />
        </div>
        <div style={{ display: 'flex', gap: '.6rem', overflow: 'hidden' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              minWidth: 130, flexShrink: 0,
              backgroundColor: 'var(--card-bg)',
              border: '0.5px solid var(--card-border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{ width: '100%', height: 66, ...shimmerStyle, backgroundColor: 'transparent' }} />
              <div style={{ padding: '.3rem .45rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                <div style={{ height: 8, width: '80%', borderRadius: 3, ...shimmerStyle }} />
                <div style={{ height: 8, width: '50%', borderRadius: 3, ...shimmerStyle }} />
                <div style={{ height: 2, width: '100%', borderRadius: 1, ...shimmerStyle }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid skeleton */}
      <div className="skeleton-grid">
        {[0, 1, 2, 3, 5, 6].map(i => (
          <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="skeleton-img" style={{ ...shimmerStyle }} />
            <div className="skeleton-body">
              <div className="skeleton-line" style={{ width: '80%', ...shimmerStyle }} />
              <div className="skeleton-line" style={{ width: '55%', ...shimmerStyle }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.15rem', paddingTop: '.25rem', borderTop: '0.5px solid var(--skeleton-base)' }}>
                <div className="skeleton-line short" style={{ ...shimmerStyle }} />
                <div style={{ display: 'flex', gap: '.2rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', ...shimmerStyle }} />
                  <div style={{ width: 50, height: 22, borderRadius: 11, ...shimmerStyle }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
