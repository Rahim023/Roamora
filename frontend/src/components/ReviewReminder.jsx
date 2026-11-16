import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Star, X } from 'lucide-react';
import { endpoints, errorMessage } from '../api.js';
import { adminBookingReference } from '../adminDisplay.js';
import { popupOverlayMotion, popupPanelMotion } from './popupMotion.js';
import './PasswordResetModal.css';
import './ReviewExperience.css';

export default function ReviewReminder({ user, loginRevision, pathname }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const path = useRef(pathname);
  const id = useId();
  const reduceMotion = useReducedMotion();
  path.current = pathname;

  useEffect(() => {
    let active = true;
    setItems([]);
    setError('');
    if (!user || !loginRevision) return () => { active = false; };
    endpoints.pendingReviews().then(({ data }) => {
      if (active && !path.current.startsWith('/review/')) setItems(data.items);
    }).catch((failure) => {
      if (active) setError(errorMessage(failure, 'Review reminders could not be loaded.'));
    });
    return () => { active = false; };
  }, [user?.id, user?._id, loginRevision]);

  useEffect(() => { if (pathname.startsWith('/review/')) setItems([]); }, [pathname]);
  useEffect(() => {
    if (!items.length) return undefined;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [items.length > 0]);

  const keyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); setItems([]); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.current.querySelectorAll('button:not(:disabled), a[href]')];
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  };

  if (error) return <div className="review-reminder-error" role="alert">{error} <button type="button" onClick={() => setError('')}>Dismiss</button></div>;
  if (!items.length || pathname.startsWith('/review/')) return null;
  return <motion.div className="reset-overlay" onKeyDown={keyDown} {...popupOverlayMotion(reduceMotion)}>
    <motion.div ref={dialog} className="reset-dialog review-reminder" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} {...popupPanelMotion(reduceMotion)}>
      <button type="button" className="reset-close" onClick={() => setItems([])} aria-label="Close review reminder"><X size={20}/></button>
      <div className="review-reminder-icon"><Star size={24}/></div>
      <div className="review-kicker">WELCOME BACK · YOUR TRAVEL STORIES</div>
      <h2 id={`${id}-title`}>The journey may be over.<br/><em>The story isn’t.</em></h2>
      <p id={`${id}-description`}>How was your trip? Share your experience to help other travellers find theirs.</p>
      <div className="review-reminder-list">{items.map((item) => <Link key={item._id || item.id} to={`/review/${item._id || item.id}`} onClick={() => setItems([])}><span><strong>{item.packageSnapshot?.title || 'Your journey'}</strong><small>{item.packageSnapshot?.destination} · {pathname.startsWith('/admin') ? adminBookingReference(item) : item.bookingReference}</small></span><ArrowRight size={17}/></Link>)}</div>
      <button type="button" className="review-later" onClick={() => setItems([])}>Maybe later</button>
    </motion.div>
  </motion.div>;
}
