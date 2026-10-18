import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearApiCache } from '../services/api';

// Recharts measures its container; jsdom has no layout, so give it a stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;

afterEach(() => {
  cleanup();
  clearApiCache();
});
