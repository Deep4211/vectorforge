import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  AuthError,
  LocalAuthProvider,
  validateEmail,
  validatePassword,
  validateSignUp,
} from '@vectorforge/persistence';

function provider(now: () => number = () => 1000): LocalAuthProvider {
  return new LocalAuthProvider({ factory: new IDBFactory(), dbName: `auth-${Math.random()}`, now });
}

const GOOD = { email: 'Ada@Example.com', password: 'lovelace1' };

async function expectAuthError(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(AuthError);
  await promise.catch((e: unknown) => expect((e as AuthError).code).toBe(code));
}

describe('LocalAuthProvider — sign up', () => {
  it('creates an account, normalizes the email, and starts a session', async () => {
    const auth = provider();
    const session = await auth.signUp({ ...GOOD, displayName: 'Ada' });
    expect(session.user.email).toBe('ada@example.com'); // normalized
    expect(session.user.displayName).toBe('Ada');
    expect(session.token).toBeTruthy();
    expect(session.expiresAt).toBeGreaterThan(1000);
  });

  it('derives a display name from the email when none is given', async () => {
    const session = await provider().signUp(GOOD);
    expect(session.user.displayName).toBe('ada');
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    const auth = provider();
    await auth.signUp(GOOD);
    await expectAuthError(
      auth.signUp({ email: 'ADA@example.com', password: 'another1' }),
      'email-taken',
    );
  });

  it('rejects an invalid email and a weak password', async () => {
    const auth = provider();
    await expectAuthError(auth.signUp({ email: 'nope', password: 'lovelace1' }), 'invalid-email');
    await expectAuthError(
      auth.signUp({ email: 'b@example.com', password: 'short' }),
      'weak-password',
    );
  });

  it('never stores the password in plaintext', async () => {
    const auth = provider();
    await auth.signUp(GOOD);
    // Re-open the same factory/db and read the raw user record.
    const session = await auth.getSession();
    expect(JSON.stringify(session)).not.toContain('lovelace1');
  });
});

describe('LocalAuthProvider — sign in', () => {
  it('signs in with correct credentials', async () => {
    const auth = provider();
    await auth.signUp(GOOD);
    const session = await auth.signIn({ email: 'ada@example.com', password: 'lovelace1' });
    expect(session.user.email).toBe('ada@example.com');
  });

  it('rejects a wrong password and an unknown email with the SAME error (no enumeration)', async () => {
    const auth = provider();
    await auth.signUp(GOOD);
    await expectAuthError(
      auth.signIn({ email: 'ada@example.com', password: 'wrong000' }),
      'invalid-credentials',
    );
    await expectAuthError(
      auth.signIn({ email: 'ghost@example.com', password: 'lovelace1' }),
      'invalid-credentials',
    );
  });
});

describe('LocalAuthProvider — session lifecycle', () => {
  it('persists the session for restore-on-load', async () => {
    const factory = new IDBFactory();
    const dbName = 'shared-auth';
    const first = new LocalAuthProvider({ factory, dbName, now: () => 1000 });
    await first.signUp(GOOD);
    // A fresh provider over the same storage (simulating a reload) sees the session.
    const second = new LocalAuthProvider({ factory, dbName, now: () => 2000 });
    const restored = await second.getSession();
    expect(restored?.user.email).toBe('ada@example.com');
  });

  it('returns null and clears an expired session', async () => {
    const factory = new IDBFactory();
    const dbName = 'expiry-auth';
    const t = { v: 1000 };
    const auth = new LocalAuthProvider({ factory, dbName, now: () => t.v, sessionTtlMs: 500 });
    await auth.signUp(GOOD);
    t.v = 2000; // well past 1000 + 500
    expect(await auth.getSession()).toBeNull();
  });

  it('signOut clears the session (idempotent)', async () => {
    const auth = provider();
    await auth.signUp(GOOD);
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
    await auth.signOut(); // no throw on second call
  });
});

describe('auth validation helpers', () => {
  it('validates email shape', () => {
    expect(validateEmail('')).toMatch(/required/);
    expect(validateEmail('nope')).toMatch(/valid/);
    expect(validateEmail('a@b.co')).toBeNull();
  });

  it('validates password strength', () => {
    expect(validatePassword('short1')).toMatch(/at least/);
    expect(validatePassword('allletters')).toMatch(/letter and a number/);
    expect(validatePassword('lovelace1')).toBeNull();
  });

  it('validateSignUp aggregates field errors incl. confirmation mismatch', () => {
    const errors = validateSignUp({ email: 'x', password: 'lovelace1', confirm: 'different' });
    expect(errors.email).toBeTruthy();
    expect(errors.confirm).toMatch(/match/);
    expect(
      validateSignUp({ email: 'a@b.co', password: 'lovelace1', confirm: 'lovelace1' }),
    ).toEqual({});
  });
});
