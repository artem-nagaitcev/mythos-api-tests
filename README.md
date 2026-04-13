# Mythos API Tests

This repository uses Playwright with TypeScript for API test automation.

## Step 0. Clone and Install Dependencies

If the project already exists in GitHub, clone it first:

```bash
git clone <your-repository-url>
cd mythos-api-tests
npm install
```

## Step 1. Install Required Tools

Install these tools before creating or running the project:

1. Node.js LTS
2. VS Code
3. Git
4. GitHub account

Recommended download pages:

1. Node.js LTS: https://nodejs.org/
2. VS Code: https://code.visualstudio.com/
3. Git: https://git-scm.com/
4. GitHub: https://github.com/

After installation, verify the tools in a terminal:

```bash
node -v
npm -v
git --version
code --version
```

## Step 2. Create a New Playwright Project

Create the project folder and run the Playwright bootstrap command:

```bash
mkdir mythos-api-tests
cd mythos-api-tests
npm init playwright@latest
```

Choose these answers in the setup wizard:

```text
language: TypeScript
tests folder: tests
add GitHub Actions: yes
install browsers: yes
```

Why this is a good starting point:

1. TypeScript gives better type safety and editor support.
2. The `tests` folder is a clean and conventional default.
3. GitHub Actions adds CI from the start.
4. Installing browsers immediately makes the project ready to run.

## Step 3. Install Extra Packages After `init`

After Playwright initialization, install the additional packages below.

Add TypeScript and Node.js typings:

```bash
npm install -D typescript @types/node
```

If TypeScript is already installed, that is fine. Just verify it exists in `package.json`.

Add `dotenv` for environment variables:

```bash
npm install dotenv
```

Why these packages are useful:

1. Playwright can execute `.ts` test files directly, but a separate TypeScript compiler is still useful for type-checking.
2. `@types/node` adds type definitions for Node.js APIs.
3. `dotenv` makes it easy to keep secrets, base URLs, and environment-specific values in `.env`.
4. A pair like `.env` and `.env.example` helps document required variables without committing secrets.

## Step 4. Generate `tsconfig.json`

The easiest way to create the initial TypeScript config is through the TypeScript CLI:

```bash
npx tsc --init
```

This generates a basic `tsconfig.json` file in the project root.

After that, run a type-check to make sure TypeScript is working:

```bash
npx tsc --noEmit
```

## Step 5. Replace `tsconfig.json`

After generating the default file, replace it with this configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node", "@playwright/test"],

    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,

    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "include": ["src", "tests", "playwright.config.ts"],
  "exclude": ["node_modules"]
}
```

## Step 6. What Each `tsconfig` Option Means

### `compilerOptions`

`target: "ES2022"`

This tells TypeScript which JavaScript version to output. `ES2022` is modern and works well in recent Node.js LTS versions.

`module: "NodeNext"`

This enables modern Node.js module behavior and supports both ESM and Node-compatible resolution rules.

`moduleResolution: "NodeNext"`

This tells TypeScript how to resolve imports when using the Node.js modern module system.

`lib: ["ES2022"]`

This includes the built-in JavaScript library definitions for ES2022 features.

`types: ["node", "@playwright/test"]`

This loads type definitions for Node.js and Playwright so the editor and compiler understand globals, APIs, fixtures, and test helpers.

`strict: true`

This turns on strict type-checking and is strongly recommended for stable test code.

`noImplicitAny: true`

This prevents TypeScript from silently using the `any` type when a type is missing.

`noUncheckedIndexedAccess: true`

This makes indexed access safer by treating missing values as possible `undefined`.

`esModuleInterop: true`

This improves compatibility when importing CommonJS packages in TypeScript.

`resolveJsonModule: true`

This allows importing `.json` files directly into TypeScript.

`skipLibCheck: true`

This skips type-checking inside dependency declaration files and usually makes builds faster.

`sourceMap: true`

This generates source maps, which helps with debugging.

`outDir: "dist"`

This sets the output folder for compiled files if you later emit JavaScript builds.

### Root-level fields

`include: ["src", "tests", "playwright.config.ts"]`

This tells TypeScript which project files should be included in type-checking.

`exclude: ["node_modules"]`

This excludes installed dependencies from project compilation.

## Step 7. Environment Variables

Store secrets and environment-specific configuration in `.env`.

Example:

```bash
BASE_URL=https://api.qasandbox.ru/api/
GRAPHQL_URL=https://api.qasandbox.ru/graphql
USERNAME=your_existing_test_username
PASSWORD=your_existing_test_password
```

Recommended example file for the team:

```bash
BASE_URL=
GRAPHQL_URL=
USERNAME=
PASSWORD=
```

The project includes `.env.example` as a safe template. Copy it into `.env` before running tests:

```bash
cp .env.example .env
```

If you are using PowerShell on Windows, use:

```powershell
Copy-Item .env.example .env
```

Typical file naming:

1. `.env` for local real values
2. `.env.example` for documented placeholders

Important on Windows:

1. Windows already defines a system `USERNAME` environment variable
2. This project loads `.env` with override enabled, so the values in `.env` win over OS-level defaults
3. This prevents local auth tests from accidentally using your Windows account name instead of the API test login

The Playwright config loads `.env` automatically and uses:

1. `BASE_URL` as Playwright `baseURL`
2. `USERNAME` and `PASSWORD` as login credentials for reusable authenticated suites

The `/register` endpoint itself does not need to be stored in `.env`. It is a fixed API path and can stay in code.

No credentials are hardcoded in the test helpers.

Auth helper behavior:

1. `getConfiguredCredentials()` uses `USERNAME` and `PASSWORD` exactly as provided in `.env`
2. `createAuthSession()` logs in with the configured user from `.env`
3. `createUniqueCredentialsFromEnv()` uses an internal `playwright_user` prefix and appends a unique suffix for registration tests
4. If `USERNAME` or `PASSWORD` is missing, auth helpers fail explicitly instead of silently falling back to defaults

Important:

1. `USERNAME` and `PASSWORD` should point to an existing reusable test user
2. `@crud` and `@negative` suites reuse that user for login
3. `@auth` tests still create unique users derived from the internal registration prefix

## Step 8. Configure GitHub Actions Secrets

GitHub Actions does not read your local `.env` file automatically.

This project uses the following strategy in CI:

1. `BASE_URL` is set directly in the workflow
2. Public smoke and read tests always run
3. Auth, CRUD, and negative tests run only when repository secrets are configured

Add these repository secrets in GitHub:

1. Open your repository in GitHub
2. Go to `Settings`
3. Open `Secrets and variables`
4. Open `Actions`
5. Click `New repository secret`
6. Create `QASANDBOX_USERNAME`
7. Create `QASANDBOX_PASSWORD`

The workflow maps them like this:

```yaml
env:
  BASE_URL: https://api.qasandbox.ru/api/
  USERNAME: ${{ secrets.QASANDBOX_USERNAME }}
  PASSWORD: ${{ secrets.QASANDBOX_PASSWORD }}
```

Behavior in CI:

1. `npm run typecheck` runs on every workflow run
2. `npm run test:smoke` runs on every workflow run
3. `npm run test:read` runs on every workflow run
4. `npm run test:auth` runs only if both secrets are present
5. `npm run test:crud` runs only if both secrets are present
6. `npm run test:negative` runs only if both secrets are present

## Step 9. Run Test Suites by Tag

The project groups tests with Playwright tags:

1. `@smoke` for the minimal public health signal
2. `@read` for public read scenarios
3. `@auth` for registration and login
4. `@crud` for authenticated create, update, and delete flows
5. `@negative` for authorization and validation errors
6. `@ignore` for intentionally excluded debug or demo tests

Why this helps:

1. You can run only the suite you need without depending on file names
2. The npm scripts stay stable even if tests are moved between files
3. CI steps stay readable and focused on business purpose
4. Intentionally broken demo tests can stay in the repository without polluting normal runs

Run by tag directly with Playwright:

```bash
npx playwright test --grep @smoke
npx playwright test --grep @read
npx playwright test --grep @auth
npx playwright test --grep @crud
npx playwright test --grep @negative
```

You can also combine suites:

```bash
npx playwright test --grep "@auth|@crud"
```

Important:

1. `@ignore` tests are excluded from normal `npm test` and `npx playwright test` runs by default
2. This project uses `@ignore` for debug demos that are expected to fail on purpose

## Step 10. Understand Reports, Traces, and CI Artifacts

This project uses different report outputs for local runs and CI:

1. Local runs use the `list` reporter with visible `test.step(...)` output plus the HTML report
2. CI uses GitHub annotations plus the HTML report
3. Test artifacts are stored in `test-results/`
4. The HTML report is stored in `playwright-report/`

Open the HTML report locally:

```bash
npx playwright show-report
```

or:

```bash
npm run report
```

Important difference:

1. `playwright-report` is an HTML report
2. `trace.zip` is a Playwright trace archive
3. `https://trace.playwright.dev/` opens `trace.zip`, not the HTML report

If you download the `playwright-report` artifact from GitHub Actions, open `index.html` inside it.

If you download the `playwright-test-results` artifact, find the failing test folder and open its `trace.zip`.

Open a trace locally with the Playwright CLI:

```bash
npx playwright show-trace path/to/trace.zip
```

Or drag `trace.zip` into the browser viewer:

```text
https://trace.playwright.dev/
```

Trace behavior in this project:

1. CI keeps traces for failed tests
2. Local runs collect traces on the first retry
3. `test.step(...)` blocks make the flow easier to read in both the terminal and the HTML report
4. Failed API tests attach `api-debug-log` with request and response details

What `api-debug-log` contains:

1. Request method and URL
2. Sanitized request headers and body
3. Response status, headers, URL, and parsed body
4. Error message and stack when the API call throws before a response is returned

Quick debugging guide:

1. `error-context.md` is generated automatically by Playwright for failed tests
2. `api-debug-log.json` is this project's custom API attachment with sanitized request and response details
3. `trace.zip` is the Playwright trace archive for timeline-style debugging in Trace Viewer

Use them like this:

1. Open `error-context.md` first for a short human-readable summary of the failure
2. Open `api-debug-log.json` when you need to inspect the exact API request, response, and body content
3. Open `trace.zip` when you need the full Playwright execution timeline and step-level context

There is also an intentionally broken debug demo test in `tests/api/debug-demo.spec.ts`.

Run it only when you want to validate report attachments and failure diagnostics:

```bash
npm run test:debug-demo
```

What to expect:

1. The command should fail on purpose
2. The failed test should produce `api-debug-log` in `test-results/`
3. The HTML report should show the failing step and attachment

## Step 11. Install the Playwright VS Code Extension

To run and debug tests directly from the editor, install the Playwright extension in VS Code.

Search in the VS Code Extensions marketplace for:

```text
Playwright Test for VSCode
```

Why install it:

1. Run tests from the editor UI
2. Debug tests with breakpoints
3. See locators and test results more easily
4. Improve day-to-day productivity during test development

## Step 12. Run Tests from the Console

Run all tests:

```bash
npx playwright test
```

or with npm:

```bash
npm test
```

Run the smoke test for `GET /mythology`:

```bash
npx playwright test --grep @smoke
npm run test:smoke
```

Run public read tests for list, filters, sorting, and `GET /mythology/{id}`:

```bash
npx playwright test --grep @read
npm run test:read
```

Run auth tests for `POST /register` and `POST /login`:

```bash
npx playwright test --grep @auth
npm run test:auth
```

Run authenticated CRUD tests for `/mythology`:

```bash
npx playwright test --grep @crud
npm run test:crud
```

Run negative tests for `/mythology` authorization and validation:

```bash
npx playwright test --grep @negative
npm run test:negative
```

Run tests in UI mode:

```bash
npx playwright test --ui
```

or:

```bash
npm run test:ui
```

Run tests in headed mode:

```bash
npx playwright test --headed
```

or:

```bash
npm run test:headed
```

If browsers ever need to be installed again:

```bash
npx playwright install
```

or:

```bash
npm run pw:install
```

## Step 13. Run Type Check

Run TypeScript type-checking without generating output files:

```bash
npx tsc --noEmit
```

or:

```bash
npm run typecheck
```

This is useful for catching typing mistakes early, even though Playwright can execute TypeScript tests directly.

## Step 13A. Run Tests in Docker

The project now includes Docker support so the same test runtime can run on Windows, macOS, and Linux without requiring a local Playwright setup.

Why this setup is useful:

1. The Docker image is based on the official Playwright image, so the runtime is consistent across platforms
2. Team members do not need to align local Node.js versions before running the suite
3. HTML reports and Playwright artifacts are written back into the repository folders on the host machine
4. The same container base can be reused later when UI tests are added to the course project

Important:

1. Docker does not force `CI=1`, so local container runs keep the same Playwright behavior as local terminal runs
2. If you later want strict CI behavior inside Docker, pass `CI=1` explicitly from your pipeline

Security note:

1. The local `.env` file is not copied into the Docker image because it is excluded by `.dockerignore`
2. Docker Compose passes values from `.env` only at container start through `env_file`
3. This is safer than baking credentials into the image, but the secrets still exist on your local machine and inside the running container environment
4. Use a dedicated test account and never store production credentials in this project

Build the image:

```bash
docker compose build tests
```

Run the full suite in Docker:

```bash
docker compose run --rm tests
```

Run only smoke tests in Docker:

```bash
docker compose run --rm tests npm run test:smoke
```

Or use the npm wrappers:

```bash
npm run docker:build
npm run docker:test
npm run docker:test:smoke
```

The Docker run still expects the same `.env` file as the local run. If you have not created it yet, copy the example first:

```bash
cp .env.example .env
```

If you are using PowerShell:

```powershell
Copy-Item .env.example .env
```

After the run finishes, the generated files stay in:

1. `playwright-report/` for the HTML report
2. `test-results/` for traces, attachments, and other raw artifacts

To open the HTML report from Docker on port `9323`, run:

```bash
docker compose run --rm --service-ports report
```

or:

```bash
npm run docker:report
```

## Step 13B. Add Allure Reports

The project also includes Allure reporting for API tests in addition to the default Playwright HTML report.

Why both reports are useful:

1. Playwright HTML is great for fast local debugging and trace navigation
2. Allure gives a cleaner history-oriented test report with steps, hooks, retries, attachments, and environment details
3. The same Playwright run can now produce both report formats without changing the test commands

How it works:

1. `allure-playwright` is configured as an additional Playwright reporter
2. `allure-js-commons` is used directly in the test code to create manual Allure steps and attach request or response payloads
3. Raw Allure result files are written to `allure-results/`
4. The HTML Allure site is generated into `allure-report/`
5. Playwright `test.step(...)` calls and hooks are included in the Allure output
6. Shared API helper calls made through `debugApiCall(...)` create Allure steps with attached request and response payloads

Install note:

1. The repository includes `allure-commandline` in `devDependencies`
2. Generating or serving an Allure HTML report still requires Java on the machine where the command runs
3. The Docker image includes Java already, so Docker-based Allure generation works without extra local setup

If you are adding Allure support manually in a fresh copy of the project, install the packages with:

```bash
npm install -D allure-playwright allure-commandline allure-js-commons
```

Run tests and collect fresh Allure results:

```bash
npm run test:allure
```

Generate the Allure HTML report:

```bash
npm run allure:generate
```

Open an existing Allure report:

```bash
npm run allure:open
```

Serve the report directly from the raw results:

```bash
npm run allure:serve
```

If you want to remove old Allure artifacts before a new run:

```bash
npm run allure:clean
```

Recommended local flow from the project root:

```bash
npm run allure:clean
npm run test:allure
npm run allure:generate
npm run allure:open
```

If you are using PowerShell on Windows and `npm` is blocked by execution policy, use:

```powershell
npm.cmd run allure:clean
npm.cmd run test:allure
npm.cmd run allure:generate
npm.cmd run allure:open
```

Docker usage:

1. `docker compose run --rm tests npm run test:allure` runs the tests and writes raw Allure files into the mounted `allure-results/` folder
2. `docker compose run --rm tests npm run allure:generate` converts those files into the mounted `allure-report/` folder
3. The generated report can then be opened locally from `allure-report/index.html`

Or use the npm wrapper for Docker-based report generation:

```bash
npm run docker:allure:generate
```

## Step 13C. Add Playwright API Mock Examples

Playwright can also be used to mock API traffic for teaching examples and isolated tests.

Important difference:

1. `APIRequestContext` is great for real API tests against the live service
2. `page.route(...)` is the main Playwright tool for network mocking
3. Playwright route-based mocking works for requests made by the page, including browser `fetch(...)` and XHR calls
4. `APIRequestContext` itself does not provide the same `route(...)` interception API
5. Because of that, the mock example in this project runs `fetch(...)` from a browser page and intercepts the requests with Playwright routes

The repository includes one focused mock example:

1. `tests/api/auth-mocks.spec.ts`
2. The mocked `/login` call returns a valid-looking but expired JWT
3. The next protected `POST /mythology` call is intercepted and forced to return `401 Token expired`

Run only the mock examples:

```bash
npm run test:mock
```

Because the mock example uses `page.route(...)`, it needs a Playwright browser installed locally. If this is your first local browser-based Playwright run on the machine, install Chromium once:

```bash
npx playwright install chromium
```

If you are using PowerShell on Windows and `npm` is blocked by execution policy, use:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:mock
```

## Step 13D. Add GraphQL API Test Examples

The project also includes GraphQL examples for the Mythos sandbox at `https://api.qasandbox.ru/graphql`.

Setup note:

1. If you cloned the current repository, a regular `npm install` or `npm ci` is enough because the GraphQL and Allure packages are already listed in `package.json`
2. No separate GraphQL-specific npm install command is required on top of the normal project dependency install
3. `GRAPHQL_URL` is optional in `.env`; if it is missing, the tests use the default public sandbox endpoint

What the GraphQL suite covers:

1. Public `allSouls` and `getSoul` queries
2. `registerScribe`, `loginScribe`, and `currentScribe` auth flow
3. Authenticated `createSoul`, `patchSoulDeeds`, and `banishSoul` lifecycle

Implementation notes:

1. Reusable GraphQL request helpers live in `src/api/graphql.ts`
2. The test suite lives in `tests/api/graphql.spec.ts`
3. The same `debugApiCall(...)` fixture is reused, so GraphQL requests and responses are attached to Allure the same way as the REST tests
4. The suite dynamically registers a new `scribe` user on each run, so it does not depend on `USERNAME` and `PASSWORD` from the REST `.env` setup

Run only the GraphQL examples:

```bash
npm run test:graphql
```

If you are using PowerShell on Windows and `npm` is blocked by execution policy, use:

```powershell
npm.cmd run test:graphql
```

Recommended local GraphQL flow:

```bash
npm install
npm run test:graphql
```

If you want Allure for only the GraphQL suite:

```bash
npm run allure:clean
npm run test:graphql
npm run allure:generate
npm run allure:open
```

## Step 14. Recommended Project Structure

A simple structure that works well for an API-focused Playwright project:

```text
mythos-api-tests/
  scripts/
  tests/
    api/
    fixtures/
    support/
  src/
    api/
    config/
  Dockerfile
  compose.yaml
  .dockerignore
  allure-results/
  allure-report/
  playwright.config.ts
  tsconfig.json
  package.json
  .env.example
  playwright-report/
  test-results/
```

What each part is for:

1. `scripts/` contains small utility launchers for special test flows
2. `tests/api/` contains REST, GraphQL, and mock-based API scenarios such as `auth.spec.ts`, `graphql.spec.ts`, and `auth-mocks.spec.ts`
3. `tests/fixtures/` contains shared Playwright fixtures for auth, request logging, and resource lifecycle
4. `tests/support/` contains shared test data, contract assertions, and helper inputs
5. `src/api/` contains reusable API request helpers for both REST and GraphQL flows
6. `src/config/` contains environment-variable helpers and shared configuration code
7. `playwright.config.ts` contains the global Playwright configuration
8. `Dockerfile` contains the cross-platform Playwright runtime for containerized runs
9. `compose.yaml` contains ready-to-run Docker services for tests and report viewing
10. `.dockerignore` keeps the Docker build context clean and avoids copying local artifacts into the image
11. `allure-results/` stores raw Allure execution data
12. `allure-report/` stores the generated Allure HTML site
13. `tsconfig.json` contains TypeScript compiler settings
14. `package.json` contains dependencies and runnable scripts
15. `.env.example` documents required environment variables
16. `playwright-report/` is generated after test runs for HTML reporting
17. `test-results/` is generated after test runs for traces and attachments

How the test layers are split:

1. REST live API tests cover the main `/api` endpoints and reuse `.env` credentials where auth is required
2. GraphQL tests cover public queries plus authenticated mutations by dynamically registering a new test user
3. Mock tests demonstrate Playwright network interception with `page.route(...)` and do not validate the real backend contract

## Step 15. API Smoke Test Starter

The project includes a smoke test in `tests/api/mythology-read.spec.ts`.

What it does:

1. Uses the configured Playwright `baseURL`
2. Sends `GET /mythology`
3. Verifies that the response is successful and JSON
4. Carries both `@smoke` and `@read` tags

Why it works this way:

1. `/mythology` does not require a JWT token
2. It is a better real smoke test for this API than a placeholder endpoint
3. `USERNAME` and `PASSWORD` stay in `.env` for the future `/register` and JWT flow

## Step 16. Read Test Starter

The project includes read tests at `tests/api/mythology-read.spec.ts`.

What they cover:

1. `GET /mythology` returns a non-empty array
2. `GET /mythology?category=...` returns entities only from that category
3. `GET /mythology?sort=asc|desc` returns correctly sorted names
4. `GET /mythology/{id}` returns an existing entity
5. `GET /mythology/{id}` returns `404` for a non-existent entity
6. Successful and error responses follow the expected JSON contract

## Step 17. Auth Test Starter

The project also includes auth tests at `tests/api/auth.spec.ts`.

What they cover:

1. `POST /register` creates a new user
2. `POST /login` returns a JWT token for that user
3. The username is generated uniquely from the internal test prefix on every run to avoid duplicate-registration failures
4. Response bodies follow the expected auth contract

## Step 18. Mythology CRUD Test Starter

The project also includes CRUD tests at `tests/api/mythology-crud.spec.ts`.

What they cover:

1. `POST /mythology` creates a new entity
2. `PATCH /mythology/{id}` updates selected fields
3. `PUT /mythology/{id}` replaces entity fields
4. `DELETE /mythology/{id}` removes the created entity
5. Returned entities follow the expected JSON contract

These tests:

1. Log in with the reusable configured test user from `.env`
2. Obtain a JWT token through `/login`
3. Work only with newly created entities, not system records
4. Use shared fixtures from `tests/fixtures/api-test.ts` for auth and cleanup
5. Reuse one auth session per worker to reduce repeated login traffic
6. Run in serial mode inside the file to avoid burst rate limits on auth endpoints
7. Clean up created data after the test when needed

## Step 19. Mythology Negative Test Starter

The project also includes negative tests at `tests/api/mythology-negative.spec.ts`.

What they cover:

1. `401 Unauthorized` for write operations without JWT
2. `400 Bad Request` for invalid create, patch, and put payloads
3. `403 Forbidden` for protected system entities like ID `1`
4. Error responses follow the expected JSON contract

Why they matter:

1. They protect the API contract for auth and validation errors
2. They catch regressions that happy-path CRUD tests will not see
3. They verify that system records remain read-only
4. They reuse the same auth and temporary-entity fixture layer as CRUD tests

Rate limit note:

1. Auth, CRUD, and negative suites intentionally avoid aggressive in-file parallelism
2. Shared fixtures reduce repeated auth calls during one run
3. This helps prevent `429 Too Many Requests` from the sandbox API

Before running it, update `.env` with the real API values for your project.

## Step 20. Student Homework: Extend Test Coverage

The current project already covers the main happy-path and baseline negative scenarios.

Use the tasks below as homework to deepen the API test suite without changing the overall project structure.

### Homework Part 1. Add Business Edge Cases

Extend the suite with cases that are easy to miss in basic CRUD coverage:

1. Verify `POST /mythology/{id}` returns `405 Method Not Allowed`
2. Verify `PUT /mythology/{id}` returns the expected status for a non-existent entity
3. Verify `PATCH /mythology/{id}` returns the expected status for a non-existent entity
4. Verify `DELETE /mythology/{id}` returns the expected status for a non-existent entity
5. Expand protected entity coverage beyond one sample ID and validate a wider range such as `1-31`

### Homework Part 2. Improve Error Assertions

The current tests already validate error shape. The next step is to validate error meaning more precisely where the API is stable.

Add assertions for:

1. Exact or partially matched `message` text for stable `400` responses
2. Exact or partially matched `error` text for stable `401`, `403`, and `404` responses
3. Consistent error-body structure across different failing endpoints

Important:

1. Only assert exact messages if the backend contract is stable enough
2. If messages are unstable, prefer partial matches over brittle exact strings

### Homework Part 3. Expand Data-Driven Negative Tests

Convert more invalid scenarios into table-driven coverage.

Good candidates:

1. Empty string values
2. Whitespace-only values
3. Invalid `category` values
4. Missing required fields
5. Excessively long strings, if the API has practical limits
6. Invalid `img` values, if the backend validates image URLs or formats

Expected goal:

1. New negative cases should be added by extending data tables, not by copy-pasting full tests

### Homework Part 4. Improving Scenarios

The read suite is a strong start, but it can still be improved.

Add coverage for:

1. Combined query parameters such as `category + sort`
2. More explicit sort validation instead of only checking that order changes
3. Additional checks that filtered responses still follow the expected contract

### Homework Part 5. Add One More Mock Example

The project already contains one route-based mock example for an expired token. Add one more mock test that demonstrates a different Playwright technique.

Recommended task:

1. Create a new file such as `tests/api/mythology-mocks.spec.ts`
2. Intercept `GET /mythology` with `page.route(...)`
3. Use `route.fetch()` to get the real backend response first
4. Patch the JSON by adding one synthetic entity like `Mocked Hero`
5. Fulfill the request with the modified body and assert that the injected entity is present in the browser-side `fetch(...)` result

Why this is good homework:

1. It teaches the difference between a full stub and a partial response override
2. It stays close to the official Playwright API mocking documentation
3. It shows how to keep most of the real backend data while still making the test deterministic

Expected goal:

1. The new mock test should attach `request` and `response` details to Allure just like the existing expired-token mock

### Homework Part 6. Add One More GraphQL Test

The GraphQL suite already covers public queries and one authenticated happy-path lifecycle. Add one negative GraphQL test to strengthen contract coverage.

Recommended task:

1. Add a test to `tests/api/graphql.spec.ts`
2. Call `createSoul` without sending the JWT token
3. Assert that the response still returns HTTP `200`, but the GraphQL body contains an `errors` array
4. Verify that `data.createSoul` is missing or `null`
5. Assert that the first error message indicates missing or invalid authorization

Why this is good homework:

1. It teaches the difference between HTTP-level success and GraphQL-level failure
2. It adds negative coverage for a protected mutation without needing extra backend setup
3. It complements the existing happy-path GraphQL lifecycle test without duplicating it

## Project Summary

This setup gives you:

1. An official Playwright project bootstrap flow
2. TypeScript support with strict checking
3. Environment variable support through `dotenv`
4. GitHub Actions support from the start
5. Tagged suites for focused local and CI runs
6. Clear HTML report and trace artifact handling
7. Allure reports with environment details, steps, and attachments
8. Shared fixtures for auth and temporary test data cleanup
9. Contract-level assertions for success and error responses
10. Easy test execution from both VS Code, the terminal, and Docker
