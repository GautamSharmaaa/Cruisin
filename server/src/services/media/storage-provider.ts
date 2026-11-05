import { mkdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export type MediaVisibility = "public" | "private";
export interface StorageMetadata {
  bytes: number;
  contentType: string;
  sha256: string;
}
export interface StorageProvider {
  readonly name: "local" | "r2";
  put(
    key: string,
    body: Buffer,
    metadata: StorageMetadata,
    visibility: MediaVisibility,
  ): Promise<void>;
  get(key: string, visibility: MediaVisibility): Promise<Buffer>;
  head(
    key: string,
    visibility: MediaVisibility,
  ): Promise<{ bytes: number; sha256?: string }>;
  delete(key: string, visibility: MediaVisibility): Promise<void>;
}
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;
  constructor(
    readonly root = join(homedir(), ".local/share/cruisin-v2/media"),
  ) {}
  private path(key: string, visibility: MediaVisibility): string {
    if (!/^[a-f0-9-]{36}\/[a-f0-9]{64}$/.test(key))
      throw new Error("Invalid media storage key");
    const p = resolve(this.root, visibility, key);
    if (!p.startsWith(resolve(this.root) + "/"))
      throw new Error("Invalid media path");
    return p;
  }
  async put(
    key: string,
    body: Buffer,
    _metadata: StorageMetadata,
    visibility: MediaVisibility,
  ): Promise<void> {
    const p = this.path(key, visibility);
    await mkdir(resolve(p, ".."), { recursive: true, mode: 0o700 });
    await writeFile(p, body, { mode: 0o600, flag: "wx" });
  }
  async get(key: string, visibility: MediaVisibility): Promise<Buffer> {
    return readFile(this.path(key, visibility));
  }
  async head(
    key: string,
    visibility: MediaVisibility,
  ): Promise<{ bytes: number }> {
    return { bytes: (await stat(this.path(key, visibility))).size };
  }
  async delete(key: string, visibility: MediaVisibility): Promise<void> {
    await unlink(this.path(key, visibility));
  }
}
export interface R2Configuration {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBucket: string;
  privateBucket: string;
  approved: boolean;
}
export class R2StorageProvider implements StorageProvider {
  readonly name = "r2" as const;
  private readonly client: S3Client;
  constructor(private readonly config: R2Configuration) {
    if (!config.approved)
      throw new Error("R2 external operations require explicit approval");
    if (config.publicBucket === config.privateBucket)
      throw new Error("Public/private R2 buckets must be distinct");
    const host = new URL(config.endpoint);
    if (
      host.protocol !== "https:" ||
      !host.hostname.endsWith(".r2.cloudflarestorage.com")
    )
      throw new Error("Invalid R2 endpoint");
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: "auto",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  private bucket(v: MediaVisibility): string {
    return v === "public"
      ? this.config.publicBucket
      : this.config.privateBucket;
  }
  async put(
    key: string,
    body: Buffer,
    m: StorageMetadata,
    v: MediaVisibility,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket(v),
        Key: key,
        Body: body,
        ContentType: m.contentType,
        Metadata: { sha256: m.sha256 },
      }),
    );
  }
  async get(key: string, v: MediaVisibility): Promise<Buffer> {
    const r = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket(v), Key: key }),
    );
    if (!r.Body) throw new Error("Media body missing");
    return Buffer.from(await r.Body.transformToByteArray());
  }
  async head(
    key: string,
    v: MediaVisibility,
  ): Promise<{ bytes: number; sha256?: string }> {
    const r = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket(v), Key: key }),
    );
    return { bytes: r.ContentLength ?? 0, sha256: r.Metadata?.sha256 };
  }
  async delete(key: string, v: MediaVisibility): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket(v), Key: key }),
    );
  }
  async signedUpload(
    key: string,
    m: StorageMetadata,
    v: MediaVisibility,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket(v),
        Key: key,
        ContentType: m.contentType,
        Metadata: { sha256: m.sha256 },
      }),
      { expiresIn: 60 },
    );
  }
  async signedDownload(key: string, v: MediaVisibility): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket(v), Key: key }),
      { expiresIn: 60 },
    );
  }
}
