/**
 * Templates remount on every navigation (layouts don't), so this replays the
 * 0.2s page fade-in for each page. Disabled under prefers-reduced-motion.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
