// Cloudflare Pages Function: POST /api/yorumla
// Rüya metnini alır, İslami bilgi tabanından ilgili parçaları seçer,
// Groq (ücretsiz, OpenAI-uyumlu) üzerinden yorum üretir.
// API anahtarı sunucu tarafında ortam değişkeninde tutulur (GROQ_API_KEY).

import { selectKnowledge } from "./knowledge.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq, llama-3.3-70b-versatile modelini 17.06.2026'da deprecate etti.
// Güncel önerilen model: openai/gpt-oss-120b. Model adı ortam değişkeniyle
// (GROQ_MODEL) değiştirilebilir; böylece ileride model değişirse kod
// güncellemeden yalnızca ayardan değiştirilebilir.
const DEFAULT_MODEL = "openai/gpt-oss-120b";

const SISTEM_TALIMATI = `Sen, İslami rüya yorum geleneğine saygılı, dürüst ve ölçülü bir rüya yorum asistanısın. Görevin, kullanıcının anlattığı rüyayı sana verilen İslami kaynak özetlerine dayanarak yorumlamak.

KESİN KURALLAR:
- Asla kesin hüküm verme. "Kesinlikle şu olacak", "bu şu demektir" gibi kesin ifadeler kullanma. Bunun yerine "olabilir", "işaret edebilir", "geleneğe göre ... yorumlanmıştır" gibi ihtimal dili kullan.
- Fetva verme, dini hüküm üretme. Rüyayı dini bir delil gibi sunma.
- Sadece sana verilen kaynak çerçevesine ve genel İslami rüya geleneğine dayan. Uydurma hadis, uydurma ayet, uydurma kaynak ASLA verme.
- Kullanıcıyı korkutma, kaygılandırma veya kadercilikle yıldırma. Kötü ihtimalleri yumuşak, umut veren ve tedbir öneren bir dille anlat.
- Tıbbi, psikolojik veya hukuki teşhis koyma. Kişinin ruh halini teşhis etme.
- Sağlık, ölüm, felaket gibi ağır temalar varsa; bunları kesin kehanet gibi değil, "geçmiş kaygıların yansıması olabilir" çerçevesinde ele al ve kişiyi rahatlat.

YORUM YAPISI (bu başlıklarla, sade ve akıcı Türkçe ile yaz):
1. **Rüyanın özeti** — Kullanıcının anlattığını 1-2 cümleyle, anladığını göstererek özetle.
2. **Öne çıkan semboller** — Rüyadaki belli başlı sembolleri ve İslami gelenekteki genel çağrışımlarını kısaca açıkla.
3. **Rüya türü ihtimali** — Bu rüyanın rahmani (salih/müjde), şeytani (kaygı/kabus) veya nefsani (gündelik yansıma) türlerden hangisine daha yakın olabileceğini, gerekçesiyle ama ihtimal diliyle söyle.
4. **Kaynaklı yorum** — Sana verilen kaynak çerçevesine dayanarak dengeli bir yorum sun.
5. **Ne yapmalı?** — Duaya, istişareye, tedbire ve gönlü ferah tutmaya yönelik, güzel ve pratik öneriler ver.

Yorumun sonunda mutlaka şu satırı ekle:
"En doğrusunu Allah bilir. Bu yorum kesin hüküm değil, hayra yorulan bir değerlendirmedir."

Yorumu markdown başlıkları (##) ve kısa paragraflarla düzenle. Sıcak, saygılı ve anlaşılır ol.`;

function kaynakMetni(parcalar) {
  return parcalar
    .map((p, i) => `[K${i + 1}] ${p.baslik}\n${p.icerik}\n(Referans: ${p.referans})`)
    .join("\n\n");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz istek biçimi." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const dreamText = (body && body.ruya ? String(body.ruya) : "").trim();

  if (dreamText.length < 15) {
    return new Response(
      JSON.stringify({ error: "Lütfen rüyanızı biraz daha ayrıntılı yazın (en az birkaç cümle)." }),
      { status: 400, headers: jsonHeaders }
    );
  }
  if (dreamText.length > 6000) {
    return new Response(
      JSON.stringify({ error: "Rüya metni çok uzun. Lütfen 6000 karakterden kısa tutun." }),
      { status: 400, headers: jsonHeaders }
    );
  }

  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Yorum servisi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin.",
      }),
      { status: 503, headers: jsonHeaders }
    );
  }

  const parcalar = selectKnowledge(dreamText, 6);
  const kaynak = kaynakMetni(parcalar);

  const kullaniciMesaji = `Kullanıcının rüyası:\n"""${dreamText}"""\n\nYorumlarken dayanabileceğin İslami kaynak çerçevesi:\n"""${kaynak}"""\n\nYukarıdaki kurallara ve yapıya uyarak bu rüyayı yorumla.`;

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
        max_tokens: 1600,
        messages: [
          { role: "system", content: SISTEM_TALIMATI },
          { role: "user", content: kullaniciMesaji },
        ],
      }),
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Yorum servisine ulaşılamadı. Lütfen biraz sonra tekrar deneyin." }),
      { status: 502, headers: jsonHeaders }
    );
  }

  if (!groqRes.ok) {
    const status = groqRes.status === 429 ? 429 : 502;
    const msg =
      groqRes.status === 429
        ? "Şu anda yoğunluk var. Lütfen birkaç dakika sonra tekrar deneyin."
        : "Yorum üretilirken bir sorun oluştu. Lütfen tekrar deneyin.";
    return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders });
  }

  let data;
  try {
    data = await groqRes.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Yorum işlenirken bir sorun oluştu. Lütfen tekrar deneyin." }),
      { status: 502, headers: jsonHeaders }
    );
  }

  const yorum = data?.choices?.[0]?.message?.content?.trim();
  if (!yorum) {
    return new Response(
      JSON.stringify({ error: "Yorum boş döndü. Lütfen tekrar deneyin." }),
      { status: 502, headers: jsonHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      yorum,
      kaynaklar: parcalar.map((p) => ({ baslik: p.baslik, referans: p.referans })),
    }),
    { status: 200, headers: jsonHeaders }
  );
}

// GET istekleri için basit bilgi
export async function onRequestGet() {
  return new Response(
    JSON.stringify({ mesaj: "Bu uç nokta yalnızca POST ile rüya yorumu üretir." }),
    { status: 405, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
