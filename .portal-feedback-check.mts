import config from "./vitest.config.mts";
const componentTests = { ...config, test: { ...config.test, globalSetup: [], include: ["tests/components/*.test.tsx", "tests/lib/admin-access.test.ts"] } };
export default componentTests;
