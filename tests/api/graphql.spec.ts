import type { APIRequestContext, APIResponse } from "@playwright/test";

import {
  banishSoul,
  createSoul,
  createSoulWithoutToken,
  createUniqueScribeCredentials,
  getAllSouls,
  getCurrentScribe,
  getGraphqlUrl,
  getSoul,
  loginScribe,
  patchSoulDeeds,
  registerScribe,
  type GraphqlAuthPayload,
  type GraphqlResponseBody,
  type GraphqlScribeCredentials,
  type SoulDetails,
  type SoulSummary,
} from "../../src/api/graphql";
import { expect, test } from "../fixtures/api-test";

test.describe.configure({ mode: "serial" });

type ApiRequestDebug = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type DebugApiCall = <T extends APIResponse>(
  metadata: {
    label: string;
    request: ApiRequestDebug;
  },
  action: () => Promise<T>,
) => Promise<T>;

type GraphqlTestContext = {
  debugApiCall: DebugApiCall;
  request: APIRequestContext;
};

type GraphqlScribeSession = {
  credentials: GraphqlScribeCredentials;
  token: string;
};

const graphqlUrl = getGraphqlUrl();

const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const createGraphqlMetadata = (
  label: string,
  body: {
    operationName: string;
    query: string;
    variables: Record<string, unknown> | null;
  },
  token?: string,
): {
  label: string;
  request: ApiRequestDebug;
} => ({
  label,
  request: {
    method: "POST",
    url: graphqlUrl,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  },
});

const expectJsonContentType = (response: APIResponse): void => {
  expect(response.headers()["content-type"]).toContain("application/json");
};

const readGraphqlData = async <TData>(
  response: APIResponse,
): Promise<TData> => {
  const body = (await response.json()) as GraphqlResponseBody<TData>;

  expect(
    body.errors,
    JSON.stringify(body.errors ?? [], null, 2),
  ).toBeUndefined();

  if (!body.data) {
    throw new Error(
      `GraphQL response did not include data: ${JSON.stringify(body, null, 2)}`,
    );
  }

  return body.data;
};

const createScribeSession = async ({
  debugApiCall,
  request,
}: GraphqlTestContext): Promise<GraphqlScribeSession> => {
  const credentials = createUniqueScribeCredentials();

  const registerResponse = await debugApiCall(
    createGraphqlMetadata("Register a GraphQL scribe", {
      operationName: "RegisterScribe",
      query: `
          mutation RegisterScribe($username: String!, $password: String!) {
            registerScribe(username: $username, password: $password)
          }
        `,
      variables: credentials,
    }),
    () => registerScribe(request, credentials),
  );

  await expect(registerResponse).toBeOK();
  expectJsonContentType(registerResponse);

  const registerData = await readGraphqlData<{ registerScribe: string }>(
    registerResponse,
  );
  expect(registerData.registerScribe.trim().length).toBeGreaterThan(0);

  const loginResponse = await debugApiCall(
    createGraphqlMetadata("Log in as the GraphQL scribe", {
      operationName: "LoginScribe",
      query: `
          mutation LoginScribe($username: String!, $password: String!) {
            loginScribe(username: $username, password: $password) {
              token
              message
            }
          }
        `,
      variables: credentials,
    }),
    () => loginScribe(request, credentials),
  );

  await expect(loginResponse).toBeOK();
  expectJsonContentType(loginResponse);

  const loginData = await readGraphqlData<{ loginScribe: GraphqlAuthPayload }>(
    loginResponse,
  );

  expect(loginData.loginScribe.message.trim().length).toBeGreaterThan(0);
  expect(loginData.loginScribe.token).toMatch(jwtPattern);

  return {
    credentials,
    token: loginData.loginScribe.token,
  };
};

test(
  "GraphQL public queries return soul data",
  { tag: "@graphql" },
  async ({ request, debugApiCall }) => {
    const allSoulsResponse =
      await test.step("Query a short public allSouls list", async () =>
        debugApiCall(
          createGraphqlMetadata("Query allSouls", {
            operationName: "AllSouls",
            query: `
          query AllSouls($limit: Int!) {
            allSouls(limit: $limit) {
              id
              name
              weight
            }
          }
        `,
            variables: { limit: 3 },
          }),
          () => getAllSouls(request, 3),
        ));

    await expect(allSoulsResponse).toBeOK();
    expectJsonContentType(allSoulsResponse);

    const allSoulsData =
      await test.step("Read the allSouls response body", async () =>
        readGraphqlData<{ allSouls: SoulSummary[] }>(allSoulsResponse));

    expect(allSoulsData.allSouls.length).toBeGreaterThan(0);

    const firstSoul = allSoulsData.allSouls[0];

    if (!firstSoul) {
      throw new Error("Expected GraphQL allSouls to return at least one soul");
    }

    expect(firstSoul.id.trim().length).toBeGreaterThan(0);
    expect(firstSoul.name.trim().length).toBeGreaterThan(0);

    const getSoulResponse =
      await test.step("Query getSoul for the first returned id", async () =>
        debugApiCall(
          createGraphqlMetadata("Query getSoul", {
            operationName: "GetSoul",
            query: `
          query GetSoul($id: ID!) {
            getSoul(id: $id) {
              id
              name
              deeds
              status
              weight
            }
          }
        `,
            variables: { id: firstSoul.id },
          }),
          () => getSoul(request, firstSoul.id),
        ));

    await expect(getSoulResponse).toBeOK();
    expectJsonContentType(getSoulResponse);

    const getSoulData =
      await test.step("Read the getSoul response body", async () =>
        readGraphqlData<{ getSoul: SoulDetails }>(getSoulResponse));

    expect(getSoulData.getSoul.id).toBe(firstSoul.id);
    expect(getSoulData.getSoul.name.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(getSoulData.getSoul.deeds)).toBe(true);
    expect(getSoulData.getSoul.status.trim().length).toBeGreaterThan(0);
  },
);

test(
  "GraphQL registerScribe, loginScribe, and currentScribe work together",
  { tag: "@graphql" },
  async ({ request, debugApiCall }) => {
    const session =
      await test.step("Register and authenticate a GraphQL scribe", async () =>
        createScribeSession({ request, debugApiCall }));

    const currentScribeResponse =
      await test.step("Query currentScribe with the JWT token", async () =>
        debugApiCall(
          createGraphqlMetadata(
            "Query currentScribe",
            {
              operationName: "CurrentScribe",
              query: `
              query CurrentScribe {
                currentScribe
              }
            `,
              variables: null,
            },
            session.token,
          ),
          () => getCurrentScribe(request, session.token),
        ));

    await expect(currentScribeResponse).toBeOK();
    expectJsonContentType(currentScribeResponse);

    const currentScribeData =
      await test.step("Read the currentScribe response body", async () =>
        readGraphqlData<{ currentScribe: string }>(currentScribeResponse));

    expect(currentScribeData.currentScribe).toBe(session.credentials.username);
  },
);

test(
  "GraphQL createSoul, patchSoulDeeds, and banishSoul handle an authenticated soul lifecycle",
  { tag: "@graphql" },
  async ({ request, debugApiCall }) => {
    const session =
      await test.step("Register and authenticate a GraphQL scribe", async () =>
        createScribeSession({ request, debugApiCall }));

    const soulName = `Playwright Soul ${Date.now()}`;
    const deed = `Documented in Playwright ${Date.now()}`;
    let soulId: string | undefined;

    try {
      const createSoulResponse =
        await test.step("Create a new soul through GraphQL", async () =>
          debugApiCall(
            createGraphqlMetadata(
              "Create a GraphQL soul",
              {
                operationName: "CreateSoul",
                query: `
              mutation CreateSoul($input: SoulInput!) {
                createSoul(input: $input) {
                  id
                  name
                  deeds
                  status
                  weight
                }
              }
            `,
                variables: {
                  input: {
                    name: soulName,
                    weight: 25,
                  },
                },
              },
              session.token,
            ),
            () =>
              createSoul(request, session.token, {
                name: soulName,
                weight: 25,
              }),
          ));

      await expect(createSoulResponse).toBeOK();
      expectJsonContentType(createSoulResponse);

      const createSoulData =
        await test.step("Read the createSoul response body", async () =>
          readGraphqlData<{ createSoul: SoulDetails }>(createSoulResponse));

      const createdSoulId = createSoulData.createSoul.id;
      soulId = createdSoulId;

      expect(createSoulData.createSoul.name).toBe(soulName);
      expect(createSoulData.createSoul.status).toBe("WAITING");
      expect(createSoulData.createSoul.weight).toBe(25);

      const patchSoulResponse =
        await test.step("Append a deed to the created soul", async () =>
          debugApiCall(
            createGraphqlMetadata(
              "Patch soul deeds",
              {
                operationName: "PatchSoulDeeds",
                query: `
              mutation PatchSoulDeeds($id: ID!, $deed: String!) {
                patchSoulDeeds(id: $id, deed: $deed) {
                  id
                  name
                  deeds
                  status
                  weight
                }
              }
            `,
                variables: {
                  id: createdSoulId,
                  deed,
                },
              },
              session.token,
            ),
            () => patchSoulDeeds(request, session.token, createdSoulId, deed),
          ));

      await expect(patchSoulResponse).toBeOK();
      expectJsonContentType(patchSoulResponse);

      const patchSoulData =
        await test.step("Read the patchSoulDeeds response body", async () =>
          readGraphqlData<{ patchSoulDeeds: SoulDetails }>(patchSoulResponse));

      expect(patchSoulData.patchSoulDeeds.id).toBe(createdSoulId);
      expect(patchSoulData.patchSoulDeeds.deeds).toContain(deed);

      const banishSoulResponse =
        await test.step("Delete the created soul", async () =>
          debugApiCall(
            createGraphqlMetadata(
              "Banish a GraphQL soul",
              {
                operationName: "BanishSoul",
                query: `
              mutation BanishSoul($id: ID!) {
                banishSoul(id: $id)
              }
            `,
                variables: { id: createdSoulId },
              },
              session.token,
            ),
            () => banishSoul(request, session.token, createdSoulId),
          ));

      await expect(banishSoulResponse).toBeOK();
      expectJsonContentType(banishSoulResponse);

      const banishSoulData =
        await test.step("Read the banishSoul response body", async () =>
          readGraphqlData<{ banishSoul: string }>(banishSoulResponse));

      expect(banishSoulData.banishSoul).toContain(createdSoulId);
      soulId = undefined;
    } finally {
      if (soulId) {
        const cleanupSoulId = soulId;

        try {
          await debugApiCall(
            createGraphqlMetadata(
              "Best-effort cleanup for the created GraphQL soul",
              {
                operationName: "BanishSoul",
                query: `
                mutation BanishSoul($id: ID!) {
                  banishSoul(id: $id)
                }
              `,
                variables: { id: cleanupSoulId },
              },
              session.token,
            ),
            () => banishSoul(request, session.token, cleanupSoulId),
          );
        } catch {
          // Cleanup is best-effort here so the original failure stays primary.
        }
      }
    }
  },
);

test(
  "GraphQL createSoul without sending the JWT token",
  { tag: ["@graphql", "@debug"] },
  async ({ request, debugApiCall }) => {
    const soulName = `Playwright Soul ${Date.now()}`;

    const createSoulResponse =
      await test.step("Create a new soul through GraphQL", async () =>
        debugApiCall(
          createGraphqlMetadata("Create a GraphQL soul", {
            operationName: "CreateSoul",
            query: `
              mutation CreateSoul($input: SoulInput!) {
                createSoul(input: $input) {
                  id
                  name
                  deeds
                  status
                  weight
                }
              }
            `,
            variables: {
              input: {
                name: soulName,
                weight: 25,
              },
            },
          }),
          () =>
            createSoulWithoutToken(request, {
              name: soulName,
              weight: 25,
            }),
        ));

    await expect(createSoulResponse).toBeOK();
    expectJsonContentType(createSoulResponse);

    const createSoulData = await createSoulResponse.json();

    expect(createSoulData.createSoul).toBeUndefined();
    expect(createSoulData.errors).toBeDefined();
    expect(createSoulData.errors[0].message).toBe(
      "Только авторизованные жрецы могут призывать души!",
    );
  },
);
