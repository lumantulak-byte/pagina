/* =========================================================
   CARTA ROMÁNTICA — comportamiento
   Todo lo que podés querer cambiar está en CONFIG.
   ========================================================= */
const CONFIG = {
  // ☁️ BASE DE DATOS COMPARTIDA para los "Planes" (Firebase Realtime Database).
  // Pegá acá la URL de tu base, por ejemplo: "https://mi-proyecto-default-rtdb.firebaseio.com"
  // Si queda vacío, los planes se guardan solo en este navegador (modo local).
  firebaseURL: "",
  planesIniciales: [
    "Ver una película abrazados", "Cocinar algo rico juntos", "Una caminata al atardecer",
    "Un picnic tranquilo", "Tomar un helado", "Mirar las estrellas"
  ],

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

/* ---------- 4. Planes compartidos entre dispositivos ---------- */
// Usa la API REST de Firebase Realtime Database (sin librerías). Estructura en la base:
//   /pareja/sembrado -> true   (evita volver a cargar los planes iniciales)
//   /pareja/planes/{id} -> { texto, sel (true/false), t (orden) }
const URL_DB = CONFIG.firebaseURL.replace(/\/+$/, "");
const usaNube = URL_DB !== "";
const listaPlanes = $("planesLista"), estadoPlanes = $("estadoPlanes");
let planes = {}, pendientes = 0, ultimaFirma = null;
const vistos = new Set();                               // para animar solo los planes nuevos

async function api(ruta, metodo = "GET", cuerpo) {
  const r = await fetch(`${URL_DB}/pareja${ruta}.json`, {
    method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    headers: cuerpo ? { "Content-Type": "application/json" } : undefined
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
// Modo local (respaldo si todavía no hay base de datos configurada)
const local = {
  leer: () => JSON.parse(localStorage.getItem("pareja") || "null"),
  guardar: (d) => localStorage.setItem("pareja", JSON.stringify(d))
};
const leer = () => (usaNube ? api("") : Promise.resolve(local.leer()));

async function escribir(metodo, id, valor) {            // metodo: PUT | PATCH | DELETE
  if (usaNube) return api(`/planes/${id}`, metodo, valor);
  const d = local.leer() || { sembrado: true, planes: {} };
  d.planes = d.planes || {};
  if (metodo === "DELETE") delete d.planes[id]; else d.planes[id] = { ...d.planes[id], ...valor };
  local.guardar(d);
}
async function sembrar() {                              // ids fijos: si dos personas entran a la vez, no se duplica
  const base = {};
  CONFIG.planesIniciales.forEach((texto, i) => (base["base" + i] = { texto, sel: false, t: i }));
  const d = { sembrado: true, planes: base };
  if (usaNube) await api("", "PATCH", d); else local.guardar(d);
  return d;
}
function pintarPlanes() {
  const firma = JSON.stringify(planes);
  if (firma === ultimaFirma) return;                    // sin cambios: no se redibuja
  ultimaFirma = firma;
  listaPlanes.replaceChildren();
  const orden = Object.entries(planes).sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
  orden.forEach(([id, p]) => {
    const li = document.createElement("li");
    li.className = "plan" + (p.sel ? " activo" : "") + (vistos.has(id) ? "" : " nuevo");
    vistos.add(id);
    const sel = document.createElement("button");
    sel.type = "button"; sel.className = "sel"; sel.textContent = p.texto;
    sel.setAttribute("aria-pressed", String(!!p.sel));
    sel.onclick = () => operar(() => (planes[id].sel = !p.sel), () => escribir("PATCH", id, { sel: !p.sel }));
    const quitar = document.createElement("button");
    quitar.type = "button"; quitar.className = "quitar"; quitar.textContent = "×";
    quitar.setAttribute("aria-label", "Quitar: " + p.texto);
    quitar.onclick = () => operar(() => delete planes[id], () => escribir("DELETE", id));
    li.append(sel, quitar);
    listaPlanes.appendChild(li);
  });
  if (!orden.length) {
    const v = document.createElement("li");
    v.className = "vacio"; v.textContent = "Todavía no hay planes. ¡Agregá el primero!";
    listaPlanes.appendChild(v);
  }
}
const textoEstado = () => usaNube
  ? "Sincronizado entre dispositivos ♥"
  : "Modo local: configurá firebaseURL en script.js para compartir los planes entre dispositivos.";

async function sincronizar() {
  if (pendientes) return;                               // no pisar cambios que se están guardando
  try {
    let d = await leer();
    if (!d || !d.sembrado) d = await sembrar();
    if (pendientes) return;
    planes = d.planes || {};
    pintarPlanes();
    estadoPlanes.textContent = textoEstado();
  } catch (e) { estadoPlanes.textContent = "Sin conexión con la base de datos. Reintentando…"; }
}
async function operar(cambioInmediato, escritura) {     // actualiza la pantalla al instante y guarda en segundo plano
  pendientes++;
  cambioInmediato(); ultimaFirma = null; pintarPlanes();
  try { await escritura(); }
  catch (e) { estadoPlanes.textContent = "No se pudo guardar el cambio. Probá de nuevo."; }
  finally { pendientes--; }
  sincronizar();                                        // vuelve a leer: queda lo que hay en la base
}
$("formPlan").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("planNuevo"), texto = input.value.trim().slice(0, 60);
  if (!texto) return;
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const plan = { texto, sel: true, t: Date.now() };
  operar(() => (planes[id] = plan), () => escribir("PUT", id, plan));
  input.value = "";
});
sincronizar();
setInterval(() => { if (!document.hidden && usaNube) sincronizar(); }, 5000);   // trae cambios de otros dispositivos
document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar(); });

/* ---------- 4b. Contador: tiempo juntos desde el 17/06/2026 ---------- */
// Fecha FIJA (no hay ningún campo en la página para cambiarla). Se calcula con la hora de
// Argentina (UTC-3), así que todos los visitantes ven exactamente el mismo tiempo.
const INICIO = Object.freeze({ anio: 2026, mes: 6, dia: 17 });
const OFFSET_AR = -3 * 36e5;
const inicioMs = Date.UTC(INICIO.anio, INICIO.mes - 1, INICIO.dia, 0, 0, 0);
const celdas = Object.fromEntries(["meses", "dias", "horas", "minutos", "segundos"].map((k) => [k, $("t-" + k)]));
const dos = (n) => String(n).padStart(2, "0");

function actualizarContador() {
  const ahoraMs = Date.now() + OFFSET_AR;               // "reloj" de Argentina, leído con getUTC*
  const ahora = new Date(ahoraMs);
  let meses = 0, resto = 0;
  if (ahoraMs > inicioMs) {                             // meses calendario completos
    meses = (ahora.getUTCFullYear() - INICIO.anio) * 12 + ahora.getUTCMonth() - (INICIO.mes - 1);
    let ancla = Date.UTC(INICIO.anio, INICIO.mes - 1 + meses, INICIO.dia);
    if (ancla > ahoraMs) { meses--; ancla = Date.UTC(INICIO.anio, INICIO.mes - 1 + meses, INICIO.dia); }
    resto = Math.floor((ahoraMs - ancla) / 1000);       // lo que sobra después de los meses
  }
  celdas.meses.textContent = meses;
  celdas.dias.textContent = Math.floor(resto / 86400);
  celdas.horas.textContent = dos(Math.floor(resto % 86400 / 3600));
  celdas.minutos.textContent = dos(Math.floor(resto % 3600 / 60));
  celdas.segundos.textContent = dos(resto % 60);
}
actualizarContador();
setInterval(actualizarContador, 1000);

/* ---------- 5. Aparición suave de secciones al hacer scroll ---------- */
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("visible");
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
