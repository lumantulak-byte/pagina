/* =========================================================
   CARTA ROMÁNTICA — comportamiento
   Todo lo que podés querer cambiar está en CONFIG.
   ========================================================= */
const CONFIG = {
  // 📅 Fecha desde la que se cuentan los días (formato AAAA-MM-DD)
  fechaInicio: "2025-02-14",
  etiquetaContador: "días desde que empezó todo",

  // 💌 Mensaje que aparece al tocar "Tengo algo para vos"
  mensajeEspecial: "Gracias por existir en mi mundo. Hoy solo quería recordarte lo mucho que te quiero.",

  // 💬 Tarjetas: se muestran de a una cada vez que se toca "Descubrir otro mensaje".
  // Podés agregar, quitar o cambiar frases libremente.
  mensajes: [
    "Entre tantas personas, qué lindo coincidir con vos.",
    "Hay personas que hacen que los días sean un poquito más bonitos.",
    "No necesito un día especial para recordarte lo importante que sos.",
    "A veces, una persona puede convertirse en nuestro lugar favorito.",
    "Si pudiera elegir nuevamente, me gustaría volver a coincidir con vos.",
    "Tu voz tiene el don de dejarme tranquilo el corazón.",
    "Lo mejor de mis días suele tener tu nombre cerca."
  ],
  tarjetasIniciales: 3,   // cuántas tarjetas se ven al comienzo
  particulas: 24          // cantidad de corazones/destellos de fondo (menos = más minimalista)
};

const $ = (id) => document.getElementById(id);
const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. Chispas de corazones al tocar ---------- */
function explosion(x, y, cantidad = 16) {
  if (reducirMovimiento) return;
  for (let i = 0; i < cantidad; i++) {
    const c = document.createElement("span");
    const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 120;
    c.className = "chispa";
    c.textContent = Math.random() > .3 ? "♥" : "✦";
    c.style.cssText = `left:${x}px;top:${y}px;font-size:${10 + Math.random() * 16}px;` +
      `--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 40}px;--giro:${(Math.random() - .5) * 120}deg`;
    c.addEventListener("animationend", () => c.remove());
    document.body.appendChild(c);
  }
}
const centroDe = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

/* ---------- 2. Botón principal + mensaje especial ---------- */
const dialogo = $("especial");
$("msgEspecial").textContent = CONFIG.mensajeEspecial;

$("btnSorpresa").addEventListener("click", (e) => {
  explosion(...centroDe(e.currentTarget), 22);
  setTimeout(() => dialogo.showModal(), 550);        // pequeña pausa para disfrutar la animación
});
$("btnCerrar").addEventListener("click", () => {
  dialogo.close();
  $("mensajes").scrollIntoView({ behavior: "smooth" });
});
dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); }); // clic afuera cierra

// El corazón también responde al toque
$("corazon").addEventListener("click", (e) => {
  const c = e.currentTarget;
  c.classList.remove("toque"); void c.offsetWidth; c.classList.add("toque");
  explosion(...centroDe(c), 12);
});

/* ---------- 3. Tarjetas de mensajes ---------- */
const contenedor = $("tarjetas"), btnOtro = $("btnOtro");
let mostradas = 0;

function agregarTarjeta() {
  const t = document.createElement("div");
  t.className = "tarjeta";
  t.innerHTML = "<p></p>";
  t.firstChild.textContent = CONFIG.mensajes[mostradas++];
  contenedor.appendChild(t);
  return t;
}
function reiniciarTarjetas() {
  contenedor.innerHTML = ""; mostradas = 0;
  for (let i = 0; i < CONFIG.tarjetasIniciales; i++) agregarTarjeta();
  btnOtro.textContent = "Descubrir otro mensaje";
}
btnOtro.addEventListener("click", () => {
  if (mostradas >= CONFIG.mensajes.length) return reiniciarTarjetas();
  agregarTarjeta().scrollIntoView({ behavior: "smooth", block: "nearest" });
  explosion(...centroDe(btnOtro), 6);
  if (mostradas >= CONFIG.mensajes.length) btnOtro.textContent = "Volver a empezar ♡";
});
reiniciarTarjetas();

/* ---------- 4. Contador de días ---------- */
$("etiquetaDias").textContent = CONFIG.etiquetaContador;
const inicio = new Date(CONFIG.fechaInicio + "T00:00:00");
const totalDias = Math.max(0, Math.floor((Date.now() - inicio) / 864e5));

function contarHasta(n) {                              // el número "sube" suavemente
  const el = $("dias"), dur = reducirMovimiento ? 0 : 1800, t0 = performance.now();
  (function paso(t) {
    const p = dur ? Math.min((t - t0) / dur, 1) : 1;
    el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))).toLocaleString("es-AR");
    if (p < 1) requestAnimationFrame(paso);
  })(t0);
}

/* ---------- 5. Aparición suave de secciones al hacer scroll ---------- */
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("visible");
    if (en.target.id === "contador") contarHasta(totalDias);
    observador.unobserve(en.target);
  });
}, { threshold: .2 });
document.querySelectorAll(".reveal").forEach((s) => observador.observe(s));

/* ---------- 6. Partículas de fondo (corazones y destellos lentos) ---------- */
const canvas = $("particulas"), ctx = canvas.getContext("2d");
let W, H, items = [];
const COLORES = ["239,167,181", "207,90,114", "248,200,208", "255,225,200"];

function dibujarCorazon(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * .3);
  ctx.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3);
  ctx.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s);
  ctx.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3);
  ctx.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3);
  ctx.fill();
}
function nueva(enFondo = false) {
  return {
    x: Math.random() * W, y: enFondo ? H + 20 : Math.random() * H,
    corazon: Math.random() > .45, s: 8 + Math.random() * 14,
    vy: .12 + Math.random() * .28,                       // velocidad de subida (lenta)
    fase: Math.random() * 6.28, oscila: 12 + Math.random() * 22,
    color: COLORES[Math.floor(Math.random() * COLORES.length)], a: .18 + Math.random() * .3
  };
}
function ajustar() {
  const d = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * d; canvas.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const n = W < 600 ? Math.round(CONFIG.particulas * .6) : CONFIG.particulas;
  items = Array.from({ length: n }, () => nueva());
}
function animar(t) {
  ctx.clearRect(0, 0, W, H);
  items.forEach((p, i) => {
    if (!reducirMovimiento) p.y -= p.vy;
    const x = p.x + Math.sin(t / 2600 + p.fase) * p.oscila;
    const brillo = p.corazon ? 1 : .6 + .4 * Math.sin(t / 700 + p.fase); // los destellos titilan
    ctx.fillStyle = `rgba(${p.color},${p.a * brillo})`;
    if (p.corazon) dibujarCorazon(x, p.y, p.s);
    else { ctx.beginPath(); ctx.arc(x, p.y, p.s / 5, 0, 6.28); ctx.fill(); }
    if (p.y < -30) items[i] = nueva(true);
  });
  if (!reducirMovimiento) requestAnimationFrame(animar);   // con movimiento reducido se dibuja una sola vez
}
addEventListener("resize", ajustar);
ajustar();
requestAnimationFrame(animar);
