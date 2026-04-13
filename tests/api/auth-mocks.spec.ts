import * as allure from 'allure-js-commons';
import { expect, test } from '../fixtures/api-test';

const expiredTokenPayload =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
  + 'eyJzdWIiOiJwbGF5d3JpZ2h0X3VzZXIiLCJyb2xlIjoic2NyaWJlIiwiZXhwIjoxNjcyNTMxMjAwLCJpYXQiOjE2NzI1Mjc2MDB9.'
  + 'expired-signature-demo';

const mockedUnauthorizedResponse = {
  error: 'Unauthorized',
  message: 'Token expired',
  statusCode: 401,
};

type MockExchange = {
  label: string;
  request: {
    body?: unknown;
    headers: Record<string, string>;
    method: string;
    url: string;
  };
  response: {
    body: unknown;
    headers?: Record<string, string>;
    status: number;
  };
};

const resolveApiUrls = (): { apiOrigin: string; loginUrl: string; createMythologyUrl: string } => {
  const configuredBaseUrl = process.env.BASE_URL?.trim() || 'https://api.qasandbox.ru/api/';
  const normalizedBaseUrl = configuredBaseUrl.endsWith('/')
    ? configuredBaseUrl
    : `${configuredBaseUrl}/`;

  return {
    apiOrigin: new URL(normalizedBaseUrl).origin,
    loginUrl: new URL('login', normalizedBaseUrl).toString(),
    createMythologyUrl: new URL('mythology', normalizedBaseUrl).toString(),
  };
};

const redactHeaders = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase().includes('authorization') ? '***' : value,
    ]),
  );

const stringifyAttachment = (value: unknown): string => JSON.stringify(value, null, 2);

const readRequestBody = (rawBody: string | null): unknown => {
  if (!rawBody) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
};

test(
  'Mocked login returns an expired JWT and the next protected request is rejected',
  { tag: '@mock' },
  async ({ page }) => {
    const { apiOrigin, loginUrl, createMythologyUrl } = resolveApiUrls();
    const exchanges: MockExchange[] = [];
    let loginCalls = 0;
    let protectedCalls = 0;

    await page.route('**/api/login', async (route) => {
      loginCalls += 1;
      const request = route.request();
      expect(request.method()).toBe('POST');

      const responseBody = {
        token: expiredTokenPayload,
      };

      exchanges.push({
        label: 'Mock login returns expired token',
        request: {
          body: readRequestBody(request.postData()),
          headers: redactHeaders(request.headers()),
          method: request.method(),
          url: request.url(),
        },
        response: {
          body: responseBody,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json',
          },
          status: 200,
        },
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        body: JSON.stringify(responseBody),
      });
    });

    await page.route('**/api/mythology', async (route) => {
      const request = route.request();

      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      protectedCalls += 1;
      expect(request.headers()['authorization']).toBe(`Bearer ${expiredTokenPayload}`);

      exchanges.push({
        label: 'Mock protected create request rejects expired token',
        request: {
          body: readRequestBody(request.postData()),
          headers: redactHeaders(request.headers()),
          method: request.method(),
          url: request.url(),
        },
        response: {
          body: mockedUnauthorizedResponse,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json',
          },
          status: 401,
        },
      });

      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        body: JSON.stringify(mockedUnauthorizedResponse),
      });
    });

    await page.goto(apiOrigin, { waitUntil: 'domcontentloaded' });

    const result = await test.step(
      'Use mocked login token in a protected write request',
      async () =>
        page.evaluate(
          async ({ loginUrl, createMythologyUrl }) => {
            const loginResponse = await fetch(loginUrl, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                username: 'mocked_scribe',
                password: 'Playwright123!',
              }),
            });

            const loginBody = (await loginResponse.json()) as { token: string };

            const createResponse = await fetch(createMythologyUrl, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${loginBody.token}`,
              },
              body: JSON.stringify({
                name: 'Mocked soul',
                category: 'heroes',
                desc: 'Created from a mocked expired-token scenario.',
              }),
            });

            return {
              createBody: (await createResponse.json()) as {
                error: string;
                message: string;
                statusCode: number;
              },
              createStatus: createResponse.status,
              loginBody,
              loginStatus: loginResponse.status,
            };
          },
          {
            loginUrl,
            createMythologyUrl,
          },
        ),
    );

    expect(loginCalls).toBe(1);
    expect(protectedCalls).toBe(1);
    expect(result.loginStatus).toBe(200);
    expect(result.loginBody.token).toBe(expiredTokenPayload);
    expect(result.createStatus).toBe(401);
    expect(result.createBody).toEqual(mockedUnauthorizedResponse);

    for (const exchange of exchanges) {
      await allure.step(`Mock API: ${exchange.label}`, async (stepContext) => {
        await stepContext.parameter('method', exchange.request.method);
        await stepContext.parameter('url', exchange.request.url);
        await stepContext.parameter('status', String(exchange.response.status));
        await allure.attachment(
          'request',
          stringifyAttachment(exchange.request),
          'application/json',
        );
        await allure.attachment(
          'response',
          stringifyAttachment(exchange.response),
          'application/json',
        );
      });
    }
  },
);
