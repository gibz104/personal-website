/**
 * Validates every .wgsl against a real device and prints only what went wrong.
 *
 * `next build` never validates WGSL — neither loader path does — so this is the
 * only real gate. Run it before trusting a shader.
 */
import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const DIR = "src/gpu/shaders";

/** Pulls every distinct error out of `vgpu check`'s JSON, however it nests. */
function errorsIn(node, found = new Map()) {
  if (Array.isArray(node)) {
    for (const item of node) errorsIn(item, found);
  } else if (node && typeof node === "object") {
    if (node.severity === "error" && node.code) {
      found.set(`${node.code}:${node.message ?? ""}`, node);
    }
    for (const value of Object.values(node)) errorsIn(value, found);
  }
  return found;
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".wgsl")).sort();
let failed = 0;

for (const file of files) {
  const path = `${DIR}/${file}`;
  let stdout = "";
  try {
    ({ stdout } = await run(
      "npx",
      ["vgpu", "check", path, "--require-validation"],
      { maxBuffer: 64 * 1024 * 1024 },
    ));
  } catch (error) {
    stdout = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    const start = stdout.indexOf("{");
    try {
      parsed = JSON.parse(stdout.slice(start));
    } catch {
      console.log(`✗ ${file}\n    unparseable output: ${stdout.slice(0, 300)}`);
      failed++;
      continue;
    }
  }

  const errors = [...errorsIn(parsed).values()];
  if (errors.length === 0) {
    console.log(`✓ ${file}`);
    continue;
  }
  failed++;
  console.log(`✗ ${file}`);
  for (const e of errors) {
    const where = e.line ? ` (line ${e.line}${e.column ? `:${e.column}` : ""})` : "";
    console.log(`    ${e.code}${where}: ${e.message ?? ""}`);
    if (e.fix) console.log(`      fix: ${e.fix}`);
  }
}

process.exit(failed ? 1 : 0);
