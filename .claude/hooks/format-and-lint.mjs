// PostToolUse hook: formats the file Claude just wrote/edited with Prettier
// and auto-fixes it with ESLint. Exits 2 (feeding stderr back to Claude)
// when Prettier fails or ESLint errors remain after --fix.
import { spawnSync } from "node:child_process";
import path from "node:path";

// Derived from the script location (not CLAUDE_PROJECT_DIR), which may be a
// POSIX-style path like /c/Users/... under Git Bash on Windows.
const projectDir = path.resolve(import.meta.dirname, "..", "..");
const PRETTIER = path.join(
  projectDir,
  "node_modules/prettier/bin/prettier.cjs",
);
const ESLINT = path.join(projectDir, "node_modules/eslint/bin/eslint.js");
const LINTABLE = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const SKIPPED_DIRS = ["node_modules", ".next", ".git"];

const readStdin = async () => {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
};

const run = (cli, args) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd: projectDir,
    encoding: "utf8",
  });

const input = JSON.parse((await readStdin()) || "{}");
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const absolute = path.resolve(projectDir, filePath);
const relative = path.relative(projectDir, absolute);
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);
if (relative.split(path.sep).some((part) => SKIPPED_DIRS.includes(part))) {
  process.exit(0);
}

const prettier = run(PRETTIER, ["--write", "--ignore-unknown", absolute]);
if (prettier.status !== 0) {
  process.stderr.write(`Prettier failed on ${relative}:\n${prettier.stderr}`);
  process.exit(2);
}

if (LINTABLE.has(path.extname(absolute))) {
  const eslint = run(ESLINT, ["--fix", absolute]);
  if (eslint.status !== 0) {
    process.stderr.write(
      `ESLint errors in ${relative}:\n${eslint.stdout}${eslint.stderr}`,
    );
    process.exit(2);
  }
}

process.exit(0);
