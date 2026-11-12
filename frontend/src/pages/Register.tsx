import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/layout/PageTransition';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password || !inviteCode.trim()) {
      setError('Please fill in every field');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.auth.register(email.trim(), password, name.trim(), inviteCode.trim());
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const field = (
    id: string,
    label: string,
    icon: React.ReactNode,
    value: string,
    set: (v: string) => void,
    type = 'text',
    autoComplete?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => {
          set(e.target.value);
          setError('');
        }}
        className="h-11"
      />
    </div>
  );

  return (
    <PageTransition variant="scale">
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-md border bg-card p-6 sm:p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="grid size-12 place-items-center rounded border bg-background">
                <ShieldCheck className="size-6" />
              </div>
              <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight">AutoTARA</h1>
              <p className="text-sm text-muted-foreground mt-2">Create your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {field('name', 'Full name', <User className="w-3.5 h-3.5" />, name, setName, 'text', 'name')}
              {field('email', 'Email address', <Mail className="w-3.5 h-3.5" />, email, setEmail, 'email', 'email')}
              {field('password', 'Password (min 8 characters)', <Lock className="w-3.5 h-3.5" />, password, setPassword, 'password', 'new-password')}
              {field('confirm', 'Confirm password', <Lock className="w-3.5 h-3.5" />, confirm, setConfirm, 'password', 'new-password')}
              {field('invite', 'Invite code', <KeyRound className="w-3.5 h-3.5" />, inviteCode, setInviteCode)}

              {error && (
                <div
                  className="flex items-center gap-2 text-destructive text-xs p-2 rounded bg-destructive/10 border border-destructive/20"
                  role="alert"
                >
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full gap-2" size="lg">
                {isLoading ? 'Creating account…' : (<>Create account <ArrowRight className="w-4 h-4" /></>)}
              </Button>
            </form>

            <p className="mt-6 text-xs text-muted-foreground text-center">
              Already registered?{' '}
              <Link to="/login" className="text-primary underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
