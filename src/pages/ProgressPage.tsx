import React from 'react';

const ProgressView = React.lazy(() =>
  import('@/components/progress/ProgressView').then((m) => ({ default: m.ProgressView }))
);

export function ProgressPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[var(--text-muted)] font-mono">
          Loading analytics engine...
        </div>
      }
    >
      <ProgressView />
    </React.Suspense>
  );
}
