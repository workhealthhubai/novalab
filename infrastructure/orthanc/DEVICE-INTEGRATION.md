# OSGB device and PACS integration

## Clinical workflow

The occupational physician chooses examinations from the employee's job, workplace hazards,
risk assessment and clinical findings. A fixed bundle for every employee is not a safe default.
The platform flow is therefore:

1. Open one patient protocol for the visit.
2. Add the physician-selected test orders to that protocol.
3. Verify patient identity before acquisition.
4. Send each order to the device using the strongest interface the device supports.
5. Match returned data to the original order, never by name alone.
6. Keep raw output, structured measurements, device/operator identity and timestamps together.
7. Let the physician review the results and sign the final occupational-health report.

The Ministry of Labour states that the physician determines the required tests using the risk
assessment, work characteristics and employee characteristics. It also assigns the final
fitness report to the workplace physician. See the
[İSGGM health-surveillance FAQ](https://www.csgb.gov.tr/tr/sikca-sorulan-sorular/is-sagligi-ve-guvenligi-genel-mudurlugu/).

## Radiology: DICOM MWL to PACS

The implemented flow is:

```text
Novalab order
  -> server-generated AccessionNumber
  -> Orthanc Modality Worklist
  -> modality C-FIND (filtered by its Calling AE Title)
  -> operator selects the patient/order on the modality
  -> modality C-STORE to Orthanc
  -> stable study
  -> Novalab reconciliation by AccessionNumber + PatientID
  -> physician reviews in OHIF and writes the report
```

This follows the DICOM Modality Worklist model. Orthanc's Worklists plugin stores worklists in its
PostgreSQL database and removes them after the related study becomes stable. Novalab never uses a
patient name as proof of ownership. New orders require both the internal patient ID and the exact
accession number; old rows without an accession number retain a constrained legacy fallback.

References:

- [Orthanc Worklists plugin](https://orthanc.uclouvain.be/book/plugins/worklists-plugin-new.html)
- [Orthanc DICOM communication](https://orthanc.uclouvain.be/book/dicom-guide.html)
- [DICOM Modality Scheduled Procedure Step](https://dicom.nema.org/medical/dicom/2026a/output/chtml/part18/chapter_14.html)

### Modality configuration

1. In **General Settings -> Organization**, set the exact Calling AE Title used by the radiology
   device, for example `XRAY01`.
2. Set `ORTHANC_AET` (the Called AE Title), normally `OSGB`.
3. Register every device with an exact AE Title and static IP in
   `ORTHANC_DICOM_MODALITIES_JSON`. Do not enable Move or Get for acquisition devices.
4. Keep `ORTHANC_DICOM_BIND=127.0.0.1` for local development. At a site, bind the DICOM port to a
   dedicated LAN/VPN IP and firewall it so only registered device IPs can connect.
5. Configure the modality's PACS destination and MWL server with the Orthanc host, port and Called
   AE Title. Test the association with C-ECHO, then verify that the modality only sees its own MWL.

For a repeatable pre-device acceptance test, install DCMTK and run:

```bash
DICOM_PATIENT_ID=<employee-uuid> \
DICOM_ACCESSION_NUMBER=<order-accession> \
PACS_AET=OSGB MODALITY_AET=XRAY01 \
pnpm dicom:test
```

The script performs C-ECHO, MWL C-FIND and C-STORE. Set `NOVALAB_API_BASE_URL`,
`NOVALAB_ACCESS_TOKEN` and `RADIOLOGY_REQUEST_ID` as well to verify automatic application-side
reconciliation. The service also has unit tests that reject the same accession with a different
PatientID.

Example:

```dotenv
ORTHANC_AET=OSGB
ORTHANC_DICOM_BIND=192.0.2.20
ORTHANC_DICOM_PORT=4242
ORTHANC_DICOM_MODALITIES_JSON={"xray01":{"AET":"XRAY01","Host":"192.0.2.10","Port":104,"AllowEcho":true,"AllowFind":true,"AllowMove":false,"AllowGet":false,"AllowStore":true}}
```

Unknown AE Titles and source IPs are rejected. Orthanc's HTTP API remains internal; browser image
access continues through the study-scoped, short-lived DICOMweb authorization path. See
[Orthanc security guidance](https://orthanc.uclouvain.be/book/faq/security.html).

## ECG, spirometry and audiometry

There is no universal connector that is correct for every device. Before building an adapter,
record the manufacturer, model, firmware/software version, serial number and supported export
interfaces. Select the first verified option in this order:

| Device capability            | Acquisition path                            | Required controls                                                                                   |
| ---------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Native DICOM waveform/report | DICOM receiver/PACS adapter                 | SOP Class allowlist, order/accession match, raw waveform retention                                  |
| HL7 v2 ORU/result feed       | Dedicated interface adapter                 | MSH sender allowlist, PID/order match, idempotent message ID, ACK/retry, OBX units                  |
| Vendor XML/CSV export        | Model-specific parser in an isolated worker | Versioned schema, units/ranges, file signature, duplicate hash, rejected-row queue                  |
| PDF/image only               | Existing medical trace upload               | MIME signature, malware scan/quarantine, operator confirmation; never infer numeric values silently |
| Vendor API                   | Server-side connector                       | mTLS/VPN, scoped credentials, polling cursor/webhook signature, idempotency                         |

The Ministry of Health's imaging-device inventory lists examples such as ECG raw signals in
SCP-ECG/DICOM and spirometry output in PDF, HL7 or XML; support still has to be confirmed from the
exact device's conformance statement or integration manual:
[device data formats](https://teleradyoloji.saglik.gov.tr/docs/Radyoloji%2C%20N%C3%BCkleer%20T%C4%B1p%20ve%20Di%C4%9Fer%20G%C3%B6r%C3%BCnt%C3%BCleme%20Cihazlar%C4%B1%20Listesi.pdf).

Current Novalab ECG and spirometry screens accept structured, physician-reviewed measurements and
medical printouts. They are not yet advertised as automatic device connectors. The next adapter
must be selected only after obtaining the real device model and its DICOM conformance statement,
HL7 profile, XML schema or vendor API manual.

For every automatic adapter, persist at least: tenant, patient, protocol/order, device, operator,
acquisition time, source message/file hash, parser version, original units, calibration status and
review status. Imported device interpretation must remain distinguishable from physician review.
