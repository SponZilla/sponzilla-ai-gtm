import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

function findTestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTestFiles(path);
    return entry.isFile() && entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const files = [
  ...findTestFiles("src"),
  ...findTestFiles("tests"),
].map((path) => relative(process.cwd(), path));

// Importing modules may construct the Prisma client even in pure unit tests.
// Supply a local placeholder only when no database URL is configured; tests
// that actually need a database must still provision and opt into one.
const testEnv = { ...process.env };
testEnv.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { stdio: "inherit", env: testEnv },
);

process.exit(result.status ?? 1);
