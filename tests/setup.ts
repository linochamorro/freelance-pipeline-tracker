import { beforeAll, afterAll } from "vitest";

beforeAll(async () => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/freelance-pipeline-tracker-test";
});

afterAll(async () => {});
