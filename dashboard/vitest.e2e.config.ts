import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^@\/(.*)/, replacement: path.resolve(__dirname, "./$1") },
			{
				find: /^(assets|components|constants|contexts|hooks|lib|locales|pages|service|types|utils)\/(.*)/,
				replacement: path.resolve(__dirname, "./src/$1/$2"),
			},
			{
				find: /^(assets|components|constants|contexts|hooks|lib|locales|pages|service|types|utils)$/,
				replacement: path.resolve(__dirname, "./src/$1"),
			},
		],
	},
	test: {
		environment: "happy-dom",
		include: ["tests/e2e/**/*.spec.{ts,tsx}"],
		setupFiles: [path.resolve(__dirname, "./tests/e2e/harness/setup.ts")],
		globals: true,
		testTimeout: 15000,
	},
});
