import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, Check, LoaderCircle, ShieldCheck, Ticket, Trash2, X } from 'lucide-react';
import { endpoints, errorMessage } from '../api.js';
import FuseButton from './FuseButton.jsx';
import { popupOverlayMotion, popupPanelMotion } from './popupMotion.js';
import './CancelBookingModal.css';

const UNDO_WINDOW = 3000;

export default function CancelBookingModal({ booking, onClose, onRefresh }) {
  const [phase, setPhase] = useState('idle');
  const [state, setState] = useState('ready');
  const [error, setError] = useState('');
  const [undone, setUndone] = useState(false);
  const dialog = useRef(null);
  const inFlight = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('.cancel-modal-close')?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'armed' && state !== 'submitting') return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase, state]);

  useEffect(() => {
    if (state === 'submitting') dialog.current?.focus();
    if (state === 'success') dialog.current?.querySelector('.cancel-modal-done')?.focus();
  }, [state]);

  const keyDown = (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented && state !== 'submitting') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.current.querySelectorAll('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };

  const commit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError('');
    setState('submitting');
    try {
      await endpoints.cancelOrder(booking.id);
      setState('success');
      onRefresh();
    } catch (failure) {
      const status = failure.response?.status;
      setError(status >= 400 && status < 500
        ? errorMessage(failure, 'Your booking could not be cancelled.')
        : 'We could not confirm the cancellation. Check My trips before trying again.');
      setState('ready');
      onRefresh();
    } finally {
      inFlight.current = false;
    }
  };

  const phaseChange = (next) => {
    setPhase(next);
    if (next === 'armed') { setError(''); setUndone(false); }
  };

  return <motion.div className="cancel-modal-overlay" onKeyDown={keyDown} {...popupOverlayMotion(reduceMotion)}>
    <motion.div ref={dialog} className="cancel-modal" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="cancel-modal-title" aria-describedby="cancel-modal-description"
      {...popupPanelMotion(reduceMotion)}>
      <button type="button" className="cancel-modal-close" onClick={onClose} disabled={state === 'submitting'} aria-label="Close cancellation"><X size={19}/></button>
      <div className={`cancel-modal-icon${state === 'success' ? ' is-success' : ''}`} aria-hidden="true">{state === 'success' ? <Check size={23}/> : <Trash2 size={22}/>}</div>
      <div className="cancel-modal-eyebrow">YOUR JOURNEY · YOUR CHOICE</div>
      <h2 id="cancel-modal-title">{state === 'success' ? 'Booking cancelled.' : 'A change of plans?'}</h2>
      <p id="cancel-modal-description">{state === 'success'
        ? 'Your cancellation has been confirmed. You can see the updated status in My trips.'
        : 'You can stop the cancellation during the countdown. Your booking will not be cancelled until the countdown ends.'}</p>
      <div className="cancel-modal-booking">
        <span className="cancel-modal-booking-icon"><Ticket size={18}/></span>
        <div><small>YOUR BOOKING</small><strong>{booking.title}</strong>
          {booking.reference && <span>{booking.reference}</span>}
          {booking.date && <span><CalendarDays size={13}/> {new Date(booking.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>}
        </div>
      </div>
      {state !== 'success' && <p className="cancel-modal-policy"><ShieldCheck size={16}/> Cancellation and any refund are subject to your booking policy.</p>}
      {undone && state === 'ready' && <p className="cancel-modal-notice" role="status"><Check size={16}/> Cancellation stopped. Your booking is unchanged.</p>}
      {error && <p className="cancel-modal-error" role="alert">{error}</p>}
      {state === 'success' ? <button type="button" className="button button-dark cancel-modal-done" onClick={onClose}>Back to my trips</button>
        : <div className="cancel-modal-actions">
          <button type="button" className="cancel-modal-keep" disabled={state === 'submitting'} onClick={onClose}>Keep booking</button>
          {state === 'submitting' ? <div className="cancel-modal-submitting" role="status"><LoaderCircle className="spin" size={16}/> Cancelling…</div>
            : <FuseButton label="Cancel booking" undoLabel="Undo cancellation" icon={<Trash2 size={15}/>} color="var(--cancel-action-ink)" background="var(--cancel-action-bg)" fuseColor="#ecc98b" size="md" radius={12} undoWindow={UNDO_WINDOW} commitOn="fuseEnd" pauseOnHover={false} onCommit={commit} onUndo={() => setUndone(true)} onPhaseChange={phaseChange}/>}
        </div>}
      {state !== 'success' && <p className="cancel-modal-footnote">{phase === 'armed'
        ? `Undo within ${UNDO_WINDOW / 1000} seconds, or close this window to keep your booking.`
        : `After choosing cancel, you have ${UNDO_WINDOW / 1000} seconds to undo. Keep this page open until confirmed.`}</p>}
    </motion.div>
  </motion.div>;
}
