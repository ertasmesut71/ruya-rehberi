// Ortak üst menü ve alt bilgiyi tüm sayfalara ekler.
(function () {
  const moonSvg =
    '<svg class="moon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" fill="#d4af37"/>' +
    '<circle cx="16.5" cy="6" r="0.9" fill="#e6c968"/>' +
    '<circle cx="19" cy="9" r="0.6" fill="#e6c968"/>' +
    "</svg>";

  const links = [
    { href: "index.html", text: "Ana Sayfa" },
    { href: "yorumla.html", text: "Rüya Yorumlat" },
    { href: "ruya-hakkinda.html", text: "Rüya Hakkında" },
    { href: "rehber-dualar.html", text: "Rehber & Dualar" },
    { href: "kaynaklar.html", text: "Kaynaklar" },
    { href: "hakkimizda.html", text: "Hakkımızda" },
  ];

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const navLinks = links
    .map((l) => `<a href="${l.href}">${l.text}</a>`)
    .join("");

  const header =
    '<header class="site-header"><nav class="nav">' +
    `<a class="brand" href="index.html">${moonSvg}<span>Rüya Rehberi</span></a>` +
    '<button class="nav-toggle" aria-label="Menü" aria-expanded="false">☰</button>' +
    `<div class="nav-links" id="navLinks">${navLinks}` +
    "</div></nav></header>";

  const footer =
    '<footer class="site-footer"><div class="container">' +
    '<div class="footer-grid">' +
    '<div class="footer-col" style="max-width:280px">' +
    "<h4>Rüya Rehberi</h4>" +
    '<p style="color:var(--ink-dim);font-size:14px;margin:0">Rüyanızı İslami yorum geleneğinin ışığında, dürüst ve ölçülü bir dille değerlendiren ücretsiz bir araç. Kesin hüküm vermez; hayra yorar.</p>' +
    "</div>" +
    '<div class="footer-col"><h4>Sayfalar</h4>' +
    '<a href="index.html">Ana Sayfa</a>' +
    '<a href="yorumla.html">Rüya Yorumlat</a>' +
    '<a href="ruya-hakkinda.html">Rüya Hakkında</a>' +
    '<a href="kaynaklar.html">Kaynaklar</a>' +
    '<a href="hakkimizda.html">Hakkımızda</a>' +
    "</div>" +
    '<div class="footer-col"><h4>Rehber & Dualar</h4>' +
    '<a href="ruyada-su-gormek.html">Rüyada Su Görmek</a>' +
    '<a href="istihare-nedir-nasil-yapilir.html">İstihare Nedir</a>' +
    '<a href="kotu-ruya-gorunce-ne-yapilir.html">Kötü Rüya Görünce</a>' +
    '<a href="borctan-sikintidan-kurtulma-dualari.html">Borç ve Sıkıntı Duaları</a>' +
    '<a href="rizik-bereket-bolluk-dualari.html">Rızık ve Bereket Duaları</a>' +
    "</div>" +
    '<div class="footer-col"><h4>Bilgi</h4>' +
    '<a href="gizlilik.html">Gizlilik Politikası</a>' +
    '<a href="hakkimizda.html#iletisim">İletişim</a>' +
    "</div>" +
    "</div>" +
    '<div class="footer-bottom">© ' +
    new Date().getFullYear() +
    " Rüya Rehberi · En doğrusunu Allah bilir.</div>" +
    "</div></footer>";

  // Header'ı body başına, footer'ı sonuna ekle
  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);

  // Aktif linki işaretle
  document.querySelectorAll("#navLinks a").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === page) {
      a.style.color = "var(--gold-soft)";
    }
  });

  // Mobil menü
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("navLinks");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
})();
