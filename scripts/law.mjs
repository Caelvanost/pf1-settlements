import { MODULE_ID } from "./data.mjs";

export const LAW_ALERT_LEVELS = {
  0: "Calme",
  1: "Veille",
  2: "Vigilance",
  3: "Alerte",
  4: "Verrouillage",
  5: "Crise"
};

// Outil Foundry de suivi : ces niveaux d'alerte ne sont pas un sous-système officiel PF1.
export const LAW_ALERT_DESCRIPTIONS = {
  0: "Routine normale. La garde suit ses patrouilles habituelles.",
  1: "Surveillance accrue autour de quelques lieux ou personnes.",
  2: "Patrouilles renforcées et contrôles plus fréquents.",
  3: "Recherche active, barrages locaux et mobilisation visible.",
  4: "Portes, quais et grands axes étroitement contrôlés.",
  5: "Crise majeure : toutes les forces disponibles sont mobilisées."
};

export const CRIME_STATUS = {
  reported: "Signalé",
  wanted: "Recherché",
  arrested: "Arrêté",
  judged: "Jugé",
  closed: "Classé"
};

export const CRIME_SEVERITY = {
  1: "Mineur",
  2: "Modéré",
  3: "Sérieux",
  4: "Grave",
  5: "Capital"
};

export const AUTHORITY_ROLES = {
  guard: "Garde",
  officer: "Officier",
  captain: "Capitaine de la garde",
  jailer: "Geôlier"
};

// Compositions explicitement données dans la Galerie de PNJ du Guide du Maître.
export const GUARD_FORMATIONS = {
  single: {
    label: "Garde seul",
    summary: "1 garde",
    cr: "1",
    guards: 1,
    officers: 0,
    source: "Guide du Maître, Milice, p. 290-291"
  },
  pair: {
    label: "Groupe de gardes",
    summary: "2 gardes",
    cr: "3",
    guards: 2,
    officers: 0,
    source: "Guide du Maître, Milice, p. 290-291"
  },
  squad: {
    label: "Escouade",
    summary: "4 gardes",
    cr: "5",
    guards: 4,
    officers: 0,
    source: "Guide du Maître, Milice, p. 290-291"
  },
  patrol: {
    label: "Patrouille",
    summary: "6 gardes + 1 officier",
    cr: "7",
    guards: 6,
    officers: 1,
    source: "Guide du Maître, Milice, p. 290-291"
  },
  smallPrison: {
    label: "Sécurité d'une petite prison",
    summary: "4 gardes + 1 geôlier",
    cr: "6",
    guards: 4,
    officers: 0,
    jailers: 1,
    source: "Guide du Maître, Milice, p. 290-291"
  }
};

export function defaultLawState() {
  return {
    version: 1,
    alertLevel: 0,
    authorityActors: {
      guard: "",
      officer: "",
      captain: "",
      jailer: ""
    },
    crimes: [],
    patrolHistory: []
  };
}

function normalizeState(raw = {}) {
  const state = foundry.utils.mergeObject(defaultLawState(), raw ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  state.alertLevel = Math.max(0, Math.min(5, Number(state.alertLevel ?? 0)));
  state.authorityActors = { ...defaultLawState().authorityActors, ...(state.authorityActors ?? {}) };
  state.crimes = Array.isArray(state.crimes) ? state.crimes : [];
  state.patrolHistory = Array.isArray(state.patrolHistory) ? state.patrolHistory : [];
  return state;
}

export function getLawState(settlement) {
  return normalizeState(settlement?.getFlag(MODULE_ID, "lawState") ?? {});
}

export async function saveLawState(settlement, state) {
  if (!settlement) return null;
  const clean = normalizeState(state);
  await settlement.setFlag(MODULE_ID, "lawState", clean);
  return clean;
}

export async function setAlertLevel(settlement, level) {
  const state = getLawState(settlement);
  state.alertLevel = Math.max(0, Math.min(5, Number(level ?? 0)));
  return saveLawState(settlement, state);
}

export async function setAuthorityActor(settlement, role, actorOrUuid = "") {
  if (!Object.prototype.hasOwnProperty.call(AUTHORITY_ROLES, role)) throw new Error(`Rôle d'autorité inconnu : ${role}`);
  const state = getLawState(settlement);
  state.authorityActors[role] = typeof actorOrUuid === "string" ? actorOrUuid : (actorOrUuid?.uuid ?? "");
  return saveLawState(settlement, state);
}

export async function clearAuthorityActor(settlement, role) {
  return setAuthorityActor(settlement, role, "");
}

function normalizeCrime(data = {}) {
  const now = Date.now();
  return {
    id: String(data.id ?? foundry.utils.randomID()),
    offense: String(data.offense ?? "Infraction sans nom"),
    suspectUuid: String(data.suspectUuid ?? ""),
    suspectName: String(data.suspectName ?? ""),
    severity: Math.max(1, Math.min(5, Number(data.severity ?? 2))),
    status: Object.prototype.hasOwnProperty.call(CRIME_STATUS, data.status) ? data.status : "reported",
    locationId: String(data.locationId ?? ""),
    factionId: String(data.factionId ?? ""),
    bounty: Math.max(0, Number(data.bounty ?? 0)),
    fine: Math.max(0, Number(data.fine ?? 0)),
    sentence: String(data.sentence ?? ""),
    evidence: String(data.evidence ?? ""),
    notes: String(data.notes ?? ""),
    createdAt: Number(data.createdAt ?? now),
    updatedAt: now
  };
}

export async function addCrime(settlement, data = {}) {
  const state = getLawState(settlement);
  const entry = normalizeCrime(data);
  state.crimes.push(entry);
  await saveLawState(settlement, state);
  return entry;
}

export async function updateCrime(settlement, crimeId, changes = {}) {
  const state = getLawState(settlement);
  const index = state.crimes.findIndex(c => c.id === crimeId);
  if (index < 0) return null;
  state.crimes[index] = normalizeCrime({ ...state.crimes[index], ...changes, id: crimeId, createdAt: state.crimes[index].createdAt });
  await saveLawState(settlement, state);
  return state.crimes[index];
}

export async function removeCrime(settlement, crimeId) {
  const state = getLawState(settlement);
  const before = state.crimes.length;
  state.crimes = state.crimes.filter(c => c.id !== crimeId);
  if (state.crimes.length === before) return false;
  await saveLawState(settlement, state);
  return true;
}

export async function recordPatrol(settlement, formationKey, data = {}) {
  const formation = GUARD_FORMATIONS[formationKey];
  if (!formation) throw new Error(`Formation de garde inconnue : ${formationKey}`);
  const state = getLawState(settlement);
  const record = {
    id: foundry.utils.randomID(),
    formationKey,
    formationLabel: formation.label,
    summary: formation.summary,
    cr: formation.cr,
    locationId: String(data.locationId ?? ""),
    reason: String(data.reason ?? ""),
    dispatchedAt: Date.now()
  };
  state.patrolHistory.unshift(record);
  state.patrolHistory = state.patrolHistory.slice(0, 30);
  await saveLawState(settlement, state);
  return record;
}

export async function clearPatrolHistory(settlement) {
  const state = getLawState(settlement);
  state.patrolHistory = [];
  return saveLawState(settlement, state);
}
