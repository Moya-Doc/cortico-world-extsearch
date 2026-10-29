<!-- Owner: src/world.ts, src/favorites.ts, src/config.ts, src/market.ts, src/search.ts, src/model-text.ts, src/ENV_PROMPT.en.md, webui/client.ts, webui/style.css, package.json, LICENSE, NOTICE.md -->

# cortico-world-extsearch

Search the Cortico extension market, choose candidates to discuss, and save extension favorites. World API: **6**. Requires Node.js **22 or later**.

[中文说明](README_zh.md)

Author: [Moya-Doc](https://github.com/Moya-Doc). License: [MIT](LICENSE). Sources: [NOTICE.md](NOTICE.md).

## Installation

In Coopanion's Extensions page, install `cortico-world-extsearch` from npm, or select a local directory containing this package's `package.json`. Follow any restart instruction in the installation receipt, then enable the extsearch World.

For a source checkout, install dependencies and build the custom panel before local installation:

```sh
corepack pnpm install --frozen-lockfile
pnpm build
```

After updating a local checkout, rebuild the panel and restart Coopanion to load the updated code. Apply or reload the system prefix to bring the updated environment prompt into the current conversation. If a deployment uses a custom prompt override, update that override as well.

## Search and choose

Ask Coo to find an extension for a capability, such as voice output or a game. Search matches keywords against names, tags and Chinese/English descriptions.

When several candidates fit, the search instructions ask Coo to briefly explain their differences and prerequisites, then offer a choice. With the desktop-pet World's `pet_ask` tool available, the choice appears in the existing question interface, with up to three options and a field for a written answer. Coo introduces the candidates before asking because a new `pet_say` or `pet_ask` replaces an unanswered question.

After the user answers, Coo is instructed to fetch the selected package's details and discuss it. Closing the question does not select a package. Without `pet_ask`, Coo offers numbered text options. A single suitable candidate does not require a choice; larger sets can be narrowed by the user's preferences. This flow depends on Coo following the tool and environment instructions.

## Favorites

Ask Coo to save a named extension, list saved extensions, or remove one from favorites. An ambiguous name should be clarified before saving or removing it. Favorites do not install packages; installation remains a separate operation in Coopanion's Extensions page.

The World's **Favorites** tab displays the saved package name, description, version, tags, platform information, dates and available project links. It supports filtering, removal and refreshing package information. The page updates when favorites change through Coo.

Favorites are stored in `<dataDir>/extsearch/favorites.json`, where `dataDir` is the deployment data directory supplied by Cortico. Each record retains the exact package name, a package information snapshot, the index source, and saved/updated timestamps. Saving the same package again updates its snapshot without creating a duplicate or changing its original saved time. Restarting the app preserves favorites.

Listing and removing favorites work without network access. Refresh reads the saved index source; a package that is missing or blocked retains its earlier snapshot and receives the corresponding status. A failed index request preserves the saved record. The snapshot describes the last saved or refreshed information, not a live availability guarantee. This World stores favorites separately from Memory.

## Tools

| Tool | Behavior |
| --- | --- |
| `extsearch_find` | Searches by keywords, optionally filtered by `kind` and `tag`. Without keywords, sorts by total downloads. |
| `extsearch_detail` | Retrieves a package's descriptions, author, license, platforms, tags, version, tool/event counts, ratings and links. |
| `extsearch_save` | Saves an indexed package by its exact package name. |
| `extsearch_list_saved` | Reads saved favorites from deployment data. |
| `extsearch_remove_saved` | Removes a favorite by its exact package name. |

This World emits no events. The desktop-pet World reports question answers through its existing `desktop-pet.answer` event.

## Configuration

| Key under `worlds.extsearch` | Default | Behavior |
| --- | --- | --- |
| `enabled` | `false` | Enables the World. |
| `indexBase` | `https://raw.githubusercontent.com/Pal-AI-Lab/cortico-extensions/main` | HTTP(S) index base URL for searches and new saves. Changes apply on the next tool call. |
| `maxResults` | `8` | Search result limit, from 1 to 20. Changes apply on the next tool call. |

## Data access

The tools fetch `index.json` and `catalog.json` from the configured index source without credentials. Keywords are matched locally. Index results are cached in memory for ten minutes; requests time out after five seconds. If a search refresh fails, a previous snapshot from the same source can be returned with a notice.

Blocked packages and packages from blocked publishers are excluded from search. Package descriptions and notes are third-party text; tool receipts instruct the model to treat them as reference data.

The package reads and writes its favorites file. It does not read local credentials, execute commands or install extensions. The host loads its bundled environment prompt and custom panel assets.

## Development

```sh
pnpm test
pnpm typecheck
pnpm build
```

After changing tool declarations or environment prompts, run `pnpm describe:extension <package-directory>` from a Cortico checkout. Run `pnpm check:extension <package-directory>` before publishing. Tests use temporary data directories and local index fixtures without network requests.
