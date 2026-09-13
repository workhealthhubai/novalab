# Hekim e-imza entegrasyonu

13 Eylül 2026. Entegrasyon hazırlığıdır; çalışan sertifikalı imzalama özelliği değildir.

## Mevcut bağlantı noktaları

- `apps/web/src/pages/doctor/e-signature-page.tsx`: bugün imza pediyle oluşturulmuş belgelerin arşivi ve SHA-256 bütünlük kontrolü var.
- `apps/api/src/modules/health-reports/health-reports.service.ts` → `approve`: hekimin aktif ve oturum sahibine bağlı olduğunu kontrol ediyor, tetkik/protokol verilerinden PDF üretiyor, veritabanında yeniden kontrol ederek raporu onaylıyor.
- `Examination.reportDocumentId`: onaylanan rapor PDF'sine bağlı. Mevcut dosya sonradan üzerine yazılmamalı.
- `Physician.userId`: oturum sahibi ile hekim eşleştirmesi mevcut. `signatureKey` bir imza görselidir; `certificateNumber` işyeri hekimliği belge numarasıdır. Bunlar e-imza sertifikası olarak kullanılmamalı.

## Uygulanacak kullanıcı akışı

1. Hekim **E-İmza** ekranında desteklenen imza uygulamasına bağlanır. Sertifikalar uygulamanın SDK/API'si üzerinden okunur; kullanıcı sertifika seçer.
2. Sertifika sahibi ile hesabın doğrulanmış hekim kimliği eşleştirilir. Ad-soyad benzerliği tek başına eşleştirme sayılmaz. Mevcut hekim modelinde bu eşleştirme için doğrulanmış kimlik alanı henüz yoktur; sağlayıcının sunduğu kimlik kanıtına göre ayrıca uygulanmalıdır.
3. Hekim raporun son PDF'sini görür ve **E-imzala** işlemini başlatır. İmza isteği tenant, hekim, rapor sürümü ve PDF özetiyle bağlanır; kısa süreli ve tek kullanımlık olur.
4. PIN yerel imza uygulamasında/token arayüzünde girilir. Web/API PIN veya özel anahtar almaz ve saklamaz.
5. İmzalı dosya sunucuda doğrulanır: PDF'nin imzalanan revizyonu beklenen içerik olmalı; imza kapsamı, sertifika zinciri, sertifika sahibi, geçerlilik/iptal durumu ve seçilen imza profilinin koşulları kontrol edilmelidir. İstemcinin `valid: true` beyanı yeterli sayılmaz.
6. Rapor/protokol/tetkik verileri işlem sırasında değişmişse imza uygulamada kesinleştirilmez; hekim güncel PDF'yi yeniden inceleyip imzalar. Uzun süren cihaz işlemi boyunca veritabanı transaction'ı açık tutulmaz.
7. Doğrulanan imzalı PDF ayrı, değişmez belge olarak saklanır. İmza durumu klinik onay durumundan ayrı tutulur. Eski raporlar otomatik olarak e-imzalı işaretlenmez.
8. Hekim arşivden imzalı PDF'yi ve son doğrulama sonucunu görür. Zaman aşımı, cihaz yokluğu, kullanıcı iptali ve doğrulama hatası ayrı gösterilir.

## Sağlayıcıdan gereken bilgi

- Kullanılan imza uygulaması/entegrasyon ürünü ve sürümü; yalnızca sertifika markası yeterli olmayabilir.
- SDK/API ve tarayıcı–yerel uygulama bağlantı dokümanı, desteklenen işletim sistemleri.
- Deneme ortamı ve test sertifikası; gerekiyorsa kurumun lisans/API erişimi. Gizli erişim bilgileri sohbete yazılmamalı, uygun ortam yapılandırmasına eklenmeli.
- PDF imzalama/doğrulama desteği, desteklenen imza profilleri, zaman damgası ve sertifika iptal kontrolü arayüzleri.

Kurumun seçimi olmadan bilinmeyen bir localhost servisine bağlanılmayacak veya sağlık raporu harici servise gönderilmeyecek. Sağlayıcı protokolü tahmin edilerek çalışıyormuş gibi bir adaptör oluşturulmayacak.

## Kabul koşulları

Gerçek desteklenen cihaz ve test sertifikasıyla PDF imzalama/doğrulama; başka hekim ve başka tenant engeli; farklı PDF döndürme girişimi; süresi dolmuş/iptal edilmiş/güvenilmeyen sertifika; bağlantı kesilmesi ve PIN iptali; imzalama sırasında rapor değişikliği; aynı isteğin tekrarlanması; mevcut imza pedi arşivinin korunması. Test sertifikasıyla alınan sonuç üretim nitelikli imza olarak gösterilmemeli.

## Kontrol edilen resmî kaynaklar

- [Kamu SM elektronik imza kütüphaneleri](https://yazilim.kamusm.gov.tr/?q=%2Fnode%2F14): uygulama entegrasyonu ve PDF imza formatı desteği.
- [Kamu SM yazılımlar](https://www.kamusm.tr/urunler/yazilim/): kütüphane ve güncel lisans başvuru kanalı.
- [E-Güven yazılım kütüphanesi](https://www.e-guven.com/yazilim-kutuphanesi): entegrasyon ürünü ve imza yöntemleri.

Bu kaynaklar kurumun kullandığı ürünün teknik erişiminin mevcut olduğunu doğrulamaz. Entegrasyon kodu seçilen ürünün güncel teknik dokümanına göre yazılmalıdır.
