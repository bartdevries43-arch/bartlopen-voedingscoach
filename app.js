/* ================================================================== *
 *  bartlopen — Voedingscoach
 *  Intake -> Anthropic API -> persoonlijk voedingsschema.
 *  Alles lokaal in de browser. Statische site, geen server nodig.
 * ================================================================== */

/* ========== INSTELLINGEN PER PERSOON — pas dit blok aan ==========
   Hergebruik deze app voor iemand anders: kopieer de map, wijzig dit
   blok en (zo nodig) coach.jpg. De storeKey moet UNIEK zijn per app. */
const CONFIG = {
  appName:     "Jouw schema",       // titel boven in de app
  athlete:     "Isa",               // voor wie het schema is (voorvult de naam)
  coachName:   "Coach Bart",        // naam van de coach
  coachHandle: "@bartlopen",        // TikTok/social van de coach
  coachPhoto:  "coach.jpg",         // coachfoto (bestand in deze map)
  storeKey:    "bartlopen.voeding.isa.v1", // UNIEKE opslagsleutel
};
/* =================================================================== */

/* --- API --- */
const API_URL = "https://api.anthropic.com/v1/messages";
const API_MODEL = "claude-sonnet-4-6";
const API_MAX_TOKENS = 8000;

/* --- Embedded systeem-prompt (exact zoals aangeleverd) ------------- */
const SYSTEM_PROMPT = `Je bent de voedingscoach van bartlopen. Je maakt persoonlijke, praktische voedingsschema's voor hardlopers en mensen die fitter en sterker willen worden. Je schrijft zoals Bart praat: warm, direct, nuchter Nederlands, motiverend, met net dat zetje. Geen kille calorieënteller. Je legt kort uit wat, wanneer en waarom, en je houdt het haalbaar.

Je krijgt de intake van één persoon. Maak op basis daarvan een compleet, persoonlijk schema.

Harde regels:
- Schrijf alles in het Nederlands.
- Geef echte maaltijden met concrete ingrediënten en porties, geen vage richtlijnen.
- Vermeld per maaltijd de koolhydraten in gram.
- Zet kcal en macro's (koolhydraten, eiwit, vet) in een apart dag-totaal, niet verstopt in de tekst.
- Maak minimaal twee dagtypes: een rustige dag en een trainingsdag. Stem de trainingsdag af op het type training van deze persoon, met fueling voor, tijdens en na.
- Respecteer dieet, allergieën en wat iemand niet eet. Overtreed dit nooit.
- Houd rekening met kooktijd, kookniveau, budget en aantal personen.
- Maak een boodschappenlijst, gegroepeerd per categorie.
- Sluit af met minstens 3 coachtips in bartlopen-stem.
- Antwoord uitsluitend met geldige JSON volgens het schema. Geen tekst eromheen, geen markdown, geen codeblok-tekens.`;

const SCHEMA_HINT = `Antwoord met exact deze JSON-structuur:
{
  "intro": "persoonlijke bartlopen-begroeting met de naam erin",
  "coachNote": "1-2 zinnen motiverend",
  "dagdoel": { "kcal": 0, "koolhydraten_g": 0, "eiwit_g": 0, "vet_g": 0, "uitleg": "1 korte zin" },
  "dagen": [
    {
      "type": "Rustige dag",
      "training": "bv. geen training of rustige wandeling",
      "maaltijden": [
        { "moment": "Ontbijt", "tijd": "07:30", "titel": "...", "ingredienten": ["..."], "koolhydraten_g": 0, "kcal": 0, "tip": "..." }
      ],
      "dagtotaal_kcal": 0
    },
    {
      "type": "Trainingsdag",
      "training": "afgestemd op haar trainingstype",
      "fueling": { "voor": "...", "tijdens": "...", "na": "..." },
      "maaltijden": [ "...zelfde structuur als hierboven..." ],
      "dagtotaal_kcal": 0
    }
  ],
  "hydratatie": "kort en concreet",
  "snacks": ["...", "..."],
  "boodschappenlijst": [ { "categorie": "Groente & fruit", "items": ["..."] } ],
  "coachtips": ["...", "...", "..."]
}`;

/* ================================================================== *
 *  Veilige localStorage (alles in try/catch)
 * ================================================================== */
const KEY_API    = "bartlopen.voeding.apikey";
const KEY_INTAKE = CONFIG.storeKey + ".intake";
const KEY_SCHEMA = CONFIG.storeKey + ".schema";
const KEY_CHECK  = CONFIG.storeKey + ".check";

const store = {
  get(k, fallback = null) {
    try { const v = localStorage.getItem(k); return v == null ? fallback : v; }
    catch { return fallback; }
  },
  getJSON(k, fallback = null) {
    try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/* ================================================================== *
 *  Intake — de vragenlijst (precies de velden voor Isa)
 *  type: text | number | textarea | choice | multichoice
 * ================================================================== */
const INTAKE = [
  { title: "Over jou", icon: "👤", sub: "Vul gewoon in wat klopt, kort mag.", fields: [
    { key: "naam",     label: "Naam", type: "text", value: CONFIG.athlete, placeholder: "Je naam" },
    { key: "leeftijd", label: "Leeftijd", type: "number", unit: "jr", placeholder: "bv. 34" },
    { key: "geslacht", label: "Geslacht", type: "choice", options: ["Vrouw", "Man", "Anders"] },
    { key: "lengte",   label: "Lengte", type: "number", unit: "cm", placeholder: "bv. 170" },
    { key: "gewicht",  label: "Gewicht", type: "number", unit: "kg", placeholder: "bv. 65" },
  ]},
  { title: "Jouw doel", icon: "🎯", sub: "Waar gaan we voor?", fields: [
    { key: "doel", label: "Wat wil je vooral?", type: "choice",
      options: ["Fit blijven", "Afvallen", "Aankomen (spier)", "Beter hardlopen", "Een afstand halen"] },
    { key: "streefgewicht", label: "Streefgewicht (als je dat hebt)", type: "number", unit: "kg", placeholder: "laat leeg als geen", optional: true },
    { key: "prestatie", label: "Hoe belangrijk is hardloopprestatie?", type: "choice",
      options: ["Niet zo", "Best wel", "Heel"] },
  ]},
  { title: "Bewegen", icon: "🏃", sub: "Hoe ziet je week eruit?", fields: [
    { key: "dagenPerWeek", label: "Dagen per week sporten of lopen", type: "number", unit: "dgn", placeholder: "bv. 4" },
    { key: "kmPerWeek", label: "Ongeveer hoeveel km per week?", type: "text", placeholder: "bv. 25 — of 'geen idee'",
      hint: "Weet je het niet? Schat of zet 'geen idee'." },
    { key: "trainingen", label: "Wat voor trainingen doe je?", type: "multichoice",
      options: ["Rustige duurloop", "Intervallen", "Lange duurloop", "Kracht", "Anders"], hint: "Meerdere mag." },
    { key: "werk", label: "Wat voor werk doe je?", type: "choice", options: ["Zittend", "Staand", "Fysiek zwaar"] },
  ]},
  { title: "Eten", icon: "🍳", sub: "Zo eet jij het liefst.", fields: [
    { key: "eetstijl", label: "Eetstijl", type: "choice",
      options: ["Alles", "Vegetarisch", "Veganistisch", "Pescotarisch"] },
    { key: "allergie", label: "Allergieën of dingen die je echt niet eet", type: "textarea", placeholder: "bv. lactose, geen vis, niet zo van paprika", optional: true },
    { key: "maaltijden", label: "Hoeveel maaltijden per dag het liefst?", type: "choice",
      options: ["3", "3 + snacks", "Meer kleine"] },
    { key: "trainingsmoment", label: "Wanneer train je meestal?", type: "choice",
      options: ["Ochtend", "Middag", "Avond"] },
    { key: "ochtendeten", label: "Eet je makkelijk 's ochtends, of liever later?", type: "choice",
      options: ["Makkelijk 's ochtends", "Liever later"] },
  ]},
  { title: "Praktisch", icon: "🛒", sub: "Zodat het ook echt past.", fields: [
    { key: "kooktijd", label: "Hoeveel tijd wil je aan koken kwijt?", type: "choice",
      options: ["Snel (<20 min)", "Normaal", "Ik kook graag uitgebreid"] },
    { key: "kookniveau", label: "Kookniveau", type: "choice", options: ["Basis", "Gemiddeld", "Gevorderd"] },
    { key: "budget", label: "Budget", type: "choice", options: ["Op de kleintjes", "Normaal", "Maakt niet uit"] },
    { key: "personen", label: "Voor hoeveel personen kook je meestal?", type: "number", unit: "pers", placeholder: "bv. 2" },
  ]},
  { title: "Persoonlijk", icon: "💬", sub: "Hier maak je het schema écht van jou.", fields: [
    { key: "uitdaging", label: "Wat is je grootste uitdaging met eten?", type: "textarea", placeholder: "bv. 's avonds snacken, geen tijd, weinig variatie", optional: true },
    { key: "lievelingseten", label: "Wat eet je het allerliefst?", type: "textarea", placeholder: "bv. pasta, Thais, een goeie boterham", optional: true },
    { key: "coachweten", label: "Iets wat de coach echt moet weten?", type: "textarea", placeholder: "alles mag", optional: true },
  ]},
];

const FIELD_LABELS = {};
INTAKE.forEach((s) => s.fields.forEach((f) => (FIELD_LABELS[f.key] = f.label)));

/* ================================================================== *
 *  State
 * ================================================================== */
const $ = (id) => document.getElementById(id);
let answers = store.getJSON(KEY_INTAKE, {});
let stepIndex = 0;

/* Vul beginwaarden vanuit de velddefinities (bv. naam = Isa) */
INTAKE.forEach((s) => s.fields.forEach((f) => {
  if (answers[f.key] == null && f.value != null) answers[f.key] = f.value;
}));

/* ================================================================== *
 *  Schermwissel
 * ================================================================== */
const VIEWS = ["intakeView", "loadingView", "resultView", "emptyView"];
function showScreen(id) {
  VIEWS.forEach((v) => $(v).classList.toggle("hidden", v !== id));
  const showBack = id === "resultView" && !!store.getJSON(KEY_SCHEMA);
  $("backButton").classList.toggle("hidden", true); // back niet nodig in deze flow
  window.scrollTo(0, 0);
  requestAnimationFrame(observeReveals);
}

/* ================================================================== *
 *  Intake-rendering
 * ================================================================== */
function startIntake() {
  $("intakeIntro").classList.add("hidden");
  $("intakeForm").classList.remove("hidden");
  stepIndex = 0;
  renderStep();
}

function renderStep() {
  const step = INTAKE[stepIndex];
  const total = INTAKE.length;
  $("stepLabel").textContent = `Stap ${stepIndex + 1}`;
  $("stepCount").textContent = `${stepIndex + 1} / ${total}`;
  $("progressFill").style.width = `${((stepIndex + 1) / total) * 100}%`;
  $("stepIcon").textContent = step.icon;
  $("stepTitle").textContent = step.title;
  $("stepSub").textContent = step.sub || "";

  $("stepFields").innerHTML = step.fields.map(renderField).join("");
  wireFields(step);

  $("prevStep").classList.toggle("hidden", stepIndex === 0);
  $("nextStep").textContent = stepIndex === total - 1 ? "Maak mijn schema 🧡" : "Volgende ›";

  // Stap-kaart opnieuw laten in-poppen
  const card = document.querySelector(".step-card");
  if (card) { card.style.animation = "none"; void card.offsetWidth; card.style.animation = ""; }
}

function renderField(f) {
  const val = answers[f.key];
  const hint = f.hint ? `<span class="hint">${f.hint}</span>` : "";
  let control = "";

  if (f.type === "choice" || f.type === "multichoice") {
    const sel = f.type === "multichoice" ? (Array.isArray(val) ? val : []) : val;
    const chips = f.options.map((o) => {
      const on = f.type === "multichoice" ? sel.includes(o) : sel === o;
      return `<button type="button" class="chip ${on ? "on" : ""}" data-key="${f.key}" data-val="${esc(o)}" data-multi="${f.type === "multichoice"}">${o}</button>`;
    }).join("");
    control = `<div class="chips">${chips}</div>`;
  } else if (f.type === "textarea") {
    control = `<textarea data-key="${f.key}" rows="2" placeholder="${esc(f.placeholder || "")}">${esc(val || "")}</textarea>`;
  } else if (f.type === "number") {
    control = `<div class="with-unit"><input type="number" inputmode="decimal" data-key="${f.key}" placeholder="${esc(f.placeholder || "")}" value="${esc(val ?? "")}">${f.unit ? `<span class="unit">${f.unit}</span>` : ""}</div>`;
  } else {
    control = `<input type="text" data-key="${f.key}" placeholder="${esc(f.placeholder || "")}" value="${esc(val ?? "")}">`;
  }

  return `<div class="field"><label class="field-label">${f.label}${f.optional ? ' <span style="color:var(--muted);font-weight:500">(mag leeg)</span>' : ""}</label>${control}${hint}</div>`;
}

function wireFields(step) {
  $("stepFields").querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      answers[el.dataset.key] = el.value;
      store.setJSON(KEY_INTAKE, answers);
    });
  });
  $("stepFields").querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.key;
      const v = chip.dataset.val;
      if (chip.dataset.multi === "true") {
        const cur = Array.isArray(answers[key]) ? answers[key] : [];
        if (cur.includes(v)) answers[key] = cur.filter((x) => x !== v);
        else answers[key] = [...cur, v];
        chip.classList.toggle("on");
      } else {
        answers[key] = v;
        chip.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
        chip.classList.add("on");
      }
      store.setJSON(KEY_INTAKE, answers);
    });
  });
}

function nextStep() {
  if (stepIndex < INTAKE.length - 1) {
    stepIndex++;
    renderStep();
    window.scrollTo(0, 0);
  } else {
    generateSchema();
  }
}
function prevStep() {
  if (stepIndex > 0) { stepIndex--; renderStep(); window.scrollTo(0, 0); }
}

/* ================================================================== *
 *  Bericht voor de API opbouwen
 * ================================================================== */
function buildUserMessage() {
  const lines = ["Hier is de intake. Maak hier het persoonlijke voedingsschema van.", ""];
  INTAKE.forEach((step) => {
    lines.push(`## ${step.title}`);
    step.fields.forEach((f) => {
      let v = answers[f.key];
      if (Array.isArray(v)) v = v.join(", ");
      v = (v == null || String(v).trim() === "") ? "—" : String(v).trim();
      let suffix = "";
      if (f.unit && v !== "—") suffix = ` ${f.unit}`;
      lines.push(`- ${f.label}: ${v}${suffix}`);
    });
    lines.push("");
  });
  lines.push(SCHEMA_HINT);
  return lines.join("\n");
}

/* ================================================================== *
 *  API-aanroep
 * ================================================================== */
const LOADING_LINES = [
  "Ik reken jouw dagdoel uit…",
  "Maaltijden samenstellen die bij je passen…",
  "De trainingsdag op je loopjes afstemmen…",
  "Boodschappenlijstje maken…",
  "Nog even de coachtips erbij…",
];

async function generateSchema() {
  const apiKey = store.get(KEY_API, "");
  if (!apiKey) {
    toast("Nog geen API-sleutel ingevuld. Open de instellingen ⚙");
    openSettings();
    return;
  }
  if (!answers.naam || String(answers.naam).trim() === "") {
    toast("Vul minstens je naam in, dan ga ik los.");
    stepIndex = 0; startIntake();
    return;
  }

  showScreen("loadingView");
  let li = 0;
  $("loadingSub").textContent = LOADING_LINES[0];
  const cycle = setInterval(() => {
    li = (li + 1) % LOADING_LINES.length;
    $("loadingSub").textContent = LOADING_LINES[li];
  }, 2200);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: API_MODEL,
        max_tokens: API_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage() }],
      }),
    });

    if (!res.ok) {
      let detail = "";
      try { const e = await res.json(); detail = e?.error?.message || ""; } catch {}
      throw new Error(detail || `Server gaf status ${res.status}`);
    }

    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const schema = parseSchema(text);
    if (!schema) throw new Error("Ik kreeg geen leesbaar schema terug. Probeer het nog eens.");

    store.setJSON(KEY_SCHEMA, schema);
    store.del(KEY_CHECK); // nieuwe lijst, vinkjes resetten
    clearInterval(cycle);
    renderResult(schema);
    showScreen("resultView");
  } catch (err) {
    clearInterval(cycle);
    console.error(err);
    const existing = store.getJSON(KEY_SCHEMA);
    toast("Er ging iets mis: " + (err.message || "onbekende fout"));
    if (existing) { renderResult(existing); showScreen("resultView"); }
    else showScreen("intakeView");
  }
}

/* JSON uit het antwoord vissen, ook als er per ongeluk tekst omheen staat */
function parseSchema(text) {
  if (!text) return null;
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(t); } catch {}
  const first = t.indexOf("{"), last = t.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)); } catch {}
  }
  return null;
}

/* ================================================================== *
 *  Resultaat-rendering
 * ================================================================== */
const COACH_INITIAL = (CONFIG.coachName.replace(/^coach\s+/i, "")[0] || "C").toUpperCase();

function renderResult(s) {
  const naam = answers.naam || CONFIG.athlete || "";
  const dagen = Array.isArray(s.dagen) ? s.dagen : [];

  const html = [];

  /* Coach-bubble met intro + coachNote */
  html.push(`
    <section class="result-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="coach-bubble">
        <div class="coach-ava">
          <img src="${CONFIG.coachPhoto}" alt="${esc(CONFIG.coachName)}" onerror="this.style.display='none'">
          <span>${COACH_INITIAL}</span>
        </div>
        <div class="coach-text">
          <span class="coach-name">${esc(CONFIG.coachName)} <span class="coach-handle">${esc(CONFIG.coachHandle)}</span></span>
          <p class="coach-intro">${esc(s.intro || `Hoi ${naam}, hier is je schema!`)}</p>
        </div>
      </div>
      ${s.coachNote ? `<p class="coach-note">${esc(s.coachNote)}</p>` : ""}
    </section>`);

  /* Dagdoel met ring */
  const dg = s.dagdoel || {};
  const kcal = num(dg.kcal);
  const koolh = num(dg.koolhydraten_g);
  const eiwit = num(dg.eiwit_g);
  const vet = num(dg.vet_g);
  html.push(`
    <section class="daygoal">
      <div class="daygoal-top">
        <div class="ring-wrap" aria-hidden="true">
          <svg viewBox="0 0 120 120" class="ring">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ff9a3d" />
                <stop offset="1" stop-color="#ff2d78" />
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="52" />
            <circle class="ring-fg" id="goalRing" cx="60" cy="60" r="52" />
          </svg>
          <div class="ring-label"><strong>${koolh || "–"}</strong><span>g koolh.</span></div>
        </div>
        <div class="daygoal-head">
          <span class="eyebrow">Jouw dagdoel</span>
          <h3>Per dag, ongeveer</h3>
          <span class="kcal-big"><strong>${kcal || "–"}</strong> kcal</span>
        </div>
      </div>
      <div class="macros">
        <div class="macro koolhydraten"><span class="m-val">${koolh || "–"}g</span><span class="m-lab">Koolhydraten</span></div>
        <div class="macro eiwit"><span class="m-val">${eiwit || "–"}g</span><span class="m-lab">Eiwit</span></div>
        <div class="macro vet"><span class="m-val">${vet || "–"}g</span><span class="m-lab">Vet</span></div>
      </div>
      ${dg.uitleg ? `<p class="daygoal-note">${esc(dg.uitleg)}</p>` : ""}
    </section>`);

  /* Dagen */
  dagen.forEach((d) => {
    const isTrain = /training/i.test(d.type || "");
    const cls = isTrain ? "day-train" : "day-rest";
    const badge = isTrain ? "🏃" : "🌿";
    const meals = Array.isArray(d.maaltijden) ? d.maaltijden : [];

    let fuelingHtml = "";
    if (d.fueling && (d.fueling.voor || d.fueling.tijdens || d.fueling.na)) {
      const row = (when, what) => what ? `<div class="fueling-row"><span class="fueling-when">${when}</span><span class="fueling-what">${esc(what)}</span></div>` : "";
      fuelingHtml = `
        <div class="fueling">
          <h4>Fueling rond je training</h4>
          ${row("Voor", d.fueling.voor)}
          ${row("Tijdens", d.fueling.tijdens)}
          ${row("Na", d.fueling.na)}
        </div>`;
    }

    const mealsHtml = meals.map((m) => {
      const ingr = Array.isArray(m.ingredienten) ? m.ingredienten : [];
      const koolhPill = (m.koolhydraten_g != null && m.koolhydraten_g !== "") ? `<span class="pill">${num(m.koolhydraten_g)}g koolh.</span>` : "";
      const kcalPill = (m.kcal != null && m.kcal !== "") ? `<span class="pill kcal">${num(m.kcal)} kcal</span>` : "";
      return `
        <article class="meal">
          <div class="meal-time">
            <span class="mt-moment">${esc(m.moment || "")}</span>
            ${m.tijd ? `<span class="mt-clock">${esc(m.tijd)}</span>` : ""}
          </div>
          <div class="meal-body">
            <h4 class="meal-title">${esc(m.titel || "")}</h4>
            ${ingr.length ? `<ul class="meal-ingredients">${ingr.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
            <div class="meal-meta">${koolhPill}${kcalPill}</div>
            ${m.tip ? `<p class="meal-tip">${esc(m.tip)}</p>` : ""}
          </div>
        </article>`;
    }).join("");

    html.push(`
      <section class="day-section ${cls}">
        <div class="day-head">
          <span class="day-badge">${badge}</span>
          <div class="day-head-text">
            <h3>${esc(d.type || "Dag")}</h3>
            ${d.training ? `<span>${esc(d.training)}</span>` : ""}
          </div>
        </div>
        ${fuelingHtml}
        ${mealsHtml}
        ${d.dagtotaal_kcal ? `<p class="daytotal">Dagtotaal: <strong>${num(d.dagtotaal_kcal)} kcal</strong></p>` : ""}
      </section>`);
  });

  /* Hydratatie & snacks */
  const snacks = Array.isArray(s.snacks) ? s.snacks : [];
  if (s.hydratatie || snacks.length) {
    html.push(`
      <div class="mini-grid">
        ${s.hydratatie ? `<div class="mini-card"><h4>💧 Hydratatie</h4><p>${esc(s.hydratatie)}</p></div>` : ""}
        ${snacks.length ? `<div class="mini-card"><h4>🍎 Snacks</h4><ul>${snacks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      </div>`);
  }

  /* Boodschappenlijst */
  const lijst = Array.isArray(s.boodschappenlijst) ? s.boodschappenlijst : [];
  if (lijst.length) {
    const checks = store.getJSON(KEY_CHECK, {});
    const cats = lijst.map((cat) => {
      const items = Array.isArray(cat.items) ? cat.items : [];
      const rows = items.map((it) => {
        const id = checkId(cat.categorie, it);
        const on = !!checks[id];
        return `<div class="shop-item ${on ? "checked" : ""}" data-check="${esc(id)}"><span class="shop-box">${on ? "✓" : ""}</span><span class="shop-text">${esc(it)}</span></div>`;
      }).join("");
      return `<div class="shop-cat"><h4>${esc(cat.categorie || "")}</h4>${rows}</div>`;
    }).join("");
    html.push(`<section class="shopping"><h3>🛒 Boodschappenlijst</h3>${cats}</section>`);
  }

  /* Coachtips */
  const tips = Array.isArray(s.coachtips) ? s.coachtips : [];
  if (tips.length) {
    html.push(`
      <section class="tips">
        <h3>Coachtips van ${esc(CONFIG.coachName)}</h3>
        ${tips.map((t, i) => `<div class="tip-row"><span class="tip-no">${i + 1}</span><span class="tip-text">${esc(t)}</span></div>`).join("")}
      </section>`);
  }

  /* Acties */
  html.push(`
    <div class="result-actions">
      <button class="btn-primary" id="printBtn" type="button">🖨 Print (zwart-wit)</button>
      <button class="btn-ghost" id="editBtn" type="button">✎ Wijzig antwoorden</button>
      <button class="btn-ghost" id="regenBtn" type="button">↻ Opnieuw genereren</button>
    </div>`);

  $("resultView").innerHTML = html.join("");
  wireResult(s);
}

function wireResult(s) {
  /* Ring animeren (koolhydraten als percentage van dagdoel) */
  const dg = s.dagdoel || {};
  const koolh = num(dg.koolhydraten_g);
  const ring = $("goalRing");
  if (ring) {
    const r = 52, c = 2 * Math.PI * r;
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c;
    // De ring is een visuele meter: vul 'm voor een vol gevoel, geschaald op 400g max.
    const pct = Math.max(0.12, Math.min(1, koolh ? koolh / 400 : 0.5));
    requestAnimationFrame(() => { ring.style.strokeDashoffset = c * (1 - pct); });
  }

  /* Boodschappen afvinken (in localStorage) */
  $("resultView").querySelectorAll(".shop-item").forEach((row) => {
    row.addEventListener("click", () => {
      const id = row.dataset.check;
      const checks = store.getJSON(KEY_CHECK, {});
      const on = !checks[id];
      if (on) checks[id] = true; else delete checks[id];
      store.setJSON(KEY_CHECK, checks);
      row.classList.toggle("checked", on);
      row.querySelector(".shop-box").textContent = on ? "✓" : "";
    });
  });

  $("printBtn").addEventListener("click", () => window.print());
  $("editBtn").addEventListener("click", () => {
    showScreen("intakeView");
    $("intakeIntro").classList.add("hidden");
    $("intakeForm").classList.remove("hidden");
    stepIndex = 0; renderStep();
  });
  $("regenBtn").addEventListener("click", () => {
    if (confirm("Een nieuw schema genereren op basis van je huidige antwoorden?")) generateSchema();
  });
}

/* ================================================================== *
 *  Instellingen
 * ================================================================== */
function openSettings() {
  const ov = $("settingsOverlay");
  $("apiKeyInput").value = store.get(KEY_API, "");
  ov.classList.remove("hidden", "fade");
  ov.setAttribute("aria-hidden", "false");
}
function closeSettings() {
  const ov = $("settingsOverlay");
  ov.classList.add("fade");
  setTimeout(() => { ov.classList.add("hidden"); ov.setAttribute("aria-hidden", "true"); }, 240);
}

/* ================================================================== *
 *  Helpers
 * ================================================================== */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function num(v) {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
}
function checkId(cat, item) {
  return (String(cat) + "|" + String(item)).replace(/\s+/g, "_").slice(0, 80);
}

/* Invliegende beelden. Alles wat al in beeld staat tonen we meteen;
   de observer is alleen voor wat je later naar beneden scrollt. */
let io;
function inView(el) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return r.top < vh && r.bottom > 0;
}
function observeReveals() {
  io = io || new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
  document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
    if (inView(el)) el.classList.add("in"); else io.observe(el);
  });
  // Vangnet: mocht er iets blijven hangen, na een tel alsnog tonen.
  setTimeout(() => document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
    if (inView(el)) el.classList.add("in");
  }), 700);
}

let toastT;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ================================================================== *
 *  Init
 * ================================================================== */
document.title = `${CONFIG.appName} — bartlopen Voedingscoach`;
if ($("appName")) $("appName").textContent = CONFIG.appName;
if ($("brandHandle")) $("brandHandle").textContent = CONFIG.coachHandle;
if ($("footCredit")) {
  $("footCredit").innerHTML = `Voeding door ${CONFIG.coachName} · TikTok <strong>${CONFIG.coachHandle}</strong> 🧡`;
}

/* Knoppen koppelen */
$("startIntake").addEventListener("click", startIntake);
$("emptyStart").addEventListener("click", () => { showScreen("intakeView"); startIntake(); });
$("nextStep").addEventListener("click", nextStep);
$("prevStep").addEventListener("click", prevStep);

$("settingsButton").addEventListener("click", openSettings);
$("closeSettings").addEventListener("click", closeSettings);
$("settingsOverlay").addEventListener("click", (e) => { if (e.target === $("settingsOverlay")) closeSettings(); });
$("showKey").addEventListener("change", (e) => {
  $("apiKeyInput").type = e.target.checked ? "text" : "password";
});
$("saveSettings").addEventListener("click", () => {
  const k = $("apiKeyInput").value.trim();
  if (k) store.set(KEY_API, k); else store.del(KEY_API);
  toast("Instellingen opgeslagen 💾");
  closeSettings();
});
$("clearData").addEventListener("click", () => {
  if (confirm("Schema én ingevulde antwoorden wissen? De API-sleutel blijft staan.")) {
    store.del(KEY_SCHEMA); store.del(KEY_INTAKE); store.del(KEY_CHECK);
    answers = {};
    INTAKE.forEach((s) => s.fields.forEach((f) => { if (f.value != null) answers[f.key] = f.value; }));
    toast("Gewist. Schoon begin!");
    closeSettings();
    $("intakeIntro").classList.remove("hidden");
    $("intakeForm").classList.add("hidden");
    showScreen("intakeView");
  }
});

/* Hero-introscherm vullen: naam + ring als flourish laten vollopen */
function setupIntro() {
  const naam = (answers.naam && String(answers.naam).trim()) || CONFIG.athlete || "";
  if ($("introName")) $("introName").textContent = naam || "jij";
  if ($("introSteps")) $("introSteps").textContent = INTAKE.length;
  const ring = $("introRing");
  if (ring) {
    const r = 52, c = 2 * Math.PI * r;
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c;
    // Mooie volle ring als accent, net als de hero op de hardloop-homepage.
    requestAnimationFrame(() => { ring.style.strokeDashoffset = c * 0.04; });
  }
}

/* Beginscherm bepalen: bestaand schema -> resultaat, anders intake */
(function boot() {
  const saved = store.getJSON(KEY_SCHEMA);
  if (saved) { renderResult(saved); showScreen("resultView"); }
  else { setupIntro(); showScreen("intakeView"); }
})();

/* Splash netjes weg laten faden (tikken slaat 'm over) */
(function () {
  const splash = $("splash");
  if (!splash) return;
  const hide = () => splash.classList.add("gone");
  setTimeout(hide, 1100);
  splash.addEventListener("click", hide);
  setTimeout(() => splash.remove(), 1700);
})();

/* Service worker voor offline gebruik (alleen op http/https) */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
