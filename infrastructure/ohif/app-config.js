/**
 * OHIF Viewer runtime configuration.
 * Mounted at /usr/share/nginx/html/app-config.js in the `ohif` container.
 *
 * The viewer is served under /viewer by the edge Nginx and talks to Orthanc
 * DICOMweb through the same-origin path /dicom-web, which Nginx protects with
 * an auth_request to the API (see infrastructure/nginx/templates).
 */
window.config = {
  routerBasename: '/viewer',
  showStudyList: true,
  extensions: [],
  modes: [],
  customizationService: {},
  investigationalUseDialog: { option: 'never' },
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  maxNumRequests: { interaction: 100, thumbnail: 75, prefetch: 25 },
  defaultDataSourceName: 'dicomweb',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'OSGB PACS (Orthanc)',
        name: 'orthanc',
        wadoUriRoot: '/dicom-web',
        qidoRoot: '/dicom-web',
        wadoRoot: '/dicom-web',
        qidoSupportsIncludeField: false,
        supportsReject: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        omitQuotationForMultipartRequest: true,
        bulkDataURI: { enabled: true, relativeResolution: 'studies' },
        // Send cookies (osgb_dicomweb) with every DICOMweb request.
        requestOptions: { requestCredentials: 'include' },
      },
    },
  ],
};
