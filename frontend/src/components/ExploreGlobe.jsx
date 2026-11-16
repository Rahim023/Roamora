import { useEffect, useRef } from 'react';

export default function ExploreGlobe() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = () => {};
    let generation = 0;

    async function setup() {
      cleanup();
      const current = ++generation;
      if (preference.matches) return;
      let THREE;
      try {
        THREE = await import('three');
      } catch (error) {
        console.warn('Explore globe could not be loaded.', error);
        return;
      }
      if (current !== generation) return;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch (error) {
        console.warn('Explore globe is unavailable; using the static backdrop.', error);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
      camera.position.z = 5.5;
      const globe = new THREE.Group();
      scene.add(globe);
      const sphereGeometry = new THREE.SphereGeometry(1.35, 32, 18);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xc3e6cf, wireframe: true, transparent: true, opacity: 0.24 });
      globe.add(new THREE.Mesh(sphereGeometry, sphereMaterial));
      const ringGeometry = new THREE.RingGeometry(1.7, 1.704, 128);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xe9d2a9, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = 1.15;
      ring.rotation.y = 0.35;
      globe.add(ring);
      let frame = 0;
      let visible = true;
      let contextLost = false;
      const resize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const draw = (time) => {
        frame = 0;
        globe.rotation.y = time * 0.00012;
        globe.rotation.z = 0.12;
        renderer.render(scene, camera);
        if (visible && !document.hidden && !contextLost) frame = requestAnimationFrame(draw);
      };
      const start = () => {
        if (visible && !document.hidden && !contextLost && !frame) frame = requestAnimationFrame(draw);
      };
      const onContextLost = () => {
        contextLost = true;
        cancelAnimationFrame(frame);
        frame = 0;
        console.warn('Explore globe graphics context was lost; using the static backdrop.');
      };
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else { cancelAnimationFrame(frame); frame = 0; }
      });
      const observer = new ResizeObserver(resize);
      const visibility = () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
        else start();
      };
      observer.observe(container);
      intersection.observe(container);
      document.addEventListener('visibilitychange', visibility);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      resize();
      start();
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        intersection.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        sphereGeometry.dispose();
        sphereMaterial.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    setup();
    preference.addEventListener('change', setup);
    return () => {
      generation++;
      preference.removeEventListener('change', setup);
      cleanup();
    };
  }, []);

  return <div ref={containerRef} className="explore-globe" aria-hidden="true"/>;
}
