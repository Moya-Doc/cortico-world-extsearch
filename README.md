<!-- Owner: src/world.ts, src/config.ts, src/market.ts, src/search.ts, package.json, LICENSE, NOTICE.md -->

# cortico-world-extsearch

Search the Cortico extension market by keywords and retrieve extension details. World API: **6**. Requires Node.js **22 or later**.

[中文说明](README_zh.md)

Author: [Moya-Doc](https://github.com/Moya-Doc). License: [MIT](LICENSE). Sources: [NOTICE.md](NOTICE.md).

## Installation

In Coopanion's Extensions page, install this package from a local directory containing `package.json`, or search for `cortico-world-extsearch` after it is published to npm. Follow any restart instruction in the installation receipt, then enable the extsearch World.

Ask Coo to find an extension for a capability, such as voice output or a game. The extension provides search and detail tools; installation is performed separately in the Extensions page.

## Tools

| Tool | Behavior |
| --- | --- |
| `extsearch_find` | Matches keywords against package names, tags and Chinese/English descriptions. Optional `kind` and `tag` filters. Without keywords, sorts by total downloads. |
| `extsearch_detail` | Returns a package's descriptions, author, license, platforms, tags, version, tool/event counts, ratings and links. |

Search results include guidance to recommend one to three candidates, explain prerequisites, inspect unclear candidates and broaden unsuccessful searches. Blocked packages and packages from blocked publishers are excluded from search.

## Configuration

| Key under `worlds.extsearch` | Default | Behavior |
| --- | --- | --- |
| `enabled` | `false` | Enables the World. |
| `indexBase` | `https://raw.githubusercontent.com/Pal-AI-Lab/cortico-extensions/main` | HTTP(S) index base URL. Changes apply on the next tool call. |
| `maxResults` | `8` | Search result limit, from 1 to 20. Changes apply on the next tool call. |

## Data access

The tools fetch `index.json` and `catalog.json` from the configured index source without credentials. Keywords are matched locally. Results are cached in memory for ten minutes; requests time out after five seconds. If refresh fails, a previous snapshot from the same source is returned with a notice.

The tools do not read or write local files, execute commands, install packages or emit events. The host loads the bundled environment prompt. Extension descriptions are third-party text; tool results instruct the model to treat them as reference data.

## Development

```sh
corepack pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
```

This package loads TypeScript source directly through Cortico and has no frontend build step. After changing tool declarations or environment prompts, run `pnpm describe:extension <package-directory>` from a Cortico checkout. Run `pnpm check:extension <package-directory>` before publishing.
