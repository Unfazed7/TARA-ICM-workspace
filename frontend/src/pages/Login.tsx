import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/layout/PageTransition';
import { NetworkParticles } from '@/components/effects/NetworkParticles';
import { MeshGradient } from '@/components/effects/MeshGradient';
import { VignetteOverlay } from '@/components/effects/VignetteOverlay';
import { LightRays } from '@/components/effects/LightRays';
import { NoiseTexture } from '@/components/effects/NoiseTexture';
import { AnimatedShield } from '@/components/effects/AnimatedShield';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

type LoginStep = 'credentials' | '2fa' | 'success';

export default function Login() {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const { login, verify2FA, resend2FA, pendingUser } = useAuth();
  const navigate = useNavigate();

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      triggerShake();
      return;
    }

    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      const result = login(email.trim(), password);
      setIsLoading(false);

      if (result.success) {
        setStep('2fa');
      } else {
        setError(result.error || 'Login failed');
        triggerShake();
      }
    }, 400);
  };

  const handleOTPComplete = (value: string) => {
    setOtpValue(value);
    if (value.length === 6) {
      setIsLoading(true);
      setTimeout(() => {
        const success = verify2FA(value);
        setIsLoading(false);

        if (success) {
          setStep('success');
          // Brief animation then redirect
          setTimeout(() => {
            navigate(pendingUser?.role === 'analyst' ? '/review' : '/dashboard');
          }, 800);
        } else {
          setError('Invalid verification code. Please try again.');
          setOtpValue('');
          triggerShake();
        }
      }, 300);
    }
  };

  const handleResend = () => {
    resend2FA();
    setOtpValue('');
    setError('');
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtpValue('');
    setError('');
  };

  const triggerShake = () => {
    setShowError(true);
    setTimeout(() => setShowError(false), 500);
  };

  return (
    <PageTransition variant="scale">
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
        {/* Skip to main content - accessibility */}
        <a href="#login-card" className="skip-link">
          Skip to login
        </a>

        {/* Background layers with parallax */}
        <div className="absolute inset-0 animated-grid gradient-shift" />
        <MeshGradient enableParallax />
        <LightRays />
        <NetworkParticles count={15} enableParallax />
        <VignetteOverlay />
        <NoiseTexture />

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" />
        </div>

        {/* Blurred vehicle wireframe effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] opacity-[0.04]">
          <svg viewBox="0 0 800 400" className="w-full h-full">
            <defs>
              <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(217 91% 60%)" />
                <stop offset="100%" stopColor="hsl(199 89% 55%)" />
              </linearGradient>
            </defs>
            <path
              d="M100,200 Q200,100 400,120 Q600,140 700,200 Q650,280 400,300 Q150,280 100,200 Z"
              fill="none"
              stroke="url(#wireGradient)"
              strokeWidth="1.5"
            />
            <circle cx="200" cy="280" r="45" fill="none" stroke="url(#wireGradient)" strokeWidth="1.5" />
            <circle cx="600" cy="280" r="45" fill="none" stroke="url(#wireGradient)" strokeWidth="1.5" />
            <path d="M250,150 Q400,100 550,150" fill="none" stroke="url(#wireGradient)" strokeWidth="0.5" opacity="0.5" />
            <path d="M180,200 L280,200" fill="none" stroke="url(#wireGradient)" strokeWidth="0.5" opacity="0.5" />
            <path d="M520,200 L620,200" fill="none" stroke="url(#wireGradient)" strokeWidth="0.5" opacity="0.5" />
          </svg>
        </div>

        {/* Premium Glass Login Card */}
        <div
          id="login-card"
          className={cn(
            'relative z-10 w-full max-w-lg mx-4',
            showError && 'error-shake'
          )}
        >
          <div className="glass-card-premium rounded-2xl p-8" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            {/* Top glow accent */}
            <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {/* Logo and Title with animations */}
            <div className="flex flex-col items-center mb-8 relative">
              <AnimatedShield size="md" />

              <h1 className="text-2xl font-semibold tracking-tight mt-6 gradient-text letter-spacing-hover">
                AutoTARA
              </h1>
              <p className="text-xs text-muted-foreground mt-2 tracking-wide animated-underline active">
                Automotive Threat Analysis & Risk Assessment
              </p>
            </div>

            {/* ═══════════════ STEP 1: CREDENTIALS ═══════════════ */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentialSubmit} className="space-y-5 animate-fade-in">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Sign in with your credentials
                </p>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@autotara.io"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    className="h-11 bg-card/40 border-border/40 backdrop-blur-sm focus:border-primary/50 transition-all"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="h-11 bg-card/40 border-border/40 backdrop-blur-sm focus:border-primary/50 transition-all"
                    autoComplete="current-password"
                  />
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-xs animate-fade-in p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'w-full gap-2 relative overflow-hidden btn-lift btn-shine',
                    email && password && 'shadow-[0_0_20px_hsl(217_91%_60%/0.3)]',
                    (!email || !password) && 'opacity-70'
                  )}
                  size="lg"
                >
                  {isLoading ? (
                    <span className="relative z-10 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="relative z-10 flex items-center gap-2">
                      Sign In
                      <ArrowRight className="w-4 h-4 arrow-slide" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* ═══════════════ STEP 2: 2FA OTP ═══════════════ */}
            {step === '2fa' && (
              <div className="space-y-5 animate-fade-in">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    We've sent a 6-digit verification code to
                  </p>
                  <p className="text-xs font-medium text-primary">
                    {pendingUser?.email || email}
                  </p>
                </div>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={(val) => {
                      setOtpValue(val);
                      setError('');
                    }}
                    onComplete={handleOTPComplete}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <span className="text-muted-foreground/40 mx-1">—</span>
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center justify-center gap-2 text-destructive text-xs animate-fade-in p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {isLoading && (
                  <div className="flex justify-center">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════ STEP 3: SUCCESS ═══════════════ */}
            {step === 'success' && (
              <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-sm font-medium gradient-text">Authentication Successful</p>
                <p className="text-xs text-muted-foreground">Redirecting to your dashboard...</p>
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}

            {/* Status Bar */}
            <div className="mt-8 pt-4 border-t border-border/20">
              <div className="flex items-center justify-center gap-2">
                <div className="version-badge">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/80 status-dot-pulse" />
                  </span>
                  <span>ISO 21434 v2.4.1</span>
                  <span className="mx-2 text-muted-foreground/40">•</span>
                  <span className="text-muted-foreground/60">Secure Login</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corner accents */}
        <div className="absolute top-8 left-8 w-20 h-20 border-l border-t border-primary/20 rounded-tl-2xl" />
        <div className="absolute top-8 right-8 w-20 h-20 border-r border-t border-primary/20 rounded-tr-2xl" />
        <div className="absolute bottom-8 left-8 w-20 h-20 border-l border-b border-accent/20 rounded-bl-2xl" />
        <div className="absolute bottom-8 right-8 w-20 h-20 border-r border-b border-accent/20 rounded-br-2xl" />

        {/* Glowing accent lines */}
        <div className="absolute top-0 left-0 right-0 h-px glow-line" />
        <div className="absolute bottom-0 left-0 right-0 h-px glow-line" />
      </div>
    </PageTransition>
  );
}
