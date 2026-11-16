import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MapPin } from 'lucide-react';
import './AccordionGallery.css';

export default function AccordionGallery({ items, active, onSelect, reducedMotion }) {
  const root = useRef(null);
  const panels = useRef([]);

  useLayoutEffect(() => {
    const animations = [];
    panels.current.forEach((panel, index) => {
      if (!panel) return;
      const selected = index === active;
      animations.push(
        gsap.to(panel, {
          flexGrow: selected ? 4.5 : 1,
          duration: reducedMotion ? 0 : 0.65,
          ease: 'power3.out',
          overwrite: true,
        }),
        gsap.to(panel.querySelector('img'), {
          scale: selected ? 1 : 1.12,
          filter: selected ? 'grayscale(0)' : 'grayscale(0.65)',
          duration: reducedMotion ? 0 : 0.65,
          ease: 'power3.out',
          overwrite: true,
        }),
      );
    });
    return () => animations.forEach((animation) => animation.kill());
  }, [active, items, reducedMotion]);

  const keyDown = (event, index) => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % items.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    if (next !== undefined) {
      event.preventDefault();
      onSelect(next);
      panels.current[next]?.focus();
    }
  };

  return <div ref={root} className="accordion-gallery" role="group" aria-label="Choose a journey">
    {items.map((item, index) => <button
      key={item.id}
      ref={(node) => { panels.current[index] = node; }}
      className={`ag-panel${index === active ? ' ag-panel--active' : ''}`}
      type="button"
      aria-pressed={index === active}
      aria-label={`Select ${item.title}, ${item.destination}`}
      onClick={() => onSelect(index)}
      onFocus={() => onSelect(index)}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') onSelect(index); }}
      onKeyDown={(event) => keyDown(event, index)}
    >
      <img src={item.image} alt="" draggable="false"/>
      <span className="ag-overlay" aria-hidden="true"/>
      <span className="ag-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="ag-caption"><span className="ag-location"><MapPin size={14}/>{item.destination}</span><strong>{item.title}</strong></span>
    </button>)}
  </div>;
}
