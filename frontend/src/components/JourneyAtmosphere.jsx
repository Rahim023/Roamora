import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
void main() {
  vec2 p = vUv;
  float drift = uTime * 0.12;
  float a = exp(-7.0 * length(p - vec2(0.78 + 0.06 * sin(drift), 0.7)));
  float b = exp(-8.0 * length(p - vec2(0.55, 0.1 + 0.08 * cos(drift))));
  float lines = pow(max(0.0, sin((p.x * 2.0 + p.y * 3.0) * 12.0 + drift)), 28.0) * 0.025;
  vec3 color = vec3(0.20, 0.42, 0.39) * a + vec3(0.32, 0.43, 0.36) * b + lines;
  gl_FragColor = vec4(color, min(0.58, a * 0.5 + b * 0.35 + lines));
}`;

export default function JourneyAtmosphere() {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = () => {};

    const setup = () => {
      cleanup();
      cleanup = () => {};
      if (preference.matches) return;

      let renderer;
      try {
        renderer = new Renderer({ alpha: true, antialias: false, depth: false, dpr: Math.min(window.devicePixelRatio || 1, 1.25) });
      } catch (error) {
        console.warn('Journey background is unavailable; using the static backdrop.', error);
        return;
      }
      const gl = renderer.gl;
      if (!gl) {
        console.warn('Journey background is unavailable; using the static backdrop.');
        return;
      }
      gl.clearColor(0, 0, 0, 0);
      const geometry = new Triangle(gl);
      const program = new Program(gl, { vertex, fragment, transparent: true, uniforms: { uTime: { value: 0 } } });
      const mesh = new Mesh(gl, { geometry, program });
      container.appendChild(gl.canvas);
      let frame = 0;
      let visible = false;
      let lastDraw = 0;
      let lost = false;
      const draw = (time) => {
        frame = 0;
        if (!visible || document.hidden || lost) return;
        if (time - lastDraw >= 33) {
          program.uniforms.uTime.value = time / 1000;
          renderer.render({ scene: mesh });
          lastDraw = time;
        }
        frame = requestAnimationFrame(draw);
      };
      const start = () => {
        if (visible && !document.hidden && !lost && !frame) frame = requestAnimationFrame(draw);
      };
      const stop = () => { cancelAnimationFrame(frame); frame = 0; };
      const resize = () => {
        if (container.clientWidth && container.clientHeight) renderer.setSize(container.clientWidth, container.clientHeight);
      };
      const onVisibility = () => { if (document.hidden) stop(); else start(); };
      const onContextLost = () => { lost = true; stop(); console.warn('Journey background context lost; using the static backdrop.'); };
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); });
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      intersection.observe(container);
      document.addEventListener('visibilitychange', onVisibility);
      gl.canvas.addEventListener('webglcontextlost', onContextLost);
      resize();
      cleanup = () => {
        stop();
        observer.disconnect();
        intersection.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        gl.canvas.removeEventListener('webglcontextlost', onContextLost);
        geometry.remove();
        program.remove();
        gl.canvas.remove();
        if (!lost) gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    };

    setup();
    preference.addEventListener('change', setup);
    return () => { preference.removeEventListener('change', setup); cleanup(); };
  }, []);

  return <div className="journey-atmosphere" ref={ref} aria-hidden="true"/>;
}
