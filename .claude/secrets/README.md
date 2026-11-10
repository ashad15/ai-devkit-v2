# Local secrets (never committed)

Credentials for any MCP servers or external tools the pipeline uses live **on your
machine only** — never in the repo, never pasted into chat. In a target repo the whole
`.claude/` folder is git-ignored by `ai-devkit-v2 init`, but keep real secret files
outside the repo anyway.

## Where secrets go
- Put key files under `~/.claude/secrets/` (create it if needed), e.g.
  `~/.claude/secrets/<service>-sa.json`.
- Reference them from your Claude Code MCP config (`~/.claude/mcp.json` or the
  equivalent `claude mcp` setup) via an env var pointing at the **absolute path** —
  never inline the secret value.

## Example — a Google service account (for a Sheets MCP)
1. Create the service account + download the JSON key.
2. Save it as `~/.claude/secrets/google-sheets-sa.json`.
3. In your MCP config, set `GOOGLE_SERVICE_ACCOUNT_KEY` to that file's absolute path.
4. Share the target resource with the service account's `client_email`.

## Rules
- Never commit a key file, token, or password.
- Never put a secret in an agent prompt, a plan, or any `.ai-devkit/output/` artifact.
- The **final-reviewer** fails the pipeline if it finds a secret in the diff.
