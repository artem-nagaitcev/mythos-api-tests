import type { APIRequestContext, APIResponse } from "@playwright/test";

import { env } from "../config/env";

export const defaultGraphqlUrl = "https://api.qasandbox.ru/graphql";

export type GraphqlVariables = Record<string, unknown>;

export type GraphqlError = {
  message: string;
  path?: Array<number | string>;
  extensions?: Record<string, unknown>;
};

export type GraphqlResponseBody<TData> = {
  data?: TData;
  errors?: GraphqlError[];
};

export type GraphqlRequestOptions<
  TVariables extends GraphqlVariables | undefined,
> = {
  operationName: string;
  query: string;
  token?: string;
  variables?: TVariables;
};

export type GraphqlScribeCredentials = {
  password: string;
  username: string;
};

export type GraphqlAuthPayload = {
  message: string;
  token: string;
};

export type SoulSummary = {
  id: string;
  name: string;
  weight: number;
};

export type SoulDetails = SoulSummary & {
  deeds: string[];
  status: string;
};

export type SoulInput = {
  name: string;
  weight: number;
};

export type SoulMutationPayload = SoulDetails;

const SCRIBE_USERNAME_PREFIX = "pw_scribe";

export const getGraphqlUrl = (): string => env.graphqlUrl ?? defaultGraphqlUrl;

const createAuthHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});

const createGraphqlBody = <TVariables extends GraphqlVariables | undefined>({
  operationName,
  query,
  variables,
}: GraphqlRequestOptions<TVariables>): {
  operationName: string;
  query: string;
  variables: GraphqlVariables | null;
} => ({
  operationName,
  query,
  variables: variables ?? null,
});

export const postGraphql = <
  TData,
  TVariables extends GraphqlVariables | undefined,
>(
  request: APIRequestContext,
  options: GraphqlRequestOptions<TVariables>,
): Promise<APIResponse> =>
  request.post(getGraphqlUrl(), {
    data: createGraphqlBody(options),
    headers: options.token ? createAuthHeaders(options.token) : undefined,
  });

const createUsernameSuffix = (): string => {
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");

  return `${timestamp}_${randomPart}`;
};

export const createUniqueScribeCredentials = (): GraphqlScribeCredentials => ({
  username: `${SCRIBE_USERNAME_PREFIX}_${createUsernameSuffix()}`,
  password: "playwright123",
});

export const getAllSouls = (
  request: APIRequestContext,
  limit: number,
): Promise<APIResponse> =>
  postGraphql<{ allSouls: SoulSummary[] }, { limit: number }>(request, {
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
    variables: { limit },
  });

export const getSoul = (
  request: APIRequestContext,
  id: string,
): Promise<APIResponse> =>
  postGraphql<{ getSoul: SoulDetails }, { id: string }>(request, {
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
    variables: { id },
  });

export const registerScribe = (
  request: APIRequestContext,
  credentials: GraphqlScribeCredentials,
): Promise<APIResponse> =>
  postGraphql<{ registerScribe: string }, GraphqlScribeCredentials>(request, {
    operationName: "RegisterScribe",
    query: `
      mutation RegisterScribe($username: String!, $password: String!) {
        registerScribe(username: $username, password: $password)
      }
    `,
    variables: credentials,
  });

export const loginScribe = (
  request: APIRequestContext,
  credentials: GraphqlScribeCredentials,
): Promise<APIResponse> =>
  postGraphql<{ loginScribe: GraphqlAuthPayload }, GraphqlScribeCredentials>(
    request,
    {
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
    },
  );

export const getCurrentScribe = (
  request: APIRequestContext,
  token: string,
): Promise<APIResponse> =>
  postGraphql<{ currentScribe: string }, undefined>(request, {
    operationName: "CurrentScribe",
    query: `
      query CurrentScribe {
        currentScribe
      }
    `,
    token,
  });

export const createSoul = (
  request: APIRequestContext,
  token: string,
  input: SoulInput,
): Promise<APIResponse> =>
  postGraphql<{ createSoul: SoulMutationPayload }, { input: SoulInput }>(
    request,
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
      token,
      variables: { input },
    },
  );

export const createSoulWithoutToken = (
  request: APIRequestContext,
  input: SoulInput,
): Promise<APIResponse> =>
  postGraphql<{ createSoul: SoulMutationPayload }, { input: SoulInput }>(
    request,
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
      variables: { input },
    },
  );

export const patchSoulDeeds = (
  request: APIRequestContext,
  token: string,
  id: string,
  deed: string,
): Promise<APIResponse> =>
  postGraphql<
    { patchSoulDeeds: SoulMutationPayload },
    { deed: string; id: string }
  >(request, {
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
    token,
    variables: { id, deed },
  });

export const banishSoul = (
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<APIResponse> =>
  postGraphql<{ banishSoul: string }, { id: string }>(request, {
    operationName: "BanishSoul",
    query: `
      mutation BanishSoul($id: ID!) {
        banishSoul(id: $id)
      }
    `,
    token,
    variables: { id },
  });
