import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ThinkingLogEntry {
  text: string;
  type: 'info' | 'success' | 'warning';
}

const thinkingMessages: ThinkingLogEntry[] = [
  { text: 'Initializing AI asset discovery engine...', type: 'info' },
  { text: 'Parsing CAN communication matrix...', type: 'info' },
  { text: 'Analyzing gateway security boundaries...', type: 'info' },
  { text: 'Mapping automotive ethernet topology...', type: 'info' },
  { text: 'Identifying Safety-Critical assets...', type: 'warning' },
  { text: 'Cross-referencing ISO 21434 asset catalog...', type: 'info' },
  { text: 'Detecting PII data flows in telematics...', type: 'warning' },
  { text: 'Evaluating cryptographic key storage...', type: 'info' },
  { text: 'Mapping UN R155 Attack Paths...', type: 'warning' },
  { text: 'Correlating STRIDE threat patterns...', type: 'info' },
  { text: 'Validating network segmentation...', type: 'info' },
  { text: 'Identifying privilege escalation vectors...', type: 'warning' },
  { text: 'Asset tagging complete ✓', type: 'success' },
];

interface AIScanOverlayProps {
  isScanning: boolean;
  onComplete?: () => void;
}

export function AIScanOverlay({ isScanning, onComplete }: AIScanOverlayProps) {
  const [visibleLogs, setVisibleLogs] = useState<ThinkingLogEntry[]>([]);
  const [pulseCount, setPulseCount] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isScanning) {
      setVisibleLogs([]);
      setPulseCount(0);
      return;
    }

    // Start sonar pulses
    const pulseInterval = setInterval(() => {
      setPulseCount((prev) => prev + 1);
    }, 600);

    // Gradually add thinking log messages
    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < thinkingMessages.length) {
        setVisibleLogs((prev) => [...prev, thinkingMessages[logIndex]]);
        logIndex++;
      } else {
        clearInterval(logInterval);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    }, 180);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(logInterval);
    };
  }, [isScanning, onComplete]);

  // Auto-scroll thinking log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  if (!isScanning) return null;

  return (
    <>
      {/* Sonar Pulse Animation - Center of canvas */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40 overflow-hidden">
        {/* Multiple pulse rings */}
        {Array.from({ length: Math.min(pulseCount, 5) }).map((_, i) => (
          <div
            key={`pulse-${pulseCount - i}`}
            className="absolute w-32 h-32 rounded-full border-2 border-primary/60 sonar-pulse"
            style={{ 
              animationDelay: `${i * 0.4}s`,
              animationDuration: '2.5s'
            }}
          />
        ))}
        
        {/* Center point */}
        <div className="absolute w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/50">
          <div className="absolute inset-0 rounded-full bg-primary animate-ping" />
        </div>
      </div>

      {/* AI Thinking Log - Bottom right */}
      <div className="absolute bottom-6 right-6 z-50 w-80">
        <div className="glass-panel-strong rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              AI Analysis Active
            </span>
          </div>

          {/* Scrolling log container */}
          <div
            ref={logContainerRef}
            className="h-40 overflow-y-auto p-3 space-y-1.5 scrollbar-thin"
          >
            {visibleLogs.map((log, i) => {
              if (!log) return null;
              return (
                <div
                  key={i}
                  className={cn(
                    "text-xs font-mono leading-relaxed animate-fade-in",
                    log.type === 'info' && "text-muted-foreground",
                    log.type === 'warning' && "text-dusty-amber",
                    log.type === 'success' && "text-sage font-medium"
                  )}
                >
                  <span className="text-primary/60 mr-2">›</span>
                  {log.text}
                </div>
              );
            })}
            
            {/* Blinking cursor */}
            <div className="flex items-center gap-1">
              <span className="text-primary/60 text-xs font-mono mr-2">›</span>
              <span className="w-2 h-4 bg-primary/70 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}