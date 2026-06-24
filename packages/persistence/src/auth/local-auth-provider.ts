import {
  AuthError,
  validateEmail,
  validatePassword,
  type AuthProvider,
  type AuthSession,
  type AuthUser,
  type Credentials,
  type SignUpInput,
} from '@vectorforge/shared';
import { generateToken, hashPassword, verifyPassword } from './crypto';

/**
 * On-device {@link AuthProvider}: accounts live in IndexedDB and passwords are
 * PBKDF2-hashed (see ./crypto). The `IDBFactory` and clock are injected so the
 * full flow — signup, duplicate-email, wrong-password, session restore, expiry,
 * logout — is testable headlessly against `fake-indexeddb`.
 */
export interface LocalAuthOptions {
  readonly factory?: IDBFactory;
  readonly dbName?: string;
  readonly now?: () => number;
  /** Session lifetime in ms (default 30 days). */
  readonly sessionTtlMs?: number;
}

interface UserRecord {
  email: string; // normalized; the store key
  id: string;
  displayName: string;
  salt: string;
  hash: string;
  createdAt: number;
}

interface SessionRecord {
  key: 'current';
  email: string;
  token: string;
  expiresAt: number;
}

const DEFAULT_DB = 'vectorforge-auth';
const USERS = 'users';
const SESSION = 'session';
const SESSION_KEY = 'current';
const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000;
// A fixed, valid 16-byte salt used to run the KDF for unknown accounts, so a
// failed sign-in costs the same time whether or not the email exists.
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA==';

function requestAsync<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class LocalAuthProvider implements AuthProvider {
  private readonly factory: IDBFactory;
  private readonly dbName: string;
  private readonly now: () => number;
  private readonly ttl: number;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: LocalAuthOptions = {}) {
    const factory = options.factory ?? globalThis.indexedDB;
    if (!factory) throw new AuthError('unavailable', 'Storage is unavailable in this environment');
    this.factory = factory;
    this.dbName = options.dbName ?? DEFAULT_DB;
    this.now = options.now ?? Date.now;
    this.ttl = options.sessionTtlMs ?? DEFAULT_TTL;
  }

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(USERS)) db.createObjectStore(USERS, { keyPath: 'email' });
        if (!db.objectStoreNames.contains(SESSION))
          db.createObjectStore(SESSION, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  private async getUser(email: string): Promise<UserRecord | null> {
    const db = await this.open();
    const store = db.transaction(USERS, 'readonly').objectStore(USERS);
    const record = await requestAsync(store.get(email) as IDBRequest<UserRecord | undefined>);
    return record ?? null;
  }

  private async putUser(record: UserRecord): Promise<void> {
    const db = await this.open();
    const store = db.transaction(USERS, 'readwrite').objectStore(USERS);
    await requestAsync(store.put(record));
  }

  private async writeSession(email: string): Promise<AuthSession> {
    const token = generateToken();
    const expiresAt = this.now() + this.ttl;
    const db = await this.open();
    const store = db.transaction(SESSION, 'readwrite').objectStore(SESSION);
    const record: SessionRecord = { key: SESSION_KEY, email, token, expiresAt };
    await requestAsync(store.put(record));
    const user = await this.getUser(email);
    if (!user) throw new AuthError('unknown', 'Account vanished while creating session');
    return { user: toAuthUser(user), token, expiresAt };
  }

  async signUp(input: SignUpInput): Promise<AuthSession> {
    const emailError = validateEmail(input.email);
    if (emailError) throw new AuthError('invalid-email', emailError);
    const passwordError = validatePassword(input.password);
    if (passwordError) throw new AuthError('weak-password', passwordError);

    const email = normalizeEmail(input.email);
    if (await this.getUser(email)) {
      throw new AuthError('email-taken', 'An account with this email already exists');
    }

    const { salt, hash } = await hashPassword(input.password);
    const displayName = (input.displayName ?? '').trim() || email.split('@')[0]!;
    await this.putUser({
      email,
      id: generateToken(),
      displayName,
      salt,
      hash,
      createdAt: this.now(),
    });
    return this.writeSession(email);
  }

  async signIn(credentials: Credentials): Promise<AuthSession> {
    const email = normalizeEmail(credentials.email);
    const user = await this.getUser(email);
    // Always run the KDF — even for an unknown account, against a dummy salt — so
    // response time does not reveal whether the email is registered. The error is
    // identical for unknown-email and wrong-password (no account enumeration).
    const ok = await verifyPassword(
      credentials.password,
      user?.salt ?? DUMMY_SALT,
      user?.hash ?? '',
    );
    if (!user || !ok) {
      throw new AuthError('invalid-credentials', 'Incorrect email or password');
    }
    return this.writeSession(email);
  }

  async signOut(): Promise<void> {
    const db = await this.open();
    const store = db.transaction(SESSION, 'readwrite').objectStore(SESSION);
    await requestAsync(store.delete(SESSION_KEY));
  }

  async getSession(): Promise<AuthSession | null> {
    const db = await this.open();
    const store = db.transaction(SESSION, 'readonly').objectStore(SESSION);
    const record = await requestAsync(
      store.get(SESSION_KEY) as IDBRequest<SessionRecord | undefined>,
    );
    if (!record) return null;
    if (record.expiresAt <= this.now()) {
      await this.signOut(); // expired — clear it
      return null;
    }
    const user = await this.getUser(record.email);
    if (!user) return null; // account deleted out from under the session
    return { user: toAuthUser(user), token: record.token, expiresAt: record.expiresAt };
  }
}

function toAuthUser(record: UserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    createdAt: record.createdAt,
  };
}
