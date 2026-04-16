import * as allure from "allure-js-commons";
import type { StepContext } from "allure-js-commons";
import { expect, test } from "../fixtures/api-test";

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

test(
  "Patch GET /mythology with a Mocked Hero",
  { tag: ["@mock", "@debug"] },
  async ({ page }) => {
    const { getMythologyUrl } = resolveApiUrls();
    const exchanges: MockExchange[] = [];

    await page.route("**/api/mythology", async (route) => {
      const response = await route.fetch();
      const json = await response.json();

      const mockedHero = {
        id: Math.floor(Math.random() * 899) + 100,
        name: "Mocked Hero",
        category: "heroes",
      };

      json.push(mockedHero);

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

    expect(heroNames).toContain("Mocked Hero");

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
