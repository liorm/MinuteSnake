# MinuteSnake

Modern implementation of the classic Snake game using JavaScript and Canvas.

## Live Demo
Play the game here: [MinuteSnake](https://liorm.github.io/MinuteSnake/)

## Build Instructions
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Build the project (development):
   ```bash
   pnpm run build
   ```

   The build configuration is now in [`esbuild.config.js`](esbuild.config.js:1).

3. Build the project for production (minified, no sourcemaps):
   ```bash
   pnpm run build:prod
   ```

## Development Mode (Watch for Changes)
Start the build in watch mode for live development:
```bash
pnpm run build -- --watch
```
Or use the shortcut:
```bash
pnpm run dev
```

## Test Instructions
Run the test suite:
```bash
pnpm run test
```

## Serve Locally
Start a local development server:
```bash
pnpm run serve
```
