export default function AdminLoading() {
  return (
    <div className="p-4 md:p-6">
      <div className="h-7 w-40 animate-pulse rounded bg-surface-alt" />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
        ))}
      </div>
      <div className="mt-4 h-64 animate-pulse rounded-xl bg-surface-alt" />
    </div>
  );
}
