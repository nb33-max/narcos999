import { useEffect, useRef } from 'react';

export default function SmokeBackground({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, raf;
    const mouse = { x: -9999, y: -9999 };
    const particles = [];
    const COUNT = 70;

    const resize = () => {
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.18 + Math.random() * 0.45,
        vx: (Math.random() - 0.5) * 0.0004,
        vy: (Math.random() - 0.5) * 0.0004,
        alpha: 0.04 + Math.random() * 0.1,
        hue: 40 + Math.random() * 20,
        drift: Math.random() * Math.PI * 2,
      });
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top) / rect.height;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    const tick = (t) => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.drift += 0.001;
        p.vx += Math.sin(p.drift) * 0.0001;
        p.vy += Math.cos(p.drift) * 0.00008;
        // mouse vortex repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.25) {
          const force = (0.25 - dist) * 0.02;
          p.vx += (dx / (dist || 1)) * force;
          p.vy += (dy / (dist || 1)) * force;
        }
        p.vx *= 0.999;
        p.vy *= 0.999;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > 1) { p.x = 1; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > 1) { p.y = 1; p.vy *= -1; }

        const x = p.x * width;
        const y = p.y * height;
        const rad = p.r * Math.min(width, height);
        const a = p.alpha * (0.8 + 0.2 * Math.sin(t * 0.001 + p.drift * 3));
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(178, 166, 148, ${a})`);
        g.addColorStop(1, 'rgba(178, 166, 148, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />;
}
