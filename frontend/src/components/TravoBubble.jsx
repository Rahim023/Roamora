import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import travoLogo from './travo-logo.png';

export default function TravoBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [mouseEntered, setMouseEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mouseEntered && !isOpen) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 4000);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [mouseEntered, isOpen]);

  if (isOpen) return null;

  return (
    <motion.div
      className="travo-bubble-container"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      onMouseEnter={() => setMouseEntered(true)}
      onMouseLeave={() => setMouseEntered(false)}
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="travo-bubble-tooltip"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
          >
            <Sparkles size={12} />
            <span>Chat with Travo, your AI travel companion</span>
            <div className="tooltip-arrow" />
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        to="/travo"
        className="travo-bubble"
        title="Open Travo AI assistant"
        onClick={() => setIsOpen(true)}
      >
        <motion.div
          className="travo-bubble-pulse"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <img src={travoLogo} alt="Travo" className="travo-bubble-icon" />
      </Link>
    </motion.div>
  );
}
