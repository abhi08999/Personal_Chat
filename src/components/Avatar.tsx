import { cn } from '@/lib/utils';

export function Avatar({ name, size = 40, online }: { name: string; size?: number; online?: boolean }) {
  const initials = name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '••';
  return (
    <div className="relative shrink-0">
      <div
        className="rounded-full bg-gradient-bubble-me text-white font-medium grid place-items-center shadow-bubble"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white',
            online ? 'bg-emerald-400' : 'bg-ink-700/30'
          )}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
