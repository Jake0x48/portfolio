# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.16.4 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" mdsvex mcp="ide:vscode+setup:local" tailwindcss="plugins:typography" --install bun portfolio
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Error handling

- `src/routes/+error.svelte` renders recoverable route errors, including missing pages and write-ups. Recovery links respect `BASE_PATH`.
- Client and server error hooks log unexpected failures locally and return safe public messages. No error reporting service is configured.
- `src/error.html` is a dependency-free fallback when the root layout or error rendering fails.
- The static adapter already emits `build/404.html`. Configure the host to serve it for unknown paths with HTTP status 404, not redirect to it or return a 200 response. This fallback needs JavaScript to render the branded route error. Server hooks do not run on a static host.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
