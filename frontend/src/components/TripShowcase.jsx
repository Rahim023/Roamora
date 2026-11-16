import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, MapPin } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FadeContent from './FadeContent.jsx';

gsap.registerPlugin(ScrollTrigger);

const WHEEL_SLOTS = 28;

export default function TripShowcase({ trips, getId, getImage, getTitle, getPlace, children }) {
  const stage = useRef(null);
  const panels = useRef(null);
  const wheel = useRef(null);
  const activeIndex = useRef(0);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    activeIndex.current = 0;
    setActive(0);
    if (trips.length < 2) return undefined;

    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const progress = { value: 0 };
      const resetVelocity = () => stage.current?.style.setProperty('--velocity', '0');
      const tween = gsap.to(progress, {
        value: 1,
        ease: 'none',
        onUpdate() {
          const value = progress.value;
          panels.current.style.transform = `translateY(-${value * (trips.length - 1) * 100}%)`;
          wheel.current.style.setProperty('--wheel-angle', `${value * (trips.length - 1) * 360 / WHEEL_SLOTS}deg`);
          const index = Math.min(trips.length - 1, Math.round(value * (trips.length - 1)));
          if (index !== activeIndex.current) {
            activeIndex.current = index;
            setActive(index);
          }
        },
        scrollTrigger: {
          trigger: stage.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * (trips.length - 1)}`,
          pin: true,
          scrub: 0.15,
          invalidateOnRefresh: true,
          onUpdate(self) {
            stage.current?.style.setProperty('--velocity', String(Math.min(1, Math.abs(self.getVelocity()) / 3500)));
          },
          onScrubComplete: resetVelocity,
          onLeave: resetVelocity,
          onLeaveBack: resetVelocity,
        },
      });
      ScrollTrigger.refresh();
      return () => {
        tween.kill();
        panels.current?.style.removeProperty('transform');
        wheel.current?.style.removeProperty('--wheel-angle');
        resetVelocity();
      };
    }, stage);
    media.add('(prefers-reduced-motion: reduce)', () => {
      activeIndex.current = 0;
      setActive(0);
    }, stage);
    return () => media.revert();
  }, [trips]);

  const current = trips[Math.min(active, trips.length - 1)];

  return <section className="showcase" id="curated">
    <FadeContent className="content-shell showcase-heading" effect="focus" duration={0.8}>
      <div><div className="eyebrow">A GOOD PLACE TO START <span className="showcase-line"/></div><h2>Trips worth<br/><em>the detour.</em></h2><p>Thoughtful journeys. The kind that stay with you long after you come home.</p></div>
      <Link to="/explore" className="showcase-link">See all journeys <ArrowRight size={16}/></Link>
    </FadeContent>
    {current && <div className="trip-cinema" ref={stage}>
      <div className="cinema-panels" ref={panels} aria-hidden="true">
        {trips.map((trip) => <div key={getId(trip)} className="cinema-panel" style={{ backgroundImage: `url("${getImage(trip)}")` }}/>)}
      </div>
      <div className="cinema-shade" aria-hidden="true"/>
      <div className="cinema-wheel-wrap" aria-hidden="true">
        <div className="cinema-wheel" ref={wheel}>
          {Array.from({ length: WHEEL_SLOTS }, (_, index) => {
            const trip = trips[index % trips.length];
            return <div key={index} className="cinema-wheel-item" style={{ '--slot-angle': `${index * -360 / WHEEL_SLOTS}deg` }}><span className="cinema-wheel-number">{String(index % trips.length + 1).padStart(2, '0')}</span><span className="cinema-wheel-title">{getTitle(trip)}</span></div>;
          })}
        </div>
      </div>
      <div className="cinema-topline"><span>JOURNEYS WORTH THE DETOUR</span><span>{String(active + 1).padStart(2, '0')} / {String(trips.length).padStart(2, '0')}</span></div>
      <div className="cinema-info">
        <span className="cinema-location"><MapPin size={14}/>{getPlace(current)}</span>
        <h3>{getTitle(current)}</h3>
        <Link className="button button-light" to={`/trips/${getId(current)}`}>Discover this journey <ArrowRight size={16}/></Link>
      </div>
      <div className="cinema-bottom"><span>CURATED FOR THE CURIOUS</span><span className="cinema-scroll">SCROLL TO DISCOVER <ArrowDown size={14}/></span></div>
    </div>}
    {!current && <div className="content-shell showcase-status">{children}</div>}
  </section>;
}
