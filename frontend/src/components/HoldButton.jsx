import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './HoldButton.css';

const HIT_PAD = 10;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function HoldButton({
  children = 'Hold to delete',
  doneLabel = 'Deleted',
  icon = null,
  doneIcon = null,
  backgroundColor = '#27272a',
  fillColor = '#5227ff',
  textColor = '#f5f5f5',
  fillTextColor = '#ffffff',
  size = 'md',
  radius = 14,
  holdTime = 2000,
  releaseTime = 200,
  disabled = false,
  onHold,
  className = '',
}) {
  const [phase, setPhase] = useState('idle');
  const [input, setInput] = useState(null);
  const phaseRef = useRef('idle');
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const gesture = useRef({ pointerId: null, rect: null });
  const motion = useRef({ raf: 0, p: 0 });
  const hintId = useId();

  const go = (next, kind = null) => {
    phaseRef.current = next;
    inputRef.current = kind;
    setPhase(next);
    setInput(kind);
  };

  const drive = (to, duration) => {
    const m = motion.current;
    cancelAnimationFrame(m.raf);
    const from = m.p;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      m.p = from + (to - from) * (to === 1 ? t : easeOut(t));
      buttonRef.current?.style.setProperty('--hb-p', m.p.toFixed(4));
      if (t < 1) {
        m.raf = requestAnimationFrame(step);
      } else {
        m.raf = 0;
        if (to === 1 && phaseRef.current === 'holding') {
          go('done', inputRef.current);
          onHold();
        }
      }
    };
    m.raf = requestAnimationFrame(step);
  };

  const begin = (kind) => {
    if (disabled || phaseRef.current !== 'idle' || !buttonRef.current) return false;
    gesture.current.rect = buttonRef.current.getBoundingClientRect();
    go('holding', kind);
    drive(1, holdTime);
    return true;
  };

  const release = () => {
    if (phaseRef.current !== 'holding') return;
    go('idle');
    drive(0, releaseTime);
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;

  const endPointer = (event) => {
    if (event.pointerId !== gesture.current.pointerId) return;
    gesture.current.pointerId = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    release();
  };

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const measure = () => {
      button.style.setProperty('--hb-w', `${button.offsetWidth}px`);
      button.style.setProperty('--hb-h', `${button.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== 'holding') return undefined;
    const cancel = () => {
      const pointerId = gesture.current.pointerId;
      gesture.current.pointerId = null;
      if (pointerId !== null && buttonRef.current?.hasPointerCapture(pointerId)) buttonRef.current.releasePointerCapture(pointerId);
      releaseRef.current();
    };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [phase]);

  useEffect(() => () => cancelAnimationFrame(motion.current.raf), []);

  const labels = <>
    <span className="hold-button__idle" aria-hidden={phase === 'done'}>{icon && <span className="hold-button__icon">{icon}</span>}{children}</span>
    <span className="hold-button__done" aria-hidden={phase !== 'done'}>{doneIcon && <span className="hold-button__icon">{doneIcon}</span>}{doneLabel}</span>
  </>;

  return <button ref={buttonRef} type="button" disabled={disabled}
    className={`hold-button hold-button--${size}${className ? ` ${className}` : ''}`}
    data-phase={phase} data-input={input || undefined} aria-describedby={hintId}
    style={{ '--hb-radius': `${radius}px`, '--hb-bg': backgroundColor, '--hb-fill': fillColor,
      '--hb-text': textColor, '--hb-fill-text': fillTextColor, '--hb-hold': `${holdTime}ms`,
      '--hb-release': `${releaseTime}ms`, '--hb-cycles': holdTime / 1100 }}
    onPointerDown={(event) => {
      if (event.button !== 0 || !event.isPrimary || gesture.current.pointerId !== null || !begin('pointer')) return;
      gesture.current.pointerId = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const rect = gesture.current.rect;
      if (event.pointerId === gesture.current.pointerId && rect &&
        (event.clientX < rect.left - HIT_PAD || event.clientX > rect.right + HIT_PAD ||
          event.clientY < rect.top - HIT_PAD || event.clientY > rect.bottom + HIT_PAD)) endPointer(event);
    }}
    onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={endPointer}
    onPointerLeave={(event) => { if (event.pointerType !== 'touch') endPointer(event); }}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && inputRef.current === 'key') release();
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (!event.repeat) begin('key');
      }
    }}
    onKeyUp={(event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (inputRef.current === 'key') release();
      }
    }}
    onBlur={() => { if (inputRef.current === 'key') release(); }}
    onContextMenu={(event) => event.preventDefault()}>
    <span className="hold-button__pulse" aria-hidden="true"/>
    <span className="hold-button__label">{labels}</span>
    <span className="hold-button__clip" aria-hidden="true">
      <span className="hold-button__fill"><span className="hold-button__label hold-button__label--fill">{labels}</span></span>
      <span className="hold-button__crest"><span className="hold-button__label hold-button__label--fill">{labels}</span></span>
    </span>
    <span id={hintId} className="hold-button__sr">Press and hold for {holdTime / 1000} seconds to confirm</span>
  </button>;
}
