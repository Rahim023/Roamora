import { useId, useLayoutEffect, useRef } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const assets = {
  sky: 'https://res.cloudinary.com/divypkla0/image/upload/v1794471795/Screenshot_2026-11-12_014558_ptin4c.png',
  background: 'https://res.cloudinary.com/divypkla0/image/upload/v1794472499/bg_vxjiqh.png',
  middle: 'https://res.cloudinary.com/divypkla0/image/upload/v1794472499/mg_btez8c.png',
  foreground: 'https://res.cloudinary.com/divypkla0/image/upload/v1794472498/fg_mzay3e.png',
  cloud1: 'https://res.cloudinary.com/divypkla0/image/upload/v1794472207/daycloud2_b75khg.png',
  cloud2: 'https://res.cloudinary.com/divypkla0/image/upload/v1794472267/daycloud3_mkb47g.png',
  cloud3: 'https://res.cloudinary.com/divypkla0/image/upload/v1794472164/daycloud1_pmemsj.png',
  cloudMask: 'https://assets.codepen.io/721952/cloud1Mask.jpg',
};

const nightAssets = {
  sky: 'https://res.cloudinary.com/divypkla0/image/upload/v1794644327/nighsky_hdumco.png',
  background: 'https://res.cloudinary.com/divypkla0/image/upload/v1794644327/bgnight_fusmcf.png',
  middle: 'https://res.cloudinary.com/divypkla0/image/upload/v1794644327/mg-night_eqbue2.png',
  foreground: 'https://res.cloudinary.com/divypkla0/image/upload/v1794644327/fgnight_sswoos.png',
  cloud1: 'https://res.cloudinary.com/divypkla0/image/upload/v1794644327/nightcloud2_pby6ql.png',
  cloud2: 'https://res.cloudinary.com/divypkla0/image/upload/v1794644327/nightcloud3_s4npvi.png',
  cloud3: 'https://res.cloudinary.com/divypkla0/image/upload/v1794644328/nightcloud1_qnaw1b.png',
};

function HeroLayer({ layer, name, preserveAspectRatio }) {
  return <g className={name}>
    <image className="adventure-asset-day" href={assets[layer]} width="1200" height="800" preserveAspectRatio={preserveAspectRatio}/>
    <image className="adventure-asset-night" href={nightAssets[layer]} width="1200" height="800" preserveAspectRatio={preserveAspectRatio}/>
  </g>;
}

export default function AdventureHero() {
  const root = useRef(null);
  const stage = useRef(null);
  const title = useRef(null);
  const actions = useRef(null);
  const maskId = `adventure-mask-${useId().replace(/:/g, '')}`;

  useLayoutEffect(() => {
    let active = true;
    const positionTitle = () => {
      const text = title.current;
      const svg = text?.ownerSVGElement;
      const header = document.querySelector('.site-header-home');
      if (!text || !svg || !header) return;
      text.setAttribute('y', '235');
      text.style.removeProperty('font-size');
      const stageTop = stage.current.getBoundingClientRect().top;
      const safeTop = stageTop + header.offsetHeight + 24;
      const availableHeight = actions.current.getBoundingClientRect().top - safeTop - 20;
      let rect = text.getBoundingClientRect();
      if (availableHeight > 0 && rect.height > availableHeight) {
        text.style.fontSize = `${parseFloat(getComputedStyle(text).fontSize) * availableHeight / rect.height}px`;
        rect = text.getBoundingClientRect();
      }
      const scale = svg.getScreenCTM()?.d;
      if (scale && rect.top < safeTop) text.setAttribute('y', String(235 + (safeTop - rect.top) / scale));
    };
    const observer = new ResizeObserver(positionTitle);
    observer.observe(stage.current);
    const header = document.querySelector('.site-header-home');
    if (header) observer.observe(header);
    positionTitle();
    document.fonts.ready.then(() => { if (active) positionTitle(); });
    return () => { active = false; observer.disconnect(); };
  }, []);

  useLayoutEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let context;
    const configure = () => {
      context?.revert();
      if (preference.matches) return;
      context = gsap.context(() => {
        gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
          .fromTo('.adventure-sky', { y: 0 }, { y: -200, ease: 'none' }, 0)
          .fromTo('.adventure-cloud1', { y: 100 }, { y: -800, ease: 'none' }, 0)
          .fromTo('.adventure-cloud2', { y: -150 }, { y: -500, ease: 'none' }, 0)
          .fromTo('.adventure-cloud3', { y: -50 }, { y: -650, ease: 'none' }, 0)
          .fromTo('.adventure-mount-bg', { y: -10 }, { y: -100, ease: 'none' }, 0)
          .fromTo('.adventure-mount-mid', { y: -30 }, { y: -250, ease: 'none' }, 0)
          .fromTo('.adventure-mount-fg', { y: -50 }, { y: -600, ease: 'none' }, 0);
      }, root);
      ScrollTrigger.refresh();
    };
    configure();
    preference.addEventListener('change', configure);

    return () => {
      preference.removeEventListener('change', configure);
      context?.revert();
    };
  }, []);

  return (
    <section className="adventure-hero" ref={root} aria-labelledby="adventure-heading">
      <div className="adventure-stage" ref={stage}>
        <svg
          className="adventure-art"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId}>
              <g className="adventure-cloud1">
                <rect fill="#fff" width="100%" height="801" y="799" />
                <image href={assets.cloudMask} width="1200" height="800" />
              </g>
            </mask>
          </defs>
          <HeroLayer name="adventure-sky" layer="sky" preserveAspectRatio="xMidYMid slice"/>
          <HeroLayer name="adventure-mount-bg" layer="background"/>
          <HeroLayer name="adventure-mount-mid" layer="middle"/>
          <HeroLayer name="adventure-cloud2" layer="cloud2"/>
          <HeroLayer name="adventure-mount-fg" layer="foreground"/>
          <HeroLayer name="adventure-cloud1" layer="cloud1"/>
          <HeroLayer name="adventure-cloud3" layer="cloud3"/>
          <text ref={title} className="adventure-title" x="600" y="235" textAnchor="middle" fill="#fff">EXPLORE</text>
          <g mask={`url(#${maskId})`}>
            <rect className="adventure-reveal-surface" fill="#fff" width="100%" height="100%" />
            <text className="adventure-reveal" x="600" y="218" textAnchor="middle" fill="#0b1628">
              <tspan x="600">BEYOND YOUR</tspan>
              <tspan x="600" dy="78">LIMITS</tspan>
            </text>
          </g>
        </svg>
        <h1 id="adventure-heading" className="visually-hidden">Explore beyond your limits</h1>
        <div className="adventure-actions" ref={actions}>
          <p>For the journeys that change everything</p>
          <a data-specular className="button adventure-cta" href="#trip-search">Explore trips <ArrowRight size={17} /></a>
        </div>
        <a className="adventure-scroll" href="#trip-search" aria-label="Skip the animation and explore trips">
          <span>SCROLL TO EXPLORE</span>
          <ArrowDown size={17} />
        </a>
      </div>
    </section>
  );
}
