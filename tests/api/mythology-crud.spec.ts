import {
  createMythologyEntity,
  deleteMythologyEntity,
  getMythologyById,
  patchMythologyEntity,
  replaceMythologyEntity,
  createMythologyEntityById,
  type MythologyEntity,
} from "../../src/api/mythology";
import { expect, test } from "../fixtures/api-test";
import {
  createMythologyPayload,
  createPatchMythologyPayload,
  createReplacementMythologyPayload,
} from "../support/mythology-test-data";
import {
  expectJsonContentType,
  expectMythologyEntityContract,
} from "../support/contract-assertions";

test.describe.configure({ mode: "serial" });

test(
  "POST /mythology creates a new entity",
  { tag: "@crud" },
  async ({ request, authToken, debugApiCall, mythologyEntityManager }) => {
    const payload = createMythologyPayload();

    const response = await test.step("Create a mythology entity", async () =>
      debugApiCall(
        {
          label: "Create a mythology entity",
          request: {
            method: "POST",
            url: "mythology",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            body: payload,
          },
        },
        () => createMythologyEntity(request, authToken, payload),
      ));

    await expect(response).toBeOK();
    expect(response.status()).toBe(201);
    expectJsonContentType(response);

    const createdEntity =
      await test.step("Read created entity response", async () =>
        (await response.json()) as MythologyEntity);

    mythologyEntityManager.track(createdEntity.id);

    expectMythologyEntityContract(createdEntity);
    expect(createdEntity.id).toEqual(expect.any(Number));
    expect(createdEntity).toMatchObject(payload);
  },
);

test(
  "PATCH /mythology/{id} updates selected fields",
  { tag: "@crud" },
  async ({ request, authToken, debugApiCall, mythologyEntityManager }) => {
    const createdEntity =
      await test.step("Create entity for patch test", async () =>
        mythologyEntityManager.create());
    const patchPayload = createPatchMythologyPayload();

    const patchResponse = await test.step("Patch selected fields", async () =>
      debugApiCall(
        {
          label: `Patch mythology entity ${createdEntity.id}`,
          request: {
            method: "PATCH",
            url: `mythology/${createdEntity.id}`,
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            body: patchPayload,
          },
        },
        () =>
          patchMythologyEntity(
            request,
            authToken,
            createdEntity.id,
            patchPayload,
          ),
      ));

    await expect(patchResponse).toBeOK();
    expect(patchResponse.status()).toBe(200);

    const getResponse = await test.step("Fetch entity after patch", async () =>
      debugApiCall(
        {
          label: `Fetch mythology entity ${createdEntity.id} after patch`,
          request: {
            method: "GET",
            url: `mythology/${createdEntity.id}`,
          },
        },
        () => getMythologyById(request, createdEntity.id),
      ));
    await expect(getResponse).toBeOK();
    expectJsonContentType(getResponse);

    const updatedEntity = (await getResponse.json()) as MythologyEntity;

    expectMythologyEntityContract(updatedEntity);
    expect(updatedEntity.id).toBe(createdEntity.id);
    expect(updatedEntity.name).toBe(createdEntity.name);
    expect(updatedEntity.category).toBe(createdEntity.category);
    expect(updatedEntity.desc).toBe(patchPayload.desc);
  },
);

test(
  "PUT /mythology/{id} replaces entity fields",
  { tag: "@crud" },
  async ({ request, authToken, debugApiCall, mythologyEntityManager }) => {
    const createdEntity =
      await test.step("Create entity for put test", async () =>
        mythologyEntityManager.create());
    const replacementPayload = createReplacementMythologyPayload();

    const putResponse = await test.step("Replace all entity fields", async () =>
      debugApiCall(
        {
          label: `Replace mythology entity ${createdEntity.id}`,
          request: {
            method: "PUT",
            url: `mythology/${createdEntity.id}`,
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            body: replacementPayload,
          },
        },
        () =>
          replaceMythologyEntity(
            request,
            authToken,
            createdEntity.id,
            replacementPayload,
          ),
      ));

    await expect(putResponse).toBeOK();
    expect(putResponse.status()).toBe(200);

    const getResponse = await test.step("Fetch entity after put", async () =>
      debugApiCall(
        {
          label: `Fetch mythology entity ${createdEntity.id} after put`,
          request: {
            method: "GET",
            url: `mythology/${createdEntity.id}`,
          },
        },
        () => getMythologyById(request, createdEntity.id),
      ));
    await expect(getResponse).toBeOK();
    expectJsonContentType(getResponse);

    const updatedEntity = (await getResponse.json()) as MythologyEntity;

    expectMythologyEntityContract(updatedEntity);
    expect(updatedEntity.id).toBe(createdEntity.id);
    expect(updatedEntity).toMatchObject(replacementPayload);
  },
);

test(
  "DELETE /mythology/{id} removes a created entity",
  { tag: "@crud" },
  async ({ request, authToken, debugApiCall, mythologyEntityManager }) => {
    const createdEntity =
      await test.step("Create entity for delete test", async () =>
        mythologyEntityManager.create());

    const deleteResponse =
      await test.step("Delete the created entity", async () =>
        debugApiCall(
          {
            label: `Delete mythology entity ${createdEntity.id}`,
            request: {
              method: "DELETE",
              url: `mythology/${createdEntity.id}`,
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            },
          },
          () => deleteMythologyEntity(request, authToken, createdEntity.id),
        ));

    expect(deleteResponse.status()).toBe(204);

    const getResponse =
      await test.step("Verify entity is no longer available", async () =>
        debugApiCall(
          {
            label: `Verify mythology entity ${createdEntity.id} is deleted`,
            request: {
              method: "GET",
              url: `mythology/${createdEntity.id}`,
            },
          },
          () => getMythologyById(request, createdEntity.id),
        ));

    expect(getResponse.status()).toBe(404);
  },
);

test(
  "POST /mythology/{id} returns 405 Method Not Allowed",
  { tag: ["@crud", "@debug"] },
  async ({ request, authToken, debugApiCall }) => {
    const payload = createMythologyPayload();

    const id = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    const getResponse =
      await test.step("Verify entity is no longer available", async () =>
        debugApiCall(
          {
            label: `Send POST request entity ${id}`,
            request: {
              method: "POST",
              url: `mythology/${id}`,
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            },
          },
          () => createMythologyEntityById(request, authToken, payload, id),
        ));
    expect(getResponse.status()).toBe(405);
  },
);

test(
  "PUT /mythology/{id} returns the expected status for a non-existent entity",
  { tag: ["@crud", "@debug"] },
  async ({ request, authToken, debugApiCall }) => {
    const payload = createMythologyPayload();

    const id = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    const getResponse =
      await test.step("Verify entity is no longer available", async () =>
        debugApiCall(
          {
            label: `Send POST request entity ${id}`,
            request: {
              method: "PUT",
              url: `mythology/${id}`,
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            },
          },
          () => replaceMythologyEntity(request, authToken, id, payload),
        ));
    expect(getResponse.status()).toBe(404);
  },
);

test(
  "PATCH /mythology/{id} returns the expected status for a non-existent entity",
  { tag: ["@crud", "@debug"] },
  async ({ request, authToken, debugApiCall }) => {
    const payload = createMythologyPayload();

    const id = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    const getResponse =
      await test.step("Verify entity is no longer available", async () =>
        debugApiCall(
          {
            label: `Send POST request entity ${id}`,
            request: {
              method: "PATCH",
              url: `mythology/${id}`,
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            },
          },
          () => patchMythologyEntity(request, authToken, id, payload),
        ));
    expect(getResponse.status()).toBe(404);
  },
);

test(
  "DELETE /mythology/{id} returns the expected status for a non-existent entity",
  { tag: ["@crud", "@debug"] },
  async ({ request, authToken, debugApiCall }) => {
    const id = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    const getResponse =
      await test.step("Verify entity is no longer available", async () =>
        debugApiCall(
          {
            label: `Send POST request entity ${id}`,
            request: {
              method: "DELETE",
              url: `mythology/${id}`,
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            },
          },
          () => deleteMythologyEntity(request, authToken, id),
        ));
    expect(getResponse.status()).toBe(404);
  },
);
