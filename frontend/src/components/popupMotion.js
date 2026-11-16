export function popupOverlayMotion(reducedMotion) {
  return {
    initial: reducedMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reducedMotion ? 0 : 0.22, ease: 'easeOut' },
  };
}

export function popupPanelMotion(reducedMotion) {
  return {
    initial: reducedMotion ? false : { opacity: 0, y: 22, scale: 0.96, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: reducedMotion ? { duration: 0 } : {
      type: 'spring', stiffness: 320, damping: 27, mass: 0.8,
      filter: { duration: 0.25, ease: 'easeOut' },
    },
  };
}
