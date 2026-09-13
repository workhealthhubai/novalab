import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { PinoLogger } from 'nestjs-pino';
import type { Readable } from 'node:stream';
import type { AppConfig } from '@/config/configuration';

export interface UploadOptions {
  /** Object key. Convention: `<tenantId>/<area>/<uuid>-<fileName>`. */
  key: string;
  body: Buffer | Readable;
  contentType: string;
  /** Required when `body` is a stream. */
  size?: number;
  bucket?: string;
  metadata?: Record<string, string>;
}

export interface PresignedUrlOptions {
  bucket?: string;
  /** Seconds. Default 15 minutes; keep short for medical documents. */
  expiresInSeconds?: number;
  method?: 'GET' | 'PUT';
  /** Forces a download file name for GET links. */
  downloadFileName?: string;
}

export interface StoredObjectInfo {
  bucket: string;
  key: string;
  etag: string;
  size?: number;
}

/**
 * Object storage abstraction over MinIO (S3 compatible).
 * Used for PDFs, certificates, scanned documents and attachments - never for DICOM.
 * MinIO credentials never leave the API; clients only receive short-lived presigned URLs.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: MinioClient;
  private readonly defaultBucket: string;
  private readonly region: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(StorageService.name);
    const minio = config.get('minio', { infer: true });
    this.defaultBucket = minio.bucket;
    this.region = minio.region;
    this.client = new MinioClient({
      endPoint: minio.endPoint,
      port: minio.port,
      useSSL: minio.useSSL,
      accessKey: minio.accessKey,
      secretKey: minio.secretKey,
      region: minio.region,
    });
  }

  async onModuleInit(): Promise<void> {
    // Best effort: do not block startup if MinIO is temporarily unavailable.
    try {
      await this.ensureBucket(this.defaultBucket);
    } catch (error) {
      this.logger.warn({ err: error }, 'Could not verify default bucket on startup');
    }
  }

  get bucket(): string {
    return this.defaultBucket;
  }

  async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.client.bucketExists(bucket);
    if (!exists) {
      await this.client.makeBucket(bucket, this.region);
      this.logger.info({ bucket }, 'Created bucket');
    }
  }

  async upload(options: UploadOptions): Promise<StoredObjectInfo> {
    const bucket = options.bucket ?? this.defaultBucket;
    const result = await this.client.putObject(bucket, options.key, options.body, options.size, {
      'Content-Type': options.contentType,
      ...options.metadata,
    });
    this.logger.info(
      {
        op: 'upload',
        bucket,
        size: options.size,
        contentType: options.contentType,
      },
      'Object stored',
    );
    return { bucket, key: options.key, etag: result.etag, size: options.size };
  }

  async download(key: string, bucket = this.defaultBucket): Promise<Readable> {
    this.logger.info({ op: 'download', bucket }, 'Object read');
    return this.client.getObject(bucket, key);
  }

  async downloadBuffer(key: string, bucket = this.defaultBucket): Promise<Buffer> {
    const stream = await this.download(key, bucket);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async delete(key: string, bucket = this.defaultBucket): Promise<void> {
    await this.client.removeObject(bucket, key);
    this.logger.info({ op: 'delete', bucket }, 'Object deleted');
  }

  async exists(key: string, bucket = this.defaultBucket): Promise<boolean> {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async getPresignedUrl(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    const bucket = options.bucket ?? this.defaultBucket;
    const expires = options.expiresInSeconds ?? 15 * 60;
    if (options.method === 'PUT') {
      return this.client.presignedPutObject(bucket, key, expires);
    }
    this.logger.info(
      { op: 'presign', bucket, method: options.method ?? 'GET', expires },
      'Presigned URL issued',
    );
    const responseHeaders = options.downloadFileName
      ? { 'response-content-disposition': `attachment; filename="${options.downloadFileName}"` }
      : undefined;
    return this.client.presignedGetObject(bucket, key, expires, responseHeaders);
  }

  /** Readiness probe: verifies the API can talk to MinIO with its credentials. */
  async healthCheck(): Promise<void> {
    await this.client.bucketExists(this.defaultBucket);
  }
}
