import { type IdCardScanResult, scoreMrz } from '@osgb/shared-types';
import { PERFECT_SCORE } from './mrz-pipeline';

export type IdScanMode = 'hybrid' | 'client' | 'server';

export interface HybridScanOptions {
  mode: IdScanMode;
  clientSupported: boolean;
  /** When false (e.g. early auto-scan frames) a weak client result is returned without asking the API. */
  allowServer?: boolean;
  client: (file: File) => Promise<IdCardScanResult>;
  server: (file: File) => Promise<IdCardScanResult>;
}

/**
 * Hybrid strategy: scan in the browser first; fall back to the API when the browser cannot run
 * the scanner, its runtime fails to load, or its result is not fully valid. The better-scoring
 * result wins and is tagged with the engine that produced it.
 */
export async function scanIdCardHybrid(
  file: File,
  options: HybridScanOptions,
): Promise<IdCardScanResult> {
  const { mode, clientSupported, allowServer = true } = options;
  const useClient = mode !== 'server' && clientSupported;
  const useServer = mode !== 'client';

  if (!useClient) {
    if (!useServer) throw new Error('Bu tarayıcı kimlik taramayı desteklemiyor');
    return tag(await options.server(file), 'server');
  }

  let clientResult: IdCardScanResult | null = null;
  try {
    clientResult = tag(await options.client(file), 'client');
  } catch (error) {
    if (!useServer) throw error;
  }
  if (clientResult && (scoreMrz(clientResult) >= PERFECT_SCORE || !useServer || !allowServer)) {
    return clientResult;
  }

  const serverResult = tag(await options.server(file), 'server');
  if (!clientResult) return serverResult;
  return scoreMrz(serverResult) > scoreMrz(clientResult) ? serverResult : clientResult;
}

function tag(result: IdCardScanResult, engine: IdCardScanResult['engine']): IdCardScanResult {
  return { ...result, engine: result.engine ?? engine };
}
