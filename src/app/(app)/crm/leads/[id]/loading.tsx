export default function LeadFichaLoading() {
  return (
    <div className="max-w-[1200px] animate-pulse">
      {/* Back link */}
      <div className="h-5 w-16 bg-muted rounded mb-6" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-muted rounded" />
          <div className="h-5 w-32 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-8 w-24 bg-muted rounded" />
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left card */}
        <div className="rounded-xl border bg-card p-5 space-y-3 h-fit">
          <div className="h-4 w-24 bg-muted rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 bg-muted/60 rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-20 w-full bg-muted/50 rounded" />
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-12 w-full bg-muted/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
