/**
 * Environment detection utilities for controlling developer features and telemetry.
 */

/**
 * Detects whether the current execution context is a local development environment.
 * Evaluates to true for:
 * - 'localhost', '127.0.0.1', '[::1]' hostnames
 * - Subdomains ending in '.localhost'
 * - Non-browser or SSR test environments where window is undefined or hostname is empty
 *
 * Evaluates to false for production / public deployments (e.g. *.github.io, custom domains).
 */
export function isLocalhost(customHostname?: string): boolean {
  if (customHostname !== undefined) {
    return isLocalhostHostname(customHostname);
  }

  const win =
    typeof window !== 'undefined'
      ? window
      : (globalThis as unknown as { window?: { location?: { hostname?: string } } }).window;

  if (!win) {
    return true; // Node / test environment without window
  }

  const hostname = win.location?.hostname;
  if (!hostname) {
    return true; // Headless test runners or file:// protocol
  }

  return isLocalhostHostname(hostname);
}

function isLocalhostHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().trim();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '[::1]' ||
    normalized.endsWith('.localhost')
  );
}
