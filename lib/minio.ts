// lib/minio.ts
import "server-only";
import * as Minio from "minio";

const endPoint = process.env.MINIO_ENDPOINT!;
const port = Number(process.env.MINIO_PORT || 9000);
const useSSL = process.env.MINIO_USE_SSL === "true";
const accessKey = process.env.MINIO_ACCESS_KEY!;
const secretKey = process.env.MINIO_SECRET_KEY!;
const bucket = process.env.MINIO_BUCKET!;

export const minioClient = new Minio.Client({
  endPoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

export const MINIO_BUCKET = bucket;

function normalizeObjectName(objectName: string) {
  return objectName
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

export async function ensureBucketExists() {
  const exists = await minioClient.bucketExists(bucket);

  if (!exists) {
    await minioClient.makeBucket(bucket, "us-east-1");
  }
}

export async function ensureObjectPrefix(prefix: string) {
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

  try {
    await minioClient.statObject(bucket, normalizedPrefix);
  } catch {
    await minioClient.putObject(
      bucket,
      normalizedPrefix,
      Buffer.alloc(0),
      0,
      { "Content-Type": "application/x-directory" },
    );
  }
}

export function getObjectProxyUrl(objectName: string) {
  return `/api/files/${normalizeObjectName(objectName)}`;
}

export function getObjectPublicUrl(objectName: string) {
  const protocol = useSSL ? "https" : "http";
  return `${protocol}://${endPoint}:${port}/${bucket}/${normalizeObjectName(objectName)}`;
}

// 新增：删除 MinIO 对象
export async function removeObject(objectName: string) {
  await minioClient.removeObject(bucket, objectName);
}
