export function LightRays() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Top-left light ray */}
      <div 
        className="absolute light-ray"
        style={{
          top: '-20%',
          left: '-10%',
          width: '60%',
          height: '200%',
          background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.03) 0%, transparent 50%)',
          transform: 'rotate(-15deg)',
        }}
      />
      
      {/* Top-right light ray */}
      <div 
        className="absolute light-ray"
        style={{
          top: '-30%',
          right: '-20%',
          width: '50%',
          height: '200%',
          background: 'linear-gradient(-135deg, hsl(199 89% 55% / 0.02) 0%, transparent 50%)',
          transform: 'rotate(15deg)',
          animationDelay: '2s',
        }}
      />
      
      {/* Bottom accent ray */}
      <div 
        className="absolute light-ray"
        style={{
          bottom: '-40%',
          left: '20%',
          width: '40%',
          height: '150%',
          background: 'linear-gradient(45deg, hsl(217 91% 60% / 0.02) 0%, transparent 40%)',
          transform: 'rotate(-30deg)',
          animationDelay: '4s',
        }}
      />
    </div>
  );
}
