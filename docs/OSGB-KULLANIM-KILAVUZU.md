# Novalab OSGB kullanım kılavuzu

**Sürüm tarihi:** 13 Eylül 2026 — ikinci öncelikli düzeltme paketine göre güncellendi. [Değişiklik kaydı](./OSGB-ONCELIKLI-DUZELTMELER.md).

## Başlamadan önce

Uygulamanın ana çalışma sırası:

**Kurum ve kullanıcı tanımları → firma/işyeri → çalışan → ziyaret protokolü → gerekli tetkikler → hekim değerlendirmesi → rapor onayı/PDF → arşiv ve takip.**

Bu sürüm sağlık operasyonlarını ve temel yönetim kayıtlarını destekliyor. Eğitim/sertifika, yapılandırılmış risk değerlendirmesi, acil durum, sözleşme/görevlendirme ve resmî gönderim gibi süreçler tamamlanmış değil. Eksik süreçleri uygulamanın yaptığı varsayılmamalı; kurumun mevcut süreçleriyle ayrıca yürütülmeli. Ayrıntılar [kapsam denetiminde](./OSGB-KAPSAM-DENETIMI-2026-09-12.md).

**Kritik kullanım kuralları:** Firma temsilcisine Personel Tanımları üzerinden firma erişim kapsamı atayın; atanmamış temsilci veri göremez. Tamamlanmış LAB sonuçları doğru ziyaretin rapor özetine ve yeni PDF'sine eklenir. Bekleyen veya sonuçsuz klinik istemler onayı engeller; iptal gerekçeleri hekim tarafından incelenmelidir. E-İmza menüsü nitelikli elektronik imza hizmeti sunmuyor.

Yerel geliştirme arayüzü: [localhost:5173](http://localhost:5173). Kurum kullanımında size tanımlanan uygulama adresi ve kişisel hesabınızla giriş yapın. Demo hesapları gerçek işletim için kullanmayın.

## 1. İlk kurulum — kurum yöneticisi

### 1.1 Kurum bilgilerini girin

**Genel Ayarlar → Kurum Bilgileri:** Kurum unvanı, iletişim, adres, yetki bilgileri ve logoyu kontrol edin. Bu bilgiler rapor çıktısını etkiler. DICOM kullanılacaksa istasyon/AET yapılandırmasını teknik sorumluyla tamamlayın.

### 1.2 Personel ve doktor tanımlarını oluşturun

**Personel Tanımları:** Her çalışan için ayrı kullanıcı açın; görevine uygun rol verin. Ortak hekim veya yönetici hesabı kullanmayın. Firma temsilcilerinde **Firma erişim kapsamı** alanından doğru firmayı atayın. İç personelde bu alanı boş bırakın; firma atanmış hesap ek rollerine rağmen firma okumalarıyla sınırlanır.

**Doktor Tanımları:** Hekimin mesleki bilgilerini girin, kaydı etkinleştirin ve doğru kullanıcı hesabıyla ilişkilendirin. Raporu onaylayacak kişi, rapordaki aktif hekim profiline bağlı kullanıcı olmalıdır.

| Görev               | Temel kullanım                              | Dikkat                                                                            |
| ------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| Kurum yöneticisi    | Tanımlar, kullanıcılar, yetkiler ve işletim | Yönetici olmak başkası adına hekim onayı vermek değildir                          |
| Kayıt görevlisi     | Çalışan kaydı, protokol ve kabul            | Protokol okuma yetkisiyle liste ve detay açılır; tıbbi okuma ayrıca gerekir       |
| İşyeri hekimi       | Muayene, sonuç değerlendirme ve rapor onayı | Kendi hesabı ve kendisine bağlı hekim profiliyle çalışır                          |
| Sağlık personeli    | Yetkisi kapsamındaki ölçüm ve hazırlık      | Hekim onayı yerine işlem yapmaz; bazı kayıt işlemleri ayrıca yetki gerektirir     |
| İş güvenliği uzmanı | Firma/işyeri ve yetkili olduğu kayıtlar     | Tam saha İSG akışı henüz yok; tıbbi yetkiler kendiliğinden verilmez               |
| Firma temsilcisi    | Hedeflenen dış firma kullanımı              | Yalnızca atanmış firmanın izin verilen kayıtlarını okur; firma ataması zorunludur |

Menüler kullanıcının yetkisine göre görünür. Bir işlevin görünmemesi her zaman veri olmadığı anlamına gelmez.

### 1.3 Firma, şube ve işyerlerini tanımlayın

**Firma Tanımları:** Önce işveren firmayı açın. Firma içinden gerekli şube ve işyerlerini oluşturun. İşyeri SGK sicili, NACE, tehlike sınıfı ve iletişim bilgilerini kontrol edin.

OSGB'nin kendi kurum kaydı ile hizmet verdiği firma farklıdır. Bir OSGB altında birden çok firma olabilir; çalışanı doğru işyerine bağlamak rapor ve takip açısından önemlidir.

### 1.4 Meslek, tetkik ve paketleri hazırlayın

- **Meslek Tanımları:** Çalışanların mesleklerini oluşturun veya mevcut kayıtları kontrol edin.
- **Tetkik Tanımları:** Kullanılan tetkikleri ve kategorilerini gözden geçirin.
- **Tetkik Paketleri:** Sık kullanılan istem gruplarını düzenleyin. Paket bir seçim kolaylığıdır; her çalışana otomatik tıbbi gereklilik anlamına gelmez.

Paket seçiminden otomatik fiyatlandırma ve fatura oluştuğunu varsaymayın. Mevcut akış kategori düzeyinde istem oluşturuyor; bütün ticari ayrıntıları protokole fiyat anlık görüntüsü olarak bağlamıyor.

### 1.5 Form ve metinleri hazırlayın

**KVKK İzinleri:** Kurumun değerlendirdiği uygun metinleri, sürümlerini ve aktifliklerini kontrol edin. İzin kaydı, bütün veri işleme dayanaklarının yerine geçmez.

**Doktor Modülü → Rapor Şablonları:** LAB ve İSG kayıtlarında kullanılacak başlık/metinleri hazırlayın. Bunlar içerik şablonlarıdır; sağlık raporunun tüm PDF düzenini değiştiren bir form tasarımcısı değildir.

## 2. Günlük hasta kabulü — kayıt görevlisi

1. **Hasta Kayıt** ekranında çalışanı arayın; yeni kayıt açmadan önce mevcut kaydı kontrol edin.
2. Kayıt yoksa yeni hasta oluşturun. Kimlik, doğum tarihi, iletişim, firma, işyeri ve mesleğini doğrulayın.
3. Kimlik okuma/doğrulama araçları yapılandırılmışsa kullanın; okunan alanları gözle kontrol edin. Başarısız dış doğrulamayı başarılı olarak kabul etmeyin.
4. Hasta detayındaki kimlik, iletişim, çalışma ve KVKK bölümlerini kontrol edin.
5. Gereken bilgilendirme ve form işlemlerini **Belge İmza** akışıyla tamamlayın.
6. Hasta detayındaki **Protokoller → Yeni Protokol** işlemini açın.
7. Ziyaret türünü seçin: işe giriş, periyodik, işe dönüş, işten ayrılış veya özel muayene.
8. Hekimin/kurumun ilgili ziyaret için belirlediği tetkikleri seçin; gerekiyorsa paket kullanın ve seçimleri kontrol edin. Not ekleyip kaydedin.
9. Otomatik oluşturulan protokol numarasını kullanarak çalışanı ilgili birimlere yönlendirin.

**Yetki kontrolü:** Kayıt görevlisinin Protokol Listesi ve detayına erişmesi için protokol okuma yetkisi yeterlidir. Oluşturma/güncelleme için ilgili ayrı protokol yetkileri gerekir; tüm tıbbi yetkileri vermeyin.

## 3. Tetkikleri kaydetme — yetkili sağlık personeli

### 3.1 Protokolü kontrol edin

**Protokol Listesi → ilgili protokol:** Doğru çalışanı, ziyaret tarihini ve istenen tetkikleri kontrol edin. Uygun kayıt bağlantısından sonuç ekranına geçin. Aynı çalışanın eski ziyaretine sonuç bağlamayın.

### 3.2 Odyometri, spirometri, EKG, göz ve pnömokonyoz

İlgili menüde çalışan/protokol ilişkisini kontrol edin, ölçüm tarihi ve gerekli ölçüm/bulgu alanlarını doldurun. Kaydetmeden önce birim, taraf ve değerleri kontrol edin. Yazılımın hesapladığı göstergeler hekim değerlendirmesinin yerine geçmez.

Kaydetme işleminden sonra protokole dönerek kalem durumunu kontrol edin. Bir kalemin “Tamamlandı” olması tek başına hekim onaylı sonuç bulunduğunu kanıtlamaz. Ölçüm cihazından otomatik aktarım her cihaz için mevcut değildir.

### 3.3 Laboratuvar sonuçları

1. Protokolün LAB kaleminden **Sonuç gir** bağlantısını veya **Lab. Tahlilleri** menüsünü açın.
2. Çalışan ve protokolü kontrol edin.
3. Başlık, tarih, laboratuvar, numune numarası/tarihi ve sonuç içeriğini doldurun.
4. Gerekirse hazırlanmış şablondan metin ekleyin ve gerçek sonuçlara göre düzenleyin.
5. Hazırlık sırasında taslak olarak saklayın. Sonuç bütünü kontrol edildikten sonra tamamlandı durumuna alın.

Bu modül serbest metin sonuç kaydıdır. Analit bazlı birim, referans aralığı ve kritik değer uyarıları otomatik yönetilmiyor. Tamamlanan kayıt kilitlenir; kontrollü ek rapor/düzeltme akışı henüz yok. Kaydetmeden önce dikkatli doğrulayın, hata halinde kurum sorumlusuna bildirin.

**Tamamlanmış LAB sonucu artık doğru ziyaretin birleşik sağlık raporu özetine ve yeni oluşturulan PDF'sine eklenir.** Taslak, başka ziyaret veya onay anından sonraki sonuçlar alınmaz. Hekim sonuçları yine incelemelidir. Önceden onaylanmış PDF'ler geriye dönük değiştirilmez; LAB/İSG metin dışa aktarımı, onaylı sağlık raporu PDF'si ile aynı şey değildir.

### 3.4 Radyoloji ve DICOM

1. **Radyoloji** üzerinden doğru çalışana ait istemi açın/oluşturun; modalite, bölge ve ziyaret ilişkisini kontrol edin.
2. Birleşik sağlık raporuna girecek istemin ilgili muayene kaydıyla ilişkili olduğunu doğrulayın.
3. Entegre cihaz iş listesi kullanıyorsa istem/erişim numarası üzerinden doğru hastayı seçin.
4. Görüntü geldiğinde eşleşen çalışma ve istemi kontrol edin; yalnızca ad benzerliğine güvenmeyin.
5. Yetkili kullanıcı görüntüleyiciden inceleyip raporunu tamamlasın.

**DICOM Kayıtları** bağlantı ve işlem durumunu izlemek için kullanılır. Yerel PACS'ın çevrimiçi görünmesi fiziksel cihaz aktarımının kabul edildiği anlamına gelmez. İlk kullanımda teknik sorumlu ile test hastası üzerinden cihazdan görüntüleyiciye kadar kabul yapılmalıdır.

## 4. Sağlık raporu — işyeri hekimi

1. Kendi hesabınızla giriş yapın. Aktif hekim profilinizin hesabınıza bağlı olduğunu kontrol edin.
2. Protokolden **Raporu aç** veya **Sağlık Raporları** üzerinden ilgili ziyareti açın.
3. Çalışan, işyeri, ziyaret türü ve tarihi kontrol edin.
4. Anamnez, özgeçmiş/şikâyet ve muayene alanlarını gerçek değerlendirmeye göre doldurun.
5. Fizik muayene bulgularını ve ölçümleri girin; yapılmayan değerlendirmeyi normal olarak kaydetmeyin.
6. Bu ziyarete ait bütün gerekli tetkikleri inceleyin. Laboratuvarın numune ve sonuç satırlarının özette yer aldığını kontrol edin.
7. Uygunluk kararını verin. Kısıtlı uygunlukta kısıtları, uygun olmama kararında gerekçeyi doldurun. Gereken takip tarihini belirleyin.
8. Kaydedin ve içerik/eksiklikleri tekrar gözden geçirin.
9. **Onayla ve PDF Oluştur** işlemini kullanın. Onaylı raporun PDF bağlantısını açıp çalışan, kurum, hekim, tarih ve içerik doğruluğunu kontrol edin.

Sistem, ziyaretin istenen klinik tetkiklerinin tamamlanmasını ve ilgili sonuç kaydını kontrol eder. Bu kontrol hekim değerlendirmesinin yerine geçmez. Radyolojide rapor metni bulunan raporlanmış sonuç gerekir. Eksik sonucu atlamak için kalemi elle tamamlamayın veya iptal etmeyin. Onay sonrası rapor değiştirilemez; hata varsa mevcut kaydı gizlice değiştirerek ilerlemek yerine kurumun kontrollü düzeltme sürecine aktarın. Uygulamada bu revizyon akışı tamamlanmış değildir.

**Protokol kapatma:** Sonuçlar ve gerekli raporlar gerçekten tamamlandıktan sonra kapatın. Bekleyen kalemlerin iptali ayrı bir işlemdir; yalnızca gerçekten iptal edilmiş istemler için gerekçe girilerek kullanılmalıdır. Kalemdeki **Not / gerekçe** düğmesiyle açıklamayı düzenleyebilirsiniz. İptaller onay öncesi hekim ekranında ve PDF'de gösterilir.

## 5. Belgeler, imza ve geçmiş kayıtlar

**Belge İmza:** Çalışanı seçin, imza bekleyen formu/aktif şablonu açın, metni ilgili kişiye gösterin ve imzalayan bilgilerini kontrol edin. İmza pedi veya desteklenen ekran yöntemiyle imzayı alıp belgeyi kaydedin. Oluşan PDF'yi doğru kişi ve belge türüyle arşivlendiğini kontrol ederek açın. Mevcut PDF üzerine imza alma akışında da aynı kontrolleri yapın.

**E-İmza:** Kayıtlı imzalı belgelerin arşivi ve SHA256 bütünlük doğrulaması için kullanılır. Bu işlem, nitelikli elektronik sertifikayla uzaktan imzalama veya resmî kuruma gönderim yapmaz.

**Muayene Karşılaştırma:** Yetkiniz varsa çalışanı ve karşılaştırılacak muayeneleri seçin. Tarihleri dikkate alarak karar ve ölçümleri karşılaştırın; eski kayıtla bugünkü ziyareti karıştırmayın.

## 6. İSG raporları ve diğer yönetim menüleri

| Menü                 | Nasıl kullanılır                                                                                   | Mevcut sınır                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| İSG Raporları        | Firma, dönem, sorumlu, başlık ve içeriği girin; gerektiğinde protokolle ilişkilendirin             | Risk matrisi, saha aksiyonu, yıllık plan veya eğitim takibi değil                              |
| Rapor Şablonları     | LAB/İSG için tekrar kullanılan metin oluşturun; aktif/pasif yönetin                                | Gerçek sonuç yerine hazır metin bırakmayın                                                     |
| Ön Muhasebe          | Gelir/gider, tutar, kayıt tarihi, vade ve belge referansını girin; gerçekleşen ödemeyi işaretleyin | Banka doğrulaması, e-fatura, kısmi ödeme ve ters kayıt yok                                     |
| Doktor Hakediş       | Hekim, dönem, hizmet adedi ve birim ücret girin                                                    | Adetleri gerçekleşen hizmetlerle manuel karşılaştırın; otomatik hesaplanan hizmet sayısı değil |
| Alt OSGB Tanımları   | Hizmet alınan kuruluşun iletişim ve kayıt bilgilerini tutun                                        | Ayrı tenant veya veri paylaşımı oluşturmaz                                                     |
| Personel Hareketleri | Yetkili olarak işlem kayıtlarını inceleyin                                                         | Kurumun olay/denetim prosedürüyle birlikte kullanın                                            |
| Aktif Kullanıcılar   | Açık oturumları kontrol edin; yetkiniz kapsamındaki oturum işlemlerini yapın                       | Ortak hesap kullanımının yerine geçmez                                                         |
| Dashboard            | Sayılar ve hızlı bağlantılarla açık işleri kontrol edin                                            | Sayıların klinik tamamlanma garantisi olmadığını unutmayın                                     |

Operasyon ekranlarındaki arama başlık üzerinden çalışır; çalışan/firma adıyla her kaydı bulmayı beklemeyin. Tarih filtreleri kayıt tarihini esas alır. Protokole bağlı kayda protokol üzerinden ulaşmak daha güvenlidir.

Ödenmiş finans/hakediş kayıtları kilitlenir. Ödendi durumunu yalnızca ödeme doğrulandıktan sonra seçin. Hatalı ödemeyi düzeltmek için rastgele yeni karşı kayıt üretmeyin; muhasebe sorumlusu ve teknik sorumluya aktarın.

## 7. Toplu kayıt aktarımı

### Hasta aktarımı

**Toplu Hasta Aktarma** ekranından güncel Excel şablonunu indirin. Şablondaki TC Kimlik No, Ad, Soyad, Doğum Tarihi (`gg.aa.yyyy`) ve GSM alanlarını doldurun; firma ve meslek eşleşmelerini kontrol edin. Dosyayı seçip önizlemeyi inceleyin. Yalnızca aktarılabilir satırları işleme alın; hatalı, yinelenen veya mevcut kayıtlar için sonuç listesini kontrol edin. İşlem sonunda örnek kayıtları açarak firma/işyeri ve kimlik alanlarını doğrulayın.

### Firma aktarımı

**Toplu Firma Aktarma** ekranının şablonunu kullanın. Firma Adı zorunludur; vergi/SGK, tehlike sınıfı, iletişim ve adres alanlarını mevcut bilgiye göre doldurun. Önizlemedeki hataları düzeltin. Aktarım sonrasında gereken şube ve işyeri yapılarını firma kartından tamamlayın.

## 8. Gün sonu ve takip

- Açık protokolleri, eksik sonuçları ve hekim onayı bekleyen raporları kontrol edin.
- Onaylanan raporların PDF'lerinin oluştuğunu ve doğru ziyaretle eşleştiğini kontrol edin.
- Takip tarihlerini inceleyin. Uygulama içi bildirimin e-posta/SMS gönderildiği anlamına gelmediğini unutmayın.
- Gelir/gider ve hakedişleri gerçek belgelerle karşılaştırın.
- PACS aktarım hatalarını teknik sorumluya bildirin.
- Ortak bilgisayarda işlemler bitince oturumu kapatın; kişisel sağlık belgelerini açık bırakmayın.

Kurumun teknik sorumlusu ayrıca yedeklerin alındığını, hataların izlendiğini ve planlanan geri yükleme denemelerinin yapıldığını doğrulamalıdır. Bunlar uygulamanın dashboard'undan kendiliğinden garanti edilmez.

## 9. Sık karşılaşılan durumlar

| Durum                           | Yapılacak işlem                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menü yok / 403                  | Kurum yöneticisi rolü kontrol etsin; bütün yetkileri açarak çözmeye çalışmayın. Protokol için protokol okuma yetkisini; firma hesabında firma atamasını kontrol edin      |
| Hekim onayı reddediliyor        | Aktif hekim profilinin giriş yapan kullanıcıya bağlı olduğunu ve zorunlu alanları kontrol edin                                                                            |
| Sonuç rapor özetinde yok        | Doğru ziyaret ilişkisini kontrol edin. LAB kaydının tamamlandığını ve doğru protokole bağlı olduğunu kontrol edin; eski onaylı PDF değişmez                               |
| Eşzamanlı değişiklik uyarısı    | Sayfayı yenileyip son kaydı inceleyin; başka kullanıcının güncellemesini ezmeyin                                                                                          |
| Tamamlanan kayıt düzenlenemiyor | Kayıt kilitlidir; sorumluya bildirin. Kontrollü revizyon geliştirmesi gerekiyor                                                                                           |
| DICOM görüntüsü yok             | İstem/erişim numarası, hasta eşleşmesi ve bağlantı durumunu teknik sorumluyla kontrol edin                                                                                |
| Şifremi unuttum                 | Girişte Şifremi Unuttum → e-posta ve kurum kodu ile destek isteyin; yönetici kimlik doğrulamasından sonra Personel Tanımları üzerinden tek kullanımlık bağlantı oluşturur |
| Eğitim/sertifika bulunamıyor    | Bu modüller uygulanmadı; API de 501 döndürüyor                                                                                                                            |
| Randevu takvimi bulunamıyor     | Randevu servisi var, kullanıcı takvim ekranı henüz yok                                                                                                                    |
| E-imza sağlayıcısı seçilemiyor  | Nitelikli imza entegrasyonu yok; mevcut ekran belge arşivi ve bütünlük kontrolüdür                                                                                        |

## 10. Kurum içi ilk kabul provası

Gerçek hasta verisi yerine ayrı test ortamında sentetik kayıtlarla aşağıdaki prova yapılmalı:

1. Yönetici iki firma, işyerleri ve görevlerine göre kullanıcıları hazırlar.
2. Kayıt görevlisi çalışan ve protokol oluşturur; yalnızca yetkili olduğu ekranlara erişir.
3. Sağlık personeli doğru protokole ölçüm ve sonuç kaydeder.
4. Hekim gerekli sonuçları kontrol eder, karar verir, kendi hesabıyla rapor onaylar ve PDF'yi inceler.
5. Arşivden aynı rapor açılır; eski muayene ile karşılaştırma yapılır.
6. Yetkisiz kullanıcının başka firmanın/rolün kayıtlarına erişemediği doğrulanır.
7. Hatalı veri, eksik tetkik, iptal ve düzeltme senaryoları denenir.
8. Teknik sorumlu cihaz aktarımı ve yedekten geri dönüşü ayrı doğrular.

Altıncı adım için sunucu kapsamı eklendi ve 40 gerçek HTTP kontrolü geçti; kurumunuzun gerçek kullanıcı/rol eşleşmeleriyle de prova yapın. Bu kılavuz, üretime geçiş onayı yerine geçmez; bugünkü işlevlerin nasıl kullanılacağını ve nerede ek işlem gerektiğini anlatır.

## Şifre kurtarma

1. Giriş ekranında **Şifremi Unuttum** bağlantısını açın. E-posta adresinizi ve kurum kodunu girip **Destek talebi gönder** düğmesine basın. Kurum kodunu bilmiyorsanız yöneticinizden alın.
2. Kullanıcı yönetim yetkisi olan kurum personeli talebi kendi bildirim kutusunda görür. Yönetici, talep sahibinin kimliğini kurum prosedürüyle doğrular.
3. Yönetici **Genel Ayarlar → Personel Tanımları → ilgili kullanıcı → Kurtarma bağlantısı → Bağlantı oluştur** yolunu izler.
4. Yönetici bağlantıyı doğruladığı kullanıcıya güvenli biçimde iletir. Sistem otomatik e-posta/SMS göndermez.
5. Kullanıcı bağlantıyı 15 dakika içinde açar, yeni şifresini iki kez girer ve kaydeder. Şifre en az 10 karakter, harf ve rakam içermelidir. Yeni şifreyle giriş yapılır; önceki oturumlar kapanır.

Bağlantı tek kullanımlıktır. Yeni bağlantı oluşturulursa eskisi geçersiz olur. Süresi dolmuş/kullanılmış bağlantıda veya kullanıcı kaydı değişmişse yönetici yenisini oluşturur. Bağlantı açıldıktan sonra güvenlik için adres çubuğundan kaldırılır; form tamamlanmadan sayfa yenilenirse verilen bağlantıyı yeniden açın.

## Kişisel bildirimler ve takip

Üst çubuktaki bildirimler ve okunmamış sayacı size aittir. **Okundu** veya **Tümünü okundu** başka personelin durumunu değiştirmez. Muayene uyarılarını ilgili okuma yetkisi olan iç personel, şifre taleplerini kullanıcı yönetim yetkisi olan iç personel görür.

Takip uyarıları çalışanın en güncel onaylı muayenesine dayanır. Tarihten 30, 7 ve 1 gün önce, aynı gün ve en az 7 gün gecikmede aşamalı uyarılar üretilir. Tarama kaçırılmışsa sistem mevcut aşamaya uygun uyarıyı üretir. Yeni muayene eski takibin yerini alır; yeni muayenede takip tarihi boşsa eski tarih için uyarı gönderilmez. Uygulama içi uyarı e-posta/SMS teslimatı anlamına gelmez.

## Belge süre takibi

Sol menüden **Belge Süre Takibi** ekranını açın.

1. Yeni sözleşme veya belge için isteğe bağlı firma seçin, dosyayı ve bitiş tarihini girip **Belgeyi ekle** düğmesine basın. Dosya en fazla 25 MB olabilir. Sağlık verisi içeriyorsa ilgili kutuyu işaretleyin; bunun için tıbbi erişim yetkisi gerekir.
2. Varsayılan liste bugünden itibaren 30 gün içinde bitecek belgeleri gösterir. **Süresi geçmiş**, **60/90 gün**, **Tarih belirtilmemiş** ve **Tüm belgeler** seçenekleri de vardır. Bitiş günü belge henüz geçmiş sayılmaz; hesap İstanbul takvim gününe göre yapılır.
3. Eski belgelerin tarihini eklemek için **Tarih belirtilmemiş → Tarihi düzenle** yolunu izleyin. Tarihi boş kaydetmek bitiş tarihini kaldırır. Belgenin dosyası değişmez.
4. **Belgeyi aç** dosyanın indirme bağlantısını açar. Firma seçimi hem listeyi süzer hem yeni yüklenecek belgeye atanır; farklı firma aramasına başlandığında önceki seçim temizlenir.

Sözleşmenin dosyası ve süresi takip edilir; bu özellik tam sözleşme/görevlendirme yönetimi veya otomatik e-posta/SMS gönderimi değildir. Önceden yüklenmiş belgelerin tarihleri otomatik tahmin edilmedi.

## Rapor filtreleri

**Doktor Modülü → Sağlık Raporları** ekranında firma adı ve hekim adı/soyadı ile arayabilirsiniz. Bu alanlar tarih aralığı, rapor durumu, karar ve mevcut hasta/protokol aramasıyla birlikte çalışır. Hekim tam adı boşluklarla ayrılarak aranır. **Filtreleri temizle** ekran filtrelerini sıfırlar; hasta kartından gelinen hasta kapsamı korunur.

Tarih filtresi İstanbul günlerine göre muayene tarihini, bu tarih yoksa oluşturulma tarihini kullanır. Filtre uygulanırken henüz raporu oluşturulmamış bekleyen istemler sonuçlara karıştırılmaz. Bunları **Eksik İşlemler** ekranından takip edin.

## Eksik işlemler

Sol menüde **Eksik İşlemler** tek sayfada üç liste sunar:

- **Bekleyen tetkik ve rapor istemleri:** Açık/devam eden protokollerde henüz tamamlanmamış kalemler. Sayı hasta sayısı değil istem sayısıdır; aynı kişiye ait farklı istemler ayrı satırlardır.
- **Onaylanmamış raporlar:** İptal edilmemiş, henüz onaylanmamış raporlar. Temel tarih, hekim seçimi ve karar eksikleri gösterilir; tüm tetkik ve onay engelleri rapor detayından incelenir.
- **Eksik çalışan bilgileri:** Aktif çalışanlarda kimlik veya pasaport numarası, doğum tarihi ve firma ataması eksikleri. Pasaport numarası olan kişiye sırf T.C. kimlik numarası olmadığı için uyarı verilmez.

Her liste kendi yetkisiyle açılır ve ayrı sayfalanır. **Kaydı aç** ilgili protokol, rapor veya çalışan kartına götürür. **Yenile** ile anında güncellenebilir; ekran açıkken listeler dakikada bir yenilenir. Firma hesaplarına bu kurum içi iş listeleri açılmaz.
