import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosInstance, isAxiosError } from 'axios';
import { PinoLogger } from 'nestjs-pino';
import type { AppConfig } from '@/config/configuration';
import type {
  OrthancFindQuery,
  OrthancInstance,
  OrthancStudy,
  OrthancSystemInfo,
} from './orthanc.types';

/**
 * Integration with the Orthanc PACS via its REST API.
 *
 * Orthanc is a separate service; the main database only stores references
 * (orthancStudyId, studyInstanceUid). Credentials stay server-side.
 * The browser reaches DICOMweb only through Nginx (see infrastructure/nginx).
 */
@Injectable()
export class OrthancService {
  private readonly http: AxiosInstance;
  private readonly viewerPath: string;
  private readonly apiPrefix: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrthancService.name);
    const orthanc = config.get('orthanc', { infer: true });
    this.viewerPath = config.get('viewer', { infer: true }).ohifPath;
    this.apiPrefix = config.get('app', { infer: true }).apiPrefix;
    this.http = axios.create({
      baseURL: orthanc.url,
      timeout: orthanc.timeoutMs,
      auth: { username: orthanc.username, password: orthanc.password },
      headers: { Accept: 'application/json' },
    });
  }

  async getSystemStatus(): Promise<OrthancSystemInfo> {
    return this.request<OrthancSystemInfo>('GET', '/system');
  }

  async getStudy(orthancStudyId: string): Promise<OrthancStudy> {
    return this.request<OrthancStudy>('GET', `/studies/${encodeURIComponent(orthancStudyId)}`);
  }

  async findStudyByStudyInstanceUid(studyInstanceUid: string): Promise<OrthancStudy | null> {
    const query: OrthancFindQuery = {
      Level: 'Study',
      Query: { StudyInstanceUID: studyInstanceUid },
      Expand: true,
      Limit: 1,
    };
    const results = await this.request<OrthancStudy[]>('POST', '/tools/find', query);
    return results[0] ?? null;
  }

  /**
   * Study-level find with the computed tags the UI shows (modalities, series/instance counts),
   * newest study first. Orthanc refuses wildcards on StudyInstanceUID, so "all studies" is
   * expressed as an empty StudyDate constraint.
   */
  async findStudies(query: Record<string, string>, limit = 25): Promise<OrthancStudy[]> {
    const body: OrthancFindQuery = {
      Level: 'Study',
      Query: Object.keys(query).length > 0 ? query : { StudyDate: '' },
      Expand: true,
      Limit: limit,
      OrderBy: [{ Type: 'DicomTag', Key: 'StudyDate', Direction: 'DESC' }],
      RequestedTags: [
        'ModalitiesInStudy',
        'NumberOfStudyRelatedSeries',
        'NumberOfStudyRelatedInstances',
      ],
    };
    return this.request<OrthancStudy[]>('POST', '/tools/find', body);
  }

  async getStudyInstances(orthancStudyId: string): Promise<OrthancInstance[]> {
    return this.request<OrthancInstance[]>(
      'GET',
      `/studies/${encodeURIComponent(orthancStudyId)}/instances`,
    );
  }

  /**
   * Returns the platform URL that serves a preview image for the study.
   * The API proxies the image so Orthanc credentials are never exposed.
   */
  getStudyPreviewUrl(radiologyRequestId: string): string {
    return `/${this.apiPrefix}/radiology/${radiologyRequestId}/preview`;
  }

  /** Builds the OHIF viewer URL for a DICOM study (served via Nginx). */
  getViewerUrl(studyInstanceUid: string): string {
    return `${this.viewerPath}/viewer?StudyInstanceUIDs=${encodeURIComponent(studyInstanceUid)}`;
  }

  /** PNG preview of the first instance of the study (rendered by Orthanc). */
  async getStudyPreviewImage(orthancStudyId: string): Promise<Buffer> {
    const instances = await this.getStudyInstances(orthancStudyId);
    const first = instances[0];
    if (!first) {
      throw new ServiceUnavailableException({
        message: 'Study has no instances',
        errorCode: 'STUDY_EMPTY',
      });
    }
    const response = await this.http.get<ArrayBuffer>(
      `/instances/${encodeURIComponent(first.ID)}/preview`,
      { responseType: 'arraybuffer', headers: { Accept: 'image/png' } },
    );
    return Buffer.from(response.data);
  }

  private async request<T>(method: 'GET' | 'POST', url: string, data?: unknown): Promise<T> {
    const startedAt = Date.now();
    try {
      const response = await this.http.request<T>({ method, url, data });
      this.logger.debug(
        { method, url, status: response.status, durationMs: Date.now() - startedAt },
        'Orthanc request',
      );
      return response.data;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      this.logger.error(
        { method, url, status, durationMs: Date.now() - startedAt, err: error },
        'Orthanc request failed',
      );
      throw new ServiceUnavailableException({
        message: 'PACS (Orthanc) is unavailable or returned an error',
        errorCode: 'ORTHANC_UNAVAILABLE',
        details: status ? { status } : undefined,
      });
    }
  }
}
