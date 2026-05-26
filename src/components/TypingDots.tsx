export function TypingDots() {
  return (
    <div className="bg-white border border-blush-200/60 rounded-3xl rounded-bl-md px-4 py-3 shadow-bubble flex items-end gap-1">
      <Dot delay="0s" /><Dot delay=".15s" /><Dot delay=".3s" />
    </div>
  );
}
function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-lavender-600/80 animate-bounce"
      style={{ animationDelay: delay, animationDuration: '1s' }}
    />
  );
}
