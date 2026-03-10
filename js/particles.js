import { ctx, tick } from './state.js';

// ─── PARTICLE SYSTEM ───────────────────────────────────────
const particles = [];
const MAX_PARTICLES = 200;

export function spawnParticle(x, y, type) {
  if (particles.length >= MAX_PARTICLES) particles.shift();

  const p = { x, y, type, life: 1.0, maxLife: 1.0 };

  switch (type) {
    case 'dirt':
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = -Math.random() * 2 - 1;
      p.size = 1.5 + Math.random() * 2;
      p.color = `hsl(${25 + Math.random() * 15}, ${50 + Math.random() * 20}%, ${30 + Math.random() * 20}%)`;
      p.maxLife = 0.5 + Math.random() * 0.5;
      p.gravity = 0.08;
      break;
    case 'sparkle':
      p.vx = (Math.random() - 0.5) * 1.5;
      p.vy = (Math.random() - 0.5) * 1.5;
      p.size = 1 + Math.random() * 2;
      p.color = '#ffd700';
      p.maxLife = 0.4 + Math.random() * 0.3;
      p.gravity = 0;
      break;
    case 'fight':
      p.vx = (Math.random() - 0.5) * 4;
      p.vy = (Math.random() - 0.5) * 4;
      p.size = 1 + Math.random() * 1.5;
      p.color = Math.random() < 0.5 ? '#ff4400' : '#ffaa00';
      p.maxLife = 0.3 + Math.random() * 0.2;
      p.gravity = 0;
      break;
    case 'heart':
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = -0.5 - Math.random() * 0.5;
      p.size = 3 + Math.random() * 2;
      p.color = '#ff6b9d';
      p.maxLife = 1.0;
      p.gravity = -0.01;
      break;
    case 'food':
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = -Math.random() * 1.5;
      p.size = 2;
      p.color = '#4aee44';
      p.maxLife = 0.6;
      p.gravity = 0.03;
      break;
    case 'snow':
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = 0.3 + Math.random() * 0.5;
      p.size = 1.5 + Math.random() * 2;
      p.color = '#ffffff';
      p.maxLife = 3.0;
      p.gravity = 0;
      break;
    case 'leaf':
      p.vx = 0.2 + Math.random() * 0.5;
      p.vy = 0.1 + Math.random() * 0.3;
      p.size = 3 + Math.random() * 2;
      p.color = `hsl(${25 + Math.random() * 20}, 70%, ${45 + Math.random() * 20}%)`;
      p.maxLife = 2.5;
      p.gravity = 0.005;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotSpeed = (Math.random() - 0.5) * 0.05;
      break;
  }

  p.life = p.maxLife;
  particles.push(p);
}

export function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.016;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    p.x += p.vx;
    p.y += p.vy;
    if (p.gravity) p.vy += p.gravity;

    const alpha = Math.min(1, p.life / p.maxLife);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.type === 'heart') {
      ctx.fillStyle = p.color;
      ctx.font = `${p.size * 2}px serif`;
      ctx.fillText('♥', p.x, p.y);
    } else if (p.type === 'leaf') {
      ctx.translate(p.x, p.y);
      p.rotation += p.rotSpeed;
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'sparkle') {
      ctx.fillStyle = p.color;
      // Star shape
      const spikes = 4;
      const outerR = p.size;
      const innerR = p.size * 0.4;
      ctx.beginPath();
      for (let s = 0; s < spikes * 2; s++) {
        const r = s % 2 === 0 ? outerR : innerR;
        const angle = (s / (spikes * 2)) * Math.PI * 2 + tick * 0.1;
        ctx.lineTo(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Convenience: spawn a burst of particles
export function burstParticles(x, y, type, count) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, type);
  }
}
