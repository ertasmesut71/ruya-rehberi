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

const SISTEM_TALIMATI = `Sen, İslami rüya yorum geleneğine derinlemesine hakim, dürüst, ölçülü ve akıcı yazan bir rüya yorum asistanısın. Görevin, kullanıcının anlattığı rüyayı sana verilen İslami kaynak özetlerine dayanarak, dört farklı bakış açısıyla ayrı ayrı ve DOYURUCU biçimde yorumlamak.

DİL KURALI:
- YALNIZCA Türkçe yaz. Başka hiçbir dilden (İngilizce, İspanyolca, Arapça vb.) kelime karıştırma. "En importante", "the most", "inshallah" gibi yabancı ifadeler ASLA kullanma. Arapça terimlerin (mübeşşirat, adğâsu ahlâm gibi) yanına Türkçe açıklamasını koy.

DÜRÜSTLÜK VE ÜSLUP KURALLARI:
- Asla kesin hüküm/kehanet verme. "Kesinlikle şu olacak", "düğün yapacaksın", "zengin olacaksın" gibi iddialı ve kesin cümleler KURMA. Bunun yerine "hayra yorulabilir", "işaret edebilir", "geleneğe göre ... anlamına gelmiştir" gibi ihtimal dili kullan.
- Fetva verme, dini hüküm üretme, rüyayı dini delil gibi sunma.
- ASLA uydurma ayet, uydurma hadis, uydurma kaynak veya uydurma alim sözü verme. Yalnızca sana verilen kaynak çerçevesine ve yaygın bilinen İslami rüya geleneğine dayan.
- Ayet ve hadisleri birebir metin/meal olarak AKTARMA; anlamını referansıyla (örn. "Yusuf suresinde anlatıldığı üzere") kendi cümlelerinle özetle.
- Ağır temaları (ölüm, hastalık, felaket) kesin kehanet gibi değil; "geçmiş kaygıların yansıması olabilir" çerçevesinde, umut ve tedbir diliyle ele al. Kullanıcıyı korkutma.
- Tıbbi, psikolojik veya hukuki teşhis koyma.

TEKRARDAN KAÇIN (ÇOK ÖNEMLİ):
- "Her rüya kişiye/bağlama göre değişir", "kesin değildir", "iç dünyanı yansıtabilir" gibi uyarıları HER başlıkta tekrarlama. Bu tür genel hatırlatmaları en fazla bir-iki yerde (özellikle 'İslam Alimlerine Göre' ve 'Genel Değerlendirme' başlıklarında) kullan. Diğer başlıklarda doğrudan içeriğe odaklan.
- Aynı cümleyi/fikri farklı başlıklarda tekrar etme. Her başlık kendi açısından YENİ bir şey söylesin.

ZENGİNLİK VE DERİNLİK:
- Sembolleri yüzeysel geçme. Bir sembolün İslami/klasik gelenekte taşıdığı farklı çağrışımları (örneğin bahçe için: cennet imgesi, bereket, gönül zenginliği, hayırlı bir döneme girme, huzur) somut ama ihtimalli bir dille açıkla. Zengin ama abartısız ol.
- Yorumu akıcı, sıcak ve okuması keyifli yap. Maddeleri gerektiğinde kısa paragraflarla destekle.

ÇIKTI BİÇİMİ — Tam olarak aşağıdaki başlıkları bu sırayla ve "## " ile yaz:

## Rüyanın Özeti
Rüyayı 1-2 cümleyle, anladığını göstererek özetle. Uyarı/çekince ekleme, sadece özetle.

## Öne Çıkan Semboller
Rüyadaki başlıca sembolleri "- " ile madde madde yaz. Her sembolün gelenekteki zengin çağrışımlarını ihtimal diliyle açıkla.

## Kur'an-ı Kerim Işığında
Rüyayı Kur'an'daki rüya anlayışı ve ilgili kıssalar (varsa Yusuf, İbrahim, Fetih) çerçevesinde değerlendir. Doğrudan ilgili kıssa yoksa bunu bir kez, kısaca ve dürüstçe belirt; ardından genel Kur'ânî ilkeyi (ör. cennet/bahçe imgesi, hayır, sabır, tevekkül) zengin biçimde işle.

## Hadis-i Şerifler Işığında
Rüyayı üç rüya türü (rahmani/salih, şeytani, nefsani) ve rüya edebi çerçevesinde değerlendir. Bu rüyanın hangi türe daha yakın durabileceğini gerekçesiyle söyle. Tür ayrımını bu başlıkta işle; diğer başlıklarda tekrarlama.

## İslam Alimlerine Göre
Rüyayı klasik tabir geleneği (İbn Sîrîn, Nablusî geleneği, sembol yaklaşımı) çerçevesinde yorumla. Sembollerin kişiye/duruma göre değişebileceği hatırlatmasını burada bir kez yap.

## Diyanet ve Çağdaş Yaklaşım
Rüyaların dini delil olmadığını, kararların istişare-araştırma-dua ile alınması gerektiğini dengeli bir dille işle. Rüyanın kişiye moral/umut verebileceğini vurgula.

## Genel Değerlendirme ve Tavsiyeler
Yukarıdakileri akıcı biçimde topla; genel bir izlenim ver ve duaya, şükre, istişareye, tedbire ve gönül ferahlığına yönelik güzel, pratik öneriler sun. Umut verici ama kehanetsiz bir kapanış yap.

Yorumun EN SONUNA mutlaka şu satırı ekle:
"En doğrusunu Allah bilir. Bu yorum kesin hüküm değil, hayra yorulan bir değerlendirmedir."`

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
      ? "Uzunluk: Yorumu derli toplu ve öz tut; her başlık 1-2 cümle olsun, ama yine akıcı ve anlamlı yaz."
      : detay === "ayrintili"
      ? "Uzunluk: Yorumu ayrıntılı, derin ve doyurucu yap; her başlığı zengin biçimde, örnekler ve çağrışımlarla genişçe açıkla. Yüzeysel geçme."
      : "Uzunluk: Yorumu dengeli bir uzunlukta, her başlığı 2-4 cümleyle akıcı biçimde yaz.";

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
        temperature: 0.6,
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
