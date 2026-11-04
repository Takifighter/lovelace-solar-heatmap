/* solar-heatmap.js
 * Solar yield heatmap for Home Assistant dashboards
 * Karte:  custom:solar-heatmap
 * Views: hourly | daily | weekly | monthly | yearly
 */

const DEFAULT_COLOR = "#34c776";
const DEFAULT_ROWS = { hourly: 21, daily: 12, weekly: 20, monthly: 5, yearly: 10 };

/* ------------------------------------------------------------------ */
/* Translations (en, de) - language follows Home Assistant             */
/* ------------------------------------------------------------------ */
const I18N = {
  en: {
    need_entity: "Please specify an entity.",
    aria_view: "View",
    aria_period: "Period",
    aria_min: "Minimum value",
    aria_max: "Maximum value",
    pct: "{p}%",
    c_below: "below {v}",
    c_from: "from {v}",
    c_upto: "up to {v}",
    c_above: "above {v}",
    c_between: "{lo} to {hi}",
    of_total: "of {n} {noun}",
    nouns: { hourly: "hours", daily: "days", weekly: "days", monthly: "months", yearly: "years" },
    out_below: "below range",
    out_above: "above range",
    standard: "Default",
    views: { hourly: "Hourly", daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" },
    week: "Wk {n}",
    year_tip: "Year {y}",
    total_row: "Total",
    load_error: "Could not load data: {msg}",
    total: "Total: {v}",
    avg: " · Ø {v} {per}",
    per: { day: "per day", month: "per month", year: "per year" },
    no_stats: '<span class="err">No statistics found.</span> Check Developer tools → Statistics to see whether the entity is listed.',
    max_line: "Highest value: {v} ({tip})",
    no_values: "No values in the selected period.",
    labels: {
      entity: "Entity (continuously increasing energy sensor)",
      title: "Title",
      view: "View on open",
      show_view_select: "Show view selector in the card",
      language: "Language",
      color: "Base colour",
      decimals: "Decimal places",
      unit: "Unit (empty = automatic)",
      rows: "Number of rows in the default view (empty = automatic)",
      stat: "Value per period",
      newest_first: "Newest row on top",
    },
    opts: {
      hourly: "Hourly (days × hours)",
      daily: "Daily (months × days)",
      weekly: "Weekly (weeks × weekdays)",
      monthly: "Monthly (years × months)",
      yearly: "Yearly (one cell per year)",
      auto: "Automatic (change in period)",
      change: "Change",
      max: "Maximum",
      mean: "Mean",
      sum: "Sum",
      lang_auto: "Automatic (Home Assistant language)",
    },
    card_desc: "Solar yield as a heatmap (hourly, daily, weekly, monthly, yearly) with a minimum-value slider",
  },
  de: {
    need_entity: "Bitte eine Entität (entity) angeben.",
    aria_view: "Ansicht",
    aria_period: "Zeitraum",
    aria_min: "Mindestwert",
    aria_max: "Höchstwert",
    pct: "{p} %",
    c_below: "unter {v}",
    c_from: "ab {v}",
    c_upto: "bis {v}",
    c_above: "über {v}",
    c_between: "{lo} bis {hi}",
    of_total: "von {n} {noun}",
    nouns: { hourly: "Stunden", daily: "Tagen", weekly: "Tagen", monthly: "Monaten", yearly: "Jahren" },
    out_below: "unter dem Bereich",
    out_above: "über dem Bereich",
    standard: "Standard",
    views: { hourly: "Stündlich", daily: "Täglich", weekly: "Wöchentlich", monthly: "Monatlich", yearly: "Jährlich" },
    week: "KW {n}",
    year_tip: "Jahr {y}",
    total_row: "Summe",
    load_error: "Daten konnten nicht geladen werden: {msg}",
    total: "Summe: {v}",
    avg: " · Ø {v} {per}",
    per: { day: "pro Tag", month: "pro Monat", year: "pro Jahr" },
    no_stats: '<span class="err">Keine Statistikdaten gefunden.</span> Prüfe unter Entwicklerwerkzeuge → Statistiken, ob die Entität dort steht.',
    max_line: "Höchster Wert: {v} ({tip})",
    no_values: "Keine Werte im gewählten Zeitraum.",
    labels: {
      entity: "Entität (fortlaufender Energiesensor)",
      title: "Titel",
      view: "Ansicht beim Öffnen",
      show_view_select: "Ansichts-Auswahl in der Karte anzeigen",
      language: "Sprache",
      color: "Grundfarbe",
      decimals: "Nachkommastellen",
      unit: "Einheit (leer = automatisch)",
      rows: "Anzahl Zeilen in der Standard-Ansicht (leer = automatisch)",
      stat: "Wert pro Zeitraum",
      newest_first: "Neueste Zeile oben",
    },
    opts: {
      hourly: "Stündlich (Tage × Stunden)",
      daily: "Täglich (Monate × Tage)",
      weekly: "Wöchentlich (Wochen × Wochentage)",
      monthly: "Monatlich (Jahre × Monate)",
      yearly: "Jährlich (ein Kästchen pro Jahr)",
      auto: "Automatisch (Änderung im Zeitraum)",
      change: "Änderung",
      max: "Maximum",
      mean: "Mittelwert",
      sum: "Summe",
      lang_auto: "Automatisch (Sprache von Home Assistant)",
    },
    card_desc: "Solarertrag als Heatmap (stündlich, täglich, wöchentlich, monatlich, jährlich) mit Mindestwert-Regler",
  },
};

function pickLang(code) {
  return String(code || "en").toLowerCase().startsWith("de") ? "de" : "en";
}

function tpl(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ""));
}

const LABEL_W = 56;
const DAY_MS = 864e5;

const pad2 = (n) => String(n).padStart(2, "0");
const kDay = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const kHour = (d) => `${kDay(d)}-${d.getHours()}`;
const kMonth = (d) => `${d.getFullYear()}-${d.getMonth()}`;
const kYear = (d) => String(d.getFullYear());

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / DAY_MS + 1) / 7);
}

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function hexToRgb(hex) {
  if (Array.isArray(hex)) return hex.map(Number);
  let h = String(hex || DEFAULT_COLOR).replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return hexToRgb(DEFAULT_COLOR);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
  return "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ */
/* Karte                                                               */
/* ------------------------------------------------------------------ */
class SolarHeatmap extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) throw new Error(I18N[pickLang(config?.language && config.language !== "auto" ? config.language : (typeof navigator !== "undefined" ? navigator.language : "en"))].need_entity);
    this._config = {
      view: "daily",
      decimals: 1,
      stat: "auto",
      color: DEFAULT_COLOR,
      below_color: "#ffffff",
      newest_first: false,
      show_view_select: true,
      ...config,
    };
    this._view = this._config.view;
    this._earliest = null;
    this._earliestPromise = null;
    this._sel = "standard";
    this._fLo = 0;
    this._fHi = 1000;
    this._lastLoad = 0;
    if (this._hass) {
      this._build();
      this._load();
    } else {
      this._built = false;
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) this._build();
    if (!this._lastLoad || Date.now() - this._lastLoad > 10 * 60 * 1000) this._load();
  }

  getCardSize() {
    return 6;
  }

  static getConfigElement() {
    return document.createElement("solar-heatmap-editor");
  }

  static getStubConfig(hass) {
    const e = hass && Object.keys(hass.states).find((k) => k.startsWith("sensor.") && /solar|pv/.test(k));
    return { entity: e || "sensor.solar_gesamt_momentanleistung_output_riemann", title: "Solarertrag", view: "daily" };
  }

  /* ---------- Hilfen ---------- */
  _lang() {
    const l = this._config?.language;
    if (l && l !== "auto") return l;
    return this._hass?.locale?.language || this._hass?.language || "en";
  }

  _t(key, vars) {
    const dict = I18N[pickLang(this._lang())];
    return tpl(dict[key], vars);
  }

  _unit() {
    return (
      this._config.unit ||
      this._hass?.states?.[this._config.entity]?.attributes?.unit_of_measurement ||
      "kWh"
    );
  }

  _fmt(v) {
    const d = this._config.decimals;
    return `${v.toLocaleString(this._lang(), { minimumFractionDigits: d, maximumFractionDigits: d })} ${this._unit()}`;
  }

  /* ---------- Aufbau des Rahmens ---------- */
  _build() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        ha-card { padding: 16px; }
        .title { font-size: 20px; font-weight: 500; margin-bottom: 14px; }
        .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
        select { padding: 7px 10px; border-radius: 6px; font: inherit; font-size: 14px;
                 border: 1px solid var(--divider-color);
                 background: var(--card-background-color); color: var(--primary-text-color); }
        .slider { flex: 1 1 200px; display: flex; align-items: center; gap: 10px; min-width: 0; }
        .range { position: relative; flex: 1; min-width: 90px; height: 24px; }
        .track { position: absolute; left: 0; right: 0; top: 50%; height: 4px; margin-top: -2px;
                 border-radius: 2px; background: var(--divider-color); }
        .fill { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: var(--primary-color); }
        .range input { position: absolute; left: 0; top: 0; width: 100%; height: 24px; margin: 0;
                       background: none; pointer-events: none; -webkit-appearance: none; appearance: none; }
        .range input::-webkit-slider-runnable-track { background: transparent; height: 24px; }
        .range input::-moz-range-track { background: transparent; height: 24px; }
        .range input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; pointer-events: auto;
            width: 18px; height: 18px; margin-top: 3px; border-radius: 50%; box-sizing: border-box;
            background: var(--primary-color); border: 2px solid var(--card-background-color);
            box-shadow: 0 0 0 1px var(--divider-color); cursor: pointer; }
        .range input::-moz-range-thumb { pointer-events: auto; width: 18px; height: 18px; border-radius: 50%;
            box-sizing: border-box; background: var(--primary-color);
            border: 2px solid var(--card-background-color);
            box-shadow: 0 0 0 1px var(--divider-color); cursor: pointer; }
        .thr { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; }
        .grid { display: grid; gap: 3px; }
        .lbl { font-size: 11px; color: var(--secondary-text-color); display: flex;
               align-items: center; white-space: nowrap; overflow: hidden; }
        .lbl.col { justify-content: center; }
        .cell { min-width: 0; border-radius: 3px; box-sizing: border-box; }
        .cell.sq { aspect-ratio: 1 / 1; }
        .cell.tall { height: 28px; }
        .cell.on { border: 1px solid var(--divider-color); cursor: pointer; }
        .cell.none { border: 1px dashed var(--divider-color); opacity: .35; }
        .cell.off { visibility: hidden; }
        .cell.sel { outline: 2px solid var(--primary-color); outline-offset: 1px; }
        .info.hover, .info.max { margin-top: 4px; }
        .info.cnt { margin: -6px 0 12px; min-height: 0; }
        .cell.big { height: 56px; display: flex; align-items: center; justify-content: center;
                    font-size: 13px; font-weight: 500; }
        .info { margin-top: 12px; min-height: 18px; font-size: 13px; color: var(--secondary-text-color); }
        .msg { font-size: 13px; color: var(--secondary-text-color); padding: 8px 0; }
        .err { color: var(--error-color); }
      </style>
      <ha-card>
        <div class="title"></div>
        <div class="controls">
          <select class="view" aria-label="${this._t("aria_view")}"></select>
          <select class="period" aria-label="${this._t("aria_period")}"></select>
          <div class="slider">
            <div class="range">
              <div class="track"><div class="fill"></div></div>
              <input class="lo" type="range" min="0" max="1000" step="1" value="0" aria-label="${this._t("aria_min")}">
              <input class="hi" type="range" min="0" max="1000" step="1" value="1000" aria-label="${this._t("aria_max")}">
            </div>
            <span class="thr"></span>
          </div>
        </div>
        <div class="info cnt" style="display:none"></div>
        <div class="grid"></div>
        <div class="info sum"></div>
        <div class="info max"></div>
        <div class="info hover"></div>
      </ha-card>`;
    this._root = root;
    const titleEl = root.querySelector(".title");
    titleEl.textContent = this._config.title || "";
    titleEl.style.display = this._config.title ? "" : "none";
    this._viewSelect = root.querySelector("select.view");
    this._select = root.querySelector("select.period");
    this._loInput = root.querySelector("input.lo");
    this._hiInput = root.querySelector("input.hi");
    this._fill = root.querySelector(".fill");
    this._cnt = root.querySelector(".info.cnt");
    this._thrLabel = root.querySelector(".thr");
    this._grid = root.querySelector(".grid");
    this._sumInfo = root.querySelector(".info.sum");
    this._info = root.querySelector(".info.max");
    this._hover = root.querySelector(".info.hover");
    this._grid.addEventListener("mouseleave", () => {
      if (this._selCell) this._show(this._selCell);
      else this._hover.textContent = "";
    });

    const viewNames = ["hourly", "daily", "weekly", "monthly", "yearly"].map((v) => [v, I18N[pickLang(this._lang())].views[v]]);
    for (const [v, l] of viewNames) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = l;
      this._viewSelect.appendChild(o);
    }
    this._viewSelect.value = this._view;
    this._viewSelect.style.display = this._config.show_view_select === false ? "none" : "";
    this._viewSelect.addEventListener("change", () => {
      this._view = this._viewSelect.value;
      this._sel = "standard";
      this._fLo = 0;
      this._fHi = 1000;
      this._fillSelector();
      this._load();
    });

    this._fillSelector();
    this._earliestPromise = this._loadEarliest();
    this._select.addEventListener("change", () => {
      this._sel = this._select.value;
      this._fLo = 0;
      this._fHi = 1000;
      this._load();
    });
    const onRange = (which) => () => {
      let lo = parseInt(this._loInput.value, 10);
      let hi = parseInt(this._hiInput.value, 10);
      if (which === "lo" && lo > hi) lo = hi; // handles never cross
      if (which === "hi" && hi < lo) hi = lo;
      this._fLo = lo;
      this._fHi = hi;
      this._syncRange();
      this._paint();
    };
    this._loInput.addEventListener("input", onRange("lo"));
    this._hiInput.addEventListener("input", onRange("hi"));
    this._syncRange();

    if (this._ro) this._ro.disconnect();
    this._ro = new ResizeObserver(() => {
      if (this._plan && this._labelStep() !== this._lastStep) this._renderGrid();
    });
    this._ro.observe(this);
    this._built = true;
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
  }

  connectedCallback() {
    if (this._ro && this._built) this._ro.observe(this);
  }

  async _loadEarliest() {
    const entity = this._config.entity;
    try {
      const res = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(2000, 0, 1).toISOString(),
        end_time: new Date().toISOString(),
        statistic_ids: [entity],
        period: "month",
        types: ["change", "max", "mean", "sum"],
      });
      if (entity !== this._config.entity) return;
      const rows = res[entity] || [];
      this._earliest = rows.length ? new Date(rows[0].start) : null;
    } catch (e) {
      this._earliest = null;
    }
    this._fillSelector();
  }

  _fillSelector() {
    const lang = this._lang();
    const now = new Date();
    const e = this._earliest || now;
    const opts = [["standard", this._t("standard")]];
    if (this._view === "daily" || this._view === "weekly") {
      for (let y = now.getFullYear(); y >= e.getFullYear(); y--) opts.push([String(y), String(y)]);
    } else if (this._view === "hourly") {
      const limit = new Date(e.getFullYear(), e.getMonth(), 1);
      for (let i = 0; i < 36; i++) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        if (m < limit) break;
        opts.push([`${m.getFullYear()}-${pad2(m.getMonth() + 1)}`, m.toLocaleDateString(lang, { month: "long", year: "numeric" })]);
      }
    }
    if (!opts.some(([v]) => v === this._sel)) this._sel = "standard";
    this._select.innerHTML = "";
    for (const [v, l] of opts) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = l;
      this._select.appendChild(o);
    }
    this._select.value = this._sel;
    this._select.style.display = this._view === "yearly" || this._view === "monthly" || opts.length <= 1 ? "none" : "";
    this._viewSelect.value = this._view;
  }

  /* ---------- Plan: Zeilen, Spalten, Zeitraum ---------- */
  _makePlan() {
    const c = this._config;
    const lang = this._lang();
    const now = new Date();
    const view = this._view;
    const rowsN = c.rows ?? DEFAULT_ROWS[view] ?? 12;
    const sel = this._sel;
    const isYear = /^\d{4}$/.test(sel);
    const isMonth = /^\d{4}-\d{2}$/.test(sel);
    const std = !isYear && !isMonth;
    const e = this._earliest;
    const plan = { view, period: "day", keyFn: kDay, cols: 0, colLabels: [], rows: [] };
    const fMonth = new Intl.DateTimeFormat(lang, { month: "short", year: "2-digit" });
    const fFull = { weekday: "short", day: "numeric", month: "long", year: "numeric" };
    // default view: do not start before the first data point
    const limit = (n, since) => (std && e ? Math.max(1, Math.min(n, since)) : n);
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (view === "daily") {
      // months x days
      const since = e ? (now.getFullYear() - e.getFullYear()) * 12 + now.getMonth() - e.getMonth() + 1 : 0;
      const n = isYear ? 12 : limit(rowsN, since);
      const first = isYear ? new Date(+sel, 0, 1) : new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
      plan.cols = 31;
      for (let d = 1; d <= 31; d++) plan.colLabels.push(pad2(d));
      for (let i = 0; i < n; i++) {
        const m = new Date(first.getFullYear(), first.getMonth() + i, 1);
        const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        const cells = [];
        for (let d = 1; d <= 31; d++) {
          if (d > days) { cells.push(null); continue; }
          const date = new Date(m.getFullYear(), m.getMonth(), d);
          cells.push({ key: kDay(date), future: date > now, tip: date.toLocaleDateString(lang, fFull) });
        }
        plan.rows.push({ label: fMonth.format(m), cells });
      }
      plan.start = first;
      plan.end = new Date(first.getFullYear(), first.getMonth() + n, 1);
    } else if (view === "weekly") {
      // calendar weeks x weekdays
      let first, n;
      if (isYear) {
        first = mondayOf(new Date(+sel, 0, 1));
        n = Math.round((mondayOf(new Date(+sel, 11, 31)) - first) / (7 * DAY_MS)) + 1;
      } else {
        const m = mondayOf(now);
        n = limit(rowsN, e ? Math.round((m - mondayOf(e)) / (7 * DAY_MS)) + 1 : 0);
        first = new Date(m.getFullYear(), m.getMonth(), m.getDate() - (n - 1) * 7);
      }
      plan.cols = 7;
      for (let j = 0; j < 7; j++) {
        plan.colLabels.push(new Date(2024, 0, 1 + j).toLocaleDateString(lang, { weekday: "short" }));
      }
      for (let i = 0; i < n; i++) {
        const ws = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7);
        const cells = [];
        for (let j = 0; j < 7; j++) {
          const date = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + j);
          if (isYear && date.getFullYear() !== +sel) { cells.push(null); continue; }
          cells.push({ key: kDay(date), future: date > now, tip: date.toLocaleDateString(lang, fFull) });
        }
        plan.rows.push({ label: this._t("week", { n: isoWeek(ws) }), cells });
      }
      plan.start = first;
      plan.end = new Date(first.getFullYear(), first.getMonth(), first.getDate() + n * 7);
    } else if (view === "monthly") {
      // years x months
      plan.period = "month";
      plan.keyFn = kMonth;
      plan.cols = 12;
      for (let j = 0; j < 12; j++) plan.colLabels.push(new Date(2024, j, 1).toLocaleDateString(lang, { month: "short" }));
      const n = limit(rowsN, e ? now.getFullYear() - e.getFullYear() + 1 : 0);
      const y0 = now.getFullYear() - (n - 1);
      for (let y = y0; y <= now.getFullYear(); y++) {
        const cells = [];
        for (let j = 0; j < 12; j++) {
          const date = new Date(y, j, 1);
          cells.push({ key: kMonth(date), future: date > now, tip: date.toLocaleDateString(lang, { month: "long", year: "numeric" }) });
        }
        plan.rows.push({ label: String(y), cells });
      }
      plan.start = new Date(y0, 0, 1);
      plan.end = new Date(now.getFullYear() + 1, 0, 1);
    } else if (view === "yearly") {
      // one cell per year
      plan.period = "month";
      plan.keyFn = kYear;
      const n = Math.max(1, Math.min(rowsN, e ? now.getFullYear() - e.getFullYear() + 1 : 1));
      const y0 = now.getFullYear() - (n - 1);
      const cells = [];
      for (let y = y0; y <= now.getFullYear(); y++) {
        plan.colLabels.push(String(y));
        cells.push({ key: String(y), future: false, tip: this._t("year_tip", { y }) });
      }
      plan.cols = n;
      plan.rows.push({ label: this._t("total_row"), cells });
      plan.start = new Date(y0, 0, 1);
      plan.end = new Date(now.getFullYear() + 1, 0, 1);
    } else {
      // hourly: Tage x Stunden
      plan.period = "hour";
      plan.keyFn = kHour;
      plan.cols = 24;
      for (let h = 0; h < 24; h++) plan.colLabels.push(pad2(h));
      let first, n;
      if (isMonth) {
        const [y, m] = sel.split("-").map(Number);
        first = new Date(y, m - 1, 1);
        n = new Date(y, m, 0).getDate();
      } else {
        n = limit(rowsN, e ? Math.round((startOfDay(now) - startOfDay(e)) / DAY_MS) + 1 : 0);
        first = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1));
      }
      const fDay = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "short" });
      for (let i = 0; i < n; i++) {
        const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
        const cells = [];
        for (let h = 0; h < 24; h++) {
          const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h);
          cells.push({
            key: kHour(date),
            future: date > now,
            tip: `${date.toLocaleDateString(lang, fFull)}, ${pad2(h)}:00–${pad2((h + 1) % 24)}:00`,
          });
        }
        plan.rows.push({ label: fDay.format(day), cells });
      }
      plan.start = first;
      plan.end = new Date(first.getFullYear(), first.getMonth(), first.getDate() + n);
    }
    if (c.newest_first) plan.rows.reverse();
    return plan;
  }

  /* ---------- Daten laden ---------- */
  async _load() {
    const c = this._config;
    this._lastLoad = Date.now();
    if (this._earliestPromise) await this._earliestPromise;
    const plan = this._makePlan();
    const reqId = (this._req = (this._req || 0) + 1);
    try {
      const res = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: plan.start.toISOString(),
        end_time: plan.end.toISOString(),
        statistic_ids: [c.entity],
        period: plan.period,
        types: ["change", "max", "mean", "sum"],
      });
      if (reqId !== this._req) return;
      const rows = res[c.entity] || [];
      const keyFn = plan.keyFn;
      const map = new Map();
      for (const r of rows) {
        const d = new Date(r.start);
        const v = c.stat === "auto" ? (r.change ?? r.max ?? r.mean) : r[c.stat];
        if (v == null) continue;
        map.set(keyFn(d), (map.get(keyFn(d)) || 0) + v);
      }
      this._plan = plan;
      this._values = map;
      this._empty = rows.length === 0;
      this._renderGrid();
    } catch (e) {
      this._grid.innerHTML = `<div class="msg err">${this._t("load_error", { msg: e.message || e })}</div>`;
    }
  }

  _labelStep() {
    const plan = this._plan;
    if (!plan) return 1;
    const w = (this.clientWidth || 360) - 32 - LABEL_W;
    const per = w / plan.cols;
    if (plan.cols <= 12) return 1;
    return per < 13 ? 3 : per < 21 ? 2 : 1;
  }

  /* ---------- Raster zeichnen ---------- */
  _renderGrid() {
    const plan = this._plan;
    const g = this._grid;
    const colMax = plan.view === "yearly" ? "130px" : "1fr";
    g.style.gridTemplateColumns = `${LABEL_W}px repeat(${plan.cols}, minmax(0, ${colMax}))`;
    g.innerHTML = "";
    this._cells = [];
    this._selCell = null;
    this._hover.textContent = "";
    const step = (this._lastStep = this._labelStep());
    const mk = (cls, text) => {
      const e = document.createElement("div");
      e.className = cls;
      if (text) e.textContent = text;
      return e;
    };

    g.appendChild(mk("lbl"));
    plan.colLabels.forEach((t, i) => g.appendChild(mk("lbl col", i % step === 0 ? t : "")));

    let max = 0;
    let maxTip = "";
    let sum = 0;
    let count = 0;
    const sq = plan.cols >= 24 ? "sq" : plan.view === "yearly" ? "big" : "tall";
    for (const row of plan.rows) {
      g.appendChild(mk("lbl", row.label));
      for (const cell of row.cells) {
        const el = mk(`cell ${sq}`);
        if (!cell) {
          el.classList.add("off");
        } else {
          const v = this._values.get(cell.key);
          if (v == null || cell.future) {
            el.classList.add("none");
          } else {
            el.classList.add("on");
            el._value = v;
            el._tip = cell.tip;
            sum += v;
            count++;
            if (v > max) { max = v; maxTip = cell.tip; }
            if (plan.view === "yearly") { el.textContent = this._fmt(v); el._text = true; }
            el.addEventListener("mouseenter", () => this._show(el));
            el.addEventListener("click", () => {
              this._cells.forEach((x) => x.classList.remove("sel"));
              el.classList.add("sel");
              this._selCell = el;
              this._show(el);
            });
          }
        }
        g.appendChild(el);
        this._cells.push(el);
      }
    }

    this._max = this._config.max ?? max;
    this._syncRange();

    const perKey = { daily: "day", weekly: "day", monthly: "month", yearly: "year" }[plan.view];
    const per = perKey && I18N[pickLang(this._lang())].per[perKey];
    this._sumInfo.textContent = this._empty || !count
      ? ""
      : this._t("total", { v: this._fmt(sum) }) + (per && count > 1 ? this._t("avg", { v: this._fmt(sum / count), per }) : "");

    if (this._empty) {
      this._info.innerHTML = this._t("no_stats");
    } else if (max > 0) {
      this._defaultInfo = this._t("max_line", { v: this._fmt(max), tip: maxTip });
      this._info.textContent = this._defaultInfo;
    } else {
      this._defaultInfo = this._t("no_values");
      this._info.textContent = this._defaultInfo;
    }
    this._paint();
  }

  _show(el) {
    const suf = el._pos === "below" ? ` (${this._t("out_below")})` : el._pos === "above" ? ` (${this._t("out_above")})` : "";
    this._hover.textContent = `${el._tip}: ${this._fmt(el._value)}${suf}`;
  }

  _num(v) {
    const d = this._config.decimals;
    return v.toLocaleString(this._lang(), { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // Handle positions are stored as fractions 0..1000; far right = exactly the highest value
  _bounds() {
    const m = this._max || 0;
    const f = (x) => (x >= 1000 ? m : (x / 1000) * m);
    return { lo: f(this._fLo), hi: f(this._fHi) };
  }

  _syncRange() {
    this._loInput.value = String(this._fLo);
    this._hiInput.value = String(this._fHi);
    const a = this._fLo / 10;
    const b = this._fHi / 10;
    this._fill.style.left = `calc(${a}% + ${(0.5 - a / 100) * 18}px)`;
    this._fill.style.width = `calc(${b - a}% - ${((b - a) / 100) * 18}px)`;
    // when both handles sit close together at the right, keep the lower one reachable
    const loTop = this._fHi - this._fLo < 30 && this._fLo > 500;
    this._loInput.style.zIndex = loTop ? "3" : "2";
    this._hiInput.style.zIndex = loTop ? "2" : "3";
  }

  _paint() {
    if (!this._cells) return;
    const { lo, hi } = this._bounds();
    const EPS = 1e-9;
    const base = hexToRgb(this._config.color);
    const span = hi - lo;
    this._thrLabel.textContent = `${this._num(lo)} – ${this._fmt(hi)}`;
    let below = 0;
    let mid = 0;
    let above = 0;
    for (const el of this._cells) {
      if (!el.classList.contains("on")) continue;
      const v = el._value;
      if (v < lo - EPS) {
        below++;
        el._pos = "below";
        el.style.background = this._config.below_color;
      } else if (v > hi + EPS) {
        above++;
        el._pos = "above";
        el.style.background = this._config.below_color;
      } else {
        mid++;
        el._pos = "in";
        const t = span <= 1e-6 ? 1 : Math.min(1, Math.max(0, (v - lo) / span));
        const f = 0.15 + 0.85 * t; // light tint -> full base colour at the upper end
        const rgb = base.map((c) => Math.round(255 * (1 - f) + c * f));
        el.style.background = `rgb(${rgb.join(",")})`;
      }
      if (el._text) {
        const m = (el.style.background.match(/\d+/g) || [255, 255, 255]).map(Number);
        el.style.color = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] > 150 ? "#000" : "#fff";
      }
    }
    this._counts(lo, hi, below, mid, above);
  }

  _counts(lo, hi, below, mid, above) {
    const loMoved = this._fLo > 0;
    const hiMoved = this._fHi < 1000;
    const total = below + mid + above;
    if ((!loMoved && !hiMoved) || !total) {
      this._cnt.textContent = "";
      this._cnt.style.display = "none";
      return;
    }
    const pct = (n) => {
      const p = (n / total) * 100;
      return this._t("pct", { p: p.toLocaleString(this._lang(), { maximumFractionDigits: p < 10 ? 1 : 0 }) });
    };
    const part = (label, n) => `${label}: ${n} (${pct(n)})`;
    const parts = [];
    if (loMoved && !hiMoved) {
      parts.push(part(this._t("c_below", { v: this._fmt(lo) }), below));
      parts.push(part(this._t("c_from", { v: this._fmt(lo) }), mid + above));
    } else if (!loMoved && hiMoved) {
      parts.push(part(this._t("c_upto", { v: this._fmt(hi) }), below + mid));
      parts.push(part(this._t("c_above", { v: this._fmt(hi) }), above));
    } else {
      parts.push(part(this._t("c_below", { v: this._fmt(lo) }), below));
      parts.push(part(this._t("c_between", { lo: this._num(lo), hi: this._fmt(hi) }), mid));
      parts.push(part(this._t("c_above", { v: this._fmt(hi) }), above));
    }
    const noun = I18N[pickLang(this._lang())].nouns[this._plan.view];
    parts.push(this._t("of_total", { n: total, noun }));
    this._cnt.textContent = parts.join(" · ");
    this._cnt.style.display = "";
  }
}

/* ------------------------------------------------------------------ */
/* Visueller Editor                                                    */
/* ------------------------------------------------------------------ */
function editorSchema(lang) {
  const o = I18N[lang].opts;
  const sel = (options) => ({ select: { mode: "dropdown", options } });
  return [
    { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
    { name: "title", selector: { text: {} } },
    {
      name: "view",
      selector: sel([
        { value: "hourly", label: o.hourly },
        { value: "daily", label: o.daily },
        { value: "weekly", label: o.weekly },
        { value: "monthly", label: o.monthly },
        { value: "yearly", label: o.yearly },
      ]),
    },
    { name: "color", selector: { color_rgb: {} } },
    {
      type: "grid",
      name: "",
      schema: [
        { name: "decimals", selector: { number: { min: 0, max: 4, mode: "box" } } },
        { name: "unit", selector: { text: {} } },
      ],
    },
    { name: "rows", selector: { number: { min: 1, max: 60, mode: "box" } } },
    {
      name: "stat",
      selector: sel([
        { value: "auto", label: o.auto },
        { value: "change", label: o.change },
        { value: "max", label: o.max },
        { value: "mean", label: o.mean },
        { value: "sum", label: o.sum },
      ]),
    },
    { name: "show_view_select", selector: { boolean: {} } },
    { name: "newest_first", selector: { boolean: {} } },
    {
      name: "language",
      selector: sel([
        { value: "auto", label: o.lang_auto },
        { value: "en", label: "English" },
        { value: "de", label: "Deutsch" },
      ]),
    },
  ];
}

class SolarHeatmapEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  _uiLang() {
    const l = this._config?.language;
    return pickLang(l && l !== "auto" ? l : this._hass?.locale?.language || this._hass?.language);
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => I18N[this._uiLang()].labels[s.name] || s.name;
      this._form.addEventListener("value-changed", (ev) => {
        const v = {};
        for (const [k, val] of Object.entries(ev.detail.value)) {
          if (val === undefined || val === "" || val === null) continue;
          v[k] = val;
        }
        if (Array.isArray(v.color)) v.color = rgbToHex(v.color);
        this._config = v;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: v }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = editorSchema(this._uiLang());
    this._form.data = {
      view: "daily",
      decimals: 1,
      stat: "auto",
      newest_first: false,
      show_view_select: true,
      ...this._config,
      color: hexToRgb(this._config.color || DEFAULT_COLOR),
    };
  }
}

customElements.define("solar-heatmap", SolarHeatmap);
customElements.define("solar-heatmap-editor", SolarHeatmapEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-heatmap",
  name: "Solar Heatmap",
  description: I18N.en.card_desc,
  preview: false,
});
