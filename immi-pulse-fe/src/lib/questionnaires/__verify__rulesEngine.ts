/**
 * Parity check — runs the shared fixture (owned by the backend) against
 * the TypeScript port of the rules engine. Mirrors the backend pytest
 * `test_rule_eval_fixture` parametrized test.
 *
 * Run with: bun run src/lib/questionnaires/__verify__rulesEngine.ts
 *
 * This is intentionally not part of the test framework (we don't have
 * vitest/jest installed) but is invoked manually when changing the
 * shared rules contract.
 */

import fs from "node:fs";
import path from "node:path";
import { isFieldRequired, isFieldVisible } from "./rulesEngine";

type FixtureCase = {
  name: string;
  field: Parameters<typeof isFieldVisible>[0];
  answers: Record<string, unknown>;
  expected_visible: boolean;
  expected_required: boolean;
};

const fixturePath = path.resolve(
  // Resolved from immi-pulse-fe/src/lib/questionnaires
  __dirname,
  "../../../..",
  "immi-pulse-be",
  "tests",
  "fixtures",
  "rule_eval_cases.json",
);

const raw = fs.readFileSync(fixturePath, "utf8");
const data = JSON.parse(raw) as { cases: FixtureCase[] };

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const c of data.cases) {
  const gotVisible = isFieldVisible(c.field, c.answers);
  const gotRequired = isFieldRequired(c.field, c.answers);
  const okV = gotVisible === c.expected_visible;
  const okR = gotRequired === c.expected_required;
  if (okV && okR) {
    passed++;
  } else {
    failed++;
    failures.push(
      `${c.name}: visible got=${gotVisible} want=${c.expected_visible} | required got=${gotRequired} want=${c.expected_required}`,
    );
  }
}

console.log(`Ran ${data.cases.length} cases — passed=${passed} failed=${failed}`);
for (const f of failures) console.log("  ✗", f);

if (failed > 0) process.exit(1);
