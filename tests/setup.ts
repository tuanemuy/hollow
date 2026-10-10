import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, onTestFailed } from "vitest";

const parent = join(homedir(), ".local/share/hollow/verification");
mkdirSync(parent, { recursive: true, mode: 0o700 });
const root = realpathSync(mkdtempSync(join(parent, "suite-")));
function directory(name: string) {
  const value = join(root, name);
  mkdirSync(value, { mode: 0o700 });
  return value;
}
const temporary = directory("tmp");
process.env.TMPDIR = temporary;
process.env.TMP = temporary;
process.env.TEMP = temporary;
process.env.HOLLOW_LLM_TEST_DIRECTORY = temporary;
process.env.DRIVE_S3_TEST_ROOT = directory("p5c1-s3-unit");
const keys = join(process.env.DRIVE_S3_TEST_ROOT, "crypto-fixture");
mkdirSync(keys, { mode: 0o700 });
for (const [name, byte] of [
  ["active.key", 1],
  ["retired.key", 2],
] as const)
  writeFileSync(join(keys, name), Buffer.alloc(32, byte), {
    flag: "wx",
    mode: 0o600,
  });
for (const [variable, name] of [
  ["DRIVE_S5A_ROOT", "p5c1-s5a-root"],
  ["HOLLOW_DRIVE_BACKUP_TEST_ROOT", "backup"],
  ["HOLLOW_DRIVE_BACKUP_HTTP_ROOT", "backup-http"],
  ["HOLLOW_DRIVE_BACKUP_SOURCE_TEST_ROOT", "backup-source"],
  ["HOLLOW_REGENERATION_TEST_ROOT", "regeneration"],
  ["HOLLOW_REGENERATION_INPUT_ROOT", "regeneration-input"],
  ["HOLLOW_S4_ROOT", "formats"],
  ["HOLLOW_LLM_INPUT_STAGE_ROOT", "input-stage"],
  ["HOLLOW_ACCOUNT_DELETION_ROOT", "account-deletion"],
  ["HOLLOW_ACCOUNT_DELETION_OWNER_RACE_ROOT", "account-deletion-owner-race"],
  ["HOLLOW_ACCOUNT_DELETION_CR_ROOT", "account-deletion-credentials"],
  ["HOLLOW_ACCOUNT_DELETION_HTTP_ROOT", "account-deletion-http"],
  ["HOLLOW_ACCOUNT_DELETION_MULTI_ROOT", "account-deletion-multiple"],
  ["HOLLOW_ACCOUNT_DELETION_LITERAL_ROOT", "account-deletion-literal"],
  ["HOLLOW_ACCOUNT_DELETION_DRIVE_ACK_ROOT", "account-deletion-drive-ack"],
  [
    "HOLLOW_ACCOUNT_DELETION_DRIVE_CAPACITY_ROOT",
    "account-deletion-drive-capacity",
  ],
] as const)
  process.env[variable] = directory(name);
for (const fixture of ["formats", "input-stage"])
  for (const name of ["objects-app", "objects-native", "records", "tmp"])
    mkdirSync(join(root, fixture, name), { mode: 0o700 });

process.env.HOLLOW_S4_BOOTSTRAP = new URL(
  "./nativeFormatsBootstrap.mjs",
  import.meta.url,
).pathname;

process.env.DRIVE_TEST_ROOT = join(temporary, "db");
mkdirSync(process.env.DRIVE_TEST_ROOT, { mode: 0o700 });

let failed = false;
beforeEach(() => {
  onTestFailed(() => {
    failed = true;
  });
});
afterAll(() => {
  if (failed) console.error(`Retained failed test fixture: ${root}`);
  else rmSync(root, { recursive: true, force: true });
});

process.env.HOLLOW_DRIVE_BACKUP_NATIVE_ROOT = join(root, "backup");
