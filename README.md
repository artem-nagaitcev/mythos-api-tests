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
USERNAME=playwright_user
PASSWORD=Playwright123!
```

Recommended example file for the team:

```bash
BASE_URL=
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

The Playwright config loads `.env` automatically and uses:

1. `BASE_URL` as Playwright `baseURL`
2. `USERNAME` and `PASSWORD` as credentials for the future `/register` flow

The `/register` endpoint itself does not need to be stored in `.env`. It is a fixed API path and can stay in code.

## Step 8. Install the Playwright VS Code Extension

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

## Step 9. Run Tests from the Console

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
npm run test:smoke
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

Show the HTML report after a run:

```bash
npx playwright show-report
```

or:

```bash
npm run report
```

If browsers ever need to be installed again:

```bash
npx playwright install
```

or:

```bash
npm run pw:install
```

## Step 10. Run Type Check

Run TypeScript type-checking without generating output files:

```bash
npx tsc --noEmit
```

or:

```bash
npm run typecheck
```

This is useful for catching typing mistakes early, even though Playwright can execute TypeScript tests directly.

## Step 11. Recommended Project Structure

A simple structure that works well for an API-focused Playwright project:

```text
mythos-api-tests/
  tests/
    api/
  src/
    config/
  playwright.config.ts
  tsconfig.json
  package.json
  .env.example
```

What each part is for:

1. `tests/api/` contains API smoke, regression, and scenario tests.
2. `src/config/` contains environment-variable helpers and shared configuration code.
3. `playwright.config.ts` contains the global Playwright configuration.
4. `tsconfig.json` contains TypeScript compiler settings.
5. `package.json` contains dependencies and runnable scripts.
6. `.env.example` documents required environment variables.

## Step 12. API Smoke Test Starter

The project includes a smoke test at `tests/api/mythology.spec.ts`.

What it does:

1. Uses the configured Playwright `baseURL`
2. Sends `GET /mythology`
3. Verifies that the response is successful and JSON

Why it works this way:

1. `/mythology` does not require a JWT token
2. It is a better real smoke test for this API than a placeholder endpoint
3. `USERNAME` and `PASSWORD` stay in `.env` for the future `/register` and JWT flow

Before running it, update `.env` with the real API values for your project.

## Project Summary

This setup gives you:

1. An official Playwright project bootstrap flow
2. TypeScript support with strict checking
3. Environment variable support through `dotenv`
4. GitHub Actions support from the start
5. Easy test execution from both VS Code and the terminal
