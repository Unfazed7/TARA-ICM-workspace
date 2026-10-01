import { useMousePosition } from '@/hooks/useMousePosition';

interface MeshGradientProps {
  enableParallax?: boolean;
}

export function MeshGradient({ enableParallax = true }: MeshGradientProps) {
  const mouse = useMousePosition(enableParallax);
  
  const parallaxOffset = enableParallax ? {
    x: mouse.normalizedX * 20,
    y: mouse.normalizedY * 20,
  } : { x: 0, y: 0 };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Animated mesh gradient blobs */}
      <div 
        className="absolute w-[800px] h-[800px] mesh-blob-1 transition-transform duration-500 ease-out"
        style={{
          top: '-20%',
          left: '10%',
          transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
          background: 'radial-gradient(circle, hsl(217 91% 60% / 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div 
        className="absolute w-[600px] h-[600px] mesh-blob-2 transition-transform duration-700 ease-out"
        style={{
          bottom: '-10%',
          right: '5%',
          transform: `translate(${-parallaxOffset.x * 0.5}px, ${-parallaxOffset.y * 0.5}px)`,
          background: 'radial-gradient(circle, hsl(199 89% 55% / 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div 
        className="absolute w-[500px] h-[500px] mesh-blob-3 transition-transform duration-600 ease-out"
        style={{
          top: '40%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.3}px)`,
          background: 'radial-gradient(circle, hsl(217 91% 50% / 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
    </div>
  );
}
