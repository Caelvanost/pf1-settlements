import { MODULE_ID } from "./data.mjs";

/**
 * v1.8 — Politique et opinion publique.
 *
 * Les scores d'opinion, de réputation, de tension et de troubles sont des
 * outils de suivi du module. Les libellés d'attitude reprennent le vocabulaire
 * habituel de Pathfinder (hostile, inamicale, indifférente, amicale, serviable),
 * mais les seuils numériques ci-dessous ne constituent pas une règle PF1.
 */

export const PUBLIC_OPINION_LEVELS = {
  hostile: "Hostile",
  unfriendly: "Inamicale",
  indifferent: "Indifférente",
  friendly: "Amicale",
  helpful: "Serviable"
};

export const UNREST_LEVELS = {
  0: "0 — Calme",
  1: "1 — Mécontentement",
  2: "2 — Tension",
  3: "3 — Manifestations",
  4: "4 — Émeutes",
  5: "5 — Insurrection"
};

export const UNREST_DESCRIPTIONS = {
  0: "La vie publique suit son cours normal.",
  1: "Les plaintes et rumeurs hostiles se multiplient, sans mobilisation organisée.",
  2: "La population est nerveuse ; rassemblements, provocations et incidents deviennent fréquents.",
  3: "Des manifestations, grèves, blocages ou mouvements organisés perturbent la communauté.",
  4: "Des émeutes ou affrontements ouverts éclatent et les autorités peinent à conserver le contrôle.",
  5: "L'ordre politique est directement menacé par une insurrection, une révolte ou une guerre civile locale."
};

export const FACTION_TENSION_LEVELS = {
  0: "0 — Coopération",
  1: "1 — Frictions",
  2: "2 — Rivalité",
  3: "3 — Hostilité",
  4: "4 — Affrontements",
  5: "5 — Guerre ouverte"
};

export const TENSION_TRENDS = {
  falling: "En baisse",
  stable: "Stable",
  rising: "En hausse"
};

/**
 * Applications des six modificateurs de communauté décrites dans le Guide du Maître.
 * Le module n'invente pas de nouveau bonus : il choisit simplement le modificateur
 * de communauté approprié et peut l'ajouter à un test saisi par le MJ.
 */
export const COMMUNITY_SKILL_CHECKS = {
  bluffOfficials: {
    label: "Bluff contre fonctionnaires / gardes",
    skill: "Bluff",
    modifier: "corruption",
    rule: "La Corruption modifie les tests de Bluff contre les fonctionnaires ou les gardes."
  },
  outdoorStealth: {
    label: "Discrétion en extérieur dans la communauté",
    skill: "Discrétion",
    modifier: "corruption",
    rule: "La Corruption modifie les tests de Discrétion en extérieur, mais pas dans un bâtiment ni sous terre."
  },
  senseMotiveCrime: {
    label: "Psychologie pour éviter de se faire bluffer",
    skill: "Psychologie",
    modifier: "crime",
    rule: "La Criminalité modifie les tests de Psychologie destinés à éviter de se faire Bluffer."
  },
  sleightOfHand: {
    label: "Escamotage / pickpocket",
    skill: "Escamotage",
    modifier: "crime",
    rule: "La Criminalité modifie les tests d'Escamotage des pickpockets."
  },
  craftIncome: {
    label: "Artisanat pour générer des revenus",
    skill: "Artisanat",
    modifier: "economy",
    rule: "L'Économie modifie les tests d'Artisanat destinés à générer des revenus."
  },
  performIncome: {
    label: "Représentation pour générer des revenus",
    skill: "Représentation",
    modifier: "economy",
    rule: "L'Économie modifie les tests de Représentation destinés à générer des revenus."
  },
  professionIncome: {
    label: "Profession pour générer des revenus",
    skill: "Profession",
    modifier: "economy",
    rule: "L'Économie modifie les tests de Profession destinés à générer des revenus."
  },
  intimidateFriendly: {
    label: "Intimidation pour obliger à réagir amicalement",
    skill: "Intimidation",
    modifier: "law",
    rule: "La Loi modifie les tests d'Intimidation destinés à obliger un adversaire à réagir de façon amicale."
  },
  diplomacyGovernment: {
    label: "Diplomatie contre un fonctionnaire gouvernemental",
    skill: "Diplomatie",
    modifier: "law",
    rule: "La Loi modifie les tests de Diplomatie contre les fonctionnaires du gouvernement."
  },
  gatherInformation: {
    label: "Diplomatie pour rassembler des informations",
    skill: "Diplomatie",
    modifier: "lore",
    rule: "Le Folklore modifie les tests de Diplomatie pour rassembler des informations."
  },
  libraryResearch: {
    label: "Connaissances avec les ressources de la ville",
    skill: "Connaissances",
    modifier: "lore",
    rule: "Le Folklore modifie les tests de Connaissances utilisant les ressources de la ville pour des recherches en bibliothèque."
  },
  disguise: {
    label: "Déguisement dans la communauté",
    skill: "Déguisement",
    modifier: "society",
    rule: "La Société modifie tous les tests de Déguisement dans la communauté."
  },
  diplomacyNonGovernment: {
    label: "Diplomatie pour modifier l'attitude d'un non-fonctionnaire",
    skill: "Diplomatie",
    modifier: "society",
    rule: "La Société modifie les tests de Diplomatie destinés à modifier l'attitude de tout fonctionnaire non-gouvernemental."
  }
};

export function defaultPoliticsState() {
  return {
    version: 1,
    publicOpinion: 0,
    opinionNotes: "",
    unrestLevel: 0,
    unrestNotes: "",
    reputations: [],
    tensions: [],
    consequences: []
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

function normalizeReputation(data = {}) {
  const now = Date.now();
  return {
    id: String(data.id ?? foundry.utils.randomID()),
    subjectName: String(data.subjectName ?? "Personnage / groupe"),
    actorUuid: String(data.actorUuid ?? ""),
    score: clampNumber(data.score, -100, 100, 0),
    visibility: normalizeVisibility(data.visibility),
    notes: String(data.notes ?? ""),
    createdAt: Number(data.createdAt ?? now),
    updatedAt: now
  };
}

function normalizeTension(data = {}) {
  const now = Date.now();
  return {
    id: String(data.id ?? foundry.utils.randomID()),
    factionAId: String(data.factionAId ?? ""),
    factionBId: String(data.factionBId ?? ""),
    level: Math.trunc(clampNumber(data.level, 0, 5, 1)),
    trend: Object.prototype.hasOwnProperty.call(TENSION_TRENDS, data.trend) ? data.trend : "stable",
    issue: String(data.issue ?? ""),
    visibility: normalizeVisibility(data.visibility),
    notes: String(data.notes ?? ""),
    createdAt: Number(data.createdAt ?? now),
    updatedAt: now
  };
}

function normalizeConsequence(data = {}) {
  const now = Date.now();
  return {
    id: String(data.id ?? foundry.utils.randomID()),
    title: String(data.title ?? "Conséquence politique"),
    description: String(data.description ?? ""),
    publicOpinionDelta: clampNumber(data.publicOpinionDelta, -100, 100, 0),
    unrestDelta: Math.trunc(clampNumber(data.unrestDelta, -5, 5, 0)),
    factionId: String(data.factionId ?? ""),
    visibility: normalizeVisibility(data.visibility),
    notes: String(data.notes ?? ""),
    campaignDate: String(data.campaignDate ?? ""),
    createdAt: Number(data.createdAt ?? now)
  };
}

function normalizeState(raw = {}) {
  const state = foundry.utils.mergeObject(defaultPoliticsState(), raw ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  state.publicOpinion = clampNumber(state.publicOpinion, -100, 100, 0);
  state.opinionNotes = String(state.opinionNotes ?? "");
  state.unrestLevel = Math.trunc(clampNumber(state.unrestLevel, 0, 5, 0));
  state.unrestNotes = String(state.unrestNotes ?? "");
  state.reputations = (Array.isArray(state.reputations) ? state.reputations : []).map(normalizeReputation);
  state.tensions = (Array.isArray(state.tensions) ? state.tensions : []).map(normalizeTension);
  state.consequences = (Array.isArray(state.consequences) ? state.consequences : []).map(normalizeConsequence).slice(0, 100);
  return state;
}

export function opinionForScore(score) {
  const value = clampNumber(score, -100, 100, 0);
  if (value <= -60) return { key: "hostile", label: PUBLIC_OPINION_LEVELS.hostile, className: "hostile", score: value };
  if (value <= -20) return { key: "unfriendly", label: PUBLIC_OPINION_LEVELS.unfriendly, className: "unfriendly", score: value };
  if (value < 20) return { key: "indifferent", label: PUBLIC_OPINION_LEVELS.indifferent, className: "indifferent", score: value };
  if (value < 60) return { key: "friendly", label: PUBLIC_OPINION_LEVELS.friendly, className: "friendly", score: value };
  return { key: "helpful", label: PUBLIC_OPINION_LEVELS.helpful, className: "helpful", score: value };
}

export function getPoliticsState(settlement) {
  return normalizeState(settlement?.getFlag(MODULE_ID, "politicsState") ?? {});
}

export async function savePoliticsState(settlement, state) {
  if (!settlement) return null;
  const clean = normalizeState(state);
  await settlement.setFlag(MODULE_ID, "politicsState", clean);
  return clean;
}

export async function setPublicOpinion(settlement, score, notes = undefined) {
  const state = getPoliticsState(settlement);
  state.publicOpinion = clampNumber(score, -100, 100, 0);
  if (notes !== undefined) state.opinionNotes = String(notes ?? "");
  return savePoliticsState(settlement, state);
}

export async function setUnrestLevel(settlement, level, notes = undefined) {
  const state = getPoliticsState(settlement);
  state.unrestLevel = Math.trunc(clampNumber(level, 0, 5, 0));
  if (notes !== undefined) state.unrestNotes = String(notes ?? "");
  return savePoliticsState(settlement, state);
}

export async function addLocalReputation(settlement, data = {}) {
  const state = getPoliticsState(settlement);
  state.reputations.push(normalizeReputation(data));
  return savePoliticsState(settlement, state);
}

export async function updateLocalReputation(settlement, id, changes = {}) {
  const state = getPoliticsState(settlement);
  const index = state.reputations.findIndex(r => r.id === id);
  if (index < 0) return state;
  state.reputations[index] = normalizeReputation({ ...state.reputations[index], ...changes, id: state.reputations[index].id, createdAt: state.reputations[index].createdAt });
  return savePoliticsState(settlement, state);
}

export async function removeLocalReputation(settlement, id) {
  const state = getPoliticsState(settlement);
  state.reputations = state.reputations.filter(r => r.id !== id);
  return savePoliticsState(settlement, state);
}

export async function addFactionTension(settlement, data = {}) {
  const state = getPoliticsState(settlement);
  const tension = normalizeTension(data);
  if (tension.factionAId && tension.factionBId && tension.factionAId === tension.factionBId) {
    throw new Error("Une tension politique doit opposer deux factions différentes.");
  }
  state.tensions.push(tension);
  return savePoliticsState(settlement, state);
}

export async function updateFactionTension(settlement, id, changes = {}) {
  const state = getPoliticsState(settlement);
  const index = state.tensions.findIndex(t => t.id === id);
  if (index < 0) return state;
  const tension = normalizeTension({ ...state.tensions[index], ...changes, id: state.tensions[index].id, createdAt: state.tensions[index].createdAt });
  if (tension.factionAId && tension.factionBId && tension.factionAId === tension.factionBId) {
    throw new Error("Une tension politique doit opposer deux factions différentes.");
  }
  state.tensions[index] = tension;
  return savePoliticsState(settlement, state);
}

export async function removeFactionTension(settlement, id) {
  const state = getPoliticsState(settlement);
  state.tensions = state.tensions.filter(t => t.id !== id);
  return savePoliticsState(settlement, state);
}

export async function applyPoliticalConsequence(settlement, data = {}) {
  const state = getPoliticsState(settlement);
  const consequence = normalizeConsequence(data);
  state.publicOpinion = clampNumber(state.publicOpinion + consequence.publicOpinionDelta, -100, 100, 0);
  state.unrestLevel = Math.trunc(clampNumber(state.unrestLevel + consequence.unrestDelta, 0, 5, 0));
  state.consequences.unshift(consequence);
  state.consequences = state.consequences.slice(0, 100);
  return savePoliticsState(settlement, state);
}

export async function removePoliticalConsequence(settlement, id) {
  const state = getPoliticsState(settlement);
  state.consequences = state.consequences.filter(c => c.id !== id);
  return savePoliticsState(settlement, state);
}

export async function clearPoliticalHistory(settlement) {
  const state = getPoliticsState(settlement);
  state.consequences = [];
  return savePoliticsState(settlement, state);
}
