import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InMemoryDocumentRepository } from '@vectorforge/persistence';
import type { AuthProvider, AuthSession } from '@vectorforge/shared';
import { App } from '../src/App';
import type { AppServices } from '../src/services';

const SESSION: AuthSession = {
  user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada', createdAt: 0 },
  token: 'test-token',
  expiresAt: 4_000_000_000_000,
};

function servicesWith(getSession: () => Promise<AuthSession | null>): AppServices {
  const authProvider: AuthProvider = {
    getSession,
    signIn: () => Promise.resolve(SESSION),
    signUp: () => Promise.resolve(SESSION),
    signOut: () => Promise.resolve(),
  };
  return { authProvider, repository: new InMemoryDocumentRepository() };
}

describe('<App /> — editor shell (authenticated)', () => {
  it('mounts the composed editor chrome once the session is restored', async () => {
    render(<App services={servicesWith(() => Promise.resolve(SESSION))} />);
    // The gate shows a splash until restoreSession resolves, then the editor.
    expect(await screen.findByRole('toolbar', { name: /tools/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Design canvas')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /layers/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /inspector/i })).toBeInTheDocument();
  });

  it('shows the sample document in the layer tree', async () => {
    render(<App services={servicesWith(() => Promise.resolve(SESSION))} />);
    expect(await screen.findByRole('tree', { name: /layer tree/i })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem').length).toBeGreaterThan(0);
  });
});

describe('<App /> — authentication gate', () => {
  it('shows the sign-in screen when there is no session', async () => {
    render(<App services={servicesWith(() => Promise.resolve(null))} />);
    expect(await screen.findByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.queryByRole('toolbar', { name: /tools/i })).not.toBeInTheDocument();
  });
});
