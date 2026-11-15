import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { isStatusResponse } from "../lib/status";
import { validStatus } from "./status-fixtures";

// The backend's default demo-mode GET /api/status reply, written by
// backend/scripts/write_fixtures.py (Story 1.13, D10). Drift between the backend and the
// hand-written validStatus() fails here.
const recorded: unknown = JSON.parse(readFileSync(resolve(__dirname, "status-response.json"), "utf8"));

test("validStatus() equals the backend-written status fixture", () => {
  expect(validStatus()).toStrictEqual(recorded);
});

test("isStatusResponse accepts the backend-written status fixture", () => {
  expect(isStatusResponse(recorded)).toBe(true);
});
