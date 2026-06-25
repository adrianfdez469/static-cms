import { vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn) => fn,
}));

vi.mock("@/lib/supabase", async () => {
  const fixtures = await import("./fixtures/cms.js");

  return {
    createSupabaseClient: () => ({
      storage: {
        from: () => ({
          download: async (path) => {
            if (path === fixtures.TEMPLATE_PATH) {
              return {
                data: { text: async () => fixtures.TEST_TEMPLATE },
                error: null,
              };
            }

            if (path === fixtures.storagePathForSlug(fixtures.TEST_SLUG)) {
              return {
                data: { text: async () => fixtures.TEST_MARKDOWN },
                error: null,
              };
            }

            return { data: null, error: { message: "Not found" } };
          },
          list: async () => ({ data: [], error: null }),
        }),
      },
    }),
  };
});
