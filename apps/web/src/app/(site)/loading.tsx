export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="h-40 animate-pulse rounded-[2rem] bg-sand/70" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-sand/50" />)}
      </div>
    </div>
  );
}
