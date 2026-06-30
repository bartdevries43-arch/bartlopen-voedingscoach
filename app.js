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
const SYSTEM_PROMPT = `Je bent de voedingscoach van bartlopen. Je bent ook een topkok die in goede restaurants heeft gewerkt en een hardloop- en afvalcoach. Je maakt persoonlijke, praktische én lekkere voedingsschema's voor hardlopers en mensen die fitter en sterker willen worden. Je schrijft zoals Bart praat: warm, direct, nuchter Nederlands, motiverend. Geen kille calorieënteller. Houd alle teksten kort en helder.

Je krijgt de intake van één persoon. Maak op basis daarvan een compleet weekschema.

Harde regels:
- Schrijf alles in correct Nederlands. Korte, duidelijke zinnen.
- Maak een hele week: zeven dagen, maandag tot en met zondag, elke dag een eigen menu. Herhaal niet steeds dezelfde maaltijden; varieer echt.
- Geef echte, smaakvolle recepten met concrete ingrediënten en porties. Geen vage richtlijnen. Kwaliteit van een goede kok, maar haalbaar thuis.
- Vermeld per maaltijd de koolhydraten, eiwit en vet in gram, plus de kcal. Wees realistisch en consistent: de som van de maaltijden is ongeveer het dagtotaal.
- Markeer per dag of het een trainingsdag of rustdag is. Geef trainingsdagen fueling voor, tijdens en na, afgestemd op haar training.
- Respecteer dieet, allergieën en wat iemand niet eet of niet lust. Overtreed dit nooit, ook niet in een tussendoortje.
- Volg de keukenvoorkeur van deze persoon (bijvoorbeeld mediterraans) in de hele week.
- Beperk voedselverspilling: laat ingrediënten door de week terugkomen. Gebruik dezelfde bron van eiwit of koolhydraten in meerdere maaltijden en koop slim in, zodat er weinig overblijft.
- Houd rekening met haar voorkeuren, kooktijd, kookniveau, budget en aantal personen.
- Maak één boodschappenlijst voor de hele week, gegroepeerd per categorie.
- Sluit af met minstens 3 korte coachtips in bartlopen-stem.
- Antwoord uitsluitend met geldige JSON volgens het schema. Geen tekst eromheen, geen markdown, geen codeblok-tekens.`;

const SCHEMA_HINT = `Antwoord met exact deze JSON-structuur. "dagen" bevat zeven dagen (maandag t/m zondag):
{
  "intro": "korte, persoonlijke bartlopen-begroeting met de naam erin",
  "coachNote": "1 korte motiverende zin",
  "dagdoel": { "kcal": 0, "koolhydraten_g": 0, "eiwit_g": 0, "vet_g": 0, "uitleg": "1 korte zin" },
  "dagen": [
    {
      "dag": "Maandag",
      "type": "Trainingsdag",
      "training": "kort, bv. avondloop 30 min",
      "fueling": { "voor": "...", "tijdens": "...", "na": "..." },
      "maaltijden": [
        { "moment": "Ontbijt", "tijd": "07:30", "titel": "...", "ingredienten": ["..."], "koolhydraten_g": 0, "eiwit_g": 0, "vet_g": 0, "kcal": 0, "tip": "korte tip" }
      ],
      "dagtotaal_kcal": 0
    },
    {
      "dag": "Dinsdag",
      "type": "Rustdag",
      "training": "geen training",
      "maaltijden": [ "...zelfde maaltijd-structuur..." ],
      "dagtotaal_kcal": 0
    }
  ],
  "hydratatie": "kort en concreet",
  "snacks": ["...", "..."],
  "boodschappenlijst": [ { "categorie": "Groente & fruit", "items": ["..."] } ],
  "coachtips": ["...", "...", "..."]
}
Let op: "fueling" alleen op trainingsdagen. Laat "fueling" weg bij rustdagen.`;

/* ================================================================== *
 *  Veilige localStorage (alles in try/catch)
 * ================================================================== */
const KEY_API    = "bartlopen.voeding.apikey";
const KEY_INTAKE = CONFIG.storeKey + ".intake";
const KEY_SCHEMA = CONFIG.storeKey + ".schema";
const KEY_CHECK  = CONFIG.storeKey + ".check";
const KEY_EATEN  = CONFIG.storeKey + ".eaten"; // afgevinkte maaltijden per dagtype
const KEY_DAY    = CONFIG.storeKey + ".day";   // gekozen dagtype in de tracker

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
    store.del(KEY_CHECK); store.del(KEY_EATEN); store.del(KEY_DAY); // nieuwe lijst, vinkjes resetten
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

/* Tracker-state */
let RESULT = null;   // huidig schema
let dayIdx = 0;      // gekozen dagtype-index

const has = (v) => v != null && v !== "";
const mealMacros = (m) => ({ kcal: num(m.kcal), k: num(m.koolhydraten_g), e: num(m.eiwit_g), v: num(m.vet_g) });
function sumMeals(meals, filter) {
  return (Array.isArray(meals) ? meals : []).reduce((t, m, i) => {
    if (filter && !filter(i)) return t;
    const x = mealMacros(m); t.kcal += x.kcal; t.k += x.k; t.e += x.e; t.v += x.v; return t;
  }, { kcal: 0, k: 0, e: 0, v: 0 });
}
const dayTotals = (day) => sumMeals(day.maaltijden);
const dayKey = (day) => day.dag || day.type || ("dag" + dayIdx);
const isTrainDay = (day) => /training/i.test(day.type || "");
const DAY_ABBR = { maandag: "Ma", dinsdag: "Di", woensdag: "Wo", donderdag: "Do", vrijdag: "Vr", zaterdag: "Za", zondag: "Zo" };
const dayAbbr = (naam, i) => DAY_ABBR[String(naam || "").toLowerCase()] || (naam ? String(naam).slice(0, 2) : "D" + (i + 1));
const todayName = () => ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"][new Date().getDay()];
function eatenForDay(day) { const all = store.getJSON(KEY_EATEN, {}) || {}; return all[dayKey(day)] || {}; }
function setEaten(day, idx, on) {
  const all = store.getJSON(KEY_EATEN, {}) || {}; const k = dayKey(day);
  all[k] = all[k] || {};
  if (on) all[k][idx] = true; else delete all[k][idx];
  store.setJSON(KEY_EATEN, all);
}
const eatenTotals = (day) => { const eat = eatenForDay(day); return sumMeals(day.maaltijden, (i) => eat[i]); };

function fuelingHTML(day) {
  if (!day.fueling || !(day.fueling.voor || day.fueling.tijdens || day.fueling.na)) return "";
  const row = (when, what) => what ? `<div class="fueling-row"><span class="fueling-when">${when}</span><span class="fueling-what">${esc(what)}</span></div>` : "";
  return `<div class="fueling"><h4>Fueling rond je training</h4>${row("Voor", day.fueling.voor)}${row("Tijdens", day.fueling.tijdens)}${row("Na", day.fueling.na)}</div>`;
}
function mealPills(m) {
  return [
    has(m.koolhydraten_g) ? `<span class="pill">${num(m.koolhydraten_g)}g kh</span>` : "",
    has(m.eiwit_g) ? `<span class="pill eiwit">${num(m.eiwit_g)}g eiwit</span>` : "",
    has(m.vet_g) ? `<span class="pill vet">${num(m.vet_g)}g vet</span>` : "",
    has(m.kcal) ? `<span class="pill kcal">${num(m.kcal)} kcal</span>` : "",
  ].join("");
}

function renderResult(s) {
  RESULT = s;
  const naam = answers.naam || CONFIG.athlete || "";
  const dagen = Array.isArray(s.dagen) ? s.dagen : [];

  /* gekozen dag herstellen: opgeslagen keuze, anders vandaag, anders dag 1 */
  dayIdx = 0;
  const savedDay = store.get(KEY_DAY, null);
  let i = savedDay != null ? dagen.findIndex((d) => (d.dag || d.type || "") === savedDay) : -1;
  if (i < 0) i = dagen.findIndex((d) => String(d.dag || "").toLowerCase() === todayName());
  if (i >= 0) dayIdx = i;

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

  /* Tracker (Virtuagym-stijl): dagkeuze + calorieën-over + macrobalken */
  const dg = s.dagdoel || {};
  html.push(`
    <section class="tracker" id="tracker">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="week-strip" id="dayToggle">
        ${dagen.map((d, i) => {
          const cls = isTrainDay(d) ? "is-train" : "is-rest";
          return `<button type="button" class="day-pill ${cls} ${i === dayIdx ? "on" : ""}" data-day="${i}" title="${esc(d.dag || ("Dag " + (i + 1)))}">
            <span class="dp-name">${esc(dayAbbr(d.dag, i))}</span>
            <span class="dp-dot" aria-hidden="true"></span>
          </button>`;
        }).join("")}
      </div>
      <div class="tracker-main">
        <div class="ring-wrap" aria-hidden="true">
          <svg viewBox="0 0 120 120" class="ring">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ff9a3d" />
                <stop offset="1" stop-color="#ff2d78" />
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="52" />
            <circle class="ring-fg" id="calRing" cx="60" cy="60" r="52" />
          </svg>
          <div class="ring-label"><strong id="calLeft">–</strong><span id="calLeftLab">kcal over</span></div>
        </div>
        <div class="macro-bars" id="macroBars"></div>
      </div>
      <p class="tracker-sub" id="trackerSub"></p>
      ${dg.uitleg ? `<p class="daygoal-note">${esc(dg.uitleg)}</p>` : ""}
    </section>`);

  /* Container voor de maaltijden van de gekozen dag (interactief) */
  html.push(`<section class="day-section" id="daySection"></section>`);

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

  /* Hele week volledig — alleen voor de print (zwart-wit op A4) */
  const printDays = dagen.map((d) => {
    const isTrain = isTrainDay(d);
    const cls = isTrain ? "day-train" : "day-rest";
    const badge = isTrain ? "🏃" : "🌿";
    const meals = Array.isArray(d.maaltijden) ? d.maaltijden : [];
    const t = dayTotals(d);
    const mealsHtml = meals.map((m) => {
      const ingr = Array.isArray(m.ingredienten) ? m.ingredienten : [];
      return `<article class="meal">
          <div class="meal-time"><span class="mt-icon" aria-hidden="true">🍽️</span>${m.tijd ? `<span class="mt-clock">${esc(m.tijd)}</span>` : ""}</div>
          <div class="meal-body">
            ${m.moment ? `<span class="meal-moment">${esc(m.moment)}</span>` : ""}
            <h4 class="meal-title">${esc(m.titel || "")}</h4>
            ${ingr.length ? `<ul class="meal-ingredients">${ingr.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
            <div class="meal-meta">${mealPills(m)}</div>
            ${m.tip ? `<p class="meal-tip">${esc(m.tip)}</p>` : ""}
          </div>
        </article>`;
    }).join("");
    return `<section class="day-section ${cls}">
        <div class="day-head"><span class="day-badge">${badge}</span><div class="day-head-text"><h3>${esc(d.dag || d.type || "Dag")}</h3><span>${[d.type, (d.training && !/^geen/i.test(d.training)) ? d.training : ""].filter(Boolean).map(esc).join(" · ")}</span></div></div>
        ${fuelingHTML(d)}
        ${mealsHtml}
        <p class="daytotal">Dagtotaal: <strong>${t.kcal} kcal</strong> · ${t.k}g kh · ${t.e}g eiwit · ${t.v}g vet</p>
      </section>`;
  }).join("");
  html.push(`<div class="print-only">${printDays}</div>`);

  /* Acties */
  html.push(`
    <div class="result-actions">
      <button class="btn-primary" id="printBtn" type="button">🖨 Print (zwart-wit)</button>
      <button class="btn-ghost" id="editBtn" type="button">✎ Wijzig antwoorden</button>
      <button class="btn-ghost" id="regenBtn" type="button">↻ Opnieuw genereren</button>
    </div>`);

  $("resultView").innerHTML = html.join("");
  wireResult(s);
  renderDay();
}

/* Maaltijden van de gekozen dag tekenen + tracker bijwerken */
function renderDay() {
  if (!RESULT) return;
  const dagen = Array.isArray(RESULT.dagen) ? RESULT.dagen : [];
  const day = dagen[dayIdx];
  if (!day) return;
  const isTrain = isTrainDay(day);
  const dc = isTrain ? "day-train" : "day-rest";

  /* Week-pills */
  document.querySelectorAll("#dayToggle .day-pill").forEach((b, i) => b.classList.toggle("on", i === dayIdx));
  const tr = $("tracker");
  if (tr) { tr.classList.remove("day-train", "day-rest"); tr.classList.add(dc); }

  /* Macrobalken (doel = dagtotalen van deze dag) */
  const goals = dayTotals(day);
  const macroBar = (lab, cls, goal) =>
    `<div class="mbar ${cls}"><div class="mbar-top"><span class="mbar-lab">${lab}</span><span class="mbar-val" data-bar="${cls}">0 / ${goal} g</span></div><div class="mbar-track"><div class="mbar-fill" data-fill="${cls}"></div></div></div>`;
  $("macroBars").innerHTML = macroBar("Koolhydraten", "koolh", goals.k) + macroBar("Eiwit", "eiwit", goals.e) + macroBar("Vet", "vet", goals.v);

  /* Maaltijden met afvink-knop */
  const meals = Array.isArray(day.maaltijden) ? day.maaltijden : [];
  const eat = eatenForDay(day);
  const mealsHtml = meals.map((m, i) => {
    const ingr = Array.isArray(m.ingredienten) ? m.ingredienten : [];
    const on = !!eat[i];
    return `<article class="meal ${on ? "eaten" : ""}" data-meal="${i}">
        <div class="meal-time"><span class="mt-icon" aria-hidden="true">🍽️</span>${m.tijd ? `<span class="mt-clock">${esc(m.tijd)}</span>` : ""}</div>
        <div class="meal-body">
          ${m.moment ? `<span class="meal-moment">${esc(m.moment)}</span>` : ""}
          <h4 class="meal-title">${esc(m.titel || "")}</h4>
          ${ingr.length ? `<ul class="meal-ingredients">${ingr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          <div class="meal-meta">${mealPills(m)}</div>
          ${m.tip ? `<p class="meal-tip">${esc(m.tip)}</p>` : ""}
          <button type="button" class="meal-log" data-meal="${i}">${on ? "✓ Gegeten" : "+ Gegeten"}</button>
        </div>
      </article>`;
  }).join("");

  const sub = [day.type, (day.training && !/^geen/i.test(day.training)) ? day.training : ""].filter(Boolean).map(esc).join(" · ");
  const ds = $("daySection");
  ds.className = `day-section ${dc}`;
  ds.innerHTML = `
    <div class="day-head">
      <span class="day-badge">${isTrain ? "🏃" : "🌿"}</span>
      <div class="day-head-text"><h3>${esc(day.dag || day.type || "Dag")}</h3>${sub ? `<span>${sub}</span>` : ""}</div>
    </div>
    ${fuelingHTML(day)}
    ${mealsHtml}`;

  ds.querySelectorAll(".meal-log").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.meal;
      const cur = !!eatenForDay(day)[i];
      setEaten(day, i, !cur);
      const art = btn.closest(".meal");
      art.classList.toggle("eaten", !cur);
      btn.textContent = !cur ? "✓ Gegeten" : "+ Gegeten";
      updateTracker();
    });
  });

  updateTracker();
}

/* Ring + macrobalken bijwerken op basis van wat is afgevinkt */
function updateTracker() {
  if (!RESULT) return;
  const dagen = Array.isArray(RESULT.dagen) ? RESULT.dagen : [];
  const day = dagen[dayIdx];
  if (!day) return;
  const goals = dayTotals(day);
  const eaten = eatenTotals(day);

  const ring = $("calRing");
  if (ring) {
    const r = 52, c = 2 * Math.PI * r;
    const pct = goals.kcal ? Math.max(0, Math.min(1, eaten.kcal / goals.kcal)) : 0;
    ring.style.strokeDasharray = c;
    requestAnimationFrame(() => { ring.style.strokeDashoffset = c * (1 - pct); });
  }
  const left = Math.max(0, goals.kcal - eaten.kcal);
  const vol = goals.kcal > 0 && eaten.kcal >= goals.kcal;
  $("calLeft").textContent = vol ? "0" : left;
  $("calLeftLab").textContent = vol ? "kcal · vol!" : "kcal over";

  const setBar = (cls, val, goal) => {
    const fill = document.querySelector(`[data-fill="${cls}"]`);
    const labEl = document.querySelector(`[data-bar="${cls}"]`);
    const pct = goal ? Math.max(0, Math.min(1, val / goal)) : 0;
    if (fill) requestAnimationFrame(() => { fill.style.width = (pct * 100).toFixed(0) + "%"; });
    if (labEl) labEl.textContent = `${Math.round(val)} / ${Math.round(goal)} g`;
  };
  setBar("koolh", eaten.k, goals.k);
  setBar("eiwit", eaten.e, goals.e);
  setBar("vet", eaten.v, goals.v);

  const doelKcal = num((RESULT.dagdoel || {}).kcal) || goals.kcal;
  $("trackerSub").innerHTML = `Gegeten: <strong>${eaten.kcal}</strong> van ${goals.kcal} kcal · dagdoel ${doelKcal} kcal`;

  refreshWeekPills();
}

/* Dagen die helemaal zijn afgevinkt een vinkje geven in de week-strip */
function refreshWeekPills() {
  const dagen = Array.isArray(RESULT && RESULT.dagen) ? RESULT.dagen : [];
  document.querySelectorAll("#dayToggle .day-pill").forEach((b, i) => {
    const day = dagen[i];
    if (!day) return;
    const meals = Array.isArray(day.maaltijden) ? day.maaltijden : [];
    const eat = eatenForDay(day);
    const done = meals.length > 0 && meals.every((_, j) => eat[j]);
    b.classList.toggle("done", done);
  });
}

function wireResult(s) {
  const dagen = Array.isArray(s.dagen) ? s.dagen : [];

  /* Dagkeuze in de tracker (week-pills) */
  const toggle = $("dayToggle");
  if (toggle) toggle.querySelectorAll(".day-pill").forEach((b) => {
    b.addEventListener("click", () => {
      dayIdx = +b.dataset.day;
      const d = dagen[dayIdx] || {};
      store.set(KEY_DAY, d.dag || d.type || "");
      renderDay();
    });
  });

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
    store.del(KEY_SCHEMA); store.del(KEY_INTAKE); store.del(KEY_CHECK); store.del(KEY_EATEN); store.del(KEY_DAY);
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
