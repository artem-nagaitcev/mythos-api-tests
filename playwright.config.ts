import dotenv from 'dotenv';
import os from 'node:os';
import { defineConfig } from '@playwright/test';

dotenv.config({ override: true, quiet: true });

const isCI = !!process.env.CI;
const includeIgnoredTests = process.env.PW_INCLUDE_IGNORE === '1';
const htmlReporter = ['html', { open: 'never' }] as const;
const allureReporter = [
  'allure-playwright',
  {
    resultsDir: 'allure-results',
    detail: true,
    suiteTitle: true,
    environmentInfo: {
      os_platform: os.platform(),
      os_release: os.release(),
      os_version: os.version(),
      node_version: process.version,
      base_url: process.env.BASE_URL ?? 'not configured',
    },
  },
] as const;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  grepInvert: includeIgnoredTests ? undefined : /@ignore/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isCI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: isCI
    ? [['github'], htmlReporter, allureReporter]
    : [['list', { printSteps: true }], htmlReporter, allureReporter],
  /* Store traces and other test artifacts in a stable folder for local runs and CI uploads. */
  outputDir: 'test-results',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.BASE_URL,

    /* Keep failure traces on CI and capture them on the first retry locally. */
    trace: isCI ? 'retain-on-failure' : 'on-first-retry',
  },

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
