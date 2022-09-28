import { readFileSync } from "fs";

const template = readFileSync("./template.js", "utf-8");

const schema = "sdb.w:";

/**
 * @returns {import('vite').Plugin}
 */
export default function plugin() {
  return {
    name: "surrealdb.worker",
    async resolveId(id, importer) {
      if (id.startsWith(schema)) {
        const [_, name, idPart] = id.split(".");
        const realID = await this.resolve(idPart, importer);

        if (realID) {
          return schema + name + ":" + realID.id;
        }
      }
    },
    load(id) {
      if (id.startsWith(schema)) {
        const [_, name, path] = id.split(".");

        return template
          .replaceAll("%NAME%", name)
          .replaceAll("%PATH%", path);
      }
    },
  };
}
