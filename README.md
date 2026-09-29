# Wardmap

Interactive analysis of warding patterns across Dota 2 teams, players, and matches.

## Development

Requires Node.js 22, Rust, `wasm-pack`, and Git LFS.

```bash
git lfs install
git lfs pull
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.15.0
npm ci
npm run build:wasm
```

Run:

```bash
npm run dev
```

By default, the app uses the production API. To develop against a local backend,
create `.env.local`:

```dotenv
VITE_API_URL=http://127.0.0.1:5000
```

## Replay import

Select **Imported** as the dataset source, then **Replay library**. Choose Dota 2
Source 2 `.dem` or `.dem.bz2` files. Replays are decompressed and parsed locally in
a Web Worker using the shared Rust parser; no replay is uploaded. Results and ward
sighting evidence are saved in this browser's IndexedDB. The library supports
searching, collections, notes, multi-selection, bulk organization, and map loading.
Its Settings tab can export or restore a portable JSON backup and shows browser
storage usage.

Imported analysis works without the API, including restoring sessions and saved views.
Choose the replay map under the Imported source before importing; this setting is
saved independently of competitive leagues.

Use replays matching the map version displayed in the import dialog. The parser
uses that map's terrain for vision calculations; it does not detect the replay's
patch. Files and decompressed replays are limited to 512 MB. Unsupported or corrupt
files report individual errors; successful files in the same batch are retained.
Match IDs and SHA-256 content hashes detect duplicate imports; enable replacement
when intentionally reparsing a match. Old mock imports are removed on library load.
Clearing browser data removes imported results unless they were exported first.

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
cargo test --workspace
npm run build
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
