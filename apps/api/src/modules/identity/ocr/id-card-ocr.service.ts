import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, type OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import sharp from 'sharp';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import { type IdCardScanResult, mergeBarcode, scoreMrz, selectBestMrz } from '@osgb/shared-types';
import type { AppConfig } from '@/config/configuration';
import { BarcodeService } from './barcode.service';
import { locateCard } from './card-locator';

/** Abstraction so a hardware ID-card reader or a cloud OCR can replace tesseract later. */
export interface IdCardScanProvider {
  readonly name: string;
  scan(image: Buffer): Promise<IdCardScanResult>;
}

const MRZ_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
/** Every check digit passed and the key fields are present. */
const PERFECT_SCORE = 14;
/** Below this the primary model found nothing usable; try the fallback model. */
const FALLBACK_THRESHOLD = 8;

interface Variant {
  name: string;
  image: Buffer;
}

/**
 * Reads the MRZ of a Turkish ID card with tesseract.js (pure WASM, runs inside the API).
 *
 * - Primary model: the bundled OCR-B/MRZ model (`OCR_LANGUAGES=mrz`, apps/api/tessdata), which is
 *   far more accurate on card photos than the generic `eng` model, used only as a fallback.
 * - Photos are prepared with sharp (EXIF auto-rotation, grayscale, contrast, upscaling) and the
 *   lower band of the card (where the MRZ sits) is tried first; the best-scoring parse wins.
 * Workers are created lazily and reused.
 */
@Injectable()
export class IdCardOcrService implements IdCardScanProvider, OnModuleDestroy {
  readonly name = 'tesseract-mrz';
  private readonly workers = new Map<string, Promise<Worker>>();
  private readonly config: AppConfig['identity'];

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
    private readonly barcodes: BarcodeService,
  ) {
    this.logger.setContext(IdCardOcrService.name);
    this.config = config.get('identity', { infer: true });
  }

  async scan(image: Buffer): Promise<IdCardScanResult> {
    if (!this.config.ocrEnabled) {
      throw new ServiceUnavailableException({
        message: 'OCR is disabled',
        errorCode: 'OCR_DISABLED',
      });
    }
    const startedAt = Date.now();
    const barcodePromise = this.barcodes.read(image);
    const variants = await this.prepareVariants(image);

    let best = await this.recognize(this.config.ocrLanguages, variants);
    let model = this.config.ocrLanguages;
    if (
      scoreMrz(best.result) < FALLBACK_THRESHOLD &&
      this.config.ocrFallbackLanguages &&
      this.config.ocrFallbackLanguages !== this.config.ocrLanguages
    ) {
      const fallback = await this.recognize(this.config.ocrFallbackLanguages, variants);
      if (scoreMrz(fallback.result) > scoreMrz(best.result)) {
        best = fallback;
        model = this.config.ocrFallbackLanguages;
      }
    }

    const result = mergeBarcode(best.result, await barcodePromise);
    const { variant } = best;
    this.logger.info(
      {
        durationMs: Date.now() - startedAt,
        confidence: result.confidence,
        mrzValid: result.mrzValid,
        model,
        variant,
        score: scoreMrz(result),
      },
      'ID card scanned',
    );
    return result;
  }

  private async recognize(
    languages: string,
    variants: Variant[],
  ): Promise<{ result: IdCardScanResult; variant: string }> {
    const worker = await this.getWorker(languages);
    let best: { result: IdCardScanResult; variant: string } | null = null;
    for (const variant of variants) {
      const { data } = await worker.recognize(variant.image);
      const result = selectBestMrz(data.text);
      result.confidence = Math.round(data.confidence);
      if (!best || scoreMrz(result) > scoreMrz(best.result))
        best = { result, variant: variant.name };
      if (scoreMrz(result) >= PERFECT_SCORE) break;
    }
    return best!;
  }

  /**
   * OCR-friendly variants, most promising first. When the card can be located in the frame
   * (camera captures rarely fit the guide exactly) its crop is tried before the whole image.
   * Each source yields the lower MRZ band at two sizes (global normalisation, then local
   * contrast) followed by the full source.
   */
  private async prepareVariants(image: Buffer): Promise<Variant[]> {
    // Apply EXIF orientation first so that width/height describe the image as displayed.
    const oriented = await sharp(image).rotate().toBuffer();
    const { width = 0, height = 0 } = await sharp(oriented).metadata();
    if (width === 0 || height === 0) return [{ name: 'original', image: oriented }];

    const sources: Array<{ name: string; image: Buffer; width: number; height: number }> = [];
    const card = await locateCard(oriented).catch(() => null);
    if (card && (card.width < width * 0.9 || card.height < height * 0.9)) {
      sources.push({
        name: 'card',
        image: await sharp(oriented).extract(card).toBuffer(),
        width: card.width,
        height: card.height,
      });
    }
    sources.push({ name: 'frame', image: oriented, width, height });

    const variants: Variant[] = [];
    for (const source of sources) {
      const upscale = (target: number) => (source.width < target ? target : source.width);
      const top = Math.round(source.height * 0.55);
      const band = () =>
        sharp(source.image)
          .extract({ left: 0, top, width: source.width, height: source.height - top })
          .grayscale();
      variants.push({
        name: `${source.name}:band-normalize`,
        image: await band()
          .normalize()
          .resize({ width: upscale(2000) })
          .png()
          .toBuffer(),
      });
      variants.push({
        name: `${source.name}:band-clahe`,
        image: await band()
          .clahe({ width: 32, height: 32, maxSlope: 3 })
          .resize({ width: upscale(3000) })
          .png()
          .toBuffer(),
      });
      variants.push({
        name: `${source.name}:full-normalize`,
        image: await sharp(source.image)
          .grayscale()
          .normalize()
          .resize({ width: upscale(2000) })
          .png()
          .toBuffer(),
      });
    }
    return variants;
  }

  private getWorker(languages: string): Promise<Worker> {
    const existing = this.workers.get(languages);
    if (existing) return existing;
    const langs = languages.split('+');
    // Bundled models are read from OCR_LANG_PATH; anything else is fetched from the CDN into the cache.
    const bundled = langs.every((lang) =>
      existsSync(join(this.config.ocrLangPath, `${lang}.traineddata`)),
    );
    const options = bundled
      ? { langPath: this.config.ocrLangPath, cachePath: this.config.ocrLangPath, gzip: false }
      : { cachePath: this.config.ocrCachePath };
    const created = (async () => {
      const worker = await createWorker(langs, undefined, {
        ...options,
        logger: (message: { status?: string; progress?: number }) => {
          if (message.status && message.progress === 1)
            this.logger.debug({ status: message.status, languages }, 'ocr worker');
        },
      });
      await worker.setParameters({
        tessedit_char_whitelist: MRZ_WHITELIST,
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      this.logger.info(
        { languages, bundled, path: bundled ? this.config.ocrLangPath : this.config.ocrCachePath },
        'OCR worker ready',
      );
      return worker;
    })().catch((error: unknown) => {
      this.workers.delete(languages);
      this.logger.error({ err: error, languages }, 'OCR worker could not start');
      throw new ServiceUnavailableException({
        message: 'OCR engine unavailable',
        errorCode: 'OCR_UNAVAILABLE',
      });
    });
    this.workers.set(languages, created);
    return created;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.workers.values()].map(async (pending) =>
        (await pending).terminate().catch(() => undefined),
      ),
    );
  }
}
