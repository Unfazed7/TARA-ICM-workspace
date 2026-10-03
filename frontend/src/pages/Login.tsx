import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/layout/PageTransition';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      setStep('success');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = (_value: string) => {
    // 2FA not used with API auth
  };

  const handleResend = () => {
    // 2FA not used with API auth
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
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-4 py-10">
        <ThemeToggle className="fixed right-4 top-4 z-50 border bg-card" />
        {/* Skip to main content - accessibility */}
        <a href="#login-card" className="skip-link">
          Skip to login
        </a>

        <div
          id="login-card"
          className={cn(
            'w-full max-w-md',
            showError && 'error-shake'
          )}
        >
          <div className="rounded-md border bg-card p-6 sm:p-8">
            <div className="flex flex-col items-center mb-8 relative">
              <div className="grid size-12 place-items-center rounded border bg-background"><ShieldCheck className="size-6" /></div>
              <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight">
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
                    placeholder="you@example.com"
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
                  <div className="flex items-center gap-2 text-destructive text-xs p-2 rounded bg-destructive/10 border border-destructive/20" role="alert" aria-live="polite">
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
                    {email}
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

            <div className="mt-8 pt-4 border-t border-border/20">
              <div className="flex items-center justify-center gap-2">
                <div className="version-badge">
                  <ShieldCheck className="mr-2 size-3.5" aria-hidden="true" />
                  <span>ISO 21434 v2.4.1</span>
                  <span className="mx-2 text-muted-foreground/40">•</span>
                  <span className="text-muted-foreground/60">Secure Login</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
