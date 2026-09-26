export function VignetteOverlay() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-40"
      style={{
        background: `
          radial-gradient(
            ellipse 80% 60% at 50% 50%,
            transparent 0%,
            transparent 50%,
            hsl(222 47% 8% / 0.3) 80%,
            hsl(222 47% 8% / 0.6) 100%
          )
        `,
      }}
    />
  );
}
