#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// ai-devkit-v2 — installer for the adversarial multi-agent kit.
//
//   ai-devkit-v2 init [target-repo]   install the kit into <target>/.claude/
//   ai-devkit-v2 update [target-repo]  re-copy the kit (refresh agents/rules)
//   ai-devkit-v2 --version | --help
//
// The kit payload (commands, agents, rules, skills, secrets, CONVENTIONS.md)
// lives in this package's .claude/ and is copied into the target repo. The whole
// .claude/ folder and the pipeline's .ai-devkit/ output are then added to the
// target's .gitignore — reinstalled or regenerated, never committed.
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(HERE, "..");
const PAYLOAD_SRC = path.join(PKG_ROOT, ".claude");

// What we install (relative to .claude/). We never touch the target's own
// settings*.json or the pipeline output in .ai-devkit/.
const PAYLOAD = ["CONVENTIONS.md", "commands", "agents", "rules", "skills", "secrets"];

// Pipeline output lives in .ai-devkit/, not .claude/: Claude Code asks before every
// write inside .claude/, in every permission mode.
const GITIGNORE_ENTRIES = [".claude/", ".ai-devkit/"];

const C = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function version() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, "package.json"), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}

const HELP = `${C.bold("ai-devkit-v2")} — install the adversarial multi-agent kit into a repo

${C.bold("Usage")}
  ai-devkit-v2 init [target-repo]     Install the kit into <target>/.claude/
  ai-devkit-v2 update [target-repo]   Refresh an existing install (re-copy the kit)
  ai-devkit-v2 --version
  ai-devkit-v2 --help

${C.bold("What init does")}
  1. Copies the kit (commands, agents, rules, skills, secrets, CONVENTIONS.md)
     into <target>/.claude/
  2. Adds ".claude/" and ".ai-devkit/" (pipeline output) to <target>/.gitignore
  3. Leaves your settings*.json and .ai-devkit/output/ untouched

${C.bold("Then, in the target repo")}
  - In Claude Code:   /task "<what you want done>"
`;

function fail(msg) {
  console.error(C.yellow("error: ") + msg);
  process.exit(1);
}

function resolveTarget(arg) {
  const target = path.resolve(process.cwd(), arg || ".");
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    fail(`not a directory: ${target}`);
  }
  return target;
}

function ensureGitignored(target) {
  const gi = path.join(target, ".gitignore");
  const text = fs.existsSync(gi) ? fs.readFileSync(gi, "utf8") : "";
  const lines = text.split("\n").map((l) => l.trim());
  const missing = GITIGNORE_ENTRIES.filter((e) => !lines.includes(e) && !lines.includes(e.slice(0, -1)));
  if (!missing.length) return missing;
  const addition =
    (text && !text.endsWith("\n") ? "\n" : "") +
    "\n# ai-devkit-v2 kit + its runtime output (reinstalled via `ai-devkit-v2 init`)\n" +
    missing.join("\n") +
    "\n";
  fs.appendFileSync(gi, addition);
  return missing;
}

function installKit(target) {
  if (!fs.existsSync(PAYLOAD_SRC)) fail(`kit payload missing at ${PAYLOAD_SRC}`);
  const dstClaude = path.join(target, ".claude");
  fs.mkdirSync(dstClaude, { recursive: true });
  for (const item of PAYLOAD) {
    const src = path.join(PAYLOAD_SRC, item);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(dstClaude, item);
    fs.rmSync(dst, { recursive: true, force: true }); // replace kit dirs/files cleanly
    fs.cpSync(src, dst, { recursive: true });
  }
}

function printNext(target) {
  const rel = path.relative(process.cwd(), target) || ".";
  console.log("");
  console.log(C.bold("Next:"));
  console.log(`  cd ${rel}`);
  console.log(`  ${C.dim("# then, in Claude Code (this editor), open the repo and run:")}`);
  console.log(`  /task "<what you want done>"`);
}

function cmdInit(arg, { update = false } = {}) {
  const target = resolveTarget(arg);
  const name = path.basename(target);
  console.log(C.cyan(update ? "Updating" : "Installing") + ` ai-devkit-v2 kit → ${C.bold(name)}`);
  console.log(C.dim(`  target: ${target}`));

  installKit(target);
  console.log(C.green("✔") + ` copied kit into ${path.join(".claude")}/ ${C.dim("(commands, agents, rules, skills, secrets, CONVENTIONS.md)")}`);

  const added = ensureGitignored(target);
  if (added.length) console.log(C.green("✔") + ` added ${added.join(" and ")} to .gitignore`);
  else console.log(C.dim(`  ${GITIGNORE_ENTRIES.join(" and ")} already git-ignored`));

  printNext(target);
}

function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === "--version" || cmd === "-v") return console.log(version());
  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") return console.log(HELP);

  switch (cmd) {
    case "init":
      return cmdInit(rest[0], { update: false });
    case "update":
      return cmdInit(rest[0], { update: true });
    default:
      fail(`unknown command: ${cmd}  (try \`ai-devkit-v2 --help\`)`);
  }
}

main(process.argv.slice(2));
