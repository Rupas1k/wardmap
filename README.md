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

Requests are proxied to a local API on `127.0.0.1:5000`. For frontend-only development, create `.env.local`:

```dotenv
VITE_API_URL=https://api.rupasov.dev
```

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
