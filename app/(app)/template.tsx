/**
 * Templates remount on every navigation (layouts don't), so this replays a
 * short fade + rise for each page. CSS only; input is never blocked; static
 * under prefers-reduced-motion. The end state is `transform: none`, so fixed
 * or sticky descendants behave normally once it settles.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
