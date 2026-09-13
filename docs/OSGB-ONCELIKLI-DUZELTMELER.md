# Öncelikli OSGB düzeltmeleri

12 Eylül 2026 tarihli kapsam denetiminden sonra uygulanan değişiklikler.

## Tamamlananlar

| Bulgu                 | Değişiklik                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 — Firma kapsamı   | Kullanıcıya tek firma atanabiliyor. Firma hesabı yalnızca bu firmanın çalışan, firma, işyeri ve sınırlı randevu kayıtlarını okuyabiliyor. Liste, toplam, arama, tekil kayıt ve dashboard sorguları sunucuda filtreleniyor.                      |
| A02 — Kayıt görevlisi | Protokol listesi ve detay rotası `protocols.read` yetkisini kullanıyor; tıbbi okuma yetkisi gerektirmiyor. Dashboard protokol sayacı da bu yetkiye bağlandı.                                                                                    |
| A03 — LAB/PDF         | Doğru çalışan ve protokole bağlı, tamamlanmış laboratuvar sonucu rapor özetine ve yeni oluşturulan PDF'ye ekleniyor. Numune bilgileri, birimler/referans aralıkları ve çok satırlı içerik korunuyor.                                            |
| A04 — Rapor onayı     | İstenen klinik tetkik bekliyorsa veya tamamlandı işaretine rağmen ilgili sonuç yoksa onay reddediliyor. İptal edilen/eksik protokol de onaylanamıyor. Radyolojide sadece görüntü alınması yeterli değil; raporlanmış, içerikli sonuç gerekiyor. |
| A07 — Protokol durumu | LAB/İSG sonucu tamamlandığında üst protokol aynı işlem içinde devam ediyor durumuna geçiyor. Taslak kaydı, mevcut devam ediyor durumunu geriletmiyor.                                                                                           |

## Firma hesabı nasıl hazırlanır?

1. Kurum yöneticisi **Genel Ayarlar → Personel Tanımları** ekranını açar.
2. Firma temsilcisinin kaydında **Düzenle → Firma erişim kapsamı** alanından doğru firmayı seçer ve kaydeder.
3. İlgili kullanıcıya firma temsilcisi rolü verilir. Atanmamış temsilci veri okuyamaz; eski hesaplara otomatik firma ataması yapılmadı.
4. Firma atanan hesap, ek rolleri olsa da izin verilen firma okumalarıyla sınırlıdır. İç personel hesaplarına firma kapsamı atamayın; bu alan çalıştığı işveren bilgisinden farklı bir erişim kısıtıdır.

Başka OSGB'ye ait firma atanamaz. Silinmiş firmaya bağlı hesap veri alamaz. Atama değişikliği sonraki API isteğinde geçerlidir. Firma hesaplarına tıbbi notlar, fotoğraflar, belge/dışa aktarma, tenant genelindeki bildirimler veya kullanıcı yönetimi açılmaz. Randevu yanıtı yalnızca temel tarih/durum ve ilişki kimliklerini içerir; serbest metin ve klinik belge bağlantıları gönderilmez.

Bu paket, kapsamlı müşteri portalını tamamlamaz. Güvenli kapsam uygulanmamış uçlar firma hesabına kapalıdır; yeni uç eklenirken firma kapsamı ayrıca uygulanıp test edilmelidir.

## Tetkik iptali ve onay

Protokol kaleminde **İptal** seçildiğinde gerekçe istenir. **Not / gerekçe** düğmesiyle mevcut açıklama düzenlenebilir. Bekleyenleri iptal ederek protokol kapatırken de gerekçe gerekir. Gerekçeler hekim ekranında ve oluşturulan PDF'de görünür.

Onay kontrolü yalnızca ilgili ziyarette istenmiş klinik tetkikleri esas alır; tüm çalışanlara standart bir test paketi zorunlu kılmaz. Sağlık raporunun kendi kalemi ve ayrı İSG raporu bu kontrolün dışında tutulur. Hekim sonucu ve iptal gerekçesini mesleki değerlendirmesiyle kontrol etmeye devam eder.

PDF oluşturulup saklandıktan sonra protokol ve tetkik özeti, seri hale getirilebilir veritabanı işlemi içinde yeniden kontrol edilir. Bu sırada değişiklik olmuşsa onay durur; referanssız PDF temizlenir ve yeniden değerlendirme istenir. Daha önce onaylanmış PDF'ler yeniden yazılmaz; eski raporlara geriye dönük LAB eklemesi yapılmaz.

## Doğrulama

- API: 208 otomatik test geçti; şirket kapsamı, yetki birleştirme, veri sorguları, rapor kaynağı, eksik sonuç ve onay sırasında değişiklik senaryoları dahil.
- Web: 120 test geçti; kayıt görevlisinin liste/detay erişimi için regresyon testleri dahil.
- HTTP sağlık testleri: 4 test geçti. Toplam 332 otomatik test; ayrıca 40 gerçek API erişim kontrolü.
- Lint, tip kontrolü ve API/web derlemesi başarılı. Web ana paketi için mevcut boyut uyarısı devam ediyor.
- Gerçek yerel API/PostgreSQL: İki geçici test tenant'ında **40 HTTP kontrolü geçti**. Kapsam atama/değiştirme, başka firma/tenant kimliği, filtre manipülasyonu, silinmiş firma ve dışa aktarma sınırları doğrulandı. Test verileri temizlendi; demo klinik kayıtları değiştirilmedi.
- Tarayıcıda personel firma kapsamı alanı ve gerekçesiz iptalde devre dışı Kaydet düğmesi kontrol edildi; mevcut kayıtlarda değişiklik kaydedilmedi.

Gerçek erişim testini tekrar çalıştırma (yalnızca yerel API ve veritabanını kabul eder):

```sh
pnpm --filter @osgb/api exec tsx test/company-scope.acceptance.ts
```

Veritabanı değişikliği: `20260912180000_company_user_scope`. Yerel veritabanına uygulandı. Başka bir ortam güncellenirken API başlatılmadan önce migration uygulanmalı:

```sh
pnpm --filter @osgb/api prisma:migrate:deploy
```

## İkinci paket — 13 Eylül 2026

**A06 uygulama içi bildirimler:** Her alıcıya ayrı bildirim kaydı oluşturulur. Liste, sayaç, tekil okundu ve tümünü okundu işlemleri hem kullanıcı hem tenant hem güncel yetkiyle sınırlıdır. Muayene uyarıları muayene okuma yetkisi olan aktif iç personele; şifre destek talepleri kullanıcı güncelleme yetkisi olan aktif iç personele gider. Firma hesapları alıcı değildir. Rolü daraltılan kullanıcı eski yetkisine ait bildirimleri artık göremez.

Eski ortak bildirimler migration ile o anda yetkili alıcılara kopyalandı. Önceki ortak okundu bilgisinin kime ait olduğu bilinmediği için bu kopyalar okunmamış başlar. Eski kaynak kayıtları korunur, kişisel gelen kutusunda gösterilmez.

**Güncel muayene hatırlatması:** Her aktif çalışanın en güncel onaylı muayenesi esas alınır (muayene tarihi, onay tarihi ve kimlik sırası). Yeni muayenenin takip tarihi boşsa eski tarihe dönülmez. İstanbul gününe göre 30, 7, 1, 0 ve 7 gün gecikme eşikleri kullanılır. Kaçırılan tarama sonrasında mevcut duruma uygun eşik seçilir. Kuyruk çalışırken muayene tekrar kontrol edilir; yeni muayene eski uyarıyı geçersiz kılar. Alıcı ve iş kimliğiyle tekrar işlemde çift kayıt önlenir.

**A08 yönetici destekli şifre kurtarma:** Giriş ekranındaki Şifremi Unuttum artık destek formuna gider. E-posta ve kurum kodu ile talep oluşturulur; hesap varlığını ifşa etmeyen ortak yanıt döner. Yönetici kimlik doğrulamasından sonra Personel Tanımları → Kurtarma bağlantısı → Bağlantı oluştur yolunu izler. Kullanıcı bağlantıda kendi şifresini belirler. Bağlantı 15 dakika geçerli ve tek kullanımlıktır; yeni bağlantı eskisini iptal eder. Veritabanında yalnızca özet değeri saklanır. Başarılı yenileme tüm eski oturumları iptal eder. Bağlantı çıkarıldıktan sonraki kullanıcı kaydı değişiklikleri bağlantıyı da geçersiz kılabilir; böyle durumda yenisi oluşturulmalıdır.

**Dış gönderim:** E-posta/SMS sağlayıcısı hâlâ bağlı değil. API bu kanallarda 503 döner, işleyici gönderim başarılıymış gibi kayıt üretmez. Yönetici bağlantıyı doğruladığı kişiye kurumun güvenli iletişim yöntemiyle kendisi iletir.

**Doğrulama:** API 224, web 123 ve HTTP sağlık testleri 4: toplam **351 otomatik test geçti**. Gerçek yerel API/PostgreSQL üzerinde kurtarma ve bildirimler için **27 HTTP kontrolü**, firma kapsamı için **40 HTTP kontrolü** geçti. Eşzamanlı tek kullanım, süre sonu, eski bağlantının iptali, eski erişim/yenileme oturumlarının reddi, kullanıcılar arası okundu ayrımı ve audit kayıtlarında sır bulunmaması doğrulandı. Geçici test tenant'ları temizlendi. Kurtarma formu ve eksik bağlantı uyarısı gerçek tarayıcıda da kontrol edildi.

Migration'lar yerel veritabanına uygulandı: `20260913090000_personal_notification_inboxes`, `20260913093000_password_recovery`.

Gerçek kabul testi (yalnızca yerel servislerde):

```sh
ACCEPTANCE_API_URL=http://localhost:3002 pnpm --filter @osgb/api exec tsx test/recovery-notifications.acceptance.ts
```

Bu oturumda 3000 portunda başka proje bulunduğu için OSGB API 3002'de, web 5173'te 3002 proxy'siyle başlatıldı. Varsayılan proje yapılandırması değiştirilmedi.

## Sıradaki açık bulgular

- **A05:** Kesinleşmiş klinik kayıtlarda gerekçeli revizyon/ek rapor; ödenmiş finans kayıtlarında kontrollü ters işlem ve kısmi ödeme.
- **A06 kalan kapsam:** Gerçek e-posta/SMS sağlayıcı entegrasyonu ve teslimat takibi. Uygulama içi alıcı/okundu ve güncel muayene takibi tamamlandı.
- **A08:** Yönetici destekli kurtarma tamamlandı. Kullanıcıya otomatik e-posta ile bağlantı gönderimi dış sağlayıcı entegrasyonuna bağlı.

Eğitim, saha İSG süreçleri, resmî entegrasyon ve diğer kapsam eksikleri bu ilk düzeltme paketinin dışında kalıyor.
