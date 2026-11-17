import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export function CharacterStream({ text, duration = 0.5, onComplete }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    const totalChars = text.length;
    const startTime = performance.now();

    const updateDisplay = (currentTime) => {
      const elapsed = currentTime - startTime;
      const durationMs = duration * 1000;
      const progress = Math.min(elapsed / durationMs, 1);
      const charsToShow = Math.floor(progress * totalChars);

      if (charsToShow === totalChars) {
        setDisplayedText(text);
        setIsComplete(true);
        onComplete?.();
      } else {
        setDisplayedText(text.slice(0, charsToShow));
        requestAnimationFrame(updateDisplay);
      }
    };

    requestAnimationFrame(updateDisplay);
  }, [text, duration, onComplete]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {displayedText}
      {!isComplete && (
        <motion.span
          className="char-stream-cursor"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          ▌
        </motion.span>
      )}
    </motion.span>
  );
}

export default CharacterStream;
