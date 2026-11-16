import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole, Mail, ShieldCheck, X } from 'lucide-react';
import { z } from 'zod';
import { endpoints, errorMessage } from '../api.js';
import { passwordSchema } from '../authValidation.js';
import CodeSlots from './CodeSlots.jsx';
import { popupOverlayMotion, popupPanelMotion } from './popupMotion.js';
import './PasswordResetModal.css';

const emailSchema = z.string().trim().email('Please enter a valid email address.').max(254).transform((value) => value.toLowerCase());
export default function PasswordResetModal({ initialEmail, onClose }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [slotStatus, setSlotStatus] = useState('idle');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef(null);
  const timer = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previous = document.activeElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('input')?.focus();
    return () => {
      clearTimeout(timer.current);
      document.body.style.overflow = bodyOverflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (step === 'email' || step === 'password') dialogRef.current?.querySelector('input')?.focus();
    if (step === 'done') dialogRef.current?.querySelector('.button')?.focus();
  }, [step]);

  const keyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };

  const requestCode = async (event) => {
    event.preventDefault();
    setError('');
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      await endpoints.requestPasswordReset({ email: parsed.data });
      setEmail(parsed.data);
      setCode('');
      setSlotStatus('idle');
      setStep('code');
    } catch (err) {
      setError(errorMessage(err, 'Could not request a code. Please try again.'));
    } finally { setLoading(false); }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setError('');
    if (code.length !== 6) { setError('Enter the six-digit code.'); return; }
    setLoading(true);
    try {
      const { data } = await endpoints.verifyPasswordReset({ email, code });
      setToken(data.token);
      setSlotStatus('success');
      timer.current = setTimeout(() => setStep('password'), reduceMotion ? 0 : 650);
    } catch (err) {
      setError(errorMessage(err, 'The code could not be verified.'));
      setSlotStatus('error');
    } finally { setLoading(false); }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await endpoints.completePasswordReset({ email, token, password: parsed.data });
      setToken(''); setPassword(''); setConfirm('');
      setStep('done');
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password. Please try again.'));
    } finally { setLoading(false); }
  };

  const backToEmail = () => { setError(''); setCode(''); setToken(''); setSlotStatus('idle'); setStep('email'); };
  return <motion.div className="reset-overlay" onKeyDown={keyDown} {...popupOverlayMotion(reduceMotion)}>
    <motion.div ref={dialogRef} className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"
      {...popupPanelMotion(reduceMotion)}>
      <button type="button" className="reset-close" onClick={onClose} aria-label="Close password recovery"><X size={20}/></button>
      <div className="reset-icon" aria-hidden="true">{step === 'done' ? <Check size={23}/> : step === 'code' ? <ShieldCheck size={23}/> : <LockKeyhole size={23}/>}</div>
      <div className="reset-kicker">ROAMORA · ACCOUNT SECURITY</div>
      <h2 id="reset-title">{step === 'email' ? 'Find your way back.' : step === 'code' ? 'Check your inbox.' : step === 'password' ? 'A fresh start.' : 'You’re all set.'}</h2>
      <p id="reset-description" className="reset-description">{step === 'email'
        ? 'Enter your account email and we’ll help you reset your password.'
        : step === 'code'
          ? <>If an eligible account exists, a code will be emailed to <strong>{email}</strong> if delivery succeeds. Check your spam folder too.</>
          : step === 'password'
            ? 'Choose a new password to secure your account.'
            : 'Your password has been updated. Log in with your new password.'}</p>
      {step === 'email' && <form className="stack-form reset-form" onSubmit={requestCode} noValidate>
        <label>Email address<span className="auth-input"><Mail size={17} aria-hidden="true"/><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required/></span></label>
        {error && <p className="reset-error" role="alert">{error}</p>}
        <button className="button button-dark button-full" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17}/> : <>Send code <ArrowRight size={16}/></>}</button>
        <p className="reset-note">Use the email for your Roamora password account. Google-only accounts should sign in with Google.</p>
      </form>}
      {step === 'code' && <form className="reset-form" onSubmit={verifyCode}>
        <label className="reset-label">Six-digit verification code</label>
        <CodeSlots value={code} onChange={(value) => { setCode(value); if (!value) setSlotStatus('idle'); }} status={slotStatus} disabled={loading} autoFocus slotSize={31} gap={4} accentColor="#8fb9ab" inkColor="#7ea99b" slotColor="#263e42" digitColor="#102322" dangerColor="#c75252"/>
        {error && <p className="reset-error" role="alert">{error}</p>}
        <button className="button button-dark button-full" disabled={loading || slotStatus === 'success'}>{loading ? <LoaderCircle className="spin" size={17}/> : <>Verify code <ArrowRight size={16}/></>}</button>
        <p className="reset-note">The code expires in 10 minutes. Wait at least one minute before requesting another; only the latest code works.</p>
        <button type="button" className="reset-back" onClick={backToEmail} disabled={loading}><ArrowLeft size={15}/> Change email or request another code</button>
      </form>}
      {step === 'password' && <form className="stack-form reset-form" onSubmit={resetPassword} noValidate>
        <label>New password<span className="auth-input"><LockKeyhole size={17} aria-hidden="true"/><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required/></span></label>
        <label>Confirm new password<span className="auth-input"><LockKeyhole size={17} aria-hidden="true"/><input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required/></span></label>
        <p className="reset-note">At least 8 characters, including a lowercase letter, a number and a special character. Maximum 72 UTF-8 bytes.</p>
        {error && <p className="reset-error" role="alert">{error}</p>}
        <button className="button button-dark button-full" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17}/> : <>Save new password <ArrowRight size={16}/></>}</button>
        <button type="button" className="reset-back" onClick={backToEmail} disabled={loading}><ArrowLeft size={15}/> Request a new code</button>
      </form>}
      {step === 'done' && <button className="button button-dark button-full" onClick={onClose}>Back to log in <ArrowRight size={16}/></button>}
    </motion.div>
  </motion.div>;
}
