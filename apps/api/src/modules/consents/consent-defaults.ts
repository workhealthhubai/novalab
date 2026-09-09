import type { ConsentType } from '@osgb/shared-types';

/**
 * Starter texts loaded by "Varsayılan metinleri yükle". Generic wording — every OSGB must have
 * them reviewed by its own legal counsel and fill in the organisation details before use.
 */
export const DEFAULT_CONSENT_TEXTS: ReadonlyArray<{
  type: ConsentType;
  title: string;
  body: string;
}> = [
  {
    type: 'DISCLOSURE',
    title: 'Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni',
    body: `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla {{KURUM_ADI}} tarafından kişisel verileriniz aşağıda açıklanan kapsamda işlenmektedir.

1. İşlenen kişisel veriler: kimlik bilgileri (ad, soyad, T.C. kimlik numarası, doğum tarihi), iletişim bilgileri, işveren ve meslek bilgileri, muayene ve tetkik sonuçları dâhil sağlık verileri.
2. İşleme amaçları: 6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve ilgili mevzuat kapsamında işe giriş ve periyodik sağlık muayenelerinin yapılması, sağlık raporlarının düzenlenmesi, işverene yasal bildirimlerin yapılması, kayıtların saklanması.
3. Hukuki sebep: KVKK m.5/2 (kanunlarda açıkça öngörülmesi, hukuki yükümlülük) ve sağlık verileri için KVKK m.6/3 ile açık rızanız.
4. Aktarım: sağlık verileriniz yalnızca yetkili sağlık personeli ve kanunen yetkili kamu kurumlarıyla; işverenle yalnızca çalışabilirlik kararı düzeyinde paylaşılır.
5. Saklama: mevzuatta öngörülen süreler boyunca (işyeri sağlık kayıtları için işten ayrılma tarihinden itibaren en az 15 yıl) saklanır.
6. Haklarınız: KVKK m.11 kapsamındaki haklarınızı {{KURUM_ILETISIM}} üzerinden kullanabilirsiniz.

Bu metni okuduğumu ve anladığımı beyan ederim.`,
  },
  {
    type: 'EXPLICIT_CONSENT',
    title: 'Kişisel Verilerin İşlenmesine İlişkin Açık Rıza Metni',
    body: `Aydınlatma metnini okudum. Kimlik ve iletişim bilgilerimin, işe giriş / periyodik sağlık muayenesi süreçlerinin yürütülmesi ve tarafıma ulaşılması amacıyla {{KURUM_ADI}} tarafından işlenmesine, kanunen yetkili kurumlarla ve işverenimle mevzuatın izin verdiği ölçüde paylaşılmasına özgür irademle açık rıza veriyorum.

Rızamı dilediğim zaman {{KURUM_ILETISIM}} üzerinden geri alabileceğimi biliyorum.`,
  },
  {
    type: 'HEALTH_DATA',
    title: 'Sağlık Verilerinin İşlenmesine İlişkin Açık Rıza Metni',
    body: `Özel nitelikli kişisel verim olan sağlık verilerimin (muayene bulguları, tetkik sonuçları, radyolojik görüntüler, işitme/solunum testleri, laboratuvar sonuçları) iş sağlığı ve güvenliği mevzuatı kapsamındaki muayene, rapor ve takip amaçlarıyla {{KURUM_ADI}} tarafından işlenmesine ve saklanmasına KVKK m.6 uyarınca açık rıza veriyorum.

Sağlık verilerimin işverenimle yalnızca çalışabilirlik kararı düzeyinde paylaşılacağını, ayrıntılı tıbbi bilgilerin sır saklama yükümlülüğü altında tutulacağını anladım.`,
  },
  {
    type: 'COMMUNICATION',
    title: 'İletişim İzni',
    body: `Randevu, muayene sonucu ve periyodik kontrol hatırlatmalarının SMS, e-posta veya telefon yoluyla tarafıma iletilmesine izin veriyorum. Bu izni dilediğim zaman geri alabilirim.`,
  },
];
