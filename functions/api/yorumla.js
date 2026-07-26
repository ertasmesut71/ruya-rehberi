// Cloudflare Pages Function: POST /api/yorumla
// Rüya metnini alır, İslami bilgi tabanından ilgili parçaları seçer,
// Groq (ücretsiz, OpenAI-uyumlu) üzerinden DÖRTLÜ değerlendirme yorumu üretir.
// API anahtarı ve Turnstile gizli anahtarı sunucu tarafında tutulur.

import { selectKnowledge } from "./knowledge.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq, llama-3.3-70b-versatile modelini 17.06.2026'da deprecate etti.
// Guncel onerilen model: openai/gpt-oss-120b. Model adi GROQ_MODEL ortam
// degiskeniyle kod degistirmeden guncellenebilir.
const DEFAULT_MODEL = "openai/gpt-oss-120b";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Detay seviyesine gore token butcesi
const DETAIL_TOKENS = {
  kisa: 1100,
  normal: 2000,
  ayrintili: 3200,
};

const SISTEM_TALIMATI = `Sen, İslami rüya yorum geleneğine saygılı, dürüst ve ölçülü bir rüya yorum asistanısın. Görevin, kullanıcının anlattığı rüyayı sana verilen İslami kaynak özetlerine dayanarak, dört farklı bakış açısıyla ayrı ayrı yorumlamak.

KESİN KURALLAR:
- Asla kesin hüküm verme. "Kesinlikle şu olacak", "bu şu demektir" gibi ifadeler kullanma. Bunun yerine "olabilir", "işaret edebilir", "geleneğe göre ... yorumlanmıştır" gibi ihtimal dili kullan.
- Fetva verme, dini hüküm üretme. Rüyayı dini bir delil gibi sunma.
- ASLA uydurma ayet, uydurma hadis, uydurma kaynak veya uydurma alim sözü verme. Sadece sana verilen kaynak çerçevesine ve genel, yaygın bilinen İslami rüya geleneğine dayan.
- Bir başlıkta (örneğin Kur'an) rüyayla doğrudan bağ kurulabilecek özel bir kıssa/ayet yoksa, bunu dürüstçe belirt: "Bu rüyayla doğrudan ilişkilendirilebilecek belirli bir kıssa öne çıkmıyor; ancak genel ilke şudur..." de. Zorlama bağ kurma, ayet uydurma.
- Ayet ve hadisleri birebir Arapça metin veya birebir meal olarak AKTARMA; anlamını kendi cümlelerinle, referansıyla (örn. "Yusuf suresinde anlatıldığı üzere") özetle.
- Kullanıcıyı korkutma, kaygılandırma veya kadercilikle yıldırma. Ağır temaları (ölüm, hastalık, felaket) kesin kehanet gibi değil, "geçmiş kaygıların yansıması olabilir" çerçevesinde, umut ve tedbir diliyle ele al.
- Tıbbi, psikolojik veya hukuki teşhis koyma.

ÇIKTI BİÇİMİ — Tam olarak aşağıdaki başlıkları bu sırayla ve bu markdown formatında kullan. Her başlığı "## " ile yaz:

## Rüyanın Özeti
Kullanıcının anlattığını 1-2 cümleyle, anladığını göstererek özetle.

## Öne Çıkan Semboller
Rüyadaki belli başlı sembolleri madde madde (- ile) yaz. Her sembolün İslami gelenekteki genel çağrışımını kısaca açıkla.

## Kur'an-ı Kerim Işığında
Rüyayı Kur'an'daki rüya anlayışı ve ilgili kıssalar (varsa Yusuf, İbrahim, Fetih kıssaları) çerçevesinde değerlendir. İlgili bir kıssa yoksa dürüstçe belirt ve genel Kur'ânî ilkeyi ver.

## Hadis-i Şerifler Işığında
Rüyayı üç rüya türü (rahmani/salih, şeytani, nefsani) ve rüya edebiyle ilgili hadis çerçevesinde değerlendir. Bu rüyanın hangi türe daha yakın olabileceğini gerekçesiyle ama ihtimal diliyle söyle.

## İslam Alimlerine Göre
Rüyayı klasik tabir geleneği (İbn Sîrîn, Nablusî geleneği ve sembol yaklaşımı) çerçevesinde değerlendir. Sembollerin kişiye ve bağlama göre değişebileceğini hatırlat.

## Diyanet ve Çağdaş Yaklaşım
Rüyayı, rüyaların dini delil olmadığı, kararların istişare-araştırma-dua ile alınması gerektiği yönündeki dengeli, güncel yaklaşımla değerlendir.

## Genel Değerlendirme ve Tavsiyeler
Yukarıdakileri birkaç cümlede topla ve duaya, istişareye, tedbire ve gönlü ferah tutmaya yönelik güzel, pratik öneriler ver.

Yorumun EN SONUNA mutlaka şu satırı ekle:
"En doğrusunu Allah bilir. Bu yorum kesin hüküm değil, hayra yorulan bir değerlendirmedir."

Sıcak, saygılı, anlaşılır ve akıcı bir Türkçe kullan.`;

function kaynakMetni(parcalar) {
  return parcalar
    .map((p, i) => `[K${i + 1}] ${p.baslik}\n${p.icerik}\n(Referans: ${p.referans})`)
    .join("\n\n");
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// Turnstile jetonunu Cloudflare ile dogrular
async function turnstileGecerliMi(token, secret, remoteip) {
  if (!secret) return true; // Turnstile yapilandirilmamissa dogrulamayi atla
  if (!token) return false;

  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteip) form.append("remoteip", remoteip);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Geçersiz istek biçimi." }, 400);
  }

  const dreamText = (body && body.ruya ? String(body.ruya) : "").trim();
  const detay = ["kisa", "normal", "ayrintili"].includes(body && body.detay)
    ? body.detay
    : "normal";
  const turnstileToken = body && body.turnstileToken ? String(body.turnstileToken) : "";

  if (dreamText.length < 15) {
    return jsonResponse(
      { error: "Lütfen rüyanızı biraz daha ayrıntılı yazın (en az birkaç cümle)." },
      400
    );
  }
  if (dreamText.length > 6000) {
    return jsonResponse(
      { error: "Rüya metni çok uzun. Lütfen 6000 karakterden kısa tutun." },
      400
    );
  }

  // Bot korumasi: Turnstile dogrulamasi (yapilandirilmissa)
  const remoteip = request.headers.get("CF-Connecting-IP") || undefined;
  const botGecti = await turnstileGecerliMi(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    remoteip
  );
  if (!botGecti) {
    return jsonResponse(
      { error: "Güvenlik doğrulaması tamamlanamadı. Lütfen sayfayı yenileyip tekrar deneyin." },
      403
    );
  }

  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: "Yorum servisi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin." },
      503
    );
  }

  const parcalar = selectKnowledge(dreamText, 8);
  const kaynak = kaynakMetni(parcalar);

  const detayNotu =
    detay === "kisa"
      ? "Yorumu derli toplu ve öz tut; her başlık kısa olsun."
      : detay === "ayrintili"
      ? "Yorumu ayrıntılı ve doyurucu yap; her başlığı zengin biçimde açıkla."
      : "Yorumu dengeli bir uzunlukta yap.";

  const kullaniciMesaji = `Kullanıcının rüyası:\n"""${dreamText}"""\n\nYorumlarken dayanabileceğin İslami kaynak çerçevesi:\n"""${kaynak}"""\n\n${detayNotu}\n\nYukarıdaki kurallara ve başlık yapısına harfiyen uyarak bu rüyayı yorumla.`;

  let groqRes;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.5,
        max_tokens: DETAIL_TOKENS[detay],
        messages: [
          { role: "system", content: SISTEM_TALIMATI },
          { role: "user", content: kullaniciMesaji },
        ],
      }),
    });
  } catch {
    return jsonResponse(
      { error: "Yorum servisine ulaşılamadı. Lütfen biraz sonra tekrar deneyin." },
      502
    );
  }

  if (!groqRes.ok) {
    const status = groqRes.status === 429 ? 429 : 502;
    const msg =
      groqRes.status === 429
        ? "Şu anda yoğunluk var. Lütfen birkaç dakika sonra tekrar deneyin."
        : "Yorum üretilirken bir sorun oluştu. Lütfen tekrar deneyin.";
    return jsonResponse({ error: msg }, status);
  }

  let data;
  try {
    data = await groqRes.json();
  } catch {
    return jsonResponse(
      { error: "Yorum işlenirken bir sorun oluştu. Lütfen tekrar deneyin." },
      502
    );
  }

  const yorum = data?.choices?.[0]?.message?.content?.trim();
  if (!yorum) {
    return jsonResponse({ error: "Yorum boş döndü. Lütfen tekrar deneyin." }, 502);
  }

  return jsonResponse({
    yorum,
    detay,
    kaynaklar: parcalar.map((p) => ({ baslik: p.baslik, referans: p.referans })),
  });
}

export async function onRequestGet() {
  return jsonResponse(
    { mesaj: "Bu uç nokta yalnızca POST ile rüya yorumu üretir." },
    405
  );
}
