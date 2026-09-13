# Novalab — eksikler, riskler ve yapılacak işler

İnceleme tarihi: **12 Eylül 2026** · İncelenen commit: **bcea2fc**

Bu doküman, paylaşılan değerlendirmeyi mevcut kaynak koduyla karşılaştırır; doğrulanan sorunları, kısmen yapılmış işleri ve tam bir OSGB ürünü için önerilen kapsamı birleştirir. **100 iş paketi** içerir. Bunlar tamamlanmış işler veya 100 ayrı güvenlik açığı değildir.

Öncelik dağılımı: **25 P0 · 56 P1 · 19 P2**. Kapsam dağılımı: 20 güvenlik, 16 klinik, 16 OSGB operasyonu, 12 ticari, 10 web/ürün, 16 teknik işletim ve 10 veri/hesap yönetimi işi.

İnceleme; kaynak kodu, Prisma şeması/migration dosyaları, web rotaları, kuyruk işleri, Docker/Nginx yapılandırmaları, CI ve mevcut testlerle sınırlıdır. Canlı ortam, kurum içi prosedürler, gerçek cihazlar ve sağlayıcı hesapları incelenmedi. “Depoda yok” ifadesi, kurumda veya harici hizmetlerde kesinlikle bulunmadığı anlamına gelmez. Koddan çıkarılan riskler için üretimde istismar veya hasta verisi sızıntısı yaşandığı iddia edilmiyor.

**Ürün kararı:** Mevcut kayıt ve tetkik altyapısının üzerine devam edilebilir. Gerçek sağlık verisiyle pilot öncesinde P0 maddeleri kapatılmalı; tam OSGB hizmet yönetimi için operasyon kapsamı da tamamlanmalıdır. Portal, SSO ve bütün muhasebe özellikleri ilk pilotun zorunlu önkoşulu değildir.

## 1. Önceki raporda düzeltilmesi gereken ifadeler

| Konu                  | Kodda görülen durum                                                                       | Gerçek kalan iş                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parola sıfırlama      | Yönetici parola değiştirebiliyor ve refresh oturumlarını iptal ediyor.                    | Kullanıcının kendi kurtarma akışı, davet, ilk girişte parola değişimi; mevcut access tokenların iptali.                                                                                            |
| Oturum güvenliği      | Argon2, refresh rotation/reuse detection, aktif oturum listesi ve yönetici iptali mevcut. | MFA, eşzamanlı refresh güvenliği, anlık iptal, cihaz/anomali politikası.                                                                                                                           |
| Sağlık verisi yetkisi | Modül izinleri `PermissionsGuard` ile ayrıca denetleniyor.                                | `MedicalDataGuard` hasta/işyeri/işlem amacı kapsamını daraltmıyor; bazı genel endpointler tıbbi özet de döndürüyor. “Tek tıbbi izni olan herkes tüm endpointlere giriyor” genellemesi doğru değil. |
| PDF rapor             | Sağlık raporu ve imza modülü gerçek PDF üretiyor.                                         | Ayrı çalışan raporu kuyruk işi hâlâ TXT placeholder üretiyor; rapor onayı, sürüm ve imza güvencesi eksik.                                                                                          |
| İmza                  | İmza pedi, PDF SHA-256 kontrolü ve imza kaydı mevcut.                                     | Sertifika temelli güvenli elektronik imza, imzalayan hekimle hesap bağının zorunlu doğrulanması ve uygun imza politikası.                                                                          |
| KVKK                  | Rıza verme/geri çekme ve rıza metni sürümleri var.                                        | İşleme sebebi ve amaç bazlı kontrol, saklama/imha, ilgili kişi talepleri, aktarım ve tedarikçi yönetimi.                                                                                           |
| OCR                   | Kimlik kartı OCR, barkod/MRZ ve NVİ sağlayıcı adaptörü var.                               | Genel belge işlemcisi placeholder; OCR kaynak sınırları ve gerçek sağlayıcı erişimi doğrulanmalı.                                                                                                  |
| Şube                  | Firma şubesi ve işyeri modelleri/API'leri var.                                            | OSGB'nin kendi şubeleri, personel/kapasite dağılımı, şube kapsamlı yetki ve il bazlı hizmet operasyonu.                                                                                            |
| Paket/fiyat           | Tetkik ve paket fiyatı/KDV alanları, fiyat hesaplaması var.                               | Sözleşmeye bağlı fiyat sürümü, işlem anındaki fiyatı sabitleme, kullanım hakkı ve faturalama.                                                                                                      |
| İçe aktarma           | Önizleme, satır doğrulama, mükerrer kayıt kontrolleri ve satır hata sonucu var.           | Kalıcı import işi, önizleme-onay bütünlüğü, eşzamanlılık, idempotency ve güvenli geri alma.                                                                                                        |
| Rapor numarası        | Protokol numarası atomik yıllık sayaçla üretiliyor. Sağlık PDF'sinde de numara var.       | Sağlık raporu numarası için kalıcı benzersiz kayıt, sürüm ve iptal/zeyil zinciri.                                                                                                                  |
| Radyoloji             | İstek, görüntü önizleme, OHIF, PACS aday arama ve manuel eşleme mevcut.                   | PACS izolasyonu, doğrulanmış hasta/study sahipliği, cihaz/worklist entegrasyonu.                                                                                                                   |
| Gözlemlenebilirlik    | Pino JSON logları, request ID, health kontrolleri ve kuyruk olay logları var.             | Merkezi toplama, metrik, tracing, alarm, olay takibi ve kişisel veri içermeyen loglar.                                                                                                             |
| Ekranlar              | Birçok kayıt ve klinik ekran çalışacak şekilde uygulanmış.                                | Dokuz rota placeholder; randevu, eğitim ve sertifika için tamamlanmış web akışı bulunmuyor.                                                                                                        |

RLS, WORM ve SSO belirli tasarım seçenekleridir; bunların hepsini adıyla zorunlu kılan genel bir mevzuat şartı varsayılmamalıdır. Zorunlu hedef; uygun hukuki dayanak, etkili erişim kontrolü, bütünlük, izlenebilirlik ve riskle orantılı veri güvenliğidir. [KVKK veri güvenliği yükümlülükleri](https://www.kvkk.gov.tr/Icerik/2040/Veri-Guvenligine-Iliskin-Yukumlulukler).

## 2. Önceki rapora eklenen önemli kod bulguları

### F01 — Genel güncelleme yoluyla onay yetkisi atlanabiliyor · P0

`UpdateExaminationDto.status`, `APPROVED` dahil tüm durumları kabul ediyor. `PATCH /examinations/:id` yalnız `examinations.update` istiyor; servis DTO'yu doğrudan kaydediyor. Henüz onaylanmamış bir kayıt, ayrı onay endpointinin hekim/karar kontrolleri, onaylayan kişi bilgisi ve PDF üretimi olmadan onaylı işaretlenebilir.

Kaynak: [DTO](/Users/ertugan/Desktop/novalab/apps/api/src/modules/examinations/dto/update-examination.dto.ts:8), [controller](/Users/ertugan/Desktop/novalab/apps/api/src/modules/examinations/examinations.controller.ts:67), [güncelleme](/Users/ertugan/Desktop/novalab/apps/api/src/modules/examinations/examinations.service.ts:73). İş: **S01**.

### F02 — DICOMweb oturumu tek study veya tenant kapsamına bağlı değil · P0

Viewer tokenı kullanıcı ve tenant kimliği taşıyor; izinli study listesi veya oturum kimliği taşımıyor. Doğrulama endpointi yalnız tokenı doğruluyor. Nginx, gelen DICOMweb yolunu ortak Orthanc hesabına geçiriyor; talep edilen study'nin tenant'a aitliğini kontrol etmiyor. Paylaşılan PACS üzerinde bir viewer oturumu edinmiş kullanıcının başka görüntülere erişmesini engelleyen kaynak bazlı kontrol görünmüyor. HTTP metoduna göre okuma/yazma ayrımı da proxy'de tanımlı değil.

Kaynak: [token üretimi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/auth/auth.service.ts:192), [doğrulama](/Users/ertugan/Desktop/novalab/apps/api/src/modules/auth/auth.controller.ts:75), [proxy](/Users/ertugan/Desktop/novalab/infrastructure/nginx/templates/default.conf.template:58). İş: **S03, S05**.

### F03 — PACS eşlenmemiş görüntü listesi bütün arşivi sorguluyor · P0

`unlinkedStudies()` Orthanc'a boş filtreyle soruyor; sadece mevcut tenant'ın bağladığı UID'leri çıkarıyor. Bu, başka tenant'ın görüntüsünü tenant'ın “eşlenmemiş” listesine getirebilir. `linkStudy()` de study'nin hastasına veya tenant'ına aitliğini doğrulamıyor. PACS hasta adı benzerliği de tek başına sahiplik kanıtı değildir.

Kaynak: [eşleme](/Users/ertugan/Desktop/novalab/apps/api/src/modules/radiology/radiology.service.ts:85), [ortak arşiv sorgusu](/Users/ertugan/Desktop/novalab/apps/api/src/modules/radiology/radiology.service.ts:195). İş: **S04**.

### F04 — Genel protokol endpointi klinik ölçümler döndürüyor · P0

`GET /protocols/:id/records` yalnız `protocols.read` izniyle erişiliyor. Yanıt; PTA, FEV1/FVC, EKG yorumu ve kalp hızı gibi klinik alanlar içeriyor. Bu endpointte tıbbi izin kontrolü veya `MedicalData` işaretlemesi yok. Resepsiyon için sadece işlem durumu ve yönlendirme bilgisi yeterli olacak şekilde yanıtlar ayrılmalı. Hasta kartındaki genel `notes` alanının arayüzde alerji/engel bilgisi için önerilmesi de aynı incelemeye dahil edilmeli.

Kaynak: [protokol controller](/Users/ertugan/Desktop/novalab/apps/api/src/modules/protocols/protocols.controller.ts:59), [klinik yanıt](/Users/ertugan/Desktop/novalab/apps/api/src/modules/protocols/protocols.service.ts:273), [hasta formu](/Users/ertugan/Desktop/novalab/apps/web/src/features/patients/patient-form.tsx:396). İş: **S07**.

### F05 — Audit hata yolu klinik içeriği saklayabiliyor · P0

Başarısız isteklerde `request.body` audit'e yazılıyor. Audit temizleyicileri parola/token alanlarını çıkarıyor, fakat anamnez, bulgu, sonuç ve kimlik numarası gibi alanları kapsamıyor. Servislerin başarılı işlemlerde yalnız metadata yazması bu hata yolunu korumuyor.

Kaynak: [audit interceptor](/Users/ertugan/Desktop/novalab/apps/api/src/common/interceptors/audit.interceptor.ts:149), [audit serileştirme](/Users/ertugan/Desktop/novalab/apps/api/src/modules/audit/audit.service.ts:50). İş: **S08**.

### F06 — Arama parametreleri loglara taşınıyor · P0

Pino mesajları ve request serializer tam URL'yi; MedicalDataGuard `originalUrl` değerini; Nginx ise `$request` değerini kaydediyor. TC kimlik numarası veya hasta adıyla yapılan aramalar URL içine girdiğinde bu değerler log/audit'e taşınabilir. Alan adı bazlı maskeleme, URL içine gömülü metni temizlemiyor. Dosya adından türeyen nesne anahtarlarının loglanması da kapsamda olmalı.

Kaynak: [Pino](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/logger/logger.module.ts:56), [medical audit](/Users/ertugan/Desktop/novalab/apps/api/src/common/guards/medical-data.guard.ts:55), [Nginx logu](/Users/ertugan/Desktop/novalab/infrastructure/nginx/nginx.conf:19). İş: **S08**.

### F07 — Belgenin tıbbi olup olmadığı istemcinin tercihine bırakılmış · P0

Yükleme `isMedical` alanını istemciden alıyor, verilmezse `false` kullanıyor. Muayeneye bağlı bir dosyanın tıbbi sınıflandırması sunucuda zorlanmıyor. Ayrıca ilişkilendirilen hasta/firma/muayenenin tenant ve birbirleriyle ilişkisi doğrulanmıyor. Nesne anahtarının tenant ile başlaması, veritabanındaki yanlış ilişkiyi engellemez.

Kaynak: [belge oluşturma](/Users/ertugan/Desktop/novalab/apps/api/src/modules/documents/documents.service.ts:116). İş: **S09, S10**.

### F08 — Rapor onayı ve eşzamanlı düzenleme atomik değil · P0

Onay önce durumu okuyor; PDF yükleme, Document oluşturma ve Examination güncelleme ayrı adımlarda gerçekleşiyor. Son güncellemede eski durum/sürüm koşulu bulunmuyor. Eşzamanlı iki onay veya onay sırasında düzenleme; birden fazla belge, PDF-veri uyumsuzluğu ya da yarım işleme neden olabilir. Protokolden rapor açarken “var mı bak, yoksa oluştur” akışı da tek başına mükerrerliği engellemiyor.

Kaynak: [rapor açma](/Users/ertugan/Desktop/novalab/apps/api/src/modules/health-reports/health-reports.service.ts:290), [onay](/Users/ertugan/Desktop/novalab/apps/api/src/modules/health-reports/health-reports.service.ts:402), [veri modeli](/Users/ertugan/Desktop/novalab/apps/api/prisma/schema.prisma:562). İş: **S13**. Bunlar koddan çıkarılan eşzamanlılık riskleridir; yarış testi ayrıca yazılmalı.

### F09 — Onaylı rapor görünümüne sonradan farklı tetkik gelebiliyor · P0

PDF onay anında üretiliyor, fakat rapor GET yanıtındaki tetkikler her seferinde yeniden hesaplanıyor. Protokolü olmayan muayenelerde “muayene tarihinden önce” sınırı yok. Radyolojide muayeneye bağlı kayıt yanında geniş bir tarih aralığındaki başka istekler de seçilebiliyor; üst tarih sınırı bulunmuyor. Onaylı PDF ile ekrandaki özet ayrışabilir veya yanlış ziyaretin tetkiki kullanılabilir.

Kaynak: [rapor GET](/Users/ertugan/Desktop/novalab/apps/api/src/modules/health-reports/health-reports.service.ts:196), [tetkik seçimi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/health-reports/health-reports.service.ts:571), [radyoloji seçimi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/health-reports/health-reports.service.ts:677). İş: **C01, C02**.

### F10 — Eksik tetkik ve muayene alanları onaya engel sayılmıyor · P0

`reportBlockers()` tarih, karar, hekim ve karara bağlı açıklamaları kontrol ediyor. Gerekli tetkiklerin tamamlanması, rapor formunun zorunlu klinik alanları ve muayene yapılmayan bölümler bu kontrolde yok. Arayüzde muayene edilmemiş sistemleri topluca “normal” yapma işlemi var. Zorunlulukları sorumlu hekimle belirlenen sunucu kurallarına dönüştürmek gerekiyor.

Kaynak: [hazırlık kontrolü](/Users/ertugan/Desktop/novalab/packages/shared-types/src/health-report.ts), [rapor editörü](/Users/ertugan/Desktop/novalab/apps/web/src/features/health-reports/report-editor.tsx). İş: **C03**.

### F11 — Oturum kapatma mevcut access/viewer tokenını hemen durdurmuyor · P0

JWT stratejisi kullanıcı ve tenant durumunu yeniden kontrol ediyor; ancak access token içindeki `sid` için oturumun iptal edilip edilmediğine bakmıyor. Aktif bir kullanıcının yönetici tarafından kapatılan oturumu veya parola değişiminden önceki access tokenı, süresi dolana kadar çalışabilir. Viewer cookie doğrulaması da güncel kullanıcı/rol/oturum durumuna bakmıyor; viewer TTL değeri bir saat.

Kaynak: [JWT validate](/Users/ertugan/Desktop/novalab/apps/api/src/modules/auth/strategies/jwt.strategy.ts:29), [oturum iptali](/Users/ertugan/Desktop/novalab/apps/api/src/modules/sessions/sessions.service.ts), [viewer tokenı](/Users/ertugan/Desktop/novalab/apps/api/src/modules/auth/auth.service.ts:20). İş: **S05, S11**.

### F12 — Refresh token rotation eşzamanlı isteklere karşı atomik değil · P1

Eski oturum kontrol edildikten sonra yeni oturum oluşturuluyor ve eski oturum ayrı işlemle iptal ediliyor. İki istek kontrolü aynı anda geçebilir. Tek kullanımlık tüketim sunucuda atomik hale getirilmeli; çoklu sekme ve yeniden deneme davranışları sınanmalı.

Kaynak: [refresh](/Users/ertugan/Desktop/novalab/apps/api/src/modules/auth/auth.service.ts:114), [oturum oluşturma/iptal](/Users/ertugan/Desktop/novalab/apps/api/src/modules/auth/auth.service.ts:242). İş: **S12**.

### F13 — Docker dağıtımında PDF indirme adresinin erişilebilirliği belirsiz · P1

Compose API'yi `MINIO_ENDPOINT=minio` ile başlatıyor; presigned URL aynı MinIO client üzerinden üretiliyor. Sadece Nginx yayınlanıyor ve dosya indirme proxy rotası görünmüyor. Standart Compose topolojisinde tarayıcıya iç ağ adresi dönmesi beklenir. Bu, gerçek dağıtımda tarayıcıdan doğrulanması gereken bir yapılandırma riski; geliştirme ortamında çalışması yeterli değil.

Kaynak: [Compose](/Users/ertugan/Desktop/novalab/docker-compose.yml:180), [presign](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/storage/storage.service.ts), [Nginx rotaları](/Users/ertugan/Desktop/novalab/infrastructure/nginx/templates/default.conf.template). İş: **Q03**.

### F14 — İleri tarihli rıza metni erken devreye girebilir · P1

Metnin `effectiveFrom` alanı kaydediliyor; aktif şablon sorguları ise sadece `isActive` kullanıyor. Yeni sürüm yayınlanırken önceki sürüm hemen pasifleştiriliyor. İleri tarihli metin planlandığında yürürlük tarihiyle seçilen metin ayrışabilir.

Kaynak: [yayınlama ve aktif şablon seçimi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/consents/consents.service.ts:52). İş: **G02**.

## 3. İş listesinin kullanımı

- **P0:** Gerçek sağlık verisiyle pilot/canlı öncesi kapatılacak güvenlik, bütünlük ve temel işletim işleri. Bu bir mühendislik önceliğidir; her satır ayrı bir kanuni zorunluluk iddiası değildir.
- **P1:** Güvenli pilotu sürdürülebilir operasyon haline getiren işler. İlgili hizmet sunulmadan önce tamamlanmalı.
- **P2:** Ticari kapsam, kullanım kolaylığı ve ölçek ihtiyacına göre sıralanacak işler.
- **D:** Kodda doğrulanan eksik veya problem. **K:** Altyapısı mevcut, tamamlanacak. **Ö:** Tam OSGB ürünü kapsamından çıkarılan öneri. **H:** Harici ortam/uzman/sağlayıcı doğrulaması gerekli.

Her iş paketinin kapanışı, tablodaki ölçüt ve ilgili test/iş kabul kaydıyla yapılmalı. Kişi atamaları ve süreler ekip kapasitesi bilinmediği için uydurulmadı. Sorumlu alanlar: S=API/güvenlik, C=API/web/sorumlu hekim, O=API/web/OSGB operasyonu, T=API/web/mali işler, U=web/ürün, Q=platform/QA, G=ürün/operasyon/KVKK sorumlusu. Gereken sağlayıcılar ilgili pakete katılır.

### A. Güvenlik, yetki ve veri bütünlüğü — 20 iş

| ID  | Öncelik · durum | Yapılacak iş                                                                       | Tamamlanma ölçütü                                                                                                                                  |
| --- | --------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | P0 · D          | Muayene durum geçişlerini tek politika altında topla; genel PATCH'ten onayı çıkar. | Sadece güncelleme izni olan kullanıcı onaylayamaz; onay metadata/PDF politikasını atlayan alternatif endpoint kalmaz. F01.                         |
| S02 | P0 · D          | Hekim hesabı, aktif hekim profili ve imza sahipliğini doğrula.                     | Kullanıcı başka hekimin profiliyle onaylayamaz; pasif/yetkisiz hekim reddedilir; her onay gerçek aktöre bağlanır. E01.                             |
| S03 | P0 · D          | DICOMweb'e tenant, hasta ve study bazlı yetkilendirme getir.                       | QIDO araması ve WADO görüntü/metadata istekleri yalnız izinli kayıtları döndürür; başka tenant/UID testi başarısız olur. F02.                      |
| S04 | P0 · D          | PACS listeleme ve study eşleme sahipliğini doğrula.                                | Ortak PACS'te tenantlar birbirinin kayıtlarını listeleyemez/bağlayamaz; hasta uyuşmazlığı ve çift eşleme engellenir. F03.                          |
| S05 | P0 · D          | Viewer oturumunu iptal edilebilir ve dar kapsamlı yap; HTTP metodlarını sınırla.   | Rol/hesap/oturum iptalinde erişim kesilir; salt görüntüleme tokenı veri yazamaz; kısa TTL ve erişim audit'i uygulanır. F02/F11.                    |
| S06 | P0 · K          | Tıbbi erişime hasta, işyeri, görev ve amaç kapsamı ekle.                           | Yetki matrisi sunucuda uygulanır; acil erişim gerekiyorsa gerekçe, süre, alarm ve sonradan inceleme kaydı vardır. E02.                             |
| S07 | P0 · D          | Resepsiyon ve yönetim yanıtlarından gereksiz tıbbi alanları ayır.                  | Protokol kayıtları, hasta notları, arama/export ve audit ekranları alan bazlı izin testlerinden geçer. F04.                                        |
| S08 | P0 · D          | API/Nginx/worker/audit loglarını izin verilen alanlarla sınırla.                   | Başarılı ve başarısız klinik isteklerde TC, anamnez, imza, ham belge ve arama metni loglarda bulunmaz. F05/F06.                                    |
| S09 | P0 · D          | Belge sınıflandırmasını sunucu tarafında uygula.                                   | Muayeneye bağlı/sağlık kategorisindeki dosya `isMedical=false` ile daha geniş erişime açılamaz. F07.                                               |
| S10 | P0 · D          | Bütün ilişki ID'lerinde tenant ve hasta/firma bütünlüğünü doğrula.                 | Belge, randevu, radyoloji, hekim, muayene create/update işlemlerinde çapraz tenant ve yanlış hasta ilişkileri reddedilir. E03/E04/F07.             |
| S11 | P0 · D          | Logout, yönetici iptali ve parola değişiminde access tokenı etkisizleştir.         | Eski access tokenla yeni istek reddedilir; varsa kısa iptal gecikmesi ölçülmüş ve politikayla sınırlandırılmıştır. F11.                            |
| S12 | P1 · D          | Refresh token tüketimini atomik hale getir.                                        | Aynı tokenla eşzamanlı yenileme iki geçerli devam oturumu oluşturmaz; çoklu sekme testleri geçer. F12.                                             |
| S13 | P0 · D          | Rapor açma/onay/düzenleme yarışlarını ve yarım işlemleri çöz.                      | Paralel isteklerde tek geçerli rapor sürümü oluşur; sürüm çakışması açık hata verir; DB/MinIO hatası tutarsız onay bırakmaz. F08.                  |
| S14 | P0 · D          | Bağımlılık açıklarını gider; özellikle XLSX ve multipart yollarını kapat.          | Güncel audit ve erişilebilirlik incelemesi kaydı vardır; dış girdiden ulaşılabilen yüksek bulgular giderilir, CI yeni bulguyu durdurur. Bölüm 5.   |
| S15 | P0 · Ö          | Ayrıcalıklı ve tıbbi hesaplarda MFA ve güvenli kurtarma uygula.                    | Kayıt/yenileme/kurtarma akışları, kurtarma kodları, yeniden kimlik doğrulama ve yönetici müdahalesi testlidir. E05.                                |
| S16 | P1 · K          | Tenant sınırını DB katmanında güçlendir.                                           | Bileşik FK/unique kontrolleri uygulanır; RLS seçilirse bağlantı havuzu, worker ve yetkili bypass senaryolarında tenant izolasyonu kanıtlanır. E06. |
| S17 | P1 · K          | Yetki verme sınırı ve son yönetici koruması ekle.                                  | Delege yönetici izin verilen kapsamın üzerinde rol veremez; son yönetici kaybedilmez; kritik değişiklikler izlenir. E07.                           |
| S18 | P0 · H          | TLS, depolama/yedek şifrelemesi ve anahtar yönetimini hayata geçir.                | Gerçek altyapıda şifreleme, anahtar erişimi/döndürme ve sertifika yenileme kayıtları doğrulanır; test sırları üretimde reddedilir. E08.            |
| S19 | P0 · H          | Olay/veri ihlali müdahale ve acil erişim kesme prosedürünü hazırla.                | Sorumlular, iletişim, delil koruma, değerlendirme ve ilgili bildirim adımları bir masa başı tatbikatında uygulanır.                                |
| S20 | P0 · H          | İşleme amacı, hukuki dayanak ve imza modelini iş akışı bazında karara bağla.       | Hangi veriye kimin hangi amaçla eriştiği; rıza gereken/gerekmeyen işlemler ve kullanılacak rapor imza yöntemi yazılı onaylanır. Bölüm 6.           |

### B. Klinik işleyiş, rapor ve laboratuvar — 16 iş

| ID  | Öncelik · durum | Yapılacak iş                                                          | Tamamlanma ölçütü                                                                                                                                 |
| --- | --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | P0 · D          | Raporun kullandığı tetkikleri açık kayıt ilişkileriyle seç.           | Farklı ziyaret, yanlış hasta ve muayene sonrası tarihli tetkik kendiliğinden rapora girmez; önceki tetkik kullanımı hekim kararıyla izlenir. F09. |
| C02 | P0 · D          | Onay anının klinik verisini ve belge bütünlüğünü sabitle.             | PDF, ekran, test kayıt/sürümleri, hekim ve şablon aynı değişmez anlık görüntüyü gösterir; SHA-256 doğrulanır. F09.                                |
| C03 | P0 · D          | Eksik muayene/tetkik ve karar kontrollerini onay koşuluna ekle.       | Sorumlu hekimin belirlediği zorunlu alanlar sunucuda doğrulanır; yapılmayan muayene sessizce normal sayılmaz. F10.                                |
| C04 | P1 · K          | Rapor numarası, sürümü, düzeltme, iptal ve zeyil zinciri kur.         | Numara DB'de benzersizdir; eski imzalı çıktı korunur; düzeltme nedeni, yeni sürüm ve önceki rapor bağı görünür. E01/E06.                          |
| C05 | P1 · K          | Rapor şablonları ve yürürlük tarihlerini yönet.                       | Ek-2 ve sunulacak diğer formlar için alan listesi uzmanla doğrulanır; önceki rapor eski şablonuyla açılır. E09.                                   |
| C06 | P1 · D/H        | Güvenli elektronik imza sağlayıcısı ve doğrulama akışını uygula.      | Hekim kendi sertifikasıyla imzalar; imzalı içerik, sertifika durumu ve gerekiyorsa zaman damgası doğrulanır; kesinti/iptal yönetilir. Bölüm 6.    |
| C07 | P1 · K          | Protokol, tetkik ve rapor durumlarını tutarlı hale getir.             | Tetkik silme/iptal/düzeltme ve rapor onayında işler yanlışlıkla DONE kalmaz; başarısız senkronizasyon yeniden işlenir. E01/E10.                   |
| C08 | P1 · D          | Laboratuvar istemi ve numune kabulünü modelle.                        | Test istemi → barkod → numune alma/kabul/red → dış lab gönderimi izlenir; hasta/numune karışması engellenir. E09/E06.                             |
| C09 | P1 · D          | Laboratuvar sonuç girişi, birim ve referans aralıklarını ekle.        | Sayısal/metinsel sonuçlar, yaş/cinsiyet/cihaz aralıkları ve kritik değer bildirim/onay kaydı tutulur.                                             |
| C10 | P1 · Ö/H        | Laboratuvar sağlayıcı/cihaz entegrasyonu kur.                         | Yetkili arayüzden sonuç alınır; tekrar mesajlar çift kayıt yaratmaz; eşlenemeyen sonuç operatör kuyruğuna düşer.                                  |
| C11 | P1 · K          | İşe giriş, periyodik, işe dönüş ve işten ayrılış süreçlerini tamamla. | Her akışın gerekli adımları, tarihleri, uygunluk kararı ve kapatma koşulları vardır; enum seçimiyle sınırlı kalmaz. E06.                          |
| C12 | P1 · D/K        | Periyodik vade hesaplama, iş listesi ve hatırlatma ekle.              | Tehlike/iş/kişisel koşula göre onaylanmış sürümlü kurallar çalışır; hekim override gerekçesi ve geciken liste tutulur. E11.                       |
| C13 | P1 · Ö          | Sevk ve takip dosyası oluştur.                                        | Sevk nedeni, hedef, sonuç, kontrol tarihi ve uygunluk kararına etkisi kapanana kadar izlenir.                                                     |
| C14 | P1 · H/K        | Klinik hesaplamaları, ölçüm birimlerini ve yorum sınırlarını doğrula. | Odyometri, spirometri, EKG, göz ve ILO için sorumlu uzman referans örneklerini onaylar; kullanılan kural sürümü tutulur. E12.                     |
| C15 | P1 · Ö/H        | Cihaz, kalibrasyon ve veri kaynağı kaydı ekle.                        | Ölçümün cihazı, operatörü ve kalibrasyon durumu izlenir; manuel/cihaz kaynaklı veri ayrılır.                                                      |
| C16 | P1 · D          | Kuyrukta çalışan hasta raporu export işini tamamla.                   | TXT placeholder yerine izinli alanlardan gerçek belge üretilir; iş durumu, indirme yetkisi ve hata sonucu sunulur. E13.                           |

### C. OSGB hizmet ve saha operasyonu — 16 iş

Bu bölümdeki yeni modeller, tam OSGB yönetimi hedefinden çıkarılmıştır. Mevzuat eşikleri, süreleri ve resmi bildirim şartları geliştirme öncesinde güncel kaynak ve yetkili uzmanla doğrulanmalıdır.

| ID  | Öncelik · durum | Yapılacak iş                                                    | Tamamlanma ölçütü                                                                                                                                       |
| --- | --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O01 | P1 · Ö          | OSGB–firma–işyeri hizmet sözleşmesi oluştur.                    | Kapsam, sorumlu ekip, başlangıç/bitiş, yenileme, fesih, SLA ve belge geçmişi izlenir.                                                                   |
| O02 | P1 · Ö/H        | İSG-KATİP sözleşme/onay/fesih/bildirim takibi kur.              | Resmi işlem referansı ve kanıtı tutulur; onay bekleyen/uyuşmayan kayıtlar görünür; resmi API erişimi teyit edilmeden otomatik entegrasyon vaat edilmez. |
| O03 | P1 · Ö/K        | Uzman, DSP, sorumlu müdür ve hekim mesleki kayıtlarını tamamla. | Sertifika türü/sınıfı, geçerlilik ve durum izlenir; kullanıcı rolü mesleki yeterlilik yerine kullanılmaz.                                               |
| O04 | P1 · Ö          | Profesyonel–işyeri ataması ve görevlendirme tarihçesi oluştur.  | Her tarihte hangi işyerinde kimin görevli olduğu ve değişiklik nedeni bulunabilir.                                                                      |
| O05 | P1 · Ö/H        | Süre ve kapasite hesaplama motoru ekle.                         | Çalışan sayısı, tehlike sınıfı ve yürürlük tarihiyle hesap yapılır; kapasite aşımı, çakışma ve kısmi dönem testlidir.                                   |
| O06 | P1 · D/K        | Randevu, kaynak takvimi ve çakışma kontrolünü tamamla.          | Hekim/oda/cihaz için eşzamanlı rezervasyon engellenir; erteleme, iptal, gelmedi ve bekleme listesi vardır. E04.                                         |
| O07 | P1 · Ö          | Çalışanın firma/işyeri ve maruziyet tarihçesini tut.            | İşyeri değişse bile eski raporun işyeri ve görev bağlamı korunur; işe giriş/çıkış hareketleri izlenir.                                                  |
| O08 | P1 · D          | Eğitim, oturum, katılım ve sınav modülünü uygula.               | API 501 dönmez; eğitmen, süre, içerik sürümü, yoklama ve başarı/yenileme kuralları çalışır. E14.                                                        |
| O09 | P1 · D          | Sertifika üretimi, iptal ve doğrulama ekle.                     | Sertifika numarası benzersizdir; QR minimum bilgiyle geçerlilik gösterir; süresi dolan/iptal sertifika ayrılır. E14.                                    |
| O10 | P1 · Ö          | Risk değerlendirmesi oluştur.                                   | İşyeri, tehlike, risk yöntemi, skor, sorumlu, kontrol önlemi ve revizyon geçmişi tutulur.                                                               |
| O11 | P1 · Ö          | Aksiyon ve uygunsuzluk takibi oluştur.                          | Sorumlu ve termin atanır; gecikme görünür; kanıt yüklenir; kapatma yetkili incelemeyle yapılır.                                                         |
| O12 | P1 · Ö          | Saha denetimi ve ziyaret kayıtları ekle.                        | Kontrol listesi sürümü, gözlem, fotoğraf/belge, ziyaret süresi ve aksiyon ilişkisi izlenir.                                                             |
| O13 | P1 · Ö/H        | Kaza, ramak kala ve meslek hastalığı şüphesi sürecini ekle.     | Olay, inceleme, düzeltici faaliyet ve gerekli bildirimlerin sorumlusu/takibi vardır; resmi gönderim kanıtı ayrı saklanır.                               |
| O14 | P1 · Ö          | Acil durum, ekip ve tatbikat takibi ekle.                       | Plan sürümü, görevliler, eğitim, tatbikat ve iyileştirme aksiyonları aynı işyerine bağlanır.                                                            |
| O15 | P1 · Ö/H        | İSG kurul kararları ve onaylı defter iş takibi oluştur.         | Toplantı, karar, sorumlu, termin ve asıl belge referansı tutulur; yazılım kaydının resmi belge yerine geçtiği varsayılmaz.                              |
| O16 | P1 · D/Ö        | Yıllık çalışma planı, değerlendirme ve İSG raporlarını tamamla. | Raporlar doğrulanabilir operasyon verilerinden oluşur; dönem kapanışı, onay ve çıktı sürümü izlenir. E09.                                               |

### D. Ticari ve mali süreçler — 12 iş

| ID  | Öncelik · durum | Yapılacak iş                                         | Tamamlanma ölçütü                                                                                                       |
| --- | --------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| T01 | P2 · Ö          | Teklif ve teklif sürümlerini oluştur.                | Hizmet kalemi, adet, iskonto, vergi, geçerlilik ve müşteri kabulü izlenir.                                              |
| T02 | P2 · K          | Firma/sözleşme bazlı fiyat listesi ve sürüm ekle.    | İşlem tarihindeki fiyat sabitlenir; sonraki fiyat değişikliği geçmiş hizmeti değiştirmez. E15.                          |
| T03 | P2 · K          | Paket kullanım hakkı ve tüketim takibi ekle.         | Paket/adet/bakiye, iptal/iade ve yeniden test kuralları mükerrer tüketim oluşturmadan çalışır.                          |
| T04 | P2 · Ö          | Verilen hizmeti faturalandırılabilir kayda dönüştür. | Aynı hizmet iki kez faturalanmaz; ücretsiz/iptal/tekrar hizmet ayrımı yapılır.                                          |
| T05 | P2 · D/Ö        | Fatura, vergi ve düzeltme/iade akışlarını uygula.    | Fiyat ve vergi hesapları mali işler örnekleriyle doğrulanır; belge ve dönem toplamları mutabıktır. E09.                 |
| T06 | P2 · Ö/H        | e-Fatura/e-Arşiv sağlayıcı bağlantısı kur.           | Test ortamında oluşturma, gönderim, durum sorgusu, hata ve iptal/iade senaryoları geçer; sağlayıcı şartları doğrulanır. |
| T07 | P2 · Ö          | Tahsilat ve cari hesap oluştur.                      | Borç/alacak, kısmi ödeme, vade ve banka/kasa eşleştirmesi izlenir.                                                      |
| T08 | P2 · D/Ö        | Hekim/uzman hakediş hesaplama ekle.                  | Sözleşmedeki hizmet/saat/adet kuralına göre hesap, kesinti ve onay izi vardır. E09.                                     |
| T09 | P2 · Ö          | Puantaj, masraf ve ödeme onayı ekle.                 | Planlanan/gerçekleşen çalışma ayrılır; kapatılan dönem sonraki değişiklikten korunur.                                   |
| T10 | P2 · D/Ö        | Alt OSGB hizmet ve mutabakatını kur.                 | Sipariş, hizmet kanıtı, fiyat, fatura ve erişim kapsamı ayrı izlenir; tenant verileri otomatik paylaşılmaz. E09.        |
| T11 | P2 · Ö          | Hizmet maliyeti, gelir ve kârlılık raporları ekle.   | Toplamlar fatura/hakediş kaynağına bağlanır; klinik ayrıntı finans ekranlarına taşınmaz.                                |
| T12 | P2 · Ö          | Mali dönem kapanışı ve muhasebe aktarımı ekle.       | Dışa aktarım mutabakatı, kilit, yeniden açma yetkisi ve muhasebe sistemine hata yönetimi çalışır.                       |

### E. Web ekranları ve ürün deneyimi — 10 iş

| ID  | Öncelik · durum | Yapılacak iş                                                                    | Tamamlanma ölçütü                                                                                                                                 |
| --- | --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| U01 | P1 · D          | Operasyon dashboardunu uygula.                                                  | Bekleyen tetkik, geciken muayene, randevu ve hata listeleri gerçek veriyle çalışır; KPI'lar ilgili kayda açılır. E09.                             |
| U02 | P1 · D          | Randevu web takvimini ekle.                                                     | Gün/hafta, profesyonel/işyeri filtreleri ve O06 akışları tamamdır; saat dilimi sınırları testlidir. E04/E09.                                      |
| U03 | P1 · D/K        | Eksik modül ekranlarını tamamla ve menü durumunu doğrula.                       | Laboratuvar, eğitim, sertifika, İSG raporu, şablon, e-imza ve DICOM ekranları ilgili API ile çalışır; sunulmayan modüller açıkça belirtilir. E09. |
| U04 | P1 · D/K        | Bildirim merkezi ve tercih ekranını ekle.                                       | Hatırlatma türü, okunma, kanal tercihi, hata ve ilgili kayda bağlantı işler. E11/E16.                                                             |
| U05 | P1 · Ö          | Kritik formlarda kayıt kaybını ve çakışmayı önle.                               | Kaydediliyor/kaydedildi/hata görünür; sayfadan ayrılma koruması ve sürüm çakışması çözümü gerçek senaryoyla test edilir.                          |
| U06 | P1 · Ö          | Uçtan uca rol bazlı kullanım kabulünü yap.                                      | Resepsiyon, hekim, teknisyen ve yöneticiyle günlük iş senaryoları tamamlanır; boş/hata/yetkisiz durumlar anlaşılırdır.                            |
| U07 | P2 · Ö          | Firma portalı oluştur.                                                          | İşveren yalnız yetkilendirildiği işyerinin paylaşımı onaylı sonuçlarını/istatistiklerini görür; ham klinik veriye erişemez.                       |
| U08 | P2 · Ö          | Hasta portalı oluştur.                                                          | Güvenilir kimlik doğrulamayla kendi raporlarına, rıza geçmişine ve tercihlerine erişir; başkasının kaydına ulaşamaz.                              |
| U09 | P2 · Ö          | Saha/tablet, erişilebilirlik ve yazdırma kullanımını doğrula.                   | Dar ekran, klavye, odak, okunurluk ve PDF yazdırma akışları test edilir; çevrimdışı çalışma seçilirse yerel sağlık verisi koruması tasarlanır.    |
| U10 | P2 · Ö/K        | Kullanıcı/tenant değişiminde tarayıcı verilerini ve oturum davranışını doğrula. | Çıkıştan sonra eski hasta verisi cache'ten gösterilmez; çoklu sekme, ortak bilgisayar ve hareketsizlik politikası testlidir. E17.                 |

### F. Teknik kalite, dağıtım ve işletim — 16 iş

| ID  | Öncelik · durum | Yapılacak iş                                               | Tamamlanma ölçütü                                                                                                                                                 |
| --- | --------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q01 | P0 · D          | Bütün dosya girişlerini güvenli işleme hattına al.         | İmza/MIME/boyut ve açılmış içerik sınırları, karantina, zararlı içerik taraması, zaman aşımı ve izole worker vardır; kontrol bitmeden dosya indirilemez. E03/E18. |
| Q02 | P0 · K          | Dağıtık rate limit ve kaynak kotaları ekle.                | İki API instance'ında toplam limit uygulanır; login, OCR, import, PDF ve PACS kaynak tüketimi tenant/iş bazında sınırlıdır. E19.                                  |
| Q03 | P1 · H/K        | Üretim dosya indirme yolunu düzelt/doğrula.                | Docker dışındaki tarayıcı PDF'yi HTTPS üzerinden alır; iç MinIO adı sızmaz, imzalı URL bozulmaz, süresi dolan link reddedilir. F13.                               |
| Q04 | P1 · K          | Nesne saklama ve DB/kuyruk tutarlılığını sağla.            | Yarım yükleme/boşa düşmüş nesne tespiti, idempotent iş, outbox veya eşdeğer yeniden işleme ve telafi akışı çalışır. E03/E11.                                      |
| Q05 | P0 · H          | Yedekleme ve geri yükleme tatbikatı yap.                   | Uygulama DB, Orthanc DB/görüntü, belge deposu ve gerekli anahtarlar tutarlı geri yüklenir; RPO/RTO ölçülür ve hedefi karşılar. E08.                               |
| Q06 | P0 · D/H        | Veri yaşam döngüsü, saklama ve imha uygula.                | Belge/fotoğraf/imza/DICOM/log/yedek için onaylı süreler ve hukuki saklama istisnası vardır; imha işi kanıt üretir. E03.                                           |
| Q07 | P1 · K          | Audit'in kalıcılığını ve değişiklik tespitini güçlendir.   | Audit yazma arızası alarm verir; kritik işlemin kanıtı kaybolmaz; DB rolü, değişmez depolama veya eşdeğer bütünlük kontrolü ve denetim exportu testlidir. E20.    |
| Q08 | P1 · K          | Merkezi log, metrik, tracing ve SLO/alarm kur.             | Hata oranı, gecikme, DB/MinIO/PACS, disk ve kuyruk için sorumluya ulaşan alarmlar vardır; klinik veri etiket yapılmaz. E19.                                       |
| Q09 | P1 · D/K        | Gerçek e-posta/SMS teslimatını uygula.                     | Gönderim, teslim, bounce/hata, retry, opt-out ve maliyet/kota kaydı tutulur; sağlayıcı yanıtı olmadan teslim edildi sayılmaz. E16.                                |
| Q10 | P0 · D          | Kritik yetki/tenant regresyon testlerini CI'a ekle.        | F01–F11 için ilgili negatif senaryolar gerçek API ve DB üzerinde doğrulanır; başka tenant, başka hasta, iptal edilmiş token erişimi engellenir. E21.              |
| Q11 | P1 · D          | Gerçek uçtan uca klinik iş akışını test et.                | Login → hasta → protokol → tetkik → onay → PDF/imza → erişim/iptal senaryosu tarayıcı, API ve gerçek test depolarıyla geçer. E21.                                 |
| Q12 | P1 · D/K        | Coverage ve CI kalite kapılarını genişlet.                 | Kritik servisler için anlamlı eşik, secret/SAST/dependency/image taraması, güncelleme otomasyonu ve migration kontrolü birlikte çalışır. E22.                     |
| Q13 | P1 · D/H        | Yük, dayanıklılık ve bağımsız güvenlik doğrulaması yap.    | Hedef eşzamanlı kullanıcı/veri boyutunda ölçüm vardır; DB/PACS/kuyruk kesintileri ve zararlı dosya senaryoları değerlendirilir; kritik bulgular kapanır.          |
| Q14 | P2 · D/K        | Web başlangıç yükünü azalt.                                | Route bazlı lazy loading/code splitting uygulanır; OCR/PDF/viewer kodu gerektiğinde yüklenir; yeni başlangıç boyutu ve yükleme süresi ölçülür. E09.               |
| Q15 | P1 · H/K        | Staging, sürüm dağıtımı, geri dönüş ve ortam ayrımını kur. | Dev proxy/seed/sırlar üretime taşınmaz; migration arızası ve rollback tatbikatı yapılır; şema drift kontrolü korunur. E08/E22.                                    |
| Q16 | P1 · D/K        | Worker ve zamanlanmış iş operasyonunu tamamla.             | Başarısız işler ekranı, retry yetkisi, idempotency, graceful shutdown ve tekil schedule çalışır; placeholder sweep gerçek vade işini yapar. E11.                  |

### G. Veri yönetimi, hesaplar ve ürünün işletilmesi — 10 iş

| ID  | Öncelik · durum | Yapılacak iş                                                            | Tamamlanma ölçütü                                                                                                                                                      |
| --- | --------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G01 | P1 · K/H        | Rıza ve aydınlatmayı işleme amacıyla ilişkilendir.                      | Rızanın geri alınması yalnız rızaya dayalı ilgili işlemleri durdurur; başka hukuki dayanakla tutulacak kayıt yanlışlıkla silinmez. Bölüm 6.                            |
| G02 | P1 · D          | Rıza şablonunda yürürlük ve eşzamanlı sürüm yayınını düzelt.            | İleri tarihli sürüm erken sunulmaz; aynı anda iki yayın tutarsız aktif sürüm üretmez. F14.                                                                             |
| G03 | P1 · Ö/H        | İlgili kişi başvurusu, veri düzeltme ve dışa aktarım sürecini kur.      | Kimlik doğrulama, kapsam, süre takibi, onaylı cevap ve teslim kaydı vardır; paylaşım gereken veriyle sınırlıdır.                                                       |
| G04 | P1 · K          | İçe aktarmayı kalıcı ve geri alınabilir iş haline getir.                | Önizlenen dosya/hash onaya bağlanır; aynı onay tekrar kayıt yaratmaz; satır hataları indirilebilir ve geçmiş izlenebilir. E23.                                         |
| G05 | P1 · Ö/K        | Hasta kimliği/mükerrer kayıt birleştirme ve veri düzeltme sürecini kur. | DB mevcut benzersizlik kuralları korunur; birleştirme hekim kayıtlarını kaybetmez; eski kimlik/kurum bağlantısı ve işlem izi kalır. E06.                               |
| G06 | P1 · D/K        | Kullanıcı daveti ve kendi parola kurtarma akışını ekle.                 | Süreli tek kullanımlık token, güvenli parola değişimi, oturum iptali ve hesap varlığı sızdırmayan yanıtlar uygulanır. E05.                                             |
| G07 | P2 · Ö          | SSO ve kurumsal IP/cihaz politikalarını ekle.                           | Gereken müşterilerde OIDC/SAML yaşam döngüsü, offboarding ve hesap eşleştirme test edilir; platform bağımlılığı önceden belirlenir.                                    |
| G08 | P2 · Ö/K        | OSGB'nin çok şubeli ve il bazlı operasyonunu modelle.                   | Firma şubesiyle OSGB şubesi ayrılır; şube personeli, yetkisi, kapasitesi ve kayıt kapsamı nettir. E06.                                                                 |
| G09 | P1 · H/Ö        | Tedarikçi, veri aktarımı ve hizmet erişim envanteri oluştur.            | Hosting, SMS, e-posta, imza, PACS/NVİ/lab için veri akışı, erişim yetkisi, sözleşme ve uygulanabilir aktarım şartları incelenir. Bölüm 6.                              |
| G10 | P1 · K/Ö        | Kurulum, müşteri kabulü, destek ve eğitim paketini tamamla.             | Tenant açılışı, rol tanımı, ilk veri aktarımı, pilot kabulü, destek/runbook, veri çıkışı ve hizmet kapanışı uygulanabilir biçimde belgelenir; README güncellenir. E24. |

## 4. Teslim sırası ve bağımlılıklar

Takvim; ekip büyüklüğü, hedef müşteri ve dış servis erişimi bilinmeden gün olarak tahmin edilmemeli. Özellikle e-imza, NVİ, laboratuvar, İSG-KATİP ve mali entegrasyonlarda erişim/tedarik süresi yazılım geliştirmeden ayrıdır.

| Aşama                      | İçerik                                                                                                       | Çıkış koşulu                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1 — Güvenli veri ve onay   | S01–S11, S13–S15, S18–S20, C01–C03, Q01–Q02, Q05–Q06, Q10                                                    | P0 testleri, onaylı imza/işleme politikası, erişim kontrolü ve geri yükleme kanıtı.           |
| 2 — Klinik pilot           | S12/S16/S17, C04–C16'dan sunulacak hizmetler, O06, U01–U06, Q03–Q04/Q07–Q09/Q11–Q13/Q15–Q16, G01–G06/G09–G10 | Pilot kurumun gerçekten kullanacağı her klinik akış, bildirim ve destek süreci kabul edilmiş. |
| 3 — OSGB hizmet yönetimi   | O01–O05, O07–O16 ve ilgili ekranlar                                                                          | Sözleşme → atama → süre → saha işi → aksiyon → rapor döngüsü tamamlanmış.                     |
| 4 — Ticari kapsam ve ölçek | T01–T12, U07–U10, Q14, G07–G08                                                                               | Seçilen ticari kapsam, portallar ve çok şube iş akışları kabul edilmiş.                       |

Ekran işleri kendi API ve süreçleriyle birlikte teslim edilmeli; örneğin U02, O06'dan; U03 laboratuvar bölümü C08/C09'dan; T08, O03/O04 ve sözleşme kurallarından; firma portalı U07, S06/S07'den bağımsız kapatılamaz. Yük ve güvenlik testleri son aşamaya ertelenmemeli. Sadece tek tenant pilot yapılsa bile açık DICOM/güncelleme yolları kapatılmalıdır.

### Pilot kabul kontrol listesi

- [ ] Tüm P0 işleri kanıtlarıyla kapanmış.
- [ ] Güncelleme izniyle rapor onaylanamıyor; başka hekim adına imzalanamıyor.
- [ ] Başka tenant/hasta/işyeri verisi API, dosya URL'si, audit veya PACS üzerinden okunamıyor.
- [ ] Eksik/yanlış tetkikle rapor onaylanmıyor; onaylı PDF ve ekran aynı sürümü gösteriyor.
- [ ] Paralel onay/yenileme ve yarım yükleme durumlarında veri tutarlı kalıyor.
- [ ] Parola/rol/oturum iptali API ve viewer erişimine uygulanıyor.
- [ ] Zararlı/uygunsuz belge yayımlanmıyor; loglar klinik veri ve sır içermiyor.
- [ ] Gerçek dağıtım adresinden PDF ve viewer erişimi çalışıyor.
- [ ] Yedek geri yüklemesi yapılmış; saklama/imha ve olay müdahalesi sorumluları belli.
- [ ] Pilot kapsamındaki kritik hasta akışı gerçek servislerle test edilmiş.
- [ ] Sorumlu hekim ve OSGB operasyonu klinik/form/kural kabulünü tamamlamış.
- [ ] Sunulmayan modüller ve manuel yürütülecek süreçler müşteriye açıkça belirtilmiş.

## 5. Bu incelemede yapılan kontroller

| Kontrol                            | Sonuç                                                                                                         | Sınır                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm audit --json`                | 11 bulgu: 7 yüksek, 3 orta, 1 düşük; kritik 0.                                                                | 12.09.2026 tarama anına aittir; her geçişli bağımlılığın üretimden erişilebilirliği ayrıca değerlendirilmeli. |
| `pnpm exec turbo run test --force` | API: 28 suite / 106 test; web: 27 dosya / 115 test geçti.                                                     | Cache kullanılmadan çalıştırıldı. Bu testler gerçek üretim güvenliği veya mevzuat uygunluğu kanıtı değildir.  |
| `pnpm --filter @osgb/api test:e2e` | 4 test geçti.                                                                                                 | Health controller testleri; DB/Redis/MinIO/Orthanc fake kullanıyor. Gerçek hasta akışı testi değil.           |
| Kaynak taraması                    | Guard/controller/service, DTO, şema/migration, rota/placeholder, CI, Docker/Nginx ve kuyruk işleri incelendi. | Tam pentest veya tüm satırlar için güvenlik garantisi değildir.                                               |
| Lint/typecheck/build               | Önceki raporda başarılı olarak bildirilmiş.                                                                   | Bu incelemede yeniden çalıştırılmadı; güncel doğrulanmış sonuç diye sunulmadı.                                |
| Web bundle                         | Statik route importları doğrulandı.                                                                           | Önceki yaklaşık 1,8 MB ölçümü yeniden alınmadı; güncel boyut ölçülmeli.                                       |

Bağımlılık bulguları, aynı paketteki ayrı advisory'ler birlikte sayılarak toplam 11 eder:

| Paket                  | Bulgu                                                                              | Plan                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xlsx`                 | 2 yüksek: prototype pollution ve ReDoS.                                            | Dış dosya okuyan doğrudan bağımlılık. Bakımı ve güvenliği doğrulanan alternatif/sürüm kaynağı seç; salt semver override ile düzeleceğini varsayma. |
| `multer`               | 3 yüksek, 1 düşük: multipart DoS, iptal edilmiş upload kaynağı ve limit sorunları. | Nest uyumluluğuyla birlikte doğrulanmış düzeltilmiş sürüm; multipart regresyonu ve kaynak tüketimi testi.                                          |
| `deepmerge-ts`         | 1 yüksek: recursive graph/stack exhaustion.                                        | Prisma/config zincirinde uygun güncelleme; uygulamadaki erişilebilirlik değerlendirmesi.                                                           |
| `mysql2`               | 1 yüksek, 1 orta.                                                                  | PostgreSQL kullanan uygulamada geçişli bağımlılığın gerçek kullanımını ayır; Prisma zinciri ve runtime imajını incele.                             |
| `decode-uri-component` | 1 orta.                                                                            | MinIO zinciri güncellemesi ve bozuk URL girdisi değerlendirmesi.                                                                                   |
| `stream-json`          | 1 orta.                                                                            | MinIO zinciri güncellemesi ve aşırı derin girdi/kaynak sınırı.                                                                                     |

İlk iki `xlsx` bulgusunun kaynakları: [prototype pollution advisory](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [ReDoS advisory](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). Audit sayısı tek başına bütün paketlerin uzaktan istismar edilebilir olduğu anlamına gelmez.

## 6. Mevzuat ve dış servis kararları

Sağlık verisi özel nitelikli kişisel veridir. Açık rıza tek olası işleme şartı değildir; amaç ve işlem için uygun dayanak ayrı belirlenmelidir. Rıza geri çekme ile zorunlu kayıt saklama aynı işlem gibi tasarlanmamalıdır. [KVKK özel nitelikli kişisel veriler](https://www.kvkk.gov.tr/Icerik/2051/Ozel-Nitelikli-Kisisel-Veriler), [KVKK rehberi](https://www.kvkk.gov.tr/Icerik/8183/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber).

İmza görseli yerleştirilmiş PDF ve SHA-256 kontrolü, tek başına güvenli elektronik imza oluşturmaz. BTK'nın açıklaması güvenli elektronik imzanın hukuki sonucunu ve sertifika altyapısını ayırır. Hangi raporda hangi imza biçiminin kullanılacağı ayrıca doğrulanmalı; tüm raporların yalnız e-imzayla düzenlenebileceği şeklinde genel bir varsayım yapılmamalıdır. Uygun ıslak imza süreci seçilirse belge aslı, tarama, teslim ve doğrulama akışı açıkça modellenmelidir. [BTK elektronik imza bilgisi](https://www.btk.gov.tr/elektronik-imza-genel-bilgi).

OSGB hizmetinde görevlendirilen profesyonellerin çalışma düzeni ve gerekli süreleri sağlanmalıdır. Süre motorunda sabit ve kaynaksız sayılar yerine, güncel şartlara göre doğrulanmış, yürürlük tarihli kurallar kullanılmalıdır. İSG-KATİP takip ihtiyacı, erişilebilir bir resmi API bulunduğunun kanıtı değildir. İlk teslim yetkili operatörün işlem referansı ve resmi belge takibiyle yapılabilir. [ÇSGB İSGGM sık sorulan sorular](https://www.csgb.gov.tr/tr/sikca-sorulan-sorular/is-sagligi-ve-guvenligi-genel-mudurlugu/), [ÇSGB İSG hizmetleri](https://csgb.gov.tr/isggm/%C4%B1sg-hizmetleri/isg-hizmetleri/).

Depoda NVİ adaptörünün bulunması gerçek erişim yetkisini, imza ekranının bulunması sağlayıcı sözleşmesini, Docker dosyasının bulunması da yedekleme/izleme hizmetlerinin işletildiğini kanıtlamaz. Bu konular H olarak işaretlendi.

## 7. Kod kanıt dizini

Tablolardaki E kodları aşağıdaki yerleri gösterir. Ö/H maddeleri bir kod hatası kanıtı değil, belirtilen ürün kapsamı veya dış doğrulama işidir.

| Kod | Kaynak ve gözlem                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E01 | [Sağlık raporu servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/health-reports/health-reports.service.ts:402), [muayene onayı](/Users/ertugan/Desktop/novalab/apps/api/src/modules/examinations/examinations.service.ts:242): hekim hesabı/onay/rapor bütünlüğü.                                                                                                     |
| E02 | [MedicalDataGuard](/Users/ertugan/Desktop/novalab/apps/api/src/common/guards/medical-data.guard.ts:24): ek kontrol genel tıbbi izin ve audit düzeyinde.                                                                                                                                                                                                                          |
| E03 | [Belge servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/documents/documents.service.ts:77): MIME/boyut, istemci sınıflandırması, ilişkiler, soft delete.                                                                                                                                                                                                             |
| E04 | [Randevu servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/appointments/appointments.service.ts:57): ilişki doğrulama ve çakışma TODO.                                                                                                                                                                                                                                |
| E05 | [Auth servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/auth/auth.service.ts), [kullanıcı servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/users/users.service.ts): mevcut token ve yönetici parola akışı.                                                                                                                                                |
| E06 | [Prisma şeması](/Users/ertugan/Desktop/novalab/apps/api/prisma/schema.prisma), [Prisma servisi](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/prisma/prisma.service.ts): model kapsamı ve manuel tenant filtreleme. Migration'lardaki ek kısıtlar da kontrol edilmeli.                                                                                              |
| E07 | [Rol servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/roles/roles.service.ts), [kullanıcı rol ataması](/Users/ertugan/Desktop/novalab/apps/api/src/modules/users/users.service.ts): rol/izin yönetimi var, aktörün devredebileceği yetki sınırı yok.                                                                                                                 |
| E08 | [Compose](/Users/ertugan/Desktop/novalab/docker-compose.yml), [Nginx](/Users/ertugan/Desktop/novalab/infrastructure/nginx/templates/default.conf.template), [README](/Users/ertugan/Desktop/novalab/README.md): dağıtım temeli var; işletim güvenceleri ayrıca doğrulanmalı.                                                                                                     |
| E09 | [Web rotaları](/Users/ertugan/Desktop/novalab/apps/web/src/app/router/routes.tsx): eager importlar; dashboard, lab-results, isg-reports, report-templates, e-signature, dicom-records, accounting, doctor-payouts, sub-osgb placeholder sayfaları.                                                                                                                               |
| E10 | [Protokol servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/protocols/protocols.service.ts), [rapor sonrası tamamlama](/Users/ertugan/Desktop/novalab/apps/api/src/modules/health-reports/health-reports.service.ts:730): modüller arası iş durumu.                                                                                                                   |
| E11 | [Zamanlanmış işler](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/queue/processors/scheduled-jobs.processor.ts), [kuyruk servisi](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/queue/queue.service.ts): vade sweep placeholder, kuyruk altyapısı mevcut.                                                                                              |
| E12 | [Paylaşılan klinik kurallar](/Users/ertugan/Desktop/novalab/packages/shared-types/src/spirometry.ts), [rapor alanları](/Users/ertugan/Desktop/novalab/packages/shared-types/src/health-report.ts): klinik kabulün teknik testten ayrı yürütüleceği alanlar.                                                                                                                      |
| E13 | [Çalışan raporu işi](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/queue/jobs/generate-employee-report.job.ts:51): gerçek PDF yerine TXT üretimi.                                                                                                                                                                                                                   |
| E14 | [Eğitim servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/trainings/trainings.service.ts), [sertifika servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/certificates/certificates.service.ts): NotImplementedException.                                                                                                                                    |
| E15 | [Paket fiyat hesabı](/Users/ertugan/Desktop/novalab/apps/api/src/modules/test-packages/package-pricing.ts), [şema](/Users/ertugan/Desktop/novalab/apps/api/prisma/schema.prisma:930): mevcut fiyat temeli.                                                                                                                                                                       |
| E16 | [Bildirim işlemcisi](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/queue/processors/notifications.processor.ts): sağlayıcı gönderimi placeholder.                                                                                                                                                                                                                   |
| E17 | [Auth store](/Users/ertugan/Desktop/novalab/apps/web/src/stores/auth.store.ts): refresh token browser storage içinde; XSS/ortak bilgisayar riskine göre HttpOnly cookie ve CSRF dahil oturum tasarımı değerlendirilmeli.                                                                                                                                                         |
| E18 | [Belge işlemcisi](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/queue/processors/documents.processor.ts), [sheet okuyucu](/Users/ertugan/Desktop/novalab/apps/api/src/modules/imports/sheet-reader.ts), [OCR servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/identity/ocr/id-card-ocr.service.ts): parse öncesi kaynak sınırları ve izolasyon kapsamı. |
| E19 | [App modülü](/Users/ertugan/Desktop/novalab/apps/api/src/app.module.ts), [logger](/Users/ertugan/Desktop/novalab/apps/api/src/infrastructure/logger/logger.module.ts): throttler ve yapılandırılmış log temeli.                                                                                                                                                                  |
| E20 | [Audit servisi](/Users/ertugan/Desktop/novalab/apps/api/src/modules/audit/audit.service.ts): yazma hatası loglanıp yutuluyor; kod yorumundaki immutable sözü depolama seviyesinde garanti değil.                                                                                                                                                                                 |
| E21 | [Health e2e](/Users/ertugan/Desktop/novalab/apps/api/test/health.e2e-spec.ts): altyapı fake'leriyle dört test.                                                                                                                                                                                                                                                                   |
| E22 | [CI](/Users/ertugan/Desktop/novalab/.github/workflows/ci.yml), [Jest config](/Users/ertugan/Desktop/novalab/apps/api/jest.config.js): lint/typecheck/unit/build/migration kontrolü var; coverage eşiği ve güvenlik tarama adımları yok.                                                                                                                                          |
| E23 | [Hasta import](/Users/ertugan/Desktop/novalab/apps/api/src/modules/employee-imports/employee-imports.service.ts), [firma import](/Users/ertugan/Desktop/novalab/apps/api/src/modules/company-imports/company-imports.service.ts): önizleme ve satır sonuçları var; kalıcı batch/rollback süreci yok.                                                                             |
| E24 | [README](/Users/ertugan/Desktop/novalab/README.md): çalışan özelliklerle eski skeleton TODO açıklamaları birlikte duruyor; kullanım ve operasyon dokümanı ayrıştırılmalı.                                                                                                                                                                                                        |

Bu teslimde uygulama davranışı değiştirilmedi. Çıktı, uygulama geliştirme ve kurum/sağlayıcı işlerini birlikte takip etmek için hazırlanmış değerlendirme ve yapılacaklar dokümanıdır.
