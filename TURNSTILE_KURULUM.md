# Bot Koruması (Cloudflare Turnstile) Kurulumu — Opsiyonel ama Önerilir

Site, Turnstile olmadan da çalışır. Ama API'nizi kötüye kullanıma (bot/spam)
karşı korumak için Turnstile eklemeniz önerilir. Ücretsizdir.

## Neden gerekli?
`/api/yorumla` uç noktası herkese açık. Turnstile olmadan, kötü niyetli biri
otomatik istekler göndererek Groq limitinizi doldurabilir. Turnstile, gerçek
kullanıcı ile botu ayırır ve bunu kullanıcıya neredeyse hiç zahmet vermeden yapar.

## Adım 1: Turnstile widget'ı oluştur
1. https://dash.cloudflare.com → sol menü → "Turnstile"
2. "Add widget" / "Add site" de.
3. İsim: örn. "Ruya Rehberi"
4. Hostname (Domain): `islamiruyarehberi.com` ekle.
5. Widget Mode: **Managed** (önerilen).
6. Oluştur. Sana iki anahtar verilir:
   - **Site Key** (herkese açık — koda gömülür)
   - **Secret Key** (gizli — ortam değişkeni olur)

## Adım 2: Site Key'i koda ekle
`public/yorumla.html` dosyasında şu satırı bul:
```html
<div class="cf-turnstile" data-sitekey="TURNSTILE_SITE_KEY" ...></div>
```
`TURNSTILE_SITE_KEY` yazan yeri, Turnstile'ın verdiği **Site Key** ile değiştir.
GitHub'a yükle (site otomatik yeniden yayınlanır).

## Adım 3: Secret Key'i gizli ortam değişkeni olarak ekle
1. Cloudflare → Workers & Pages → `ruya-rehberi` projesi → Settings → Environment variables
2. Yeni değişken:
   - İsim: `TURNSTILE_SECRET_KEY`
   - Değer: Turnstile'ın verdiği **Secret Key**
3. Kaydet ve yeniden dağıt (redeploy).

## Nasıl çalışır?
- Site Key yoksa (TURNSTILE_SITE_KEY placeholder kalırsa): widget görünmez,
  site normal çalışır ama bot koruması yoktur.
- Hem Site Key hem Secret Key ayarlıysa: kullanıcı formu gönderdiğinde Turnstile
  doğrulaması yapılır. Doğrulama geçmezse yorum üretilmez (403).
- Secret Key sunucuda olmazsa backend doğrulamayı atlar (geriye dönük uyum).

Yani en güvenli kurulum: **hem Site Key hem Secret Key** ayarlı olsun.
