import { defineConfig } from "orval";

export default defineConfig({
  tbvApi: {
    input: "./openapi.json",
    output: {
      mode: "tags-split",
      target: "./src/api/generated/endpoints",
      schemas: "./src/api/generated/schemas",
      client: "fetch",
      override: {
        mutator: {
          path: "./src/api/customFetch.ts",
          name: "customFetch",
        },
      },
    },
  },
});
