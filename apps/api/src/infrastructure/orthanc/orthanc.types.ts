/** Subset of Orthanc REST API responses used by the platform. */

export interface OrthancSystemInfo {
  Name: string;
  Version: string;
  ApiVersion: number;
  DicomAet: string;
  DicomPort: number;
  HttpPort: number;
  PluginsEnabled: boolean;
  DatabaseBackendPlugin?: string | null;
  StorageAreaPlugin?: string | null;
}

export interface OrthancStudy {
  ID: string;
  ParentPatient: string;
  Series: string[];
  IsStable: boolean;
  LastUpdate: string;
  Type: 'Study';
  MainDicomTags: Record<string, string> & {
    StudyInstanceUID?: string;
    StudyDate?: string;
    StudyDescription?: string;
    AccessionNumber?: string;
  };
  PatientMainDicomTags: Record<string, string> & {
    PatientID?: string;
    PatientName?: string;
  };
}

export interface OrthancInstance {
  ID: string;
  ParentSeries: string;
  FileSize: number;
  IndexInSeries?: number;
  MainDicomTags: Record<string, string> & {
    SOPInstanceUID?: string;
    InstanceNumber?: string;
  };
}

export interface OrthancFindQuery {
  Level: 'Patient' | 'Study' | 'Series' | 'Instance';
  Query: Record<string, string>;
  Expand?: boolean;
  Limit?: number;
}
