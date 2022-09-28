import { defineConfig } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import node from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

import { sync } from "rimraf";
sync('./dist')
sync('./dist-test')

const nodePackages = {
  name: "ws",
  resolveId(id, importer) {
    if (id === "isomorphic-ws") {
      return "ws";
    }
    if(id === "nanoid") {
      return this.resolve('nanoid/index.borwser.js', importer).then(v=>v?v.id:null)
    }
  },
  load(id) {
    if (id === "ws") {
      return `
        export default WebSocket
      `;
    }
  },
}

export default defineConfig([
  // Build all
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
  // Build umd
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
      nodePackages,
      node(),
      esbuild({
        minify: false,
        sourceMap: true,
      }),
    ],
  },
  // Build test to get size
  {
    input: {
      testing: "./src/_test_/mod.ts",
    },
    output: {
      dir: "./dist-test",
      format: "esm",
    },
    plugins: [
      nodePackages,
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
  // Build types
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
