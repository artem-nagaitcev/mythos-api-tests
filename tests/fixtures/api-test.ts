import { writeFile } from 'node:fs/promises';
import * as allure from 'allure-js-commons';
import {
  expect,
  request as playwrightRequest,
  test as base,
  type APIResponse,
} from '@playwright/test';

import { createAuthSession, type AuthSession } from '../../src/api/auth';
import { env } from '../../src/config/env';
import {
  createMythologyEntity,
  deleteMythologyEntity,
  type CreateMythologyPayload,
  type MythologyEntity,
} from '../../src/api/mythology';
import { createMythologyPayload } from '../support/mythology-test-data';

type ApiRequestDebug = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type ApiCallMetadata = {
  label: string;
  request: ApiRequestDebug;
};

type MythologyEntityManager = {
  create: (overrides?: Partial<CreateMythologyPayload>) => Promise<MythologyEntity>;
  track: (id: number) => void;
};

type ApiDebugCall = <T extends APIResponse>(
  metadata: ApiCallMetadata,
  action: () => Promise<T>,
) => Promise<T>;

type ApiFixtures = {
  authToken: string;
  debugApiCall: ApiDebugCall;
  mythologyEntityManager: MythologyEntityManager;
};

type ApiWorkerFixtures = {
  authSession: AuthSession;
};

type ApiExchange = {
  label: string;
  request: ApiRequestDebug;
  response?: {
    body: unknown;
    headers: Record<string, string>;
    ok: boolean;
    status: number;
    url: string;
  };
  error?: {
    message: string;
    stack?: string;
  };
  startedAt: string;
  finishedAt: string;
};

const sensitiveKeys = ['authorization', 'cookie', 'password', 'set-cookie', 'token'];

const requireBaseUrl = (): string => {
  if (!env.baseUrl) {
    throw new Error('Missing required environment variable: BASE_URL');
  }

  return env.baseUrl;
};

const isSensitiveKey = (key: string): boolean =>
  sensitiveKeys.some((fragment) => key.toLowerCase().includes(fragment));

const redactSensitive = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, itemValue]) => [
      key,
      isSensitiveKey(key) ? '***' : redactSensitive(itemValue),
    ]);

    return Object.fromEntries(entries);
  }

  return value;
};

const redactHeaders = (
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined => {
  if (!headers) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, isSensitiveKey(key) ? '***' : value]),
  );
};

const serializeError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
};

const stringifyAttachment = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2);

const readResponseBody = async (response: APIResponse): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  const contentType = response.headers()['content-type'] ?? '';

  if (contentType.includes('application/json')) {
    try {
      return redactSensitive(JSON.parse(text));
    } catch {
      return text;
    }
  }

  return text;
};

const buildRequestSnapshot = (request: ApiRequestDebug): ApiRequestDebug => ({
  ...request,
  body: redactSensitive(request.body),
  headers: redactHeaders(request.headers),
});

export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  authSession: [
    async ({}, use) => {
      const authRequest = await playwrightRequest.newContext({
        baseURL: requireBaseUrl(),
      });

      try {
        const session = await createAuthSession(authRequest);
        await use(session);
      } finally {
        await authRequest.dispose();
      }
    },
    { scope: 'worker' },
  ],

  authToken: async ({ authSession }, use) => {
    await use(authSession.token);
  },

  debugApiCall: async ({}, use, testInfo) => {
    const apiExchanges: ApiExchange[] = [];

    const debugApiCall: ApiDebugCall = async (metadata, action) => {
      const startedAt = new Date().toISOString();
      const requestSnapshot = buildRequestSnapshot(metadata.request);

      return allure.step(`API: ${metadata.label}`, async (stepContext) => {
        await stepContext.parameter('method', metadata.request.method);
        await stepContext.parameter('url', metadata.request.url);
        await allure.attachment('request', stringifyAttachment(requestSnapshot), 'application/json');

        try {
          const response = await action();
          const responseSnapshot = {
            body: await readResponseBody(response),
            headers: redactHeaders(response.headers()) ?? {},
            ok: response.ok(),
            status: response.status(),
            url: response.url(),
          };

          apiExchanges.push({
            label: metadata.label,
            request: requestSnapshot,
            response: responseSnapshot,
            finishedAt: new Date().toISOString(),
            startedAt,
          });

          await stepContext.parameter('status', String(responseSnapshot.status));
          await allure.attachment(
            'response',
            stringifyAttachment(responseSnapshot),
            'application/json',
          );

          return response;
        } catch (error) {
          const errorSnapshot = serializeError(error);

          apiExchanges.push({
            label: metadata.label,
            request: requestSnapshot,
            error: errorSnapshot,
            finishedAt: new Date().toISOString(),
            startedAt,
          });

          await allure.attachment('error', stringifyAttachment(errorSnapshot), 'application/json');

          throw error;
        }
      });
    };

    await use(debugApiCall);

    const shouldAttachDebugLog =
      apiExchanges.length > 0 &&
      (testInfo.errors.length > 0 || testInfo.status !== testInfo.expectedStatus);

    if (shouldAttachDebugLog) {
      const debugLogPath = testInfo.outputPath('api-debug-log.json');

      await writeFile(debugLogPath, JSON.stringify(apiExchanges, null, 2), 'utf8');
      await testInfo.attach('api-debug-log', {
        path: debugLogPath,
        contentType: 'application/json',
      });
    }
  },

  mythologyEntityManager: async ({ request, authToken, debugApiCall }, use) => {
    const trackedEntityIds = new Set<number>();

    const manager: MythologyEntityManager = {
      create: async (overrides = {}) => {
        const payload = createMythologyPayload(overrides);
        const response = await debugApiCall(
          {
            label: 'Create temporary mythology entity',
            request: {
              method: 'POST',
              url: 'mythology',
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
              body: payload,
            },
          },
          () => createMythologyEntity(request, authToken, payload),
        );

        if (!response.ok()) {
          throw new Error(
            `Create mythology entity failed: ${response.status()} ${await response.text()}`,
          );
        }

        const entity = (await response.json()) as MythologyEntity;
        trackedEntityIds.add(entity.id);

        return entity;
      },

      track: (id: number) => {
        trackedEntityIds.add(id);
      },
    };

    await use(manager);

    for (const entityId of Array.from(trackedEntityIds).reverse()) {
      const response = await debugApiCall(
        {
          label: `Clean up mythology entity ${entityId}`,
          request: {
            method: 'DELETE',
            url: `mythology/${entityId}`,
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          },
        },
        () => deleteMythologyEntity(request, authToken, entityId),
      );

      if (response.status() === 204 || response.status() === 404) {
        continue;
      }

      throw new Error(
        `Cleanup failed for mythology entity ${entityId}: ${response.status()} ${await response.text()}`,
      );
    }
  },
});

export { expect };
