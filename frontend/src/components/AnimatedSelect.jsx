import { motion, useReducedMotion } from 'motion/react';

export default function AnimatedSelect(props) {
  const reducedMotion = useReducedMotion();
  return <motion.select
    {...props}
    whileHover={reducedMotion || props.disabled ? undefined : { y: -2 }}
    whileFocus={reducedMotion || props.disabled ? undefined : { y: -1 }}
    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
  />;
}
