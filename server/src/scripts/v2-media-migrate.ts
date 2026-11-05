import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { permissions } from "@cruisin/contracts";
import { env } from "../config/env.js";
import { connectDb, disconnectDb } from "../config/db.js";
import { connectRedis, redis } from "../config/redis.js";
import {
  MediaMigrationService,
  migrationEntrySchema,
} from "../services/media/migration.service.js";
import { mediaProvider } from "../services/media/media.service.js";
import { randomUUID } from "node:crypto";
const main = async (): Promise<void> => {
  const uri = new URL(env.MONGODB_URI);
  if (
    !(
      env.APP_ENV === "development" &&
      ["localhost", "127.0.0.1"].includes(uri.hostname)
    ) &&
    !(
      env.APP_ENV === "staging" &&
      process.env.CRUISIN_R2_MIGRATION_APPROVED === "true"
    )
  )
    throw new Error(
      "Media tooling requires local isolation or separately approved V2 staging",
    );
  const root = join(homedir(), ".local/share/cruisin-v2/migration-fixtures");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const manifestPath = process.argv[2];
  if (!manifestPath)
    throw new Error(
      "Pass a synthetic manifest JSON path; no source network reads are performed",
    );
  const manifest = z
    .array(migrationEntrySchema)
    .max(1000)
    .parse(JSON.parse(await readFile(manifestPath, "utf8")));
  await connectDb();
  await connectRedis();
  const results = [];
  try {
    for (const entry of manifest)
      results.push(
        await MediaMigrationService.migrate(
          {
            actor: {
              id: "local-migration",
              kind: "admin",
              name: "Local migration",
              permissions: [...permissions],
            },
            correlationId: randomUUID(),
          },
          entry,
          root,
        ),
      );
    const report = {
      at: new Date().toISOString(),
      sourceAssets: manifest.length,
      verified: results.filter((r) => r.status === "VERIFIED").length,
      failed: results.filter((r) => r.status === "FAILED").length,
      provider: mediaProvider().name,
      productionCutover: false,
      results,
    };
    await writeFile(
      join(root, "migration-report.json"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        verified: report.verified,
        failed: report.failed,
        report: join(root, "migration-report.json"),
      }),
    );
  } finally {
    await disconnectDb();
    await redis.quit();
  }
};
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
});
