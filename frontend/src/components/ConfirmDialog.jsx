import { useEffect, useId, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';
import { popupOverlayMotion, popupPanelMotion } from './popupMotion.js';
import './PasswordResetModal.css';

export default function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose, hideCancel = false }) {
  const dialog = useRef(null);
  const confirmed = useRef(false);
  const id = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector(hideCancel ? '.confirm-dialog-confirm' : '.confirm-dialog-cancel')?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [hideCancel]);

  const keyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
    if (!buttons.length) { event.preventDefault(); return; }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };

  const confirm = () => {
    if (confirmed.current) return;
    confirmed.current = true;
    onConfirm();
  };

  return <motion.div className="reset-overlay" onKeyDown={keyDown} {...popupOverlayMotion(reduceMotion)}>
    <motion.div ref={dialog} className="reset-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} {...popupPanelMotion(reduceMotion)}>
      <button type="button" className="reset-close" onClick={onClose} aria-label="Close confirmation"><X size={20}/></button>
      <div className="reset-icon" aria-hidden="true"><ShieldCheck size={23}/></div>
      <div className="reset-kicker">ROAMORA · PLEASE CONFIRM</div>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`} className="reset-description">{description}</p>
      <div className="confirm-dialog-actions">
        {!hideCancel && <button type="button" className="button button-outline confirm-dialog-cancel" onClick={onClose}>Cancel</button>}
        <button type="button" className="button button-dark confirm-dialog-confirm" onClick={confirm}>{confirmLabel}</button>
      </div>
    </motion.div>
  </motion.div>;
}
