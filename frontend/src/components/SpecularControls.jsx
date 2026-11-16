import { useEffect, useRef } from 'react';
import { PAD, UNIFORMS, clamp, wrap, loopPosition, rimPoint, link } from './specularShader.js';
import './SpecularControls.css';

const selector = '[data-specular]';
const lightColor = new Float32Array([0.93, 1, 0.94]);
const baseColor = new Float32Array([0.42, 0.66, 0.53]);

export default function SpecularControls() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas.closest('.app-shell');
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
    if (!gl) {
      console.warn('WebGL2 is unavailable; using the static specular button fallback.');
      return undefined;
    }
    const program = link(gl);
    if (!program) {
      console.warn('The specular button shader could not be initialized; using the static fallback.');
      return undefined;
    }
    const uniforms = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]));
    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    if (!buffer || !vao) {
      console.warn('The specular button renderer could not allocate resources; using the static fallback.');
      if (buffer) gl.deleteBuffer(buffer);
      if (vao) gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      return undefined;
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    root.dataset.specularWebgl = 'true';

    let active = null;
    let pointer = null;
    let spot = 0;
    let level = 0.35;
    let press = 0;
    let raf = 0;
    let last = 0;
    let settleFrames = 0;
    let contextLost = false;

    const wake = (frames = 1) => {
      if (contextLost) return;
      settleFrames = Math.max(settleFrames, frames);
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const draw = (time) => {
      raf = 0;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(window.innerWidth * ratio));
      const height = Math.max(1, Math.round(window.innerHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
      last = time;
      if (active && (!active.isConnected || active.disabled)) {
        active = null;
        pointer = null;
      }
      const targetLevel = active && !preference.matches ? 1 : 0.35;
      level += (targetLevel - level) * (1 - Math.exp(-dt * 7));
      press *= Math.exp(-dt * 5);
      gl.viewport(0, 0, width, height);
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform3fv(uniforms.uLineColor, lightColor);
      gl.uniform3fv(uniforms.uBaseColor, baseColor);
      gl.uniform1f(uniforms.uPx, ratio);
      gl.uniform1f(uniforms.uThickness, 1.5);
      gl.uniform1f(uniforms.uGlow, 1.2);

      let difference = 0;
      root.querySelectorAll(selector).forEach((button) => {
        const rect = button.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;
        const style = window.getComputedStyle(button);
        if (style.visibility !== 'visible' || Number(style.opacity) === 0) return;
        const halfX = rect.width / 2;
        const halfY = rect.height / 2;
        const radiusValue = style.borderTopLeftRadius;
        const radius = Math.min(radiusValue.endsWith('%') ? parseFloat(radiusValue) * Math.min(rect.width, rect.height) / 100 : parseFloat(radiusValue) || 0, halfX, halfY);
        const inset = radius * (1 - Math.SQRT1_2);
        const rest = loopPosition(inset - halfX, halfY - inset, halfX, halfY, radius);
        let currentSpot = rest;
        const focused = button === active;
        if (focused && pointer && !preference.matches) {
          const x = pointer.x - rect.left - halfX;
          const y = rect.top + halfY - pointer.y;
          const nearest = loopPosition(x, y, halfX, halfY, radius);
          const depth = clamp(Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8), 0, 1);
          const sway = rest - (x / halfX) * 0.06 - (y / halfY) * 0.02;
          const offset = sway - nearest - Math.round(sway - nearest);
          const desired = wrap(nearest + offset * depth * depth * (3 - 2 * depth));
          difference = desired - spot;
          difference -= Math.round(difference);
          spot = wrap(spot + difference * (1 - Math.exp(-dt * 8)));
          currentSpot = spot;
        } else if (focused) {
          currentSpot = rest;
        }
        const [rimX, rimY] = rimPoint(currentSpot, halfX, halfY, radius);
        const distance = Math.hypot(rimX, rimY);
        const pull = 1 - Math.min(0.35 * halfY, distance) / Math.max(distance, 0.0001);
        const left = Math.max(0, Math.floor((rect.left - PAD) * ratio));
        const bottom = Math.max(0, Math.floor((window.innerHeight - rect.bottom - PAD) * ratio));
        const right = Math.min(width, Math.ceil((rect.right + PAD) * ratio));
        const top = Math.min(height, Math.ceil((window.innerHeight - rect.top + PAD) * ratio));
        if (right <= left || top <= bottom) return;
        gl.scissor(left, bottom, right - left, top - bottom);
        gl.uniform2f(uniforms.uCenter, (rect.left + halfX) * ratio, (window.innerHeight - rect.top - halfY) * ratio);
        gl.uniform2f(uniforms.uHalf, halfX * ratio, halfY * ratio);
        gl.uniform1f(uniforms.uRadius, radius * ratio);
        gl.uniform1f(uniforms.uSpot, currentSpot);
        gl.uniform2f(uniforms.uEntry, rimX * pull * ratio, rimY * pull * ratio);
        gl.uniform1f(uniforms.uIntensity, (button.disabled ? 0.3 : 1.25) * (focused ? level + press * 0.8 : 0.5));
        gl.uniform2f(uniforms.uWindow, 10 / 360 + (focused ? press * 0.06 : 0), 34 / 360 + 0.0001);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });
      gl.bindVertexArray(null);
      settleFrames -= 1;
      if (settleFrames > 0 || Math.abs(targetLevel - level) > 0.002 || Math.abs(difference) > 0.0002 || press > 0.002) {
        raf = requestAnimationFrame(draw);
      } else {
        last = 0;
      }
    };

    const findControl = (target) => {
      const control = target instanceof Element ? target.closest(selector) : null;
      return control && root.contains(control) && !control.disabled ? control : null;
    };
    const move = (event) => {
      if (preference.matches || event.pointerType !== 'mouse') return;
      const control = findControl(event.target);
      if (control !== active) {
        active = control;
        spot = 0;
      }
      pointer = control ? { x: event.clientX, y: event.clientY } : null;
      wake(3);
    };
    const focus = (event) => { active = findControl(event.target); pointer = null; wake(2); };
    const down = (event) => {
      active = findControl(event.target);
      if (!active) return;
      pointer = preference.matches ? null : { x: event.clientX, y: event.clientY };
      press = preference.matches ? 0 : 1;
      wake(20);
    };
    const leave = () => { active = null; pointer = null; wake(2); };
    const redraw = () => wake(20);
    const handleContextLost = () => {
      contextLost = true;
      cancelAnimationFrame(raf);
      raf = 0;
      delete root.dataset.specularWebgl;
      console.warn('The specular button WebGL context was lost; using the static fallback.');
    };
    const observer = new MutationObserver(redraw);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerdown', down, { passive: true });
    root.addEventListener('pointerleave', leave);
    root.addEventListener('focusin', focus);
    root.addEventListener('focusout', leave);
    window.addEventListener('scroll', redraw, { passive: true, capture: true });
    window.addEventListener('resize', redraw, { passive: true });
    preference.addEventListener('change', redraw);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    wake(2);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerdown', down);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('focusin', focus);
      root.removeEventListener('focusout', leave);
      window.removeEventListener('scroll', redraw, true);
      window.removeEventListener('resize', redraw);
      preference.removeEventListener('change', redraw);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      delete root.dataset.specularWebgl;
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="specular-overlay" aria-hidden="true"/>;
}
