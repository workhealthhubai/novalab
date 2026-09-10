# Demo veri seti

`pnpm db:seed:reset` komutu Postgres tablolarını (il/ilçe/mahalle referans verisi hariç), MinIO
kovasını, Orthanc PACS'i ve Redis kuyruğunu **tamamen siler**, sonra aşağıdaki demo verisini
sıfırdan üretir. Tüm kayıtlar deterministik kimliklerle (`uid()`) yazılır; komut her çalıştığında
aynı kayıtlar, aynı bağlantılarla oluşur. `pnpm db:seed` ise yalnızca temel veriyi (izinler, tenant,
sistem rolleri, admin, lokasyonlar) idempotent olarak yazar; tenant'ta protokol varsa demo bölümünü
atlar.

```bash
pnpm db:seed:reset                 # her şeyi sil + demo veri
SEED_DEMO=false pnpm db:seed       # sadece temel veri
```

MinIO veya Orthanc'a ulaşılamazsa seed durmaz; belge/fotoğraf/imza ve DICOM adımları uyarı ile
atlanır (kayıtlar dosyasız kalır).

## Giriş bilgileri (şifre hepsinde `Admin123!`)

| E-posta                                | Rol                                     | Not                                            |
| -------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| admin@demo.local                       | Tenant Admin                            | tüm izinler                                    |
| hekim@demo.local                       | İşyeri Hekimi (Dr. Elif Demir)          | hekim profili + imza; raporları o onaylar      |
| radyoloji@demo.local                   | İşyeri Hekimi (Uzm. Dr. Murat Aksoy)    | radyoloji raporları, ILO B okuyucu             |
| hemsire@demo.local                     | Sağlık Personeli                        | tetkikleri o girer                             |
| isg@demo.local                         | İSG Uzmanı                              | eğitim randevuları, sertifika belgeleri        |
| kayit@demo.local                       | Kayıt Görevlisi (özel rol)              | sistem olmayan rol örneği                      |
| firma@demo.local                       | Firma Temsilcisi                        | tıbbi veri göremez                             |
| davetli@ / pasif@ / ayrilan@demo.local | Sağlık Personeli                        | INVITED / SUSPENDED / DISABLED durum örnekleri |
| admin@ege.local                        | Tenant Admin (ikinci tenant "Ege OSGB") | tenant izolasyonu testi                        |

## İçerik

- **Kurum Bilgileri**: tam profil (vergi, SGK, yetki belgesi, adres İstanbul/Kadıköy, rapor alt yazısı) ve logo (MinIO).
- **Doktor Tanımları**: 3 hekim (2'si kullanıcıya bağlı ve imzalı, 1'i pasif).
- **Meslek Tanımları**: 18 meslek (ISCO kodlu, 1 pasif).
- **Tetkik Tanımları / Paketleri**: 23 tetkik (radyoloji, odyometri, EKG, SFT, göz, ILO, 9 lab, rapor, İSG raporu, diğer; 1 pasif), 7 paket (1 pasif, 1'i toplam fiyatlı).
- **Firma Tanımları**: 5 firma (çok tehlikeli / tehlikeli / az tehlikeli), 4 şube, 7 işyeri (NACE, SGK), 1 soft-delete firma.
- **Hasta Kayıt**: 30 hasta; TC kimlik (algoritmaya uygun), 1 pasaportlu yabancı, 1 işyeri bağlantısız bireysel başvuru, il/ilçe/mahalle adres, meslek, departman, durum (ACTIVE / ON_LEAVE / TERMINATED), kimlik doğrulama (VERIFIED / MANUAL / UNVERIFIED / FAILED), 13 hastada fotoğraf, 1 soft-delete mükerrer kayıt.
- **KVKK İzinleri**: 4 rıza tipi, Aydınlatma Metni'nin eski (v1) ve güncel (v2) sürümü; 73 rıza (Güncel / Eski sürüm / Alınmadı / Geri çekildi durumlarının hepsi), yöntemler PAPER / SIGNATURE_PAD / ELECTRONIC / VERBAL.
- **Belge İmza**: 12 imza pediyle imzalanmış rıza PDF'i + 3 yüklenip damgalanmış form; her birinin imza PNG'si ve SHA-256'sı var (doğrulama çalışır).
- **Protokol Listesi**: 25 protokol (2024: 3, 2025: 7, 2026: 15), sayaçlar yıl bazında dolu; durumlar OPEN / IN_PROGRESS / COMPLETED / CANCELLED; her protokolde sıralı tetkik kalemleri (PENDING / DONE / CANCELLED).
- **Sağlık Raporları**: 24 muayene; 19'u onaylı ve gerçek Ek-2 PDF'i MinIO'da (`REPORT` belgesi), kararlar FIT / FIT_WITH_RESTRICTIONS / UNFIT, anamnez + sistem muayenesi + 253 ölçüm; 3 devam eden, 1 planlı, 1 iptal.
- **Muayene Karşılaştırma**: Mehmet Kaya (2024 → 2025 → 2026) ve Hasan Demir (2024 → 2025) için birden fazla muayene; ölçüm trendleri (kilo, tansiyon, FEV1, işitme).
- **Odyometri**: 12 test; bazal + kontrol çiftleri, Mehmet Kaya'da 3–6 kHz çentik ve STS (≥10 dB kayma), kemik yolu örnekleri.
- **EKG**: 10 kayıt; normal, bradikardi, LVH + ST depresyonu, RBBB, inkomplet RBBB, cihazdan gelmeyen QTc (Bazett); 3'ünde `ECG_TRACE` görüntüsü.
- **Spirometri**: 10 test; normal, obstrüktif (reversibl), ağır obstrüktif, kısıtlayıcı, bazale göre FEV1 düşüşü; ECSC beklenen değerler; 3'ünde `SPIROMETRY_TRACE` görüntüsü.
- **Göz**: 12 muayene; gözlük gereksinimi, renk görme kusuru, görme alanı bozukluğu, presbiyopi.
- **Radyoloji**: 11 istek (REQUESTED / SCHEDULED / IN_PROGRESS / COMPLETED / REPORTED / CANCELLED); 7'si Orthanc'a yüklenmiş sentetik PA akciğer DICOM çalışmasına bağlı (OHIF'te açılır), 4'ü raporlu.
- **Pnömokonyoz**: 6 ILO okuması; aynı film için A ve B okuyucu (1/0 vs 0/1), amfizem/bül sembolleri, negatif bazal filmler.
- **Belgeler**: toplam 50 belge (rapor, imzalı form, EKG/SFT çıktısı, taranmış kimlik/pasaport, sertifika, sözleşme, konsültasyon ve lab sonuç ekleri); hepsi MinIO'da gerçek dosya.
- **Randevular**: 13 randevu (muayene / radyoloji / eğitim / konsültasyon / diğer; SCHEDULED / CONFIRMED / COMPLETED / CANCELLED / NO_SHOW), hasta, firma, muayene ve radyoloji isteğine bağlı.
- **Aktif Kullanıcılar**: 4 açık oturum (farklı cihaz/IP), 1 iptal edilmiş, 1 süresi dolmuş.
- **Personel Hareketleri**: 264 denetim kaydı (giriş/çıkış, başarısız giriş, token yeniden kullanımı, iş kayıtları CREATE/UPDATE/DELETE, tıbbi veri erişimi, dışa aktarma, HTTP hata kayıtları).

## Eksik / kullanılmayan alanlar (seed ile doldurulamadı)

Aşağıdaki ekranlar ya yer tutucu (`ModulePlaceholder`) ya da arkasında veri modeli yok. Demo veri
bunları **besleyemez**; ilgili altyapı geldiğinde seed'e eklenmeli.

| Alan                                         | Durum                    | Not                                                                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                                    | Yer tutucu               | Özet göstergeler için sorgu/endpoint yok. Seed'deki protokol/randevu/rapor sayıları hazır.                                                                                                                                          |
| Lab. Tahlilleri                              | Yer tutucu               | `TestDefinition` LAB kalemleri ve protokol `LAB` item'ları var, ancak sonuç girişi için model yok. Lab sonuçları şimdilik `ExaminationMeasurement` (GLUCOSE, HEMOGLOBIN, TOTAL_CHOLESTEROL) ve PDF ek belge olarak seed'lendi.      |
| İSG Raporları                                | Yer tutucu               | `ISG_REPORT` tetkik kategorisi ve `ProtocolItemType.ISG_REPORT` tanımlı; hiçbir protokolde kullanılmadı çünkü rapor içeriği için model yok. Risk değerlendirme raporu `OTHER` kategorili belge olarak eklendi.                      |
| Rapor Şablonları                             | Yer tutucu               | Şablon modeli yok; Ek-2 PDF'i koddaki sabit düzenle üretiliyor. `OrganizationProfile.reportFooter` dolduruldu ama PDF'e basılmıyor.                                                                                                 |
| E-İmza                                       | Yer tutucu               | Nitelikli e-imza entegrasyonu yok; imza pedi (Belge İmza) ile karıştırılmamalı.                                                                                                                                                     |
| Doktor Hakedişleri                           | Yer tutucu               | Hakediş/ücret modeli yok. Tetkik `unitPrice`/`vatRate` ve paket fiyatları seed'de dolu; hesaplama için hekim–protokol eşlemesi (`Examination.physicianProfileId`) kullanılabilir.                                                   |
| Muhasebe                                     | Yer tutucu               | Fatura/tahsilat modeli yok.                                                                                                                                                                                                         |
| DICOM Kayıtları                              | Yer tutucu               | Orthanc'ta 7 çalışma var, ancak bağımsız DICOM listesi ekranı yok; yalnızca Radyoloji istekleri üzerinden erişiliyor.                                                                                                               |
| Alt OSGB                                     | Yer tutucu               | Tenant hiyerarşisi yok. İkinci tenant (`ege`) yalnızca izolasyonu göstermek için eklendi; tenant değiştirme arayüzü yok.                                                                                                            |
| Randevular                                   | UI yok                   | `Appointment` modeli ve API modülü var, 13 randevu seed'lendi; ancak web'de randevu takvimi/listesi sayfası yok.                                                                                                                    |
| Eğitimler / Sertifikalar                     | API stub                 | `trainings` ve `certificates` modülleri `NotImplemented` dönüyor; Prisma modeli yok. İzinler (`trainings.*`, `certificates.*`) rollerde tanımlı ama hiçbir ekran kullanmıyor. Sertifikalar şimdilik `CERTIFICATE` kategorili belge. |
| Bildirimler                                  | Kuyruk var, tüketici yok | `NotificationsService` işi kuyruğa atıyor; SMS/e-posta sağlayıcı yok. `COMMUNICATION` rızaları seed'lendi ama hiçbir yerde kullanılmıyor.                                                                                           |
| Toplu içe aktarma                            | Veri yok                 | Employee/Company import senkron çalışıyor, kalıcı import kaydı yok; denetim kaydında örnek bir `EmployeeImport` satırı var.                                                                                                         |
| Kimlik doğrulama (NVİ)                       | Dış servis               | `identityVerificationStatus` değerleri seed'lendi; gerçek NVİ sorgusu yapılmadı.                                                                                                                                                    |
| `Tenant.settings`                            | Şema JSON                | Dolduruldu (`locale`, `timezone`, `protocol`, `reports`) fakat uygulama okumuyor.                                                                                                                                                   |
| `Appointment.location` / `Document.checksum` | Kısmen                   | Dolu; UI'da gösterilmiyor.                                                                                                                                                                                                          |
| Mahalle verisi                               | Opsiyonel                | Mahalleler yalnızca `LOCATIONS_FETCH_NEIGHBORHOODS=true` ile yüklenir; yoksa hasta adresleri ilçe düzeyinde kalır.                                                                                                                  |
