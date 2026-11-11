import { MODULE_ID, defaultSettlementConfig } from "./data.mjs";
import { calculateSettlement } from "./calculator.mjs";

export const CALENDAR_ENTRY_TYPES = {
  holyDay: "Jour saint",
  festival: "Festival / fête",
  civic: "Événement civique",
  market: "Marché / foire",
  deadline: "Échéance",
  event: "Événement",
  other: "Autre"
};

export const CALENDAR_ENTRY_STATUS = {
  planned: "À venir",
  active: "Aujourd'hui",
  completed: "Passé",
  cancelled: "Annulé"
};

export const PROJECT_TYPES = {
  construction: "Construction",
  repair: "Réparation",
  fortification: "Fortification",
  civic: "Travaux publics",
  commercial: "Projet commercial",
  religious: "Projet religieux",
  other: "Autre"
};

export const PROJECT_STATUS = {
  planned: "Planifié",
  active: "En cours",
  completed: "Achevé",
  paused: "En pause",
  cancelled: "Annulé"
};

export const POPULATION_CHANGE_TYPES = {
  births: "Naissances",
  deaths: "Décès",
  migrationIn: "Immigration",
  migrationOut: "Émigration",
  disaster: "Catastrophe",
  war: "Guerre / conflit",
  prosperity: "Croissance économique",
  other: "Autre"
};

function defaultMonths() {
  return Array.from({ length: 12 }, (_, i) => ({ name: `Mois ${i + 1}`, days: 30 }));
}

function defaultWeekdays() {
  return Array.from({ length: 7 }, (_, i) => `Jour ${i + 1}`);
}

export function defaultCalendarState() {
  return {
    version: 1,
    current: { year: 1, month: 1, day: 1 },
    config: {
      yearLabel: "année",
      months: defaultMonths(),
      weekdays: defaultWeekdays(),
      epochWeekday: 0,
      syncMarketWeeks: false,
      marketDayAccumulator: 0
    },
    entries: [],
    projects: [],
    populationHistory: [],
    timeline: []
  };
}

function clampInt(value, min, max, fallback = min) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function normalizeMonths(months) {
  const src = Array.isArray(months) && months.length ? months : defaultMonths();
  return src.slice(0, 24).map((m, i) => ({
    name: String(m?.name ?? `Mois ${i + 1}`).trim() || `Mois ${i + 1}`,
    days: clampInt(m?.days, 1, 999, 30)
  }));
}

function normalizeWeekdays(days) {
  const src = Array.isArray(days) && days.length ? days : defaultWeekdays();
  return src.slice(0, 20).map((d, i) => String(d ?? `Jour ${i + 1}`).trim() || `Jour ${i + 1}`);
}

function normalizeDate(date, config) {
  const months = normalizeMonths(config?.months);
  const year = Math.max(1, Math.trunc(Number(date?.year ?? 1)) || 1);
  const month = clampInt(date?.month, 1, months.length, 1);
  const maxDay = months[month - 1]?.days ?? 30;
  const day = clampInt(date?.day, 1, maxDay, 1);
  return { year, month, day };
}

function normalizeState(raw = {}) {
  const state = foundry.utils.mergeObject(defaultCalendarState(), raw ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  state.config.months = normalizeMonths(state.config?.months);
  state.config.weekdays = normalizeWeekdays(state.config?.weekdays);
  state.config.yearLabel = String(state.config?.yearLabel ?? "année").trim() || "année";
  state.config.epochWeekday = clampInt(state.config?.epochWeekday, 0, state.config.weekdays.length - 1, 0);
  state.config.syncMarketWeeks = Boolean(state.config?.syncMarketWeeks);
  state.config.marketDayAccumulator = Math.max(0, Math.trunc(Number(state.config?.marketDayAccumulator ?? 0)) || 0);
  state.current = normalizeDate(state.current, state.config);
  state.entries = Array.isArray(state.entries) ? state.entries : [];
  state.projects = Array.isArray(state.projects) ? state.projects : [];
  state.populationHistory = Array.isArray(state.populationHistory) ? state.populationHistory : [];
  state.timeline = Array.isArray(state.timeline) ? state.timeline : [];
  return state;
}

export function getCalendarState(settlement) {
  return normalizeState(settlement?.getFlag(MODULE_ID, "calendarState") ?? {});
}

export async function saveCalendarState(settlement, state) {
  if (!settlement) return null;
  const clean = normalizeState(state);
  await settlement.setFlag(MODULE_ID, "calendarState", clean);
  return clean;
}

export function daysInYear(config) {
  return normalizeMonths(config?.months).reduce((sum, m) => sum + Number(m.days || 0), 0);
}

export function dateToOrdinal(date, config) {
  const months = normalizeMonths(config?.months);
  const d = normalizeDate(date, { ...config, months });
  const yearDays = months.reduce((sum, m) => sum + m.days, 0);
  let ordinal = (d.year - 1) * yearDays;
  for (let i = 0; i < d.month - 1; i++) ordinal += months[i].days;
  ordinal += d.day - 1;
  return ordinal;
}

export function ordinalToDate(ordinal, config) {
  const months = normalizeMonths(config?.months);
  const yearDays = Math.max(1, months.reduce((sum, m) => sum + m.days, 0));
  let rest = Math.max(0, Math.trunc(Number(ordinal) || 0));
  const year = Math.floor(rest / yearDays) + 1;
  rest %= yearDays;
  let month = 1;
  while (month <= months.length && rest >= months[month - 1].days) {
    rest -= months[month - 1].days;
    month += 1;
  }
  return { year, month: Math.min(month, months.length), day: rest + 1 };
}

export function weekdayIndex(date, config) {
  const weekdays = normalizeWeekdays(config?.weekdays);
  const base = clampInt(config?.epochWeekday, 0, weekdays.length - 1, 0);
  return (base + dateToOrdinal(date, config)) % weekdays.length;
}

export function formatCalendarDate(date, config, { includeWeekday = true } = {}) {
  const months = normalizeMonths(config?.months);
  const weekdays = normalizeWeekdays(config?.weekdays);
  const d = normalizeDate(date, { ...config, months, weekdays });
  const monthName = months[d.month - 1]?.name ?? `Mois ${d.month}`;
  const yearLabel = String(config?.yearLabel ?? "année").trim() || "année";
  const weekday = includeWeekday ? `${weekdays[weekdayIndex(d, { ...config, months, weekdays })]}, ` : "";
  return `${weekday}${d.day} ${monthName}, ${yearLabel} ${d.year}`;
}

export function compareDates(a, b, config) {
  return dateToOrdinal(a, config) - dateToOrdinal(b, config);
}

function normalizeEntry(data, state) {
  const now = Date.now();
  const date = normalizeDate(data?.date ?? state.current, state.config);
  const type = Object.prototype.hasOwnProperty.call(CALENDAR_ENTRY_TYPES, data?.type) ? data.type : "event";
  const recurrence = ["none", "yearly"].includes(data?.recurrence) ? data.recurrence : "none";
  return {
    id: String(data?.id ?? foundry.utils.randomID()),
    title: String(data?.title ?? "Événement sans nom"),
    type,
    date,
    recurrence,
    visibility: data?.visibility === "gm" ? "gm" : "public",
    status: Object.prototype.hasOwnProperty.call(CALENDAR_ENTRY_STATUS, data?.status) ? data.status : "planned",
    locationId: String(data?.locationId ?? ""),
    factionId: String(data?.factionId ?? ""),
    description: String(data?.description ?? ""),
    notes: String(data?.notes ?? ""),
    createdAt: Number(data?.createdAt ?? now),
    updatedAt: now
  };
}

function normalizeProject(data, state) {
  const now = Date.now();
  return {
    id: String(data?.id ?? foundry.utils.randomID()),
    title: String(data?.title ?? "Projet sans nom"),
    type: Object.prototype.hasOwnProperty.call(PROJECT_TYPES, data?.type) ? data.type : "construction",
    startDate: normalizeDate(data?.startDate ?? state.current, state.config),
    durationDays: Math.max(1, Math.trunc(Number(data?.durationDays ?? 30)) || 30),
    status: Object.prototype.hasOwnProperty.call(PROJECT_STATUS, data?.status) ? data.status : "planned",
    locationId: String(data?.locationId ?? ""),
    factionId: String(data?.factionId ?? ""),
    description: String(data?.description ?? ""),
    notes: String(data?.notes ?? ""),
    createdAt: Number(data?.createdAt ?? now),
    updatedAt: now
  };
}

function appendTimeline(state, data) {
  state.timeline.unshift({
    id: foundry.utils.randomID(),
    date: normalizeDate(data?.date ?? state.current, state.config),
    type: String(data?.type ?? "note"),
    title: String(data?.title ?? "Évolution"),
    description: String(data?.description ?? ""),
    createdAt: Date.now()
  });
  state.timeline = state.timeline.slice(0, 100);
}

function sameMonthDay(a, b) {
  return Number(a?.month) === Number(b?.month) && Number(a?.day) === Number(b?.day);
}

function updateDynamicStatuses(state) {
  const currentOrdinal = dateToOrdinal(state.current, state.config);
  for (const entry of state.entries) {
    if (entry.status === "cancelled") continue;
    const recurringToday = entry.recurrence === "yearly" && sameMonthDay(entry.date, state.current);
    const targetOrdinal = dateToOrdinal(entry.date, state.config);
    if (recurringToday || (entry.recurrence === "none" && targetOrdinal === currentOrdinal)) entry.status = "active";
    else if (entry.recurrence === "none" && targetOrdinal < currentOrdinal) entry.status = "completed";
    else entry.status = "planned";
  }

  for (const project of state.projects) {
    if (["paused", "cancelled"].includes(project.status)) continue;
    const start = dateToOrdinal(project.startDate, state.config);
    const finish = start + Math.max(1, Number(project.durationDays || 1)) - 1;
    if (currentOrdinal < start) project.status = "planned";
    else if (currentOrdinal > finish) project.status = "completed";
    else project.status = "active";
  }
}

export async function configureCalendar(settlement, changes = {}) {
  const state = getCalendarState(settlement);
  const monthNames = Array.isArray(changes.months) ? changes.months : state.config.months;
  const weekdays = Array.isArray(changes.weekdays) ? changes.weekdays : state.config.weekdays;
  state.config = {
    ...state.config,
    ...changes,
    months: normalizeMonths(monthNames),
    weekdays: normalizeWeekdays(weekdays)
  };
  state.current = normalizeDate(state.current, state.config);
  updateDynamicStatuses(state);
  return saveCalendarState(settlement, state);
}

export async function setCalendarDate(settlement, date) {
  const state = getCalendarState(settlement);
  state.current = normalizeDate(date, state.config);
  updateDynamicStatuses(state);
  appendTimeline(state, { type: "calendar", title: "Date de campagne modifiée", description: formatCalendarDate(state.current, state.config, { includeWeekday: false }) });
  return saveCalendarState(settlement, state);
}

export async function advanceCalendar(settlement, days = 1) {
  const state = getCalendarState(settlement);
  const amount = Math.max(0, Math.trunc(Number(days) || 0));
  const before = { ...state.current };
  const beforeStatuses = new Map(state.entries.map(e => [e.id, e.status]));
  const beforeProjects = new Map(state.projects.map(p => [p.id, p.status]));
  state.current = ordinalToDate(dateToOrdinal(state.current, state.config) + amount, state.config);
  state.config.marketDayAccumulator = Math.max(0, Number(state.config.marketDayAccumulator || 0) + amount);
  const marketWeeksElapsed = state.config.syncMarketWeeks ? Math.floor(state.config.marketDayAccumulator / 7) : 0;
  if (marketWeeksElapsed > 0) state.config.marketDayAccumulator %= 7;
  updateDynamicStatuses(state);

  const activatedEntries = state.entries.filter(e => beforeStatuses.get(e.id) !== "active" && e.status === "active").map(e => e.id);
  const completedProjects = state.projects.filter(p => beforeProjects.get(p.id) !== "completed" && p.status === "completed").map(p => p.id);
  appendTimeline(state, {
    date: state.current,
    type: "calendar",
    title: `Temps avancé de ${amount} jour(s)`,
    description: `${formatCalendarDate(before, state.config, { includeWeekday: false })} → ${formatCalendarDate(state.current, state.config, { includeWeekday: false })}`
  });
  await saveCalendarState(settlement, state);
  return { state, marketWeeksElapsed, activatedEntries, completedProjects };
}

export async function addCalendarEntry(settlement, data = {}) {
  const state = getCalendarState(settlement);
  const entry = normalizeEntry(data, state);
  state.entries.push(entry);
  updateDynamicStatuses(state);
  appendTimeline(state, { date: entry.date, type: "calendar-entry", title: `Calendrier : ${entry.title}`, description: CALENDAR_ENTRY_TYPES[entry.type] ?? "Événement" });
  await saveCalendarState(settlement, state);
  return entry;
}

export async function updateCalendarEntry(settlement, entryId, changes = {}) {
  const state = getCalendarState(settlement);
  const index = state.entries.findIndex(e => e.id === entryId);
  if (index < 0) return null;
  state.entries[index] = normalizeEntry({ ...state.entries[index], ...changes, id: entryId, createdAt: state.entries[index].createdAt }, state);
  updateDynamicStatuses(state);
  await saveCalendarState(settlement, state);
  return state.entries[index];
}

export async function removeCalendarEntry(settlement, entryId) {
  const state = getCalendarState(settlement);
  const before = state.entries.length;
  state.entries = state.entries.filter(e => e.id !== entryId);
  if (state.entries.length === before) return false;
  await saveCalendarState(settlement, state);
  return true;
}

export async function addProject(settlement, data = {}) {
  const state = getCalendarState(settlement);
  const project = normalizeProject(data, state);
  state.projects.push(project);
  updateDynamicStatuses(state);
  appendTimeline(state, { date: project.startDate, type: "project", title: `Projet : ${project.title}`, description: `${PROJECT_TYPES[project.type] ?? "Projet"} · ${project.durationDays} jour(s)` });
  await saveCalendarState(settlement, state);
  return project;
}

export async function updateProject(settlement, projectId, changes = {}) {
  const state = getCalendarState(settlement);
  const index = state.projects.findIndex(p => p.id === projectId);
  if (index < 0) return null;
  state.projects[index] = normalizeProject({ ...state.projects[index], ...changes, id: projectId, createdAt: state.projects[index].createdAt }, state);
  updateDynamicStatuses(state);
  await saveCalendarState(settlement, state);
  return state.projects[index];
}

export async function removeProject(settlement, projectId) {
  const state = getCalendarState(settlement);
  const before = state.projects.length;
  state.projects = state.projects.filter(p => p.id !== projectId);
  if (state.projects.length === before) return false;
  await saveCalendarState(settlement, state);
  return true;
}

function parsePopulation(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  const compact = String(value ?? "").replace(/[\s\u00A0._']/g, "");
  const match = compact.match(/-?\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
}

export async function applyPopulationChange(settlement, delta, data = {}) {
  if (!settlement) return null;
  const state = getCalendarState(settlement);
  const savedConfig = foundry.utils.mergeObject(defaultSettlementConfig(), settlement.getFlag(MODULE_ID, "config") ?? {}, { inplace: false, insertKeys: true, insertValues: true, overwrite: true });
  const explicitBase = parsePopulation(data.basePopulation);
  const previous = explicitBase ?? parsePopulation(savedConfig.population);
  if (previous == null) throw new Error("Population actuelle non numérique");
  const amount = Math.trunc(Number(delta) || 0);
  const next = Math.max(0, previous + amount);
  const record = {
    id: foundry.utils.randomID(),
    date: normalizeDate(data.date ?? state.current, state.config),
    type: Object.prototype.hasOwnProperty.call(POPULATION_CHANGE_TYPES, data.type) ? data.type : "other",
    delta: amount,
    previous,
    next,
    reason: String(data.reason ?? "Évolution de population"),
    notes: String(data.notes ?? ""),
    createdAt: Date.now()
  };
  state.populationHistory.unshift(record);
  state.populationHistory = state.populationHistory.slice(0, 100);
  appendTimeline(state, { date: record.date, type: "population", title: record.reason, description: `${amount >= 0 ? "+" : ""}${amount} habitant(s) · ${previous} → ${next}` });
  savedConfig.population = String(next);
  await settlement.update({
    [`flags.${MODULE_ID}.config`]: savedConfig,
    [`flags.${MODULE_ID}.derived`]: calculateSettlement(savedConfig),
    [`flags.${MODULE_ID}.calendarState`]: normalizeState(state)
  });
  return record;
}

export async function clearPopulationHistory(settlement) {
  const state = getCalendarState(settlement);
  state.populationHistory = [];
  return saveCalendarState(settlement, state);
}

export async function clearTimeline(settlement) {
  const state = getCalendarState(settlement);
  state.timeline = [];
  return saveCalendarState(settlement, state);
}

export function getProjectProgress(project, state) {
  const start = dateToOrdinal(project.startDate, state.config);
  const current = dateToOrdinal(state.current, state.config);
  const duration = Math.max(1, Number(project.durationDays || 1));
  const elapsed = Math.max(0, Math.min(duration, current - start + 1));
  const percent = Math.max(0, Math.min(100, Math.round((elapsed / duration) * 100)));
  const finishDate = ordinalToDate(start + duration - 1, state.config);
  return { elapsed, duration, percent, finishDate };
}
