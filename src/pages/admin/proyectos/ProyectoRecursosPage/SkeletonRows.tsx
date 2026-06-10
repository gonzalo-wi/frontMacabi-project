export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] rounded-xl bg-muted/40 animate-pulse"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}
