import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { env } from "../config/env.js";
import { connectDb, disconnectDb } from "../config/db.js";
import mongoose from "mongoose";
interface Reference {
  collection: string;
  document: string;
  path: string;
  source: string;
  visibility: "public" | "private";
}
const main = async (): Promise<void> => {
  const uri = new URL(env.MONGODB_URI);
  if (
    env.APP_ENV !== "development" ||
    !["localhost", "127.0.0.1"].includes(uri.hostname)
  )
    throw new Error("Media inventory refuses nonlocal databases");
  await connectDb();
  const refs: Reference[] = [];
  try {
    for (const collection of [
      "products",
      "categories",
      "collections",
      "banners",
      "cmssections",
      "cmspages",
      "cmsmedias",
      "cmsversions",
      "navigationitems",
      "megamenulinks",
      "sitesettings",
      "pagesettings",
      "megamenupromos",
      "megamenucollectioncards",
      "returnrequests",
    ]) {
      for await (const doc of mongoose.connection
        .db!.collection(collection)
        .find({})) {
        const walk = (value: unknown, path: string): void => {
          if (typeof value === "string") {
            try {
              if (new URL(value).hostname === "res.cloudinary.com")
                refs.push({
                  collection,
                  document: String(doc._id),
                  path,
                  source: value,
                  visibility:
                    collection === "returnrequests" || path.includes("evidence")
                      ? "private"
                      : "public",
                });
            } catch {}
            return;
          }
          if (Array.isArray(value)) {
            value.forEach((v, i) => walk(v, path ? `${path}.${i}` : String(i)));
            return;
          }
          if (value && typeof value === "object")
            for (const [key, v] of Object.entries(value))
              if (key !== "_id") walk(v, path ? `${path}.${key}` : key);
        };
        walk(doc, "");
      }
    }
    const root = join(homedir(), ".local/share/cruisin-v2/migration-fixtures");
    await mkdir(root, { recursive: true, mode: 0o700 });
    const path = join(root, "media-reference-inventory.json");
    await writeFile(
      path,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          database: uri.pathname.slice(1),
          references: refs,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        references: refs.length,
        private: refs.filter((r) => r.visibility === "private").length,
        report: path,
      }),
    );
  } finally {
    await disconnectDb();
  }
};
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Inventory failed");
  process.exitCode = 1;
});
