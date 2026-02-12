# dis-bot

## Overview

`dis-bot` is a Discord bot with text and audio commands. It supports a split setup where
public code lives in this repo and optional private assets/commands live in a separate repo.
Private commands override public ones by name, and private audio/assets are searched first.

## Tech Stack

- Bun (runtime)
- TypeScript
- discord.js
- SQLite + Drizzle ORM

## Quick Start

1. Install dependencies:

```
npm install
```

2. Create a `.env` file with at least:

```
BOT_TOKEN=your_discord_bot_token
DB_FILE_PATH=../dis-bot-assets-private/sqlite.db
```

3. Optional private repo variables:

```
ASSETS_PRIVATE_DIR=/home/user/repo/dis-bot-assets-private
PRIVATE_COMMANDS_DIR=/home/user/repo/dis-bot-assets-private/commands
BF6_PLAYERS_CONFIG_PATH=/home/user/repo/dis-bot-assets-private/config/bf6players.json
CRASH_COUNTER_FILE_PATH=/home/user/repo/dis-bot-assets-private/crashcounter.json
```

`DB_FILE_PATH` can be absolute or relative to this repo directory. `DB_FILE_NAME` is still
accepted for backward compatibility, but `DB_FILE_PATH` is preferred.
`BF6_PLAYERS_CONFIG_PATH` is optional; if not set and `ASSETS_PRIVATE_DIR` is set, the bot
defaults to `${ASSETS_PRIVATE_DIR}/config/bf6players.json`.
`CRASH_COUNTER_FILE_PATH` is optional; if not set and `ASSETS_PRIVATE_DIR` is set, the bot
defaults to `${ASSETS_PRIVATE_DIR}/crashcounter.json`.

4. Run the bot:

```
bun run index.ts
```

On startup, Drizzle migrations are applied automatically to the configured `DB_FILE_PATH`.
You can also run them manually:

```
npm run db:migrate
```

## Private Assets

You can keep private audio/images in a separate GitHub repo and point the bot to a local clone.

1. Clone your private assets repo locally:

```
git clone git@github.com:<you>/dis-bot-assets-private.git /home/user/repo/dis-bot-assets-private
```

2. Put assets in the expected structure:

```
/home/user/repo/dis-bot-assets-private/
  audio/
  images/
  config/
    bf6players.json
```

3. Set the environment variable:

```
ASSETS_PRIVATE_DIR=/home/user/repo/dis-bot-assets-private
```

When set, the bot searches:

1. `${ASSETS_PRIVATE_DIR}/audio/...` (private)
2. `assets/audio/...` (public repo)

This keeps your public GitHub repo clean while still letting private, server-specific assets work.

## Private Commands

If you want server-specific commands (like `command.ts`) to stay out of the public repo, put them in your private repo and set `PRIVATE_COMMANDS_DIR`.

Example structure:

```
/home/user/repo/dis-bot-assets-private/
  commands/
    audio/
      command.ts
```

Set:

```
PRIVATE_COMMANDS_DIR=/home/user/repo/dis-bot-assets-private/commands
```

On startup, the bot loads commands from:

1. `./commands` (public repo)
2. `${PRIVATE_COMMANDS_DIR}` (private repo)

Private commands override public ones if they share the same name.

## Private/Public Summary

- Public commands load first, private commands load after and override by name.
- Audio/assets search order is private first, then public.
- Private assets/commands live outside this repo and are configured via environment variables.
- SQLite can live outside this repo via `DB_FILE_PATH` (for example in `../dis-bot-assets-private/sqlite.db`).
- Crash tracker file can live outside this repo via `CRASH_COUNTER_FILE_PATH`.

## Typecheck Private Commands

To validate types across public + private commands:

```
npm run typecheck:private
```

This uses `tsconfig.private.json` which includes:

- Public repo TypeScript files
- `../dis-bot-assets-private/commands/**/*.ts`

If your private repo lives elsewhere, update `tsconfig.private.json` accordingly.

## VS Code Multi-Root Workspace

If you want full IntelliSense for both public and private commands, open the multi-root workspace:

```
code dis-bot.code-workspace
```

This workspace includes:

- `./`
- `../dis-bot-assets-private`

If your private repo lives elsewhere, edit `dis-bot.code-workspace`.

For portability, you can use the relative-path workspace template:

```
code dis-bot.code-workspace.example
```

This assumes your private repo is a sibling folder named `dis-bot-assets-private`.
