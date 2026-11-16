import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Compass, MapPin, Sparkles, Wallet } from 'lucide-react';
import { endpoints, errorMessage } from '../api.js';
import PromptBar from './PromptBar.jsx';
import ThoughtLine from './ThoughtLine.jsx';
import travoLogo from './travo-logo.png';

const starters = [
  { icon: Wallet, label: 'Plan around my budget', prompt: 'Can you help me find a trip within my budget?' },
  { icon: MapPin, label: 'Find my kind of escape', prompt: 'Help me choose a destination that suits my interests.' },
  { icon: Compass, label: 'How does Roamora work?', prompt: 'How do I find and book a trip on Roamora?' },
];

function MessageText({ text }) {
  const parts = text.split(/(\/trips\/[a-f\d]{24})/gi);
  return parts.map((part, index) => /^\/trips\/[a-f\d]{24}$/i.test(part)
    ? <Link key={index} to={part}>View trip <ArrowUpRight size={13}/></Link>
    : <span key={index}>{part}</span>);
}

export default function Travo() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [error, setError] = useState('');
  const controller = useRef(null);
  const conversation = useRef(null);
  const promptInput = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => {
    const active = controller.current;
    controller.current = null;
    active?.abort();
  }, []);
  useEffect(() => {
    if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages, pending]);

  async function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || controller.current) return;
    const userMessage = { role: 'user', text };
    const next = [...messages, userMessage];
    const requestMessages = next.slice(-19).map(({ role, text: messageText }) => ({ role, text: messageText.slice(0, 1500) }));
    const request = new AbortController();
    const start = performance.now();
    controller.current = request;
    setStartedAt(start);
    setMessages(next);
    setDraft('');
    setPending(true);
    setError('');
    try {
      const { data } = await endpoints.chat({ messages: requestMessages }, { signal: request.signal });
      if (controller.current !== request) return;
      setMessages((current) => [...current, { role: 'model', text: data.reply, elapsed: (performance.now() - start) / 1000 }]);
    } catch (err) {
      if (controller.current !== request) return;
      setMessages((current) => current.slice(0, -1));
      setDraft(text);
      setError(request.signal.aborted
        ? 'Stopped waiting. Your message is ready to send again.'
        : err.response?.status === 404
          ? 'Travo is not available on the running API. Restart the Roamora backend and try again.'
          : errorMessage(err, 'Travo could not respond. Please try again.'));
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setPending(false);
      }
    }
  }

  return <main className="content-shell page-content travo-page">
    <motion.section className="travo-panel" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
      <aside className="travo-aside">
        <div className="travo-aside-top"><span><Sparkles size={14}/> YOUR ROAMORA COMPANION</span><span className="travo-aside-index" aria-hidden="true">01 / 01</span></div>
        <div className="travo-aside-content">
          <div className="travo-mascot"><span className="travo-mascot-ring"/><img src={travoLogo} alt="Travo"/></div>
          <div className="travo-aside-copy"><div className="travo-eyebrow">A LITTLE HELP GOING FURTHER</div><h1>Every journey<br/><span>starts here.</span></h1><p>Tell Travo what matters to you, and discover where your next story could take you.</p></div>
        </div>
        <div className="travo-aside-bottom"><div><Compass size={18}/><span>THOUGHTFUL TRAVEL<br/><strong>Made personal.</strong></span></div><ArrowUpRight size={18} aria-hidden="true"/></div>
      </aside>
      <div className="travo-workspace">
      <div className="travo-workspace-header"><div><span className="travo-workspace-kicker"><span/> YOUR TRAVEL COMPANION</span><h2>Let's find your way.</h2><p>Curious about a place, a budget, or Roamora? Just ask.</p></div><div className="travo-header-logo"><img src={travoLogo} alt=""/></div></div>
      <div className="travo-conversation-head"><div><span className="travo-conversation-number">01</span><span>YOUR CONVERSATION</span></div><span className="travo-availability"><span/> HERE TO HELP</span></div>
      <div ref={conversation} className="travo-messages" role="log" aria-live="polite" aria-label="Conversation with Travo">
        <div className="travo-message-row"><img className="travo-avatar" src={travoLogo} alt=""/><div className="travo-message travo-assistant"><strong>TRAVO</strong><p>Hi! Where would you like to go, or what would you like to know about Roamora?</p></div></div>
        {messages.map((message, index) => <div key={index} className={`travo-message-row ${message.role === 'user' ? 'is-user' : ''}`}>
          {message.role === 'model' && <img className="travo-avatar" src={travoLogo} alt=""/>}
          <div className={`travo-message ${message.role === 'user' ? 'travo-user' : 'travo-assistant'}`}><strong>{message.role === 'user' ? 'YOU' : 'TRAVO'}</strong>
            {message.role === 'model' && <ThoughtLine elapsed={message.elapsed}/>}
            <p><MessageText text={message.text}/></p></div></div>)}
        {pending && <div className="travo-message-row"><img className="travo-avatar" src={travoLogo} alt=""/><div className="travo-message travo-assistant"><ThoughtLine startedAt={startedAt}/></div></div>}
      </div>
      {!messages.length && <div className="travo-starters" aria-label="Conversation starters"><span>NEED A LITTLE INSPIRATION?</span><div>{starters.map(({ icon: Icon, label, prompt }) => <button key={label} type="button" disabled={pending} onClick={() => { setDraft(prompt); setError(''); promptInput.current?.focus(); }}><Icon size={15}/><span>{label}</span><ArrowRight size={14}/></button>)}</div></div>}
      {error && <div className="alert-box alert-error" role="alert">{error}</div>}
      <PromptBar inputRef={promptInput} value={draft} onChange={setDraft} onSend={send} onStop={() => controller.current?.abort()} busy={pending}/>
      <p className="travo-privacy">Messages and public trip information are sent to Google Gemini. Please don’t share sensitive information. This conversation stays on this page; Travo may make mistakes, so check trip details before booking.</p>
      </div>
    </motion.section>
  </main>;
}
