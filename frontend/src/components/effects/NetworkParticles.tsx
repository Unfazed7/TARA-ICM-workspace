import { useMemo } from 'react';
import { useMousePosition } from '@/hooks/useMousePosition';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  shape: 'circle' | 'hexagon' | 'triangle';
}

interface NetworkParticlesProps {
  count?: number;
  enableParallax?: boolean;
}

export function NetworkParticles({ count = 12, enableParallax = true }: NetworkParticlesProps) {
  const mouse = useMousePosition(enableParallax);
  
  const particles = useMemo(() => {
    const items: Particle[] = [];
    const shapes: Particle['shape'][] = ['circle', 'hexagon', 'triangle'];
    
    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 8,
        delay: Math.random() * 5,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
    return items;
  }, [count]);

  // Calculate connections between nearby particles
  const connections = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
    const maxDistance = 30;
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance) {
          lines.push({
            x1: particles[i].x,
            y1: particles[i].y,
            x2: particles[j].x,
            y2: particles[j].y,
            opacity: 1 - distance / maxDistance,
          });
        }
      }
    }
    return lines;
  }, [particles]);

  const parallaxOffset = enableParallax ? {
    x: mouse.normalizedX * -10,
    y: mouse.normalizedY * -10,
  } : { x: 0, y: 0 };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
        }}
      >
        <defs>
          <linearGradient id="particleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
          </linearGradient>
          <filter id="particleGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Connection lines */}
        {connections.map((line, i) => (
          <line
            key={`line-${i}`}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            stroke="url(#particleGradient)"
            strokeWidth="0.5"
            opacity={line.opacity * 0.3}
            className="network-line"
          />
        ))}
        
        {/* Particles */}
        {particles.map((particle) => (
          <g
            key={particle.id}
            className="network-particle"
            style={{
              animationDelay: `${particle.delay}s`,
            }}
          >
            {particle.shape === 'circle' && (
              <circle
                cx={`${particle.x}%`}
                cy={`${particle.y}%`}
                r={particle.size / 2}
                fill="url(#particleGradient)"
                filter="url(#particleGlow)"
                opacity="0.5"
              />
            )}
            {particle.shape === 'hexagon' && (
              <polygon
                points={getHexagonPoints(particle.x, particle.y, particle.size / 2)}
                fill="url(#particleGradient)"
                filter="url(#particleGlow)"
                opacity="0.4"
              />
            )}
            {particle.shape === 'triangle' && (
              <polygon
                points={getTrianglePoints(particle.x, particle.y, particle.size / 2)}
                fill="url(#particleGradient)"
                filter="url(#particleGlow)"
                opacity="0.4"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function getHexagonPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle) * 0.1}%,${cy + r * Math.sin(angle) * 0.1}%`);
  }
  return points.join(' ');
}

function getTrianglePoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle) * 0.15}%,${cy + r * Math.sin(angle) * 0.15}%`);
  }
  return points.join(' ');
}
