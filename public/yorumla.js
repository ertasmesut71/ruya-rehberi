// Rüya yorumlama sayfası mantığı
(function () {
  const $ = (id) => document.getElementById(id);
  const ruya = $("ruya");
  const sayac = $("sayac");
  const gonder = $("gonder");
  const hata = $("hata");
  const yukleniyor = $("yukleniyor");
  const sonuc = $("sonuc");
  const yorumEl = $("yorum");
  const kaynaklarEl = $("kaynaklar");

  // Karakter sayacı
  function guncelleSayac() {
    const n = ruya.value.length;
    sayac.textContent = `${n} / 6000 karakter`;
  }
  ruya.addEventListener("input", guncelleSayac);
  guncelleSayac();

  function hataGoster(mesaj) {
    hata.textContent = mesaj;
    hata.style.display = "block";
  }
  function hataGizle() {
    hata.style.display = "none";
    hata.textContent = "";
  }

  // --- Güvenli markdown dönüştürücü (yalnızca temel öğeler; XSS'e karşı önce kaçış) ---
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderMarkdown(md) {
    const lines = escapeHtml(md).split("\n");
    let html = "";
    let inList = false;
    const closeList = () => {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    };
    for (let raw of lines) {
      let line = raw.trim();
      if (line === "") {
        closeList();
        continue;
      }
      // Başlıklar
      if (/^###\s+/.test(line)) {
        closeList();
        html += "<h3>" + inline(line.replace(/^###\s+/, "")) + "</h3>";
        continue;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        html += "<h2>" + inline(line.replace(/^##\s+/, "")) + "</h2>";
        continue;
      }
      if (/^#\s+/.test(line)) {
        closeList();
        html += "<h2>" + inline(line.replace(/^#\s+/, "")) + "</h2>";
        continue;
      }
      // Liste
      if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += "<li>" + inline(line.replace(/^[-*]\s+/, "")) + "</li>";
        continue;
      }
      // Numaralı liste öğesini kalın başlık gibi ele al
      closeList();
      html += "<p>" + inline(line) + "</p>";
    }
    closeList();
    return html;
  }

  function inline(s) {
    // **kalın** ve *italik* (kaçışlanmış metin üzerinde çalışır)
    return s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  }

  function kaynaklariGoster(kaynaklar) {
    if (!kaynaklar || !kaynaklar.length) {
      kaynaklarEl.innerHTML = "";
      return;
    }
    let html =
      '<h3 style="color:var(--gold-soft);font-family:var(--font-serif);font-size:16px;margin:0 0 10px;">Dayanılan kaynak çerçevesi</h3>';
    html += '<ul style="margin:0;padding-left:18px;color:var(--ink-dim);font-size:14px;">';
    for (const k of kaynaklar) {
      html +=
        "<li style='margin:5px 0'><span style='color:var(--ink-soft)'>" +
        escapeHtml(k.baslik) +
        "</span> — <span style='font-style:italic'>" +
        escapeHtml(k.referans) +
        "</span></li>";
    }
    html += "</ul>";
    html +=
      "<p style='color:var(--ink-dim);font-size:13px;margin:10px 0 0'>Bu araç, İslami rüya yorum geleneğinin telifsiz özetine dayanır. Ayet ve hadis metinleri birebir aktarılmamış, kavramsal çerçeve ve referans verilmiştir.</p>";
    kaynaklarEl.innerHTML = html;
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

    try {
      const res = await fetch("/api/yorumla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruya: metin }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // gövde okunamadı
      }

      if (!res.ok) {
        const mesaj =
          (data && data.error) ||
          "Yorum alınırken bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.";
        hataGoster(mesaj);
        return;
      }

      if (!data || !data.yorum) {
        hataGoster("Yorum boş döndü. Lütfen tekrar deneyin.");
        return;
      }

      yorumEl.innerHTML = renderMarkdown(data.yorum);
      kaynaklariGoster(data.kaynaklar);
      sonuc.style.display = "block";
      sonuc.dataset.rawYorum = data.yorum;
      sonuc.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      hataGoster(
        "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      gonder.disabled = false;
      yukleniyor.style.display = "none";
    }
  }

  gonder.addEventListener("click", yorumla);

  // Ctrl/Cmd + Enter ile gönder
  ruya.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      yorumla();
    }
  });

  // Yeni rüya
  $("tekrar").addEventListener("click", () => {
    ruya.value = "";
    guncelleSayac();
    sonuc.style.display = "none";
    hataGizle();
    ruya.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Kopyala
  $("kopyala").addEventListener("click", async () => {
    const raw = sonuc.dataset.rawYorum || yorumEl.innerText;
    try {
      await navigator.clipboard.writeText(raw);
      const btn = $("kopyala");
      const eski = btn.textContent;
      btn.textContent = "✓ Kopyalandı";
      setTimeout(() => (btn.textContent = eski), 1800);
    } catch {
      hataGoster("Kopyalama başarısız oldu. Metni elle seçip kopyalayabilirsiniz.");
    }
  });
})();
