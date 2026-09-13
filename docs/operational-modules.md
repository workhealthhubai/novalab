# Operasyon modülleri

Boş modül ekranları yerine aşağıdaki akışlar eklenmiştir:

- Dashboard: yetkiye göre gerçek hasta/firma sayıları, açık protokoller, onay bekleyen raporlar ve hızlı erişim.
- Laboratuvar: protokol, numune, laboratuvar, tarih ve sonuç metni; taslak/tamamlandı durumu.
- İSG raporları: firma, dönem, hazırlayan uzman, isteğe bağlı protokol ve rapor metni.
- Şablonlar: laboratuvar/İSG metinleri, aktif/pasif durumu; rapor formuna metin ekleme.
- Ön muhasebe: firma, belge numarası, gelir/gider, tutar, vade, bekleyen/ödenmiş kayıtlar ve tahsilat-ödeme farkı.
- Doktor hakediş: hekim, dönem, elle girilen hizmet adedi ve birim ücret üzerinden hesaplama ve ödeme durumu.
- Alt OSGB: kurum, vergi numarası, yetki belgesi ve iletişim bilgileri. Bu kayıtlar ayrı tenant veya kullanıcı erişimi oluşturmaz.
- DICOM: mevcut radyoloji/PACS servisleriyle kayıt listesi, bekleyen çalışmalar, eşleştirme ve görüntü detayına geçiş.
- E-imza: mevcut imza pedi belge arşivi, PDF açma ve SHA-256 bütünlük doğrulaması. Nitelikli elektronik imza sağlayıcısı/sertifika entegrasyonu dahil değildir; ekranda açıkça belirtilir.

## Kalıcılık ve API

`20260912160000_operation_registers` geçişi `operation_records` tablosunu ekler. Geçiş yerel geliştirme veritabanına uygulanmıştır. Diğer ortamlarda normal `pnpm db:migrate:deploy` akışıyla uygulanır.

`/api/operations/:kind` GET/POST, `/:kind/:id` PUT, `/:kind/summary` GET ve `/:kind/options/:field` GET uçları laboratuvar (`lab`), İSG (`isg`), şablon (`templates`), ön muhasebe (`accounting`), hakediş (`payouts`) ve alt OSGB (`sub-osgb`) kayıtlarını yönetir. `/api/operations/dashboard` yetkiye göre sayımları döndürür. Listeleme sayfalı; başlık, durum, tarih ve protokol filtreleri desteklenir.

Tür bazlı alanlar ve izinler ortak pakette tanımlanır. API alanları doğrular, tenant kimliğini oturumdan alır, ilişkileri aynı kurum içinde doğrular. Güncellemeler `version` gerektirir. Tamamlanmış raporlar ve ödenmiş mali kayıtlar değiştirilemez; şablonlar ve alt OSGB kayıtları pasifleştirilebilir. Tutarlar veritabanında tam sayı kuruştur.

Bir protokolün ilgili laboratuvar/İSG kaydı tektir. Tamamlama, rapor kaydı ve protokol kaleminin DONE geçişini aynı işlemde yapar; kapalı/iptal protokole yazılamaz. Protokol detayında oluşturulan rapora bağlantı görünür. Sağlık verisi erişimleri ve yazma işlemleri denetim izine kaydedilir.

Laboratuvar sonuçları elle girilen rapor metnidir; cihaz/LIS bağlantısı veya otomatik klinik yorumlama yoktur. Rapor çıktısı UTF-8 metin dosyasıdır. Muhasebe kaydı banka işlemi veya e-fatura gönderimi gerçekleştirmez. Hakedişte hizmet adedi otomatik muayene sayımı değildir.

## Doğrulama

- API: operasyon doğrulama ve servis testleri (17 test); tenant ayrımı, izin, tutar hassasiyeti, protokol durumu, tekrar kayıt ve sürüm çakışması.
- Web: modül kayıt/hata akışı ve uygulama yönlendirme testleri (55 test).
- API ve web TypeScript kontrolleri; web lint, yeni API dosyaları lint ve web üretim derlemesi.
- Tarayıcıda gerçek API üzerinden muhasebe formu ve şablon oluşturma/güncelleme doğrulandı. Demo kuruma kullanılabilir bir İSG değerlendirme metin şablonu eklendi.
