import '@testing-library/jest-dom/vitest';
import axios, { AxiosError } from 'axios';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// No real network in unit tests: jsdom's document URL is http://localhost:3000, the API's dev port,
// so an unmocked request could reach a running API, get 401 and wipe the session mid-test.
// The adapter is copied into every axios.create() instance made after this line.
axios.defaults.adapter = () =>
  Promise.reject(new AxiosError('Network disabled in tests', AxiosError.ERR_NETWORK));

// jsdom lacks ResizeObserver, which Radix primitives (checkbox, tooltip) use.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
