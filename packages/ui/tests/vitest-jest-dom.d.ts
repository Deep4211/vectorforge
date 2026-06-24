// Brings the jest-dom matcher augmentations (toBeInTheDocument, toHaveFocus, …)
// into TypeScript scope for the component tests. The runtime registration lives
// in the root vitest.setup.ts (loaded by the `dom` test project).
import '@testing-library/jest-dom/vitest';
