# Novalab OSGB kapsam ve kullanıma hazırlık denetimi

> **Güncelleme:** Bu belge ilk denetimin tarihsel bulgularını içerir. A01, A02, A03, A04 ve A07 düzeltmeleri ile A08 yönetici destekli şifre kurtarma tamamlandı. A06 kişisel bildirim ve güncel muayene takibi düzeltildi; dış gönderim ile A05 revizyon/ters işlem açık; güncel durum ve doğrulamalar [öncelikli düzeltmeler kaydındadır](./OSGB-ONCELIKLI-DUZELTMELER.md).

**Tarih:** 12 Eylül 2026  
**Kapsam:** Mevcut çalışma ağacındaki API, web arayüzü, veri modeli, yetkiler, otomatik testler ve yerel çalışan servisler. Bu incelemede uygulama kodu değiştirilmedi.

## Sonuç

**Hayır, tam kapsamlı bir OSGB yazılımında beklenen bütün süreçler henüz yok.** Uygulama hasta kabul, protokol, tetkik ve hekim raporlaması etrafında gelişmiş bir temel sunuyor. İş güvenliği saha yönetimi, eğitim, sözleşme/görevlendirme, resmî veri aktarımı ve kapsamlı finans süreçleri ise eksik veya başlangıç düzeyinde.

Önceki geliştirmede boş sayfaların işlev kazanması, bu alanların bütün iş süreçlerinin tamamlandığı anlamına gelmiyor. Laboratuvar ve İSG kayıtları, ön muhasebe, hakediş ve alt OSGB ekranları şu anda sınırlı kayıt araçlarıdır. **Firma temsilcilerinin şirket kapsamı düzeltilmeden dış firma erişimi açılmamalı.** Sağlık raporunun tetkik bütünlüğü ve düzeltme süreçleri de üretim kullanımı öncesinde ele alınmalı.

Bu rapor bir mevzuata uygunluk belgesi değildir. Her OSGB yükümlülüğünün aynı yazılımda bulunması zorunlu değildir; ancak dışarıda yürütülen sürecin sahibi, kaydı ve takip yöntemi açık olmalıdır. Menü bulunması, API bulunması, sürecin uçtan uca çalışması ve resmî kurumun çıktıyı kabul etmesi ayrı seviyelerdir.

## Mevcut ürünün kapsamı

**Var:** İşlevsel uygulama akışı mevcut; üretim kabulü yapıldığı anlamına gelmez. **Sınırlı:** Sürecin bir kısmı mevcut. **API:** Servis mevcut, kullanıcı ekranı yok. **Yok:** Bu incelemede uygulanmış akış bulunmadı.

| Alan                                   | Durum   | Mevcut işlev / sınır                                                                                                                      |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Kurum, firma, şube ve işyeri           | Var     | Kurum bilgisi; firma, işyeri, SGK/NACE/tehlike sınıfı kayıtları                                                                           |
| Kullanıcı, rol ve oturum               | Sınırlı | Yetkiler ve oturum yönetimi var; firma temsilcisi şirket izolasyonu eksik                                                                 |
| Hasta/çalışan kabul                    | Var     | Kimlik, iletişim, çalışma bilgileri, arama, firma/işyeri ilişkisi                                                                         |
| Toplu aktarım                          | Var     | Hasta ve firma Excel aktarımı, önizleme ve satır sonuçları                                                                                |
| Kimlik doğrulama                       | Sınırlı | OCR/MRZ/barkod ve yapılandırılabilir NVİ sağlayıcısı; gerçek kurum bağlantısı doğrulanmadı                                                |
| Protokol ve tetkik istemi              | Sınırlı | Ziyaret, istem, durum ve kapatma; kayıt görevlisi arayüz yetkisi hatalı, klinik kayıt ile durum bütünlüğü güçlendirilmeli                 |
| Odyometri, spirometri, EKG, göz        | Var     | Ölçüm/sonuç kayıtları; her cihaz markası için otomatik veri aktarımı yok                                                                  |
| Radyoloji ve pnömokonyoz               | Var     | İstem, görüntü/sonuç ve ilgili değerlendirme akışları                                                                                     |
| DICOM/PACS                             | Sınırlı | Orthanc, iş listesi, eşleştirme ve görüntüleyici; yerel bağlantı çevrimiçi, fiziksel cihaz kabulü yapılmadı                               |
| Laboratuvar                            | Sınırlı | Numune ve serbest metin sonuç kaydı; yapılandırılmış analit, birim/referans aralığı, kritik değer, LIS ve birleşik rapor bağlantısı eksik |
| Sağlık raporu                          | Sınırlı | Anamnez, muayene, karar, hekim onayı ve PDF; LAB özeti ve gerekli tetkiklerin tamamlanma kontrolü eksik                                   |
| Geçmiş muayene karşılaştırma           | Var     | Yetkili kullanıcının muayeneleri karşılaştırması                                                                                          |
| Belge arşivi ve imza pedi              | Var     | Belge/form imzalama, PDF ve kayıtlı belgenin bütünlük kontrolü                                                                            |
| Nitelikli elektronik imza              | Yok     | E-İmza ekranı arşiv ve SHA256 doğrulaması sunuyor; nitelikli imza sağlayıcısı değil                                                       |
| KVKK izinleri                          | Sınırlı | Şablon/sürüm ve izin kaydı; tek başına veri koruma yükümlülüklerinin tamamı değil                                                         |
| İSG raporları                          | Sınırlı | Firma/dönem/sorumlu ve serbest metin; yapılandırılmış saha iş güvenliği modülü değil                                                      |
| Rapor şablonları                       | Sınırlı | LAB/İSG metin şablonları; bütün formları tasarlayan bir çıktı tasarımcısı değil                                                           |
| Randevu                                | API     | CRUD ve çakışma/ilişki kontrolleri var; takvim/planlama ekranı yok                                                                        |
| Eğitim ve sertifika                    | Yok     | Servisler HTTP 501 döndürüyor; uygulanmış süreç yok                                                                                       |
| Bildirim                               | Sınırlı | Uygulama içi bildirim ve tarih bazlı tarama; kişiye özel okundu bilgisi ve dış gönderim eksik                                             |
| Ön muhasebe                            | Sınırlı | Manuel gelir/gider, tutar, vade ve ödeme durumu; tam cari/finans sistemi değil                                                            |
| Doktor hakedişi                        | Sınırlı | Manuel adet × birim ücret; gerçekleşen hizmetlerden otomatik hesaplama yok                                                                |
| Alt OSGB                               | Sınırlı | İletişim/kayıt listesi; ayrı kuruluş yetkilendirme veya veri paylaşımı değil                                                              |
| Personel hareketi / aktif kullanıcılar | Var     | Denetim ve oturum görünürlüğü; üretim log saklama/izleme süreci ayrıca gerekli                                                            |
| İSG-KATİP / İBYS aktarımı              | Yok     | Bu uygulamadan doğrulanmış resmî gönderim, kabul/red ve tekrar gönderim akışı bulunmadı                                                   |

## Tam OSGB işletimi için eksik süreçler

ÇSGB'nin açıklamaları; sağlık gözetimine ek olarak risk değerlendirmesi, acil durum, eğitim, kaza/meslek hastalığı süreçleri ve görevlendirme gibi ayrı yükümlülükleri tarif ediyor. Bu nedenle sadece sağlık tetkiklerinin tamamlanması, bütün OSGB operasyonunun karşılandığı anlamına gelmez. [ÇSGB — sık sorulan sorular](https://www.csgb.gov.tr/tr/sikca-sorulan-sorular/is-sagligi-ve-guvenligi-genel-mudurlugu/)

| Eksik süreç                               | Beklenen ürün akışı                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Teklif, sözleşme ve görevlendirme         | Firma hizmet kapsamı, geçerlilik, uzman/hekim ataması, süre/kapasite planı, yenileme ve resmî kayıt referansı |
| Risk değerlendirmesi                      | İşyeri/tehlike, etkilenen kişiler, yöntem, risk seviyesi, önlem, sorumlu, termin, revizyon ve onay            |
| Düzeltici faaliyet / saha denetimi        | Tespit, kanıt, aksiyon, sorumlu, vade, gecikme ve kapatma doğrulaması                                         |
| Yıllık plan ve değerlendirme              | Firma bazlı hedefler, ziyaret/hizmet planı, gerçekleşen faaliyet ve dönem raporu                              |
| Eğitim ve sertifika                       | Plan, konu, eğitici, katılımcı, yoklama, değerlendirme, sertifika ve yenileme                                 |
| Acil durum ve tatbikat                    | Plan sürümü, ekipler, görevler, tatbikat, katılım, değerlendirme ve iyileştirme                               |
| İş kazası / ramak kala / meslek hastalığı | Olay, inceleme, kök neden, aksiyon, bildirim takibi ve belge                                                  |
| Kurul / çalışan katılımı                  | Uygulanabilir işyerlerinde toplantı, gündem, karar, sorumlu ve karar takibi                                   |
| Ekipman, KKD ve ortam ölçümü              | Envanter, zimmet, periyodik kontrol, ölçüm sonucu ve sonraki kontrol                                          |
| Firma portalı                             | Şirkete sabitlenmiş veri kapsamı, rol bazlı görünürlük, tıbbi verilerin ayrıca sınırlandırılması              |
| Hizmet ve finans bütünlüğü                | Firma tarifesi, gerçekleşen hizmet, faturalama, tahsilat/mahsup, kısmi ödeme ve ters kayıt                    |
| Resmî entegrasyon operasyonu              | Yetkili kanal, güncel veri seti eşlemesi, gönderim, kabul/red, yeniden deneme ve denetim izi                  |
| Sağlık izlemi / sevk                      | Güncel muayeneye göre takip, kontrollü düzeltme, sevk ve kapanış takibi                                       |

Acil durum kayıtları yalnızca metin saklamaktan ibaret olmamalı; tatbikatın katılım ve değerlendirme çıktıları da izlenmeli. [ÇSGB — Acil Durum Planı Hazırlama Rehberi](https://www.csgb.gov.tr/Media/vnfptwuo/acil-durum-plani-hazirlama-rehberi_mdb.pdf)

## Öncelikli bulgular ve kabul ölçütleri

### A01 — Firma temsilcisi başka firmaların çalışanlarını görebiliyor · P0

**Doğrulandı:** Yerel demo firma temsilcisiyle çalışan listesi isteği HTTP 200 döndü; dönen 30 kayıtta beş farklı firma bulundu. Kişisel bilgiler bu rapora alınmadı. Sorun farklı OSGB tenant'ları arasında kanıtlanmış bir sızıntı değil; aynı OSGB içindeki müşteri firmalar arasında kapsam eksikliği.

**Kanıt:** `apps/api/src/modules/employees/employees.repository.ts` yalnızca tenant ve isteğe bağlı firma filtresini uyguluyor. `apps/api/src/modules/roles/role-templates.ts` firma temsilcisine çalışan okuma yetkisi veriyor; zorunlu kullanıcı–firma kapsamı bulunmuyor.

**Kabul:** Kullanıcı–firma/işyeri eşlemesi sunucuda zorunlu uygulanmalı. Liste, tekil detay, arama, belge, dışa aktarma ve ilişkili uçlar ikinci firma verisini döndürmemeli. İstek parametresini değiştirerek kapsam aşılamamalı. Dış firma erişimi bu testler geçene kadar açılmamalı.

### A02 — Kayıt görevlisi protokol ekranına erişemeyebilir · P1

**Kodla doğrulandı:** Protokol menüsü `EXAMINATIONS_READ` istiyor. Kayıt görevlisinde protokol yetkileri mevcutken bu tıbbi okuma yetkisi yok. `PermissionGate` aynı menü tanımını detay rotalarına da uyguluyor.

**Kanıt:** `apps/web/src/app/router/navigation.ts:126`, `apps/web/src/app/router/permission-gate.tsx`, `apps/api/prisma/seed/demo-definitions.ts`.

**Kabul:** Protokol listesi ve detayına kendi protokol yetkisiyle erişim sağlanmalı; çözüm olarak kayıt görevlisine tüm tıbbi okuma yetkileri verilmemeli. Gerçek kayıt görevlisi rolüyle kabul senaryosu çalıştırılmalı.

### A03 — Laboratuvar sonucu birleşik sağlık raporu/PDF özetine alınmıyor · P1

**Kodla doğrulandı:** `health-reports.service.ts:629` içindeki `testSummaries`, yeni LAB operasyon kayıtlarını okumuyor. Protokolde tamamlanan laboratuvar kaydı bulunsa da birleşik tetkik özeti onu kapsamıyor.

**Kabul:** Doğru çalışan ve ziyaretle ilişkili, uygun durumdaki laboratuvar sonucu rapor önizlemesine ve onay anındaki PDF'ye tutarlı taşınmalı. Başka ziyaretin sonucu alınmamalı; onaylı PDF sonradan değişmemeli.

### A04 — Onaylanabilir rapor ile klinik olarak tamamlanmış ziyaret ayrımı zayıf · P1

**Kodla doğrulandı:** `packages/shared-types/src/health-report.ts:81` tarih, karar, hekim ve karara bağlı açıklamaları kontrol ediyor; gerekli istemlerin tamamlanması burada kontrol edilmiyor. Protokol kalemi de klinik kayıt zorunluluğu olmadan elle tamamlanabiliyor (`protocols.service.ts`, `protocol-rules.ts`).

**Kabul:** Hekimin bu ziyaret için gerekli gördüğü tetkikler ve ilgili sonuçları doğrulanmalı. İptal/istisna varsa gerekçe ve yetkili karar kaydedilmeli. Her çalışana aynı tetkikleri zorunlu tutan genel bir kontrol yapılmamalı. İş akışı durumu klinik sonuç yerine geçmemeli.

### A05 — Tamamlanmış kayıtlar için kontrollü düzeltme eksik · P1

LAB/İSG tamamlanınca ve finans/hakediş ödenince kayıt kilitleniyor. LAB/İSG'de protokol başına tek kayıt sınırı da var. Hatalı sonucun ek raporla düzeltilmesi, eski/yeni sürüm ilişkisi ve gerekçeli onay süreci bulunmuyor. Finans tarafında iptal, iade, ters kayıt ve kısmi ödeme süreçleri eksik.

**Kanıt:** `apps/api/src/modules/operations/operation-validation.ts`, `operations.service.ts`.

**Kabul:** Eski kayıt korunarak kim, ne zaman, neden düzeltti bilgisi ve yetkili onayıyla yeni sürüm/ters işlem oluşturulmalı; bağlı raporların etkilenmesi açık yönetilmeli.

### A06 — Bildirimler kişiye özel değil; e-posta/SMS gönderimi yok · P2

`notifications.service.ts` liste ve okundu işlemlerini tenant düzeyinde yürütüyor. Bir kişinin okuması diğerlerini etkileyebilir. `notifications.processor.ts` dış gönderimi gerçek sağlayıcıya yapmıyor. Tarih taraması da eski muayenelerden gereksiz bildirim veya kaçırılmış taramalarda eksiklik üretebilir.

**Kabul:** Alıcı bazlı erişim/okundu bilgisi, güncel muayene seçimi, kaçırılan işlerin telafisi ve gerçek sağlayıcının teslimat durumları test edilmeli.

### A07 — Operasyon sonucu kaydı üst protokol durumunu tutarlı güncellemeyebilir · P2

`operations.service.ts` sonuçla kalemi tamamladığında üst protokolde yalnızca `updatedAt` güncelliyor. Normal kalem güncellemesinin türettiği protokol durumu burada uygulanmıyor.

**Kabul:** LAB/İSG kaydı ve normal kalem güncellemesi aynı durum kurallarını kullanmalı; açık/devam eden/tamamlanan ziyaret sayıları tutarlı olmalı.

### A08 — Şifre kurtarma bağlantısı işlem başlatmıyor · P2

`login-form.tsx` içindeki “Şifremi Unuttum” bağlantısı giriş sayfasına yönleniyor. Yönetici üzerinden parola belirleme mevcut; kullanıcıya dönük güvenli kurtarma akışı yok.

**Kabul:** Süreli, tek kullanımlık kurtarma ve oturum politikası uygulanmalı veya arayüz mevcut yönetici destek yolunu doğru anlatmalı.

## Veri güvenliği ve işletim hazırlığı

Sağlık verileri özel nitelikli kişisel veridir. İzin kaydı bulunması tek başına bütün işleme faaliyetleri için yeterli değerlendirme değildir; uygun hukuki dayanak ve erişim kapsamı belirlenmelidir. [KVKK — Özel Nitelikli Kişisel Veriler](https://www.kvkk.gov.tr/Icerik/2051/Ozel-Nitelikli-Kisisel-Veriler)

Mevcut rol, tenant, denetim ve hekim sahipliği kontrolleri değerli bir temel sunuyor. Üretim kabulünde A01'e ek olarak erişim matrisi, güvenli oturum, TLS, yedekleme, geri yükleme denemesi, olay izleme ve saklama süreçleri kanıtlanmalı. Bunların her biri için sorumlu ve çalıştırılabilir işletim prosedürü gerekli. README'de yedekleme önerisi bulunması, yedeğin gerçekten alındığını veya geri yüklenebildiğini kanıtlamaz. Bu incelemede otomatik yedekleme/geri yükleme kabulü yapılmadı.

Tedbirler işlenen verinin riskine göre belirlenmelidir; belirli bir teknoloji adının bulunması tek başına uyumluluk sağlamaz. [KVKK — Veri Güvenliğine İlişkin Yükümlülükler](https://www.kvkk.gov.tr/Icerik/2040/Veri-Guvenligine-Iliskin-Yukumlulukler)

Belge yaşam döngüsünde saklama ve imha işlerinin uygulaması tamamlanmış görünmüyor; saklama gerekçeleri sona erdiğinde uygulanacak süreç ayrıca tanımlanmalı. [KVKK — Silme, Yok Etme veya Anonim Hale Getirme](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi)

## Doğrulama sonuçları

| Kontrol                  | Sonuç                                                                             |
| ------------------------ | --------------------------------------------------------------------------------- |
| API otomatik testleri    | 44 test grubu, 187 test geçti                                                     |
| Web otomatik testleri    | 28 dosya, 118 test geçti                                                          |
| API HTTP testleri        | 4 test geçti; altyapısı taklit edilen sağlık uçları, klinik uçtan uca kabul değil |
| Toplam                   | **309 test geçti**                                                                |
| Lint / tip kontrolü      | Başarılı                                                                          |
| API ve web derleme       | Başarılı; web ana paketi yaklaşık 1,84 MB, paket boyutu uyarısı mevcut            |
| Yerel hazırlık kontrolü  | `/health/ready` → 200                                                             |
| Operasyon modülleri      | Dashboard, LAB, İSG, şablon, ön muhasebe, hakediş, alt OSGB → 200                 |
| Randevu API              | 200                                                                               |
| Eğitim / sertifika API   | 501 / 501                                                                         |
| PACS operasyon kontrolü  | 200, bağlantı ONLINE                                                              |
| Firma temsilcisi kapsamı | Başarısız: beş farklı firma çalışanı görünür                                      |

**Sınırlar:** Her ekranın bütün etkileşimleri yeni bir tarayıcı kabul testinden geçirilmedi. Fiziksel tıbbi cihazlar, imza pedi donanımı, gerçek NVİ, nitelikli e-imza, resmî İBYS gönderimi, yük/sızma testleri ve yedekten geri dönüş doğrulanmadı. Testlerin geçmesi bunları veya klinik doğruluğu garanti etmez. Doğrudan mevzuat PDF erişimi ve İBYS sitesi bu incelemede yanıt vermedi; güncel entegratör/veri seti kabul koşulları teyit edilmiş sayılmıyor.

Eski `PROJE-EKSIKLERI-VE-YAPILACAKLAR.md` güncel sonuç yerine kullanılmamalı. Önceden bildirilen hekim sahipliği, genel muayene güncellemesiyle onay atlama ve DICOM erişim kontrollerinin bir kısmına mevcut kodda düzeltmeler eklenmiş. Bu rapor kalan kapsam ve doğrulanan yeni bulgulara odaklanır.

## Önerilen geliştirme sırası

1. **Erişim ve klinik bütünlük:** A01–A05; şirket kapsamı ve hekim/kayıt görevlisi rolleriyle kabul testleri.
2. **Günlük operasyon:** Randevu ekranı, A06–A08, kontrollü revizyon, yapılandırılmış laboratuvar ve sonuç aktarımı.
3. **İSG hizmetleri:** Sözleşme/görevlendirme, risk, saha aksiyonu, yıllık plan, eğitim/sertifika, acil durum, olay ve kurul süreçleri.
4. **Hizmet–finans bağlantısı:** Tarife, gerçekleşen hizmet, hakediş, cari ve ödeme düzeltmeleri.
5. **Harici entegrasyon ve üretim kabulü:** Güncel resmî kanal koşulları, imza sağlayıcısı, cihaz kabulü, yedek geri dönüşü ve güvenlik testleri.

Her paket tamamlandığında sadece ekranın açılması değil; normal işlem, yanlış veri, yetkisiz erişim, düzeltme ve çıktı senaryoları kabul edilmeli. Kullanım adımları ayrı [kılavuzda](./OSGB-KULLANIM-KILAVUZU.md) yer alıyor.
