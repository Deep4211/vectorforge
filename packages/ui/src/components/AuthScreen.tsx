import { useState, type FormEvent } from 'react';
import { validateEmail, validateSignUp } from '@vectorforge/shared';
import { clearAuthError, signIn, signUp } from '../auth/auth-store';
import { useAuth } from '../hooks/use-auth';
import { Icon, PATHS } from './icons';

type Mode = 'signin' | 'signup';
interface Errors {
  email?: string | undefined;
  password?: string | undefined;
  confirm?: string | undefined;
  name?: string | undefined;
}

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  autoComplete: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}

function Field({ id, label, type, value, autoComplete, error, onChange }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-muted text-[12px] font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-surface text-ink h-[38px] rounded-lg border px-3 text-[13px] outline-none transition-colors ${
          error ? 'border-danger' : 'border-border focus:border-brand'
        }`}
      />
      {error && (
        <span id={`${id}-error`} role="alert" className="text-danger text-[11.5px]">
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * Full-screen authentication gate (sign in / create account). Renders above the
 * editor when there is no session. Validation mirrors the provider's rules
 * (shared), shown inline; the store surfaces auth failures as a banner. The
 * password field is never echoed anywhere but the masked input.
 */
export function AuthScreen() {
  const { busy, error } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const switchMode = (next: Mode): void => {
    setMode(next);
    setErrors({});
    setConfirm('');
    clearAuthError();
  };

  const validate = (): Errors => {
    if (mode === 'signin') {
      const next: Errors = {};
      const e = validateEmail(email);
      if (e) next.email = e;
      if (password === '') next.password = 'Password is required';
      return next;
    }
    const fields = validateSignUp({ email, password, confirm, displayName: name });
    return {
      email: fields.email,
      password: fields.password,
      confirm: fields.confirm,
      name: fields.displayName,
    };
  };

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    if (mode === 'signin') {
      await signIn({ email, password });
    } else {
      const displayName = name.trim();
      await signUp(displayName ? { email, password, displayName } : { email, password });
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="bg-canvas text-ink flex h-screen w-screen items-center justify-center p-6">
      <div className="bg-panel border-border w-full max-w-[380px] rounded-2xl border p-7 shadow-[0_24px_60px_rgba(0,0,0,.35)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="from-brand-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br to-[#5B3CE0] text-white shadow-[0_4px_14px_rgba(124,92,255,.45)]">
            <Icon d={PATHS.logo} size={22} sw={2.2} />
          </div>
          <div>
            <h1 className="text-ink-bright text-[17px] font-semibold">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-faint mt-0.5 text-[12.5px]">
              {isSignup ? 'Start designing with VectorForge' : 'Sign in to your VectorForge studio'}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="border-danger/40 bg-danger/10 text-danger mb-4 rounded-lg border px-3 py-2 text-[12.5px]"
          >
            {error}
          </div>
        )}

        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
          {isSignup && (
            <Field
              id="auth-name"
              label="Name (optional)"
              type="text"
              value={name}
              autoComplete="name"
              error={errors.name}
              onChange={(v) => {
                setName(v);
                clearAuthError();
              }}
            />
          )}
          <Field
            id="auth-email"
            label="Email"
            type="email"
            value={email}
            autoComplete="email"
            error={errors.email}
            onChange={(v) => {
              setEmail(v);
              setErrors((p) => ({ ...p, email: undefined }));
              clearAuthError();
            }}
          />
          <Field
            id="auth-password"
            label="Password"
            type="password"
            value={password}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            error={errors.password}
            onChange={(v) => {
              setPassword(v);
              setErrors((p) => ({ ...p, password: undefined }));
              clearAuthError();
            }}
          />
          {isSignup && (
            <Field
              id="auth-confirm"
              label="Confirm password"
              type="password"
              value={confirm}
              autoComplete="new-password"
              error={errors.confirm}
              onChange={(v) => {
                setConfirm(v);
                setErrors((p) => ({ ...p, confirm: undefined }));
              }}
            />
          )}

          <button
            type="submit"
            disabled={busy}
            className="from-brand-2 mt-1 flex h-[40px] items-center justify-center rounded-lg bg-gradient-to-b to-[#7048E8] text-[13.5px] font-semibold text-white shadow-[0_2px_12px_rgba(124,92,255,.35)] transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-faint mt-5 text-center text-[12.5px]">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
            className="text-brand font-semibold hover:underline"
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
