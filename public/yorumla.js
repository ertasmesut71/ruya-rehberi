// Rüya yorumlama sayfası mantığı
(function () {
  const $ = (id) => document.getElementById(id);
  const ruya = $("ruya");
  const sayac = $("sayac");
  const gonder = $("gonder");
  const hata = $("hata");
  const yukleniyor = $("yukleniyor");
  const yuklenimMetin = $("yuklenimMetin");
  const sonuc = $("sonuc");
  const kartlarEl = $("kartlar");
  const kaynaklarEl = $("kaynaklar");

  // Yükleme sırasında dönen adım mesajları
  const YUKLEME_ADIMLARI = [
    "Rüyanız okunuyor…",
    "İlgili kaynaklar inceleniyor…",
    "Semboller değerlendiriliyor…",
    "Kur'an ve hadis çerçevesi taranıyor…",
    "Yorum hazırlanıyor…",
  ];
  let yuklemeTimer = null;

  function yuklemeBaslat() {
    let i = 0;
    yuklenimMetin.textContent = YUKLEME_ADIMLARI[0];
    yuklemeTimer = setInterval(() => {
      i = (i + 1) % YUKLEME_ADIMLARI.length;
      yuklenimMetin.textContent = YUKLEME_ADIMLARI[i];
    }, 2200);
  }
  function yuklemeDurdur() {
    if (yuklemeTimer) { clearInterval(yuklemeTimer); yuklemeTimer = null; }
  }

  function guncelleSayac() {
    sayac.textContent = ruya.value.length + " / 6000 karakter";
  }
  ruya.addEventListener("input", guncelleSayac);
  guncelleSayac();

  // Mobilde otomatik büyüyen textarea
  function otoBuyu() {
    ruya.style.height = "auto";
    ruya.style.height = Math.min(ruya.scrollHeight, 500) + "px";
  }
  ruya.addEventListener("input", otoBuyu);

  function hataGoster(mesaj) { hata.textContent = mesaj; hata.style.display = "block"; }
  function hataGizle() { hata.style.display = "none"; hata.textContent = ""; }

  // --- Güvenli markdown (XSS'e karşı önce kaçış) ---
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function inline(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  }
  // Bir metin bloğunu (## başlıkları olmadan) paragraf + liste olarak render eder
  function renderBlok(md) {
    const lines = escapeHtml(md).split("\n");
    let html = "", inList = false;
    const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
    for (let raw of lines) {
      const line = raw.trim();
      if (line === "") { closeList(); continue; }
      if (/^[-*]\s+/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + inline(line.replace(/^[-*]\s+/, "")) + "</li>";
        continue;
      }
      closeList();
      html += "<p>" + inline(line) + "</p>";
    }
    closeList();
    return html;
  }

  // Başlık -> ikon/etiket eşlemesi (SVG ikonlar)
  const IKON = {
    ozet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    sembol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>',
    kuran: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h12"/></svg>',
    hadis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l2 5h5l-4 3 1.5 5L12 18l-4.5 3L9 16l-4-3h5z"/></svg>',
    alim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8l9-4 9 4-9 4z"/><path d="M7 10v5c0 1 2 2 5 2s5-1 5-2v-5"/></svg>',
    diyanet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21h16M6 21V9l6-5 6 5v12M9 21v-6h6v6"/></svg>',
    genel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg>',
  };
  function basligaIkon(baslik) {
    const b = baslik.toLocaleLowerCase("tr-TR");
    if (b.includes("özet")) return IKON.ozet;
    if (b.includes("sembol")) return IKON.sembol;
    if (b.includes("kur'an") || b.includes("kuran")) return IKON.kuran;
    if (b.includes("hadis")) return IKON.hadis;
    if (b.includes("alim")) return IKON.alim;
    if (b.includes("diyanet") || b.includes("çağdaş")) return IKON.diyanet;
    if (b.includes("değerlendirme") || b.includes("tavsiye")) return IKON.genel;
    return IKON.genel;
  }

  // Markdown yorumu "## başlık" bölümlerine ayırıp kartlara dönüştürür
  function kartlariOlustur(md) {
    // Son satırdaki disclaimer'ı ayır
    let disclaimer = "";
    const discRe = /En doğrusunu Allah bilir\.[^\n]*/;
    const discMatch = md.match(discRe);
    if (discMatch) { disclaimer = discMatch[0]; md = md.replace(discRe, "").trim(); }

    const parts = md.split(/^##\s+/m).map((p) => p.trim()).filter(Boolean);
    let html = "";
    for (const part of parts) {
      const nl = part.indexOf("\n");
      const baslik = (nl === -1 ? part : part.slice(0, nl)).trim();
      const govde = nl === -1 ? "" : part.slice(nl + 1).trim();
      html +=
        '<section class="yorum-kart">' +
        '<div class="yorum-kart-bas"><span class="yorum-ikon">' + basligaIkon(baslik) + "</span>" +
        "<h3>" + escapeHtml(baslik) + "</h3></div>" +
        '<div class="yorum-kart-icerik prose">' + renderBlok(govde) + "</div>" +
        "</section>";
    }
    if (disclaimer) {
      html += '<div class="disclaimer" style="margin-top:4px"><span class="i">☾</span><span>' +
        escapeHtml(disclaimer) + "</span></div>";
    }
    return html;
  }

  function kaynaklariGoster(kaynaklar) {
    if (!kaynaklar || !kaynaklar.length) { kaynaklarEl.innerHTML = ""; return; }
    let items = "";
    for (const k of kaynaklar) {
      items += "<li><span class='k-baslik'>" + escapeHtml(k.baslik) +
        "</span> — <span class='k-ref'>" + escapeHtml(k.referans) + "</span></li>";
    }
    kaynaklarEl.innerHTML =
      '<details class="kaynak-detay"><summary>Dayanılan kaynak çerçevesi (' + kaynaklar.length + ")</summary>" +
      "<ul class='kaynak-liste'>" + items + "</ul>" +
      "<p class='kaynak-not'>Bu araç, İslami rüya yorum geleneğinin telifsiz özetine dayanır. Ayet ve hadis metinleri birebir aktarılmamış, kavramsal çerçeve ve referans verilmiştir. Daha fazlası için <a href='kaynaklar.html'>Kaynaklar</a> sayfasına bakabilirsiniz.</p>" +
      "</details>";
  }

  function seciliDetay() {
    const el = document.querySelector('input[name="detay"]:checked');
    return el ? el.value : "normal";
  }

  // Turnstile jetonu (varsa)
  function turnstileToken() {
    try {
      if (window.turnstile && typeof window.turnstile.getResponse === "function") {
        return window.turnstile.getResponse() || "";
      }
    } catch (_) {}
    return "";
  }
  function turnstileSifirla() {
    try { if (window.turnstile && window.turnstile.reset) window.turnstile.reset(); } catch (_) {}
  }

  async function yorumla() {
    hataGizle();
    const metin = ruya.value.trim();
    if (metin.length < 15) {
      hataGoster("Lütfen rüyanızı biraz daha ayrıntılı yazın (en az birkaç cümle).");
      ruya.focus();
      return;
    }

    gonder.disabled = true;
    sonuc.style.display = "none";
    yukleniyor.style.display = "block";
    yuklemeBaslat();

    try {
      const res = await fetch("/api/yorumla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruya: metin, detay: seciliDetay(), turnstileToken: turnstileToken() }),
      });

      let data = null;
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        hataGoster((data && data.error) || "Yorum alınırken bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.");
        turnstileSifirla();
        return;
      }
      if (!data || !data.yorum) {
        hataGoster("Yorum boş döndü. Lütfen tekrar deneyin.");
        turnstileSifirla();
        return;
      }

      kartlarEl.innerHTML = kartlariOlustur(data.yorum);
      kaynaklariGoster(data.kaynaklar);
      sonuc.style.display = "block";
      sonuc.dataset.rawYorum = data.yorum;
      turnstileSifirla();
      sonuc.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      hataGoster("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
      turnstileSifirla();
    } finally {
      gonder.disabled = false;
      yukleniyor.style.display = "none";
      yuklemeDurdur();
    }
  }

  gonder.addEventListener("click", yorumla);
  ruya.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); yorumla(); }
  });

  $("tekrar").addEventListener("click", () => {
    ruya.value = ""; guncelleSayac(); otoBuyu();
    sonuc.style.display = "none"; hataGizle(); ruya.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Tekrar yorumla (aynı rüya, yeni yorum)
  $("yeniden").addEventListener("click", () => {
    if (ruya.value.trim().length >= 15) yorumla();
  });

  $("kopyala").addEventListener("click", async () => {
    const raw = sonuc.dataset.rawYorum || kartlarEl.innerText;
    try {
      await navigator.clipboard.writeText(raw);
      const btn = $("kopyala");
      const eski = btn.innerHTML;
      btn.innerHTML = "✓ Kopyalandı";
      btn.classList.add("ok");
      setTimeout(() => { btn.innerHTML = eski; btn.classList.remove("ok"); }, 1900);
    } catch {
      hataGoster("Kopyalama başarısız oldu. Metni elle seçip kopyalayabilirsiniz.");
    }
  });
})();
