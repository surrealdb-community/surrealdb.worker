import { defineConfig } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import node from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

export default defineConfig([
  {
    input: {
      "client": "./src/client.ts",
      "worker.setup": "./src/worker.setup.ts",
      "framework/vue": "./src/framework/vue.ts",
      "framework/react": "./src/framework/react.ts",
      worker: "./src/worker.ts",
    },
    output: {
      dir: "./dist",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      {
        name: "ws",
        resolveId(id) {
          if (id === "isomorphic-ws") {
            return "ws";
          }
        },
        load(id) {
          if (id === "ws") {
            return `
              export default WebSocket
            `;
          }
        },
      },
      node(),
      esbuild({
        sourceMap: true,
      }),
    ],
    external: [
      "vue",
      "@preact/signals-core",
      "nanoid",
      "surrealdb.js",
    ],
  },
  {
    input: {
      worker: "./src/worker.ts",
    },
    output: {
      dir: "./dist/umd",
      format: "umd",
      name: "SurrealWorker",
      globals: "setupWorker",
    },
    plugins: [
      {
        name: "ws",
        resolveId(id) {
          if (id === "isomorphic-ws") {
            return "ws";
          }
        },
        load(id) {
          if (id === "ws") {
            return `
              export default WebSocket
            `;
          }
        },
      },
      node(),
      esbuild({
        minify: false,
        sourceMap: true,
      }),
    ],
  },
  {
    input: {
      testing: "./src/_test_/mod.ts",
    },
    output: {
      dir: "./dist-test",
      format: "esm",
    },
    plugins: [
      {
        name: "ws",
        resolveId(id) {
          if (id === "isomorphic-ws") {
            return "ws";
          }
        },
        load(id) {
          if (id === "ws") {
            return `
              export default WebSocket
            `;
          }
        },
      },
      node(),
      esbuild({
        minify: true,
      }),
    ],
    external: [
      "surrealdb.js",
      "vue",
    ],
  },
  {
    input: {
      worker: "./dts-tmp/worker.d.ts",
      "worker.setup": "./dts-tmp/worker.setup.d.ts",
      client: "./dts-tmp/client.d.ts",
      "framework/vue": "./dts-tmp/framework/vue.d.ts",
      "framework/react": "./dts-tmp/framework/react.d.ts",
    },
    output: {
      dir: "./dist",
    },
    plugins: [
      dts(),
    ],
  },
]);
