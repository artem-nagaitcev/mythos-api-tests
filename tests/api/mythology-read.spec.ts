import {
  getMythologyById,
  getMythologyList,
  type MythologyEntity,
} from "../../src/api/mythology";
import { expect, test } from "../fixtures/api-test";
import {
  mythologyCategories,
  notFoundMythologyEntityId,
} from "../support/mythology-test-data";
import {
  expectApiErrorBodyContract,
  expectJsonContentType,
  expectMythologyEntityContract,
  expectMythologyEntityListContract,
} from "../support/contract-assertions";

const not_found = "Персонаж не найден";

test(
  "GET /mythology returns successful JSON response",
  { tag: ["@read", "@smoke"] },
  async ({ request, debugApiCall }) => {
    const response = await test.step("Fetch mythology list", async () =>
      debugApiCall(
        {
          label: "Fetch mythology list",
          request: {
            method: "GET",
            url: "mythology",
          },
        },
        () => getMythologyList(request),
      ));

    await expect(response).toBeOK();
    expectJsonContentType(response);

    const body = await test.step("Read mythology list response", async () =>
      (await response.json()) as MythologyEntity[]);

    expectMythologyEntityListContract(body);
    expect(body.length).toBeGreaterThan(0);
  },
);

for (const category of mythologyCategories) {
  test(
    `GET /mythology?category=${category} returns only ${category}`,
    { tag: "@read" },
    async ({ request, debugApiCall }) => {
      const response =
        await test.step(`Fetch mythology list filtered by ${category}`, async () =>
          debugApiCall(
            {
              label: `Fetch mythology list filtered by ${category}`,
              request: {
                method: "GET",
                url: `mythology?category=${category}`,
              },
            },
            () => getMythologyList(request, { category }),
          ));

      await expect(response).toBeOK();
      expectJsonContentType(response);

      const body =
        await test.step("Read filtered mythology list response", async () =>
          (await response.json()) as MythologyEntity[]);

      expectMythologyEntityListContract(body);

      for (const entity of body) {
        expect(entity.category).toBe(category);
      }
    },
  );
}

test(
  "GET /mythology?sort=asc and sort=desc return the same entities in opposite order",
  { tag: "@read" },
  async ({ request, debugApiCall }) => {
    const ascResponse =
      await test.step("Fetch mythology list sorted ascending", async () =>
        debugApiCall(
          {
            label: "Fetch mythology list sorted ascending",
            request: {
              method: "GET",
              url: "mythology?sort=asc",
            },
          },
          () => getMythologyList(request, { sort: "asc" }),
        ));
    const descResponse =
      await test.step("Fetch mythology list sorted descending", async () =>
        debugApiCall(
          {
            label: "Fetch mythology list sorted descending",
            request: {
              method: "GET",
              url: "mythology?sort=desc",
            },
          },
          () => getMythologyList(request, { sort: "desc" }),
        ));

    await expect(ascResponse).toBeOK();
    await expect(descResponse).toBeOK();
    expectJsonContentType(ascResponse);
    expectJsonContentType(descResponse);

    const ascEntities =
      await test.step("Read ascending mythology list response", async () =>
        (await ascResponse.json()) as MythologyEntity[]);
    const descEntities =
      await test.step("Read descending mythology list response", async () =>
        (await descResponse.json()) as MythologyEntity[]);

    expectMythologyEntityListContract(ascEntities);
    expectMythologyEntityListContract(descEntities);

    const descIds = new Set(descEntities.map((entity) => entity.id));
    const ascIds = new Set(ascEntities.map((entity) => entity.id));

    const commonAscIds = ascEntities
      .filter((entity) => descIds.has(entity.id))
      .map((entity) => entity.id);
    const commonDescIds = descEntities
      .filter((entity) => ascIds.has(entity.id))
      .map((entity) => entity.id);

    expect(commonAscIds.length).toBeGreaterThan(20);
    expect(commonDescIds.length).toBe(commonAscIds.length);
    expect(commonAscIds).not.toEqual(commonDescIds);
    expect(commonAscIds.slice(0, 20)).not.toEqual(commonDescIds.slice(0, 20));
  },
);

test(
  "GET /mythology/{id} returns an existing entity",
  { tag: "@read" },
  async ({ request, debugApiCall }) => {
    const existingEntity =
      await test.step("Load mythology list and select an existing entity", async () => {
        const listResponse = await debugApiCall(
          {
            label: "Load mythology list to select an existing entity",
            request: {
              method: "GET",
              url: "mythology",
            },
          },
          () => getMythologyList(request),
        );
        await expect(listResponse).toBeOK();

        const entities = (await listResponse.json()) as MythologyEntity[];
        expect(entities.length).toBeGreaterThan(0);

        return entities[0] as MythologyEntity;
      });

    const response =
      await test.step("Fetch the selected entity by id", async () =>
        debugApiCall(
          {
            label: `Fetch mythology entity ${existingEntity.id}`,
            request: {
              method: "GET",
              url: `mythology/${existingEntity.id}`,
            },
          },
          () => getMythologyById(request, existingEntity.id),
        ));

    await expect(response).toBeOK();
    expectJsonContentType(response);

    const entity = await test.step("Read mythology entity response", async () =>
      (await response.json()) as MythologyEntity);

    expectMythologyEntityContract(entity);
    expect(entity.id).toBe(existingEntity.id);
    expect(entity.name).toBe(existingEntity.name);
    expect(entity.category).toBe(existingEntity.category);
    expect(entity.desc).toBe(existingEntity.desc);
  },
);

test(
  "GET /mythology/{id} returns 404 for a non-existent entity",
  { tag: ["@read", "@debug"] },
  async ({ request, debugApiCall }) => {
    const response =
      await test.step("Fetch a non-existent mythology entity by id", async () =>
        debugApiCall(
          {
            label: `Fetch non-existent mythology entity ${notFoundMythologyEntityId}`,
            request: {
              method: "GET",
              url: `mythology/${notFoundMythologyEntityId}`,
            },
          },
          () => getMythologyById(request, notFoundMythologyEntityId),
        ));

    expect(response.status()).toBe(404);
    expectJsonContentType(response);
    const data = await response.json();
    expect(data.error).toBe(not_found);

    const body =
      await test.step("Read non-existent mythology entity response", async () =>
        (await response.json()) as unknown);

    expectApiErrorBodyContract(body);
  },
);
