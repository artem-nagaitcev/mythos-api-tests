import * as allure from "allure-js-commons";
import type { StepContext } from "allure-js-commons";
import { expect, test } from "../fixtures/api-test";

const id = Math.floor(Math.random() * 899) + 100;

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

const resolveApiUrls = (): {
  getMythologyUrl: string;
} => {
  const configuredBaseUrl =
    process.env.BASE_URL?.trim() || "https://api.qasandbox.ru/api/";
  const normalizedBaseUrl = configuredBaseUrl.endsWith("/")
    ? configuredBaseUrl
    : `${configuredBaseUrl}/`;

  return {
    getMythologyUrl: new URL("mythology", normalizedBaseUrl).toString(),
  };
};

const stringifyAttachment = (value: unknown): string =>
  JSON.stringify(value, null, 2);

const mockedResponse = {
  id: expect.any(Number),
  name: expect.any(String),
  category: expect.any(String),
  desc: expect.any(String),
};

const redactHeaders = (
  headers: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase().includes("authorization") ? "***" : value,
    ]),
  );

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
  "Patch GET /mythology with a Mocked Hero",
  { tag: ["@mock", "@debug"] },
  async ({ page }) => {
    const { getMythologyUrl } = resolveApiUrls();
    const exchanges: MockExchange[] = [];

    await page.route("**/api/mythology", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      const request = route.request();

      const mockedHero = {
        id: id,
        name: `Mocked Hero ${id}`,
        category: "heroes",
        desc: `Mocked Hero ${id}`,
      };

      json.push(mockedHero);

      exchanges.push({
        label:
          "Mock GET /mythology to return a patched list with a synthetic hero",
        request: {
          body: readRequestBody(request.postData()),
          headers: redactHeaders(request.headers()),
          method: request.method(),
          url: request.url(),
        },
        response: {
          body: mockedResponse,
          headers: {
            "access-control-allow-origin": "*",
            "content-type": "application/json",
          },
          status: 200,
        },
      });

      await route.fulfill({
        response,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "*",
        },
        body: JSON.stringify(json),
      });
    });

    const result = await page.evaluate(
      async ({ getMythologyUrl }) => {
        const resp = await fetch(getMythologyUrl, {
          method: "GET",
          headers: {
            "content-type": "application/json",
          },
        });
        return await resp.json();
      },
      {
        getMythologyUrl,
      },
    );

    const jsonArray = result as any[];
    const heroNames = jsonArray.map((hero: any) => hero.name);

    expect(heroNames).toContain(`Mocked Hero ${id}`);

    for (const exchange of exchanges) {
      await allure.step(
        `Mock API: ${exchange.label}`,
        async (stepContext: StepContext) => {
          await stepContext.parameter("method", exchange.request.method);
          await stepContext.parameter("url", exchange.request.url);
          await stepContext.parameter(
            "status",
            String(exchange.response.status),
          );
          await allure.attachment(
            "request",
            stringifyAttachment(exchange.request),
            "application/json",
          );
          await allure.attachment(
            "response",
            stringifyAttachment(exchange.response),
            "application/json",
          );
        },
      );
    }
  },
);
