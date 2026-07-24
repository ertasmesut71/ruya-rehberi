# Rüya Rehberi — Kurulum ve Yayına Alma Kılavuzu

Bu, kullanıcıların rüyasını yazıp İslami yorum geleneğine dayalı, dürüst bir
değerlendirme aldığı, tamamen çalışır bir web sitesidir. Herkes tarayıcıdan
kullanabilir; kullanıcıların kurulum yapmasına gerek yoktur.

## Ne var, ne yok?

- **Frontend:** `public/` klasörü — saf HTML/CSS/JS, hiçbir build gerektirmez.
- **Backend:** `functions/api/` — Cloudflare Pages Function. API anahtarını
  sunucu tarafında gizli tutar (kod içine gömülmez, sızmaz).
- **Bilgi tabanı:** `functions/api/knowledge.js` — Kur'an/hadis/Diyanet/TDV
  çerçevesinin telifsiz özeti. Ayet/hadis metinleri birebir kopyalanmamıştır.

Ücretsiz LLM olarak **Groq** kullanılır (OpenAI-uyumlu). Ücret çıkmaz.

---

## Yayına alma (önerilen: Cloudflare Pages — ücretsiz)

Bu yol, API anahtarını gizli tutar ve kullanıcıların hiçbir şey girmeden
kullanmasını sağlar.

### 1. Ücretsiz Groq API anahtarı al
1. https://console.groq.com adresine gir, ücretsiz hesap aç (kredi kartı gerekmez).
2. "API Keys" bölümünden yeni bir anahtar oluştur ve kopyala.

### 2. Kodu bir GitHub deposuna yükle
Bu klasörün tamamını (`public/` ve `functions/`) bir GitHub deposuna koy.

### 3. Cloudflare Pages'e bağla
1. https://dash.cloudflare.com → Workers & Pages → Create → Pages.
2. GitHub deposunu seç.
3. Build ayarları:
   - **Framework preset:** None
   - **Build command:** (boş bırak)
   - **Build output directory:** `public`
4. "Save and Deploy" de.

### 4. API anahtarını gizli ortam değişkeni olarak ekle
1. Pages projen → Settings → Environment variables.
2. Yeni değişken ekle:
   - İsim: `GROQ_API_KEY`
   - Değer: (Groq'tan aldığın anahtar)
3. (İsteğe bağlı) Model değiştirmek istersen: `GROQ_MODEL` = `openai/gpt-oss-120b`
4. Kaydet ve yeniden dağıt (redeploy).

Bitti. Site adresin `https://PROJE-ADI.pages.dev` olur. Herkes kullanabilir.

> **Not — güncel model:** Groq, eski `llama-3.3-70b-versatile` modelini
> 17.06.2026'da kaldırdı. Kod varsayılan olarak güncel `openai/gpt-oss-120b`
> modelini kullanır. Groq ileride bunu da değiştirirse, `GROQ_MODEL` ortam
> değişkenini güncel bir model adıyla değiştirmen yeterlidir; kodu değiştirmen
> gerekmez. Güncel liste: https://console.groq.com/docs/models

---

## Yerelde deneme (bilgisayarında test)

Cloudflare'in ücretsiz `wrangler` aracıyla:

```bash
npm install -g wrangler
cd ruya-ai
# API anahtarını yerel gizli dosyaya koy:
echo "GROQ_API_KEY=buraya_anahtar" > .dev.vars
wrangler pages dev public
```

Ardından tarayıcıda `http://localhost:8788` adresini aç.

> `.dev.vars` dosyasını asla GitHub'a yükleme (içinde anahtar var). `.gitignore`
> zaten bunu engeller.

---

## Alternatif: Vercel / Netlify

Kod Cloudflare Pages Functions biçiminde yazılmıştır. Vercel veya Netlify
kullanmak istersen `functions/api/yorumla.js` dosyasını ilgili platformun
fonksiyon biçimine küçük bir uyarlamayla taşıyabilirsin (istek/yanıt nesneleri
neredeyse aynıdır). İstersen bu uyarlamayı da yapabilirim.

---

## Reklam ekleme (ileride)

Site, reklam onayı için gereken temel sayfaları (Hakkımızda, Gizlilik, içerik
sayfası) zaten içerir. AdSense gibi bir ağa başvururken:
1. Önce siteyi yayına al ve birkaç gün gerçek kullanım olsun.
2. AdSense hesabı aç, siteyi ekle, doğrulama kodunu tüm sayfaların `<head>`
   bölümüne koy.
3. Onaydan sonra reklam birimlerini yerleştir.
4. `gizlilik.html` içindeki "Reklamlar" bölümünü kullandığın ağa göre güncelle.

---

## Önemli dürüstlük notları

- Bu araç bir yapay zeka kullanır; yapay zeka **hata yapabilir**. Yorumlar kesin
  değildir ve her sayfada bu açıkça belirtilir.
- Site bir dini kurum değildir; fetva vermez. Bu, hem doğru hem de kullanıcı
  güveni ve reklam onayı için önemlidir.
- Yayına almadan önce `hakkimizda.html` içindeki iletişim bilgisini ve
  `gizlilik.html` metnini kendi durumuna göre güncelle.
