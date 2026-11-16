import { useLayoutEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUp, Square } from 'lucide-react';

export default function PromptBar({ inputRef, value, onChange, onSend, onStop, busy }) {
  const reduceMotion = useReducedMotion();
  useLayoutEffect(() => {
    const input = inputRef.current;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }, [value]);

  return <form className="travo-prompt" onSubmit={onSend}>
    <label className="visually-hidden" htmlFor="travo-input">Message Travo</label>
    <textarea ref={inputRef} id="travo-input" rows="2" maxLength="1500" value={value}
      onChange={(event) => onChange(event.target.value)} disabled={busy}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.currentTarget.form.requestSubmit();
        }
      }}
      placeholder="Ask anything about your next journey…"/>
    <div className="travo-prompt-footer"><span>Enter to send <span aria-hidden="true">·</span> Shift + Enter for a new line</span>
      <motion.button type={busy ? 'button' : 'submit'} className="travo-send"
        aria-label={busy ? 'Stop waiting for response' : 'Send message'}
        disabled={!busy && !value.trim()} onClick={busy ? onStop : undefined}
        whileTap={reduceMotion ? undefined : { scale: .94 }}>
        <motion.span key={busy ? 'stop' : 'send'} initial={reduceMotion ? false : { opacity: 0, scale: .7, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: .2 }}>
          {busy ? <Square size={16} fill="currentColor"/> : <ArrowUp size={19}/>}
        </motion.span>
      </motion.button>
    </div>
  </form>;
}
