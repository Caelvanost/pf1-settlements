import { MODULE_ID } from "./data.mjs";

/**
 * v1.9 — Lois, édits, taxes et réglementations locales.
 *
 * Le Guide du Maître décrit la caractéristique Loi comme la rigidité des édits
 * et l'organisation des autorités, mais ne fournit pas de barème universel de
 * codes juridiques, de taxes ou de peines. Les structures ci-dessous sont donc
 * des outils de campagne : elles stockent les décisions du MJ sans inventer de
 * bonus PF1 supplémentaires.
 */

export const LEGISLATION_TYPES = {
  law: "Loi",
  edict: "Édit / décret",
  prohibition: "Interdiction",
  requirement: "Obligation",
  license: "Licence / permis",
  curfew: "Couvre-feu",
  trade: "Réglementation commerciale",
  magic: "Réglementation de la magie",
  weapons: "Réglementation des armes",
  publicOrder: "Ordre public",
  other: "Autre"
};

export const LEGISLATION_STATUS = {
  draft: "Projet",
  active: "En vigueur",
  suspended: "Suspendue",
  repealed: "Abrogée"
};

export const LEVY_TYPES = {
  tax: "Taxe",
  toll: "Péage / droit d'entrée",
  tithe: "Dîme",
  tariff: "Droit de douane",
  market: "Taxe de marché",
  licenseFee: "Droit de licence",
  other: "Autre prélèvement"
};

export const LEVY_MODES = {
  percent: "Pourcentage",
  flat: "Montant fixe"
};

export const LEVY_FREQUENCIES = {
  transaction: "Par transaction",
  entry: "À l'entrée / au passage",
  day: "Par jour",
  week: "Par semaine",
  month: "Par mois",
  year: "Par an",
  once: "Ponctuel",
  other: "Autre"
};

export function defaultLegislationState() {
  return {
    version: 1,
    laws: [],
    levies: [],
    history: []
  };
}

function clampNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeVisibility(value) {
  return value === "gm" ? "gm" : "public";
}

function normalizeLaw(data = {}) {
  const now = Date.now();
  const type = Object.prototype.hasOwnProperty.call(LEGISLATION_TYPES, data.type) ? data.type : "law";
  const status = Object.prototype.hasOwnProperty.call(LEGISLATION_STATUS, data.status) ? data.status : "active";
  return {
    id: String(data.id ?? foundry.utils.randomID()),
    title: String(data.title ?? "Nouvelle loi"),
    type,
    status,
    description: String(data.description ?? ""),
    scope: String(data.scope ?? "Toute la communauté"),
    enforcement: String(data.enforcement ?? ""),
    penalty: String(data.penalty ?? ""),
    issuingFactionId: String(data.issuingFactionId ?? ""),
    locationId: String(data.locationId ?? ""),
    effectiveDate: String(data.effectiveDate ?? ""),
    visibility: normalizeVisibility(data.visibility),
    crimeSeverity: Math.trunc(clampNumber(data.crimeSeverity, 1, 5, 2)),
    defaultFine: Math.max(0, Number(data.defaultFine ?? 0) || 0),
    defaultSentence: String(data.defaultSentence ?? ""),
    publicOpinionDelta: Math.trunc(clampNumber(data.publicOpinionDelta, -100, 100, 0)),
    unrestDelta: Math.trunc(clampNumber(data.unrestDelta, -5, 5, 0)),
    notes: String(data.notes ?? ""),
    createdAt: Number(data.createdAt ?? now),
    updatedAt: now
  };
}

function normalizeLevy(data = {}) {
  const now = Date.now();
  const type = Object.prototype.hasOwnProperty.call(LEVY_TYPES, data.type) ? data.type : "tax";
  const mode = Object.prototype.hasOwnProperty.call(LEVY_MODES, data.mode) ? data.mode : "percent";
  const frequency = Object.prototype.hasOwnProperty.call(LEVY_FREQUENCIES, data.frequency) ? data.frequency : "transaction";
  const rate = mode === "percent"
    ? clampNumber(data.rate, 0, 1000, 0)
    : Math.max(0, Number(data.rate ?? 0) || 0);
  return {
    id: String(data.id ?? foundry.utils.randomID()),
    title: String(data.title ?? "Nouveau prélèvement"),
    type,
    mode,
    rate,
    frequency,
    appliesTo: String(data.appliesTo ?? ""),
    exemptions: String(data.exemptions ?? ""),
    collectorFactionId: String(data.collectorFactionId ?? ""),
    locationId: String(data.locationId ?? ""),
    active: data.active !== false,
    marketApplicable: Boolean(data.marketApplicable),
    effectiveDate: String(data.effectiveDate ?? ""),
    visibility: normalizeVisibility(data.visibility),
    notes: String(data.notes ?? ""),
    createdAt: Number(data.createdAt ?? now),
    updatedAt: now
  };
}

function normalizeHistoryEntry(data = {}) {
  return {
    id: String(data.id ?? foundry.utils.randomID()),
    kind: String(data.kind ?? "note"),
    title: String(data.title ?? "Évolution juridique"),
    detail: String(data.detail ?? ""),
    campaignDate: String(data.campaignDate ?? ""),
    createdAt: Number(data.createdAt ?? Date.now())
  };
}

function normalizeState(raw = {}) {
  const state = foundry.utils.mergeObject(defaultLegislationState(), raw ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  state.laws = (Array.isArray(state.laws) ? state.laws : []).map(normalizeLaw);
  state.levies = (Array.isArray(state.levies) ? state.levies : []).map(normalizeLevy);
  state.history = (Array.isArray(state.history) ? state.history : []).map(normalizeHistoryEntry).slice(0, 100);
  return state;
}

export function getLegislationState(settlement) {
  return normalizeState(settlement?.getFlag(MODULE_ID, "legislationState") ?? {});
}

export async function saveLegislationState(settlement, state) {
  if (!settlement) return null;
  const clean = normalizeState(state);
  await settlement.setFlag(MODULE_ID, "legislationState", clean);
  return clean;
}

async function pushHistory(settlement, state, entry) {
  state.history.unshift(normalizeHistoryEntry(entry));
  state.history = state.history.slice(0, 100);
  return saveLegislationState(settlement, state);
}

export async function addLegislation(settlement, data = {}, { campaignDate = "" } = {}) {
  const state = getLegislationState(settlement);
  const law = normalizeLaw(data);
  state.laws.push(law);
  await pushHistory(settlement, state, {
    kind: "law-created",
    title: `Texte ajouté : ${law.title}`,
    detail: `${LEGISLATION_TYPES[law.type] ?? law.type} — ${LEGISLATION_STATUS[law.status] ?? law.status}`,
    campaignDate
  });
  return law;
}

export async function updateLegislation(settlement, lawId, changes = {}, { campaignDate = "" } = {}) {
  const state = getLegislationState(settlement);
  const index = state.laws.findIndex(l => l.id === lawId);
  if (index < 0) return null;
  const previousStatus = state.laws[index].status;
  const updated = normalizeLaw({ ...state.laws[index], ...changes, id: lawId, createdAt: state.laws[index].createdAt });
  state.laws[index] = updated;
  if (previousStatus !== updated.status) {
    await pushHistory(settlement, state, {
      kind: "law-status",
      title: `${updated.title} : ${LEGISLATION_STATUS[updated.status] ?? updated.status}`,
      detail: `Statut précédent : ${LEGISLATION_STATUS[previousStatus] ?? previousStatus}`,
      campaignDate
    });
  } else {
    await saveLegislationState(settlement, state);
  }
  return updated;
}

export async function setLegislationStatus(settlement, lawId, status, { campaignDate = "" } = {}) {
  if (!Object.prototype.hasOwnProperty.call(LEGISLATION_STATUS, status)) return null;
  return updateLegislation(settlement, lawId, { status }, { campaignDate });
}

export async function removeLegislation(settlement, lawId, { campaignDate = "" } = {}) {
  const state = getLegislationState(settlement);
  const law = state.laws.find(l => l.id === lawId);
  if (!law) return false;
  state.laws = state.laws.filter(l => l.id !== lawId);
  await pushHistory(settlement, state, {
    kind: "law-removed",
    title: `Texte supprimé : ${law.title}`,
    detail: LEGISLATION_TYPES[law.type] ?? law.type,
    campaignDate
  });
  return true;
}

export async function addLevy(settlement, data = {}, { campaignDate = "" } = {}) {
  const state = getLegislationState(settlement);
  const levy = normalizeLevy(data);
  state.levies.push(levy);
  await pushHistory(settlement, state, {
    kind: "levy-created",
    title: `Prélèvement ajouté : ${levy.title}`,
    detail: LEVY_TYPES[levy.type] ?? levy.type,
    campaignDate
  });
  return levy;
}

export async function updateLevy(settlement, levyId, changes = {}, { campaignDate = "" } = {}) {
  const state = getLegislationState(settlement);
  const index = state.levies.findIndex(l => l.id === levyId);
  if (index < 0) return null;
  const updated = normalizeLevy({ ...state.levies[index], ...changes, id: levyId, createdAt: state.levies[index].createdAt });
  state.levies[index] = updated;
  await saveLegislationState(settlement, state);
  return updated;
}

export async function removeLevy(settlement, levyId, { campaignDate = "" } = {}) {
  const state = getLegislationState(settlement);
  const levy = state.levies.find(l => l.id === levyId);
  if (!levy) return false;
  state.levies = state.levies.filter(l => l.id !== levyId);
  await pushHistory(settlement, state, {
    kind: "levy-removed",
    title: `Prélèvement supprimé : ${levy.title}`,
    detail: LEVY_TYPES[levy.type] ?? levy.type,
    campaignDate
  });
  return true;
}

export function calculateLevy(levy, baseAmount = 0) {
  const base = Math.max(0, Number(baseAmount ?? 0) || 0);
  if (!levy) return { base, amount: 0, total: base };
  const amount = levy.mode === "flat"
    ? Math.max(0, Number(levy.rate ?? 0) || 0)
    : base * (Math.max(0, Number(levy.rate ?? 0) || 0) / 100);
  return { base, amount, total: base + amount };
}

export function getActiveLegislation(settlement) {
  return getLegislationState(settlement).laws.filter(l => l.status === "active");
}

export function getActiveLevies(settlement) {
  return getLegislationState(settlement).levies.filter(l => l.active);
}

export async function clearLegislationHistory(settlement) {
  const state = getLegislationState(settlement);
  state.history = [];
  return saveLegislationState(settlement, state);
}
