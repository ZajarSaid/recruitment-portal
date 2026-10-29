// Stub for the `server-only` guard package so server modules can be
// imported inside the Node-based test environment. The real package throws
// when imported outside a React Server Component, which is exactly what we
// want at build time but not in unit/integration tests.
export {};
