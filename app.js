/* ================================================================== *
 *  bartlopen — Voedingscoach
 *  Vast weekmenu + interactieve tracker (afvinken, calorieën & macro's).
 *  Net als de hardloopapps: alles lokaal, geen server, geen sleutel.
 * ================================================================== */

/* ========== INSTELLINGEN PER PERSOON — pas dit blok aan ==========
   Hergebruik deze app voor iemand anders: kopieer de map, wijzig dit
   blok, vervang coach.jpg en pas het WEEKMENU hieronder aan.          */
const CONFIG = {
  appName:     "Jouw weekmenu",
  athlete:     "Isa",
  coachName:   "Coach Bart",
  coachHandle: "@bartlopen",
  coachPhoto:  "coach.jpg",
  storeKey:    "bartlopen.voeding.isa.v1", // UNIEK per persoon
};
/* =================================================================== */

/* --- Klein hulpje om het weekmenu compact te schrijven -------------- */
const M = (moment, tijd, titel, ingredienten, kh, e, v, kcal, tip) =>
  ({ moment, tijd, titel, ingredienten, koolhydraten_g: kh, eiwit_g: e, vet_g: v, kcal, tip });
const oatsRust  = (bes) => M("Ontbijt", "07:30", "Overnight oats met magere kwark, honing en " + bes,
  ["50 g havermout", "150 g magere kwark", "scheutje water", "1 tl honing", "snufje kaneel", "handje " + bes],
  52, 23, 6, 380, "Maak 'm de avond ervoor, dan staat je ontbijt 's ochtends klaar.");
const oatsTrain = (bes) => M("Ontbijt", "07:30", "Overnight oats met magere kwark, honing en " + bes,
  ["60 g havermout", "150 g magere kwark", "scheutje water", "1 tl honing", "snufje kaneel", "handje " + bes, "1 el pompoenpitten"],
  62, 25, 11, 450, "Iets grotere portie, vandaag heb je de brandstof nodig.");
const fruit = (tijd, titel, ingr, kh, kcal) => M("Tussendoor", tijd, titel, ingr, kh, 1, 0, kcal, "Lekker fris fruitmoment voor de ochtend.");
const rauwHummus = (tijd) => M("Tussendoor", tijd, "Rauwkost met hummus",
  ["komkommer, paprika en worteltjes", "2 el hummus"], 14, 5, 9, 150, "Snijd je rauwkost de avond ervoor alvast.");
const rauwFeta = (tijd) => M("Tussendoor", tijd, "Rauwkost met een blokje feta",
  ["komkommer, paprika en worteltjes", "20 g feta"], 8, 6, 9, 140, "Knapperig en hartig, precies genoeg.");

/* ================================================================== *
 *  HET WEEKMENU — door coach Bart samengesteld
 *  Mediterraans, geen melk, geen banaan, allergieproof, weinig verspilling.
 * ================================================================== */
const SCHEMA = {
  intro: "Hoi Isa! Hier is je week. Mediterraans, vol smaak en makkelijk vol te houden. We gaan stap voor stap richting je doel.",
  coachNote: "Een halve kilo per week, zonder honger. Jij kunt dit.",
  dagdoel: { kcal: 1650, koolhydraten_g: 175, eiwit_g: 95, vet_g: 60, uitleg: "Genoeg om je te voeden, met een lichte min zodat je rustig afvalt." },
  hydratatie: "Drink 1,5 tot 2 liter water per dag. Rond je looptjes een extra glas, voor en na.",
  snacks: [
    "Een stuk fruit: sinaasappel, druiven of aardbeien",
    "Rauwkost met hummus: komkommer, paprika en worteltjes",
    "Rauwkost met een blokje feta",
    "Magere kwark met blauwe bessen",
    "Een handje olijven",
    "Twee dadels, vlak voor je training",
  ],
  boodschappenlijst: [
    { categorie: "Groente & fruit", items: ["Cherrytomaat", "Snoeptomaatjes", "Komkommer", "Worteltjes", "Courgette", "Paprika", "Aubergine", "Rode ui", "Ui", "Knoflook", "Citroen", "Aardbeien", "Blauwe bessen", "Sinaasappel", "Druiven", "Granaatappel", "Verse peterselie", "Verse munt", "Verse dille"] },
    { categorie: "Vlees, vis & eiwit", items: ["Kipfilet", "Kabeljauwfilet", "Zalmfilet", "Tonijn uit blik", "Eieren", "Kikkererwten uit blik", "Halloumi", "Hummus"] },
    { categorie: "Zuivel", items: ["Magere kwark", "Feta", "30+ kaas"] },
    { categorie: "Granen & brood", items: ["Havermout", "Parelcouscous", "Volkoren couscous", "Bulgur", "Zilvervliesrijst", "Volkoren pasta", "Volkorenbrood", "Krieltjes"] },
    { categorie: "Kast & kruiden", items: ["Olijfolie", "Olijven", "Kappertjes", "Tahin", "Tomatensaus (passata)", "Honing", "Dadels", "Kaneel", "Ras el hanout", "Paprikapoeder", "Oregano", "Pompoenpitten"] },
  ],
  coachtips: [
    "Mediterraans eten is jouw stijl: veel groente, olijfolie, feta en verse kruiden. Lekker, voedzaam en precies goed om rustig af te vallen.",
    "Ik laat basisingrediënten terugkomen, zodat je weinig weggooit. Eén bak magere kwark, één blok feta, één pak couscous, één blik kikkererwten en een portie kip gaan de hele week mee.",
    "Rooster je groente op hoog vuur met een scheutje olijfolie tot de randjes karamelliseren. Maak meteen een extra plaat, die eet je later in een salade, wrap of tortilla.",
    "Geen banaan nodig. Voor je loop pak je twee dadels of een snee brood met honing. Snelle brandstof zonder gedoe.",
  ],
  dagen: [
    { dag: "Maandag", type: "Trainingsdag", training: "Avondloop 30 min",
      fueling: { voor: "Een uur voor je loop twee dadels of een snee brood met honing.", tijdens: "Het is een kort rondje, dus water is genoeg.", na: "Eet binnen het half uur. De pasta hieronder is je herstelmaaltijd." },
      maaltijden: [
        oatsTrain("blauwe bessen"),
        fruit("10:30", "Sinaasappel", ["1 sinaasappel"], 18, 90),
        M("Lunch", "12:30", "Parelcouscoussalade met feta en munt", ["60 g parelcouscous", "40 g feta", "komkommer en cherrytomaat", "handje olijven", "citroen, munt en olijfolie"], 50, 16, 16, 460, "Maak meteen een dubbele portie voor woensdag."),
        rauwHummus("15:30"),
        M("Diner", "19:30", "Volkoren pasta met kip, courgette en feta", ["80 g volkoren pasta", "120 g kipfilet", "courgette en cherrytomaat", "30 g feta", "knoflook en olijfolie"], 65, 38, 16, 580, "Bak meteen 100 g kip extra voor de lunch van woensdag."),
      ], dagtotaal_kcal: 1730 },

    { dag: "Dinsdag", type: "Rustdag", training: "geen training",
      maaltijden: [
        oatsRust("blauwe bessen"),
        fruit("10:30", "Trosje druiven", ["trosje druiven"], 20, 90),
        M("Lunch", "12:30", "Bulgur-tabouleh met kikkererwten", ["60 g bulgur", "100 g kikkererwten", "veel peterselie en munt", "tomaat en komkommer", "citroen en olijfolie"], 55, 15, 12, 440, "Bewaar de rest van de kikkererwten voor donderdag."),
        rauwHummus("15:30"),
        M("Diner", "18:30", "Kabeljauw uit de oven met cherrytomaat, olijven en krieltjes", ["150 g kabeljauwfilet", "250 g krieltjes", "cherrytomaat en olijven", "knoflook, citroen en olijfolie"], 45, 35, 14, 480, "Alles op één bakplaat, dus weinig afwas."),
      ], dagtotaal_kcal: 1540 },

    { dag: "Woensdag", type: "Trainingsdag", training: "Avondloop 30 min",
      fueling: { voor: "Een uur voor je loop twee dadels of een snee brood met honing.", tijdens: "Water is genoeg op dit tempo.", na: "De pasta hieronder is je herstelmaaltijd." },
      maaltijden: [
        oatsTrain("aardbeien"),
        fruit("10:30", "Handje aardbeien en blauwe bessen", ["handje aardbeien", "handje blauwe bessen"], 16, 80),
        M("Lunch", "12:30", "Couscousbowl met kip en ras el hanout", ["60 g volkoren couscous", "100 g kipfilet van maandag", "courgette en paprika", "30 g feta", "citroen en olijfolie"], 52, 30, 14, 470, "Gebruik de kip die je maandag extra hebt gebakken."),
        rauwHummus("15:30"),
        M("Diner", "19:30", "Volkoren pasta puttanesca met tonijn en olijven", ["80 g volkoren pasta", "1 blik tonijn, uitgelekt", "tomatensaus", "olijven, kappertjes en knoflook", "peterselie"], 66, 32, 12, 540, "Een klassieker die in een kwartier klaarstaat."),
      ], dagtotaal_kcal: 1700 },

    { dag: "Donderdag", type: "Rustdag", training: "geen training",
      maaltijden: [
        oatsRust("blauwe bessen"),
        fruit("10:30", "Halve granaatappel", ["1/2 granaatappel"], 18, 90),
        M("Lunch", "12:30", "Rijstsalade met kikkererwten, geroosterde paprika en feta", ["60 g zilvervliesrijst", "100 g kikkererwten", "geroosterde paprika", "30 g feta", "rode ui, citroen en olijfolie"], 58, 16, 14, 470, "Kikkererwten uit hetzelfde blik als dinsdag."),
        rauwHummus("15:30"),
        M("Diner", "18:30", "Kip-traybake met paprika, rode ui, olijven en bulgur", ["120 g kipfilet", "60 g bulgur", "paprika en rode ui", "olijven", "olijfolie en oregano"], 58, 34, 15, 540, "Alles tegelijk de oven in, ondertussen kook je de bulgur."),
      ], dagtotaal_kcal: 1630 },

    { dag: "Vrijdag", type: "Rustdag", training: "geen training",
      maaltijden: [
        oatsRust("aardbeien"),
        fruit("10:30", "Sinaasappel", ["1 sinaasappel"], 18, 90),
        M("Lunch", "12:30", "Geroosterde groente-couscous met kikkererwten", ["60 g volkoren couscous", "100 g kikkererwten", "courgette, paprika en aubergine", "citroen, munt en olijfolie"], 58, 14, 12, 450, "Rooster meteen een extra plaat groente voor het weekend."),
        rauwFeta("15:30"),
        M("Diner", "18:30", "Griekse gyrosbowl met kip, tzatziki en ovenaardappel", ["120 g kipfilet met gyroskruiden", "250 g aardappel uit de oven", "tzatziki van magere kwark", "komkommer, tomaat en rode ui"], 50, 36, 16, 520, "De tzatziki maak je van je magere kwark met komkommer en knoflook."),
      ], dagtotaal_kcal: 1580 },

    { dag: "Zaterdag", type: "Trainingsdag", training: "Ochtendloop",
      fueling: { voor: "Een uur voor je ochtendloop twee dadels of een snee brood met honing.", tijdens: "Water is genoeg op dit tempo.", na: "Het ontbijt hieronder is meteen je herstel." },
      maaltijden: [
        oatsTrain("blauwe bessen"),
        fruit("11:30", "Trosje druiven", ["trosje druiven"], 20, 90),
        M("Lunch", "13:00", "Bulgur met gegrilde kip, courgette en feta", ["60 g bulgur", "100 g kipfilet", "gegrilde courgette", "30 g feta", "citroen en olijfolie"], 50, 32, 14, 470, "Gril meteen wat extra courgette voor zondag."),
        rauwFeta("16:00"),
        M("Diner", "19:00", "Gegrilde zalm met courgette en bulgur", ["125 g zalmfilet", "60 g bulgur", "courgette", "citroen, dille en olijfolie"], 45, 34, 20, 540, "Zalm geeft je goede vetten voor je herstel."),
      ], dagtotaal_kcal: 1720 },

    { dag: "Zondag", type: "Rustdag", training: "geen training",
      maaltijden: [
        oatsRust("blauwe bessen"),
        fruit("11:30", "Sinaasappel", ["1 sinaasappel"], 18, 90),
        M("Lunch", "13:00", "Spaanse tortilla met aardappel en paprika", ["2 eieren", "150 g gekookte aardappel", "paprika en ui", "tomatensalade ernaast"], 32, 16, 16, 440, "Dé manier om restjes aardappel en groente op te maken."),
        rauwHummus("16:00"),
        M("Diner", "18:30", "Geroosterde groente met halloumi en couscous", ["60 g volkoren couscous", "80 g halloumi", "courgette, paprika en rode ui", "citroen, munt en olijfolie"], 55, 22, 21, 500, "Gebruik de groente die je vrijdag extra roosterde."),
      ], dagtotaal_kcal: 1580 },
  ],
};

/* ================================================================== *
 *  Veilige localStorage (alleen voortgang: afvinken & dagkeuze)
 * ================================================================== */
const KEY_CHECK = CONFIG.storeKey + ".check"; // boodschappen afgevinkt
const KEY_EATEN = CONFIG.storeKey + ".eaten"; // maaltijden afgevinkt per dag
const KEY_DAY   = CONFIG.storeKey + ".day";   // gekozen dag in de tracker

const store = {
  get(k, fallback = null) { try { const v = localStorage.getItem(k); return v == null ? fallback : v; } catch { return fallback; } },
  getJSON(k, fallback = null) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/* ================================================================== *
 *  Helpers
 * ================================================================== */
const $ = (id) => document.getElementById(id);
const esc = (str) => String(str ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { if (v == null || v === "") return 0; const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? Math.round(n) : 0; };
const has = (v) => v != null && v !== "";
const checkId = (cat, item) => (String(cat) + "|" + String(item)).replace(/\s+/g, "_").slice(0, 80);

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

/* ================================================================== *
 *  Resultaat-rendering
 * ================================================================== */
const COACH_INITIAL = (CONFIG.coachName.replace(/^coach\s+/i, "")[0] || "C").toUpperCase();
let dayIdx = 0; // gekozen dag-index

function renderResult(s) {
  const dagen = Array.isArray(s.dagen) ? s.dagen : [];

  /* gekozen dag: opgeslagen keuze, anders vandaag, anders dag 1 */
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
          <p class="coach-intro">${esc(s.intro || `Hoi ${CONFIG.athlete}, hier is je weekmenu!`)}</p>
        </div>
      </div>
      ${s.coachNote ? `<p class="coach-note">${esc(s.coachNote)}</p>` : ""}
    </section>`);

  /* Tracker: dagkeuze + calorieën-over ring + macrobalken */
  const dg = s.dagdoel || {};
  html.push(`
    <section class="tracker" id="tracker">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="week-strip" id="dayToggle">
        ${dagen.map((d, idx) => {
          const cls = isTrainDay(d) ? "is-train" : "is-rest";
          return `<button type="button" class="day-pill ${cls} ${idx === dayIdx ? "on" : ""}" data-day="${idx}" title="${esc(d.dag || ("Dag " + (idx + 1)))}">
            <span class="dp-name">${esc(dayAbbr(d.dag, idx))}</span>
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

  /* Maaltijden van de gekozen dag (interactief) */
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
    const checks = store.getJSON(KEY_CHECK, {}) || {};
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
        ${tips.map((t, idx) => `<div class="tip-row"><span class="tip-no">${idx + 1}</span><span class="tip-text">${esc(t)}</span></div>`).join("")}
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
            ${ingr.length ? `<ul class="meal-ingredients">${ingr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
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
    </div>`);

  $("resultView").innerHTML = html.join("");
  wireResult(s);
  renderDay();
  requestAnimationFrame(observeReveals);
}

/* Maaltijden van de gekozen dag tekenen + tracker bijwerken */
function renderDay() {
  const dagen = Array.isArray(SCHEMA.dagen) ? SCHEMA.dagen : [];
  const day = dagen[dayIdx];
  if (!day) return;
  const isTrain = isTrainDay(day);
  const dc = isTrain ? "day-train" : "day-rest";

  document.querySelectorAll("#dayToggle .day-pill").forEach((b, i) => b.classList.toggle("on", i === dayIdx));
  const tr = $("tracker");
  if (tr) { tr.classList.remove("day-train", "day-rest"); tr.classList.add(dc); }

  const goals = dayTotals(day);
  const macroBar = (lab, cls, goal) =>
    `<div class="mbar ${cls}"><div class="mbar-top"><span class="mbar-lab">${lab}</span><span class="mbar-val" data-bar="${cls}">0 / ${goal} g</span></div><div class="mbar-track"><div class="mbar-fill" data-fill="${cls}"></div></div></div>`;
  $("macroBars").innerHTML = macroBar("Koolhydraten", "koolh", goals.k) + macroBar("Eiwit", "eiwit", goals.e) + macroBar("Vet", "vet", goals.v);

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
  const dagen = Array.isArray(SCHEMA.dagen) ? SCHEMA.dagen : [];
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

  const doelKcal = num((SCHEMA.dagdoel || {}).kcal) || goals.kcal;
  $("trackerSub").innerHTML = `Gegeten: <strong>${eaten.kcal}</strong> van ${goals.kcal} kcal · dagdoel ${doelKcal} kcal`;

  refreshWeekPills();
}

/* Dagen die helemaal zijn afgevinkt een vinkje geven in de week-strip */
function refreshWeekPills() {
  const dagen = Array.isArray(SCHEMA.dagen) ? SCHEMA.dagen : [];
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

  /* Dagkeuze (week-pills) */
  const toggle = $("dayToggle");
  if (toggle) toggle.querySelectorAll(".day-pill").forEach((b) => {
    b.addEventListener("click", () => {
      dayIdx = +b.dataset.day;
      const d = dagen[dayIdx] || {};
      store.set(KEY_DAY, d.dag || d.type || "");
      renderDay();
    });
  });

  /* Boodschappen afvinken */
  $("resultView").querySelectorAll(".shop-item").forEach((row) => {
    row.addEventListener("click", () => {
      const id = row.dataset.check;
      const checks = store.getJSON(KEY_CHECK, {}) || {};
      const on = !checks[id];
      if (on) checks[id] = true; else delete checks[id];
      store.setJSON(KEY_CHECK, checks);
      row.classList.toggle("checked", on);
      row.querySelector(".shop-box").textContent = on ? "✓" : "";
    });
  });

  $("printBtn").addEventListener("click", () => window.print());
}

/* ================================================================== *
 *  Invliegende beelden
 * ================================================================== */
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
  document.querySelectorAll(".reveal:not(.in)").forEach((el) => { if (inView(el)) el.classList.add("in"); else io.observe(el); });
}

/* ================================================================== *
 *  Toast
 * ================================================================== */
let toastT;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ================================================================== *
 *  Init
 * ================================================================== */
document.title = `${CONFIG.appName} — bartlopen Voedingscoach`;
if ($("appName")) $("appName").textContent = CONFIG.appName;
if ($("brandHandle")) $("brandHandle").textContent = CONFIG.coachHandle;
if ($("footCredit")) $("footCredit").innerHTML = `Voeding door ${CONFIG.coachName} · TikTok <strong>${CONFIG.coachHandle}</strong> 🧡`;

$("resetButton").addEventListener("click", () => {
  if (confirm("Alle afvinkjes (maaltijden en boodschappen) wissen?")) {
    store.del(KEY_EATEN); store.del(KEY_CHECK);
    renderResult(SCHEMA);
    toast("Afvinkjes gewist");
  }
});

renderResult(SCHEMA);

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
