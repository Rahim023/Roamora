import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function ThoughtLine({ startedAt, elapsed }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (elapsed !== undefined) return undefined;
    const update = () => setSeconds((performance.now() - startedAt) / 1000);
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [startedAt, elapsed]);
  const working = elapsed === undefined;
  return <div className={`thought-line${working ? ' is-working' : ''}`} role={working ? 'status' : undefined}>
    <Sparkles size={14} aria-hidden="true"/>
    <span>{working ? 'Thinking' : 'Thought for'} <span aria-hidden={working ? 'true' : undefined}>{working ? seconds.toFixed(1) : elapsed.toFixed(1)}s</span></span>
  </div>;
}
