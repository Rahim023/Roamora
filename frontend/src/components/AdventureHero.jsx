import { useId, useLayoutEffect, useRef, useState } from 'react';
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

function HeroLayer({ layer, name, preserveAspectRatio, height = 800, children }) {
  return <g className={name}>
    {children}
    <image className="adventure-asset-day" href={assets[layer]} width="1200" height={height} preserveAspectRatio={preserveAspectRatio}/>
    <image className="adventure-asset-night" href={nightAssets[layer]} width="1200" height={height} preserveAspectRatio={preserveAspectRatio}/>
  </g>;
}

export default function AdventureHero() {
  const root = useRef(null);
  const stage = useRef(null);
  const title = useRef(null);
  const actions = useRef(null);
  const [mobileHeight, setMobileHeight] = useState(null);
  const maskId = `adventure-mask-${useId().replace(/:/g, '')}`;
  const dayCloudFillId = `${maskId}-day-fill`;
  const nightCloudFillId = `${maskId}-night-fill`;
  // Extend the viewBox on portrait screens so the full landscape and the scroll reveal both fit.
  const viewHeight = mobileHeight || 800;
  const landscapeOffset = mobileHeight ? mobileHeight - 800 : 0;
  const motionScale = mobileHeight ? mobileHeight / 800 : 1;
  const titleY = mobileHeight ? mobileHeight * 0.28 : 235;

  useLayoutEffect(() => {
    const updateViewport = () => {
      const { width, height } = stage.current.getBoundingClientRect();
      const next = window.matchMedia('(max-width: 700px)').matches && width
        ? Math.max(800, Math.round(1200 * height / width))
        : null;
      setMobileHeight((previous) => previous === next ? previous : next);
    };
    const observer = new ResizeObserver(updateViewport);
    observer.observe(stage.current);
    updateViewport();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    let active = true;
    const positionTitle = () => {
      const text = title.current;
      const svg = text?.ownerSVGElement;
      const header = document.querySelector('.site-header-home');
      if (!text || !svg || !header) return;
      text.setAttribute('y', String(titleY));
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
      if (scale && rect.top < safeTop) text.setAttribute('y', String(titleY + (safeTop - rect.top) / scale));
    };
    const observer = new ResizeObserver(positionTitle);
    observer.observe(stage.current);
    const header = document.querySelector('.site-header-home');
    if (header) observer.observe(header);
    positionTitle();
    document.fonts.ready.then(() => { if (active) positionTitle(); });
    return () => { active = false; observer.disconnect(); };
  }, [titleY]);

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
          .fromTo('.adventure-sky', { y: 0 }, { y: -200 * motionScale, ease: 'none' }, 0)
          .fromTo('.adventure-cloud-mask', { y: 100 * motionScale }, { y: -800 * motionScale, ease: 'none' }, 0)
          .fromTo('.adventure-cloud1', { y: mobileHeight ? 0 : 100 }, { y: -800 * motionScale, ease: 'none' }, 0)
          .fromTo('.adventure-cloud2', { y: -150 * motionScale }, { y: -500 * motionScale, ease: 'none' }, 0)
          .fromTo('.adventure-cloud3', { y: -50 * motionScale }, { y: -650 * motionScale, ease: 'none' }, 0)
          .fromTo('.adventure-mount-bg', { y: -10 * motionScale }, { y: -100 * motionScale, ease: 'none' }, 0)
          .fromTo('.adventure-mount-mid', { y: -30 * motionScale }, { y: -250 * motionScale, ease: 'none' }, 0)
          .fromTo('.adventure-mount-fg', { y: -50 * motionScale }, { y: -600 * motionScale, ease: 'none' }, 0);
      }, root);
      ScrollTrigger.refresh();
    };
    configure();
    preference.addEventListener('change', configure);

    return () => {
      preference.removeEventListener('change', configure);
      context?.revert();
    };
  }, [mobileHeight, motionScale]);

  return (
    <section className="adventure-hero" ref={root} aria-labelledby="adventure-heading">
      <div className="adventure-stage" ref={stage}>
        <svg
          className="adventure-art"
          viewBox={`0 0 1200 ${viewHeight}`}
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={dayCloudFillId} gradientUnits="userSpaceOnUse" x1="0" y1="500" x2="0" y2="650">
              <stop offset="0" stopColor="#fdfdfd" stopOpacity="0" />
              <stop offset="1" stopColor="#fdfdfd" />
            </linearGradient>
            <linearGradient id={nightCloudFillId} gradientUnits="userSpaceOnUse" x1="0" y1="500" x2="0" y2="650">
              <stop offset="0" stopColor="#1c2c3b" stopOpacity="0" />
              <stop offset="1" stopColor="#1c2c3b" />
            </linearGradient>
            <mask id={maskId}>
              <g transform={`translate(0 ${landscapeOffset})`}>
                <g className="adventure-cloud-mask">
                  <rect fill="#fff" width="100%" height={viewHeight + 1} y="799" />
                  <image href={assets.cloudMask} width="1200" height="800" />
                </g>
              </g>
            </mask>
          </defs>
          <HeroLayer name="adventure-sky" layer="sky" height={mobileHeight ? viewHeight + 200 * motionScale : 800} preserveAspectRatio="xMidYMid slice"/>
          <g transform={`translate(0 ${landscapeOffset})`}>
            <HeroLayer name="adventure-mount-bg" layer="background"/>
            <HeroLayer name="adventure-mount-mid" layer="middle"/>
            <HeroLayer name="adventure-cloud2" layer="cloud2"/>
            <HeroLayer name="adventure-mount-fg" layer="foreground"/>
            <HeroLayer name="adventure-cloud1" layer="cloud1">
              {mobileHeight && <>
                <rect className="adventure-asset-day" y="500" width="1200" height={viewHeight + 300} fill={`url(#${dayCloudFillId})`}/>
                <rect className="adventure-asset-night" y="500" width="1200" height={viewHeight + 300} fill={`url(#${nightCloudFillId})`}/>
              </>}
            </HeroLayer>
            <HeroLayer name="adventure-cloud3" layer="cloud3"/>
          </g>
          <text ref={title} className="adventure-title" x="600" y={titleY} textAnchor="middle" fill="#fff">EXPLORE</text>
          <g mask={`url(#${maskId})`}>
            <rect className="adventure-reveal-surface" fill="#fff" width="100%" height="100%" />
            <text className="adventure-reveal" x="600" y={mobileHeight ? mobileHeight * 0.25 : 218} textAnchor="middle" fill="#0b1628">
              <tspan x="600">BEYOND YOUR</tspan>
              <tspan x="600" dy={mobileHeight ? 115 : 78}>LIMITS</tspan>
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
