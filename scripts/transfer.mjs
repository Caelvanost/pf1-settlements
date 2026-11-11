import {
  MODULE_ID,
  SETTLEMENT_TYPES,
  ALIGNMENTS,
  GOVERNMENTS,
  ADVANTAGES,
  DRAWBACKS
} from "./data.mjs";
import {
  createSettlement,
  createDistrict,
  getSettlements,
  getRootSettlements,
  getDistricts,
  setParentSettlement
} from "./settlements.mjs";
import { createLocation, getLocations, getLocationConfig, setLocationParent } from "./locations.mjs";
import { createFaction, getFactions, getFactionConfig } from "./factions.mjs";
import { calculateSettlement } from "./calculator.mjs";

export const TEMPLATE_SETTING = "communityTemplates";
export const GENERATED_MARKER = "[Généré PF1 Settlements]";
const OLD_GENERATED_NOTE = "Proposition générée automatiquement par le module";

export const BUILTIN_TEMPLATES = {
  fishingVillage: {
    id: "fishingVillage",
    label: "Village de pêcheurs",
    description: "Petite communauté littorale vivant de la pêche et du cabotage.",
    config: {
      type: "village", alignment: "N", government: "council", population: "120",
      advantages: { insular: true, rumorMongering: true }, drawbacks: {},
      campaignRole: "Village côtier", notes: "Modèle générique fourni par PF1 Settlements v2.1."
    }
  },
  commercialPort: {
    id: "commercialPort",
    label: "Port commercial",
    description: "Bourgade prospère organisée autour des quais, entrepôts et marchands.",
    config: {
      type: "largeTown", alignment: "N", government: "council", population: "3500",
      advantages: { prosperous: true, strategicLocation: true, rumorMongering: true }, drawbacks: {},
      campaignRole: "Port marchand", notes: "Modèle générique fourni par PF1 Settlements v2.1."
    }
  },
  piratePort: {
    id: "piratePort",
    label: "Port pirate",
    description: "Port turbulent, réputé et dangereux, dominé par les intérêts criminels.",
    config: {
      type: "largeTown", alignment: "CN", government: "secretSyndicate", population: "4200",
      advantages: { notorious: true, rumorMongering: true, strategicLocation: true }, drawbacks: {},
      campaignRole: "Port pirate", notes: "Modèle générique fourni par PF1 Settlements v2.1."
    }
  },
  fortifiedTown: {
    id: "fortifiedTown",
    label: "Petite ville fortifiée",
    description: "Communauté défensive structurée autour d'une garnison et de ses remparts.",
    config: {
      type: "smallCity", alignment: "LN", government: "overlord", population: "7200",
      advantages: { strategicLocation: true, insular: true, prosperous: true, pious: true }, drawbacks: {},
      campaignRole: "Ville fortifiée", notes: "Modèle générique fourni par PF1 Settlements v2.1."
    }
  },
  metropolis: {
    id: "metropolis",
    label: "Métropole",
    description: "Très grande cité cosmopolite, riche, complexe et politiquement influente.",
    config: {
      type: "metropolis", alignment: "N", government: "council", population: "42000",
      advantages: { prosperous: true, academic: true, magicallyAttuned: true, strategicLocation: true, touristAttraction: true, rumorMongering: true }, drawbacks: {},
      campaignRole: "Métropole régionale", notes: "Modèle générique fourni par PF1 Settlements v2.1."
    }
  }
};

function clone(value) {
  return value == null ? value : foundry.utils.deepClone(value);
}

function allFlagKeysForCopy(options = {}) {
  const keys = [];
  if (options.market) keys.push("marketState");
  if (options.rumors) keys.push("urbanState");
  if (options.law) keys.push("lawState");
  if (options.calendar) keys.push("calendarState");
  if (options.politics) keys.push("politicsState");
  if (options.legislation) keys.push("legislationState");
  return keys;
}

function remapDeep(value, idMap = new Map()) {
  if (Array.isArray(value)) return value.map(v => remapDeep(v, idMap));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string" && /(Id|ID|id)$/.test(key) && idMap.has(raw)) out[key] = idMap.get(raw);
    else out[key] = remapDeep(raw, idMap);
  }
  return out;
}

async function copySelectedStates(source, target, options, idMap = new Map()) {
  const update = {};
  for (const key of allFlagKeysForCopy(options)) {
    const raw = source.getFlag(MODULE_ID, key);
    if (raw != null) update[`flags.${MODULE_ID}.${key}`] = remapDeep(clone(raw), idMap);
  }
  if (Object.keys(update).length) await target.update(update);
}

function rootsForSource(source) {
  const config = source?.getFlag(MODULE_ID, "config") ?? {};
  return config.parentSettlementId ? game.journal.get(config.parentSettlementId) : source;
}

export async function duplicateSettlement(source, options = {}) {
  if (!source || !game.user.isGM) return null;
  const opts = {
    districts: true, locations: true, factions: true,
    market: true, rumors: true, law: true, calendar: true, politics: true, legislation: true,
    ...options
  };
  const sourceConfig = clone(source.getFlag(MODULE_ID, "config") ?? {});
  const sourceIsDistrict = Boolean(sourceConfig.parentSettlementId);
  const sourceParentId = sourceConfig.parentSettlementId || "";
  sourceConfig.parentSettlementId = sourceIsDistrict ? sourceParentId : "";
  const target = await createSettlement(`${source.name} — copie`, sourceConfig);
  if (!target) return null;

  const idMap = new Map([[source.id, target.id]]);
  const districtMap = new Map();
  const root = rootsForSource(source);

  if (opts.districts && !sourceIsDistrict) {
    for (const district of getDistricts(source)) {
      const cfg = clone(district.getFlag(MODULE_ID, "config") ?? {});
      cfg.parentSettlementId = target.id;
      const next = await createSettlement(district.name, cfg);
      districtMap.set(district.id, next.id);
      idMap.set(district.id, next.id);
    }
  }

  const locationMap = new Map();
  if (opts.locations) {
    const sourceLocationRows = getLocations().filter(loc => {
      const c = getLocationConfig(loc);
      if (sourceIsDistrict) return c.districtId === source.id;
      return c.settlementId === source.id;
    });
    for (const loc of sourceLocationRows) {
      const cfg = clone(getLocationConfig(loc));
      cfg.settlementId = sourceIsDistrict ? sourceParentId : target.id;
      cfg.districtId = sourceIsDistrict ? target.id : (cfg.districtId ? (districtMap.get(cfg.districtId) ?? "") : "");
      const parent = cfg.districtId ? game.journal.get(cfg.districtId) : target;
      const next = await createLocation(parent, loc.name, cfg);
      locationMap.set(loc.id, next.id);
      idMap.set(loc.id, next.id);
    }
  }

  const factionMap = new Map();
  if (opts.factions) {
    const linked = getFactions().filter(faction => {
      const c = getFactionConfig(faction);
      if (sourceIsDistrict) return c.influences.some(i => i.districtId === source.id);
      return c.influences.some(i => i.settlementId === source.id);
    });
    for (const faction of linked) {
      const cfg = clone(getFactionConfig(faction));
      cfg.influences = cfg.influences
        .filter(i => sourceIsDistrict ? i.districtId === source.id : i.settlementId === source.id)
        .map(i => ({
          ...i,
          settlementId: sourceIsDistrict ? sourceParentId : target.id,
          districtId: sourceIsDistrict ? target.id : (i.districtId ? (districtMap.get(i.districtId) ?? "") : "")
        }));
      cfg.headquartersLocationId = locationMap.get(cfg.headquartersLocationId) ?? "";
      cfg.relations = [];
      const next = await createFaction(null, faction.name, cfg);
      factionMap.set(faction.id, next.id);
      idMap.set(faction.id, next.id);
    }
    // Second pass: restore internal relations between duplicated factions.
    for (const faction of linked) {
      const next = game.journal.get(factionMap.get(faction.id));
      if (!next) continue;
      const cfg = clone(getFactionConfig(next));
      const sourceCfg = getFactionConfig(faction);
      cfg.relations = sourceCfg.relations
        .filter(r => factionMap.has(r.factionId))
        .map(r => ({ ...r, factionId: factionMap.get(r.factionId) }));
      await next.update({ [`flags.${MODULE_ID}.factionConfig`]: cfg });
    }
  }

  for (const [oldDistrictId, newDistrictId] of districtMap.entries()) {
    const oldDistrict = game.journal.get(oldDistrictId);
    const newDistrict = game.journal.get(newDistrictId);
    if (oldDistrict && newDistrict) await copySelectedStates(oldDistrict, newDistrict, opts, idMap);
  }
  await copySelectedStates(source, target, opts, idMap);
  ui.notifications.info(`${source.name} a été dupliquée.`);
  return target;
}

function exportFlags(journal) {
  const flags = clone(journal.flags?.[MODULE_ID] ?? {});
  delete flags.isSettlement;
  delete flags.isLocation;
  delete flags.isFaction;
  delete flags.derived;
  return flags;
}

export function buildSettlementExport(source) {
  const root = rootsForSource(source);
  const sourceIsDistrict = Boolean(source.getFlag(MODULE_ID, "config")?.parentSettlementId);
  const districts = sourceIsDistrict ? [] : getDistricts(root);
  const districtIds = new Set(districts.map(d => d.id));
  const locations = getLocations().filter(l => {
    const c = getLocationConfig(l);
    return sourceIsDistrict ? c.districtId === source.id : c.settlementId === root.id;
  });
  const locationIds = new Set(locations.map(l => l.id));
  const factions = getFactions().filter(f => {
    const c = getFactionConfig(f);
    return c.influences.some(i => sourceIsDistrict ? i.districtId === source.id : i.settlementId === root.id || districtIds.has(i.districtId));
  });
  return {
    format: "pf1-settlements-community",
    version: 1,
    exportedAt: new Date().toISOString(),
    root: { oldId: source.id, name: source.name, flags: exportFlags(source) },
    districts: districts.map(d => ({ oldId: d.id, name: d.name, flags: exportFlags(d) })),
    locations: locations.map(l => ({ oldId: l.id, name: l.name, flags: exportFlags(l) })),
    factions: factions.map(f => ({ oldId: f.id, name: f.name, flags: exportFlags(f) }))
  };
}

export function downloadSettlementExport(source) {
  const data = buildSettlementExport(source);
  const safe = source.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "communaute";
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.pf1-settlement.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importSettlementData(payload) {
  if (!game.user.isGM) return null;
  if (!payload || payload.format !== "pf1-settlements-community" || !payload.root) {
    throw new Error("Fichier PF1 Settlements non reconnu.");
  }
  const idMap = new Map();
  const rootCfg = clone(payload.root.flags?.config ?? {});
  rootCfg.parentSettlementId = "";
  const root = await createSettlement(payload.root.name || "Communauté importée", rootCfg);
  idMap.set(payload.root.oldId, root.id);

  for (const row of payload.districts ?? []) {
    const cfg = clone(row.flags?.config ?? {});
    cfg.parentSettlementId = root.id;
    const doc = await createSettlement(row.name || "Quartier importé", cfg);
    idMap.set(row.oldId, doc.id);
  }
  for (const row of payload.locations ?? []) {
    const cfg = remapDeep(clone(row.flags?.locationConfig ?? {}), idMap);
    const parent = cfg.districtId ? game.journal.get(cfg.districtId) : root;
    const doc = await createLocation(parent, row.name || "Lieu importé", cfg);
    idMap.set(row.oldId, doc.id);
  }
  const factionRows = [];
  for (const row of payload.factions ?? []) {
    const cfg = remapDeep(clone(row.flags?.factionConfig ?? {}), idMap);
    cfg.relations = [];
    const doc = await createFaction(null, row.name || "Faction importée", cfg);
    idMap.set(row.oldId, doc.id);
    factionRows.push([row, doc]);
  }
  for (const [row, doc] of factionRows) {
    const cfg = remapDeep(clone(row.flags?.factionConfig ?? {}), idMap);
    cfg.relations = (cfg.relations ?? []).filter(r => [...idMap.values()].includes(r.factionId));
    await doc.update({ [`flags.${MODULE_ID}.factionConfig`]: cfg });
  }

  const settlementRows = [[payload.root, root], ...(payload.districts ?? []).map(row => [row, game.journal.get(idMap.get(row.oldId))])];
  for (const [row, doc] of settlementRows) {
    if (!doc) continue;
    const updates = {};
    for (const [key, value] of Object.entries(row.flags ?? {})) {
      if (key === "config") continue;
      updates[`flags.${MODULE_ID}.${key}`] = remapDeep(clone(value), idMap);
    }
    if (Object.keys(updates).length) await doc.update(updates);
  }
  ui.notifications.info(`${root.name} a été importée.`);
  return root;
}

export async function importSettlementFile(file) {
  const text = await file.text();
  return importSettlementData(JSON.parse(text));
}

function readCustomTemplates() {
  try { return JSON.parse(game.settings.get(MODULE_ID, TEMPLATE_SETTING) || "[]"); }
  catch { return []; }
}
async function writeCustomTemplates(rows) {
  await game.settings.set(MODULE_ID, TEMPLATE_SETTING, JSON.stringify(rows));
}

export function getCommunityTemplates() {
  const builtins = Object.values(BUILTIN_TEMPLATES).map(t => ({ ...clone(t), builtin: true }));
  const custom = readCustomTemplates().map(t => ({ ...t, builtin: false }));
  return [...builtins, ...custom];
}

export async function saveSettlementAsTemplate(source, name = "") {
  if (!source) return null;
  const rows = readCustomTemplates();
  const id = foundry.utils.randomID();
  const config = clone(source.getFlag(MODULE_ID, "config") ?? {});
  config.parentSettlementId = "";
  rows.push({
    id,
    label: name.trim() || `Modèle — ${source.name}`,
    description: `Modèle personnel créé à partir de ${source.name}.`,
    config,
    builtin: false
  });
  await writeCustomTemplates(rows);
  return id;
}

export async function deleteCommunityTemplate(id) {
  const rows = readCustomTemplates().filter(t => t.id !== id);
  await writeCustomTemplates(rows);
}

export async function createSettlementFromTemplate(templateId, name = "") {
  const template = getCommunityTemplates().find(t => t.id === templateId);
  if (!template) throw new Error("Modèle introuvable.");
  const config = clone(template.config ?? {});
  config.parentSettlementId = "";
  return createSettlement(name.trim() || template.label, config);
}

function generatedJournal(doc) {
  if (!doc) return false;
  if (doc.getFlag(MODULE_ID, "generatedByAssistant")) return true;
  const raw = JSON.stringify(doc.flags?.[MODULE_ID] ?? {});
  return raw.includes(OLD_GENERATED_NOTE) || raw.includes(GENERATED_MARKER);
}

export async function resetGeneratedData(settlement) {
  if (!settlement || !game.user.isGM) return;
  const sc = settlement.getFlag(MODULE_ID, "config") ?? {};
  const rootId = sc.parentSettlementId || settlement.id;
  const districtId = sc.parentSettlementId ? settlement.id : "";

  const generatedLocations = getLocations().filter(loc => {
    const c = getLocationConfig(loc);
    const linked = districtId ? c.districtId === districtId : c.settlementId === rootId;
    return linked && generatedJournal(loc);
  });
  const generatedFactions = getFactions().filter(f => {
    const c = getFactionConfig(f);
    const linked = c.influences.some(i => districtId ? i.districtId === districtId : i.settlementId === rootId);
    return linked && generatedJournal(f);
  });
  if (generatedLocations.length) await JournalEntry.deleteDocuments(generatedLocations.map(d => d.id));
  if (generatedFactions.length) await JournalEntry.deleteDocuments(generatedFactions.map(d => d.id));

  const urban = clone(settlement.getFlag(MODULE_ID, "urbanState") ?? {});
  if (Array.isArray(urban.rumors)) urban.rumors = urban.rumors.filter(r => !String(r.notes ?? "").includes(OLD_GENERATED_NOTE) && !String(r.notes ?? "").includes(GENERATED_MARKER));
  if (Array.isArray(urban.events)) urban.events = urban.events.filter(r => !String(r.notes ?? "").includes(OLD_GENERATED_NOTE) && !String(r.notes ?? "").includes(GENERATED_MARKER));

  const legislation = clone(settlement.getFlag(MODULE_ID, "legislationState") ?? {});
  if (Array.isArray(legislation.laws)) legislation.laws = legislation.laws.filter(r => !String(r.notes ?? "").includes(OLD_GENERATED_NOTE) && !String(r.notes ?? "").includes(GENERATED_MARKER));
  if (Array.isArray(legislation.levies)) legislation.levies = legislation.levies.filter(r => !String(r.notes ?? "").includes(OLD_GENERATED_NOTE) && !String(r.notes ?? "").includes(GENERATED_MARKER));

  const updates = {};
  if (Object.keys(urban).length) updates[`flags.${MODULE_ID}.urbanState`] = urban;
  if (Object.keys(legislation).length) updates[`flags.${MODULE_ID}.legislationState`] = legislation;
  if (Object.keys(updates).length) await settlement.update(updates);
  ui.notifications.info(`Les données générées automatiquement de ${settlement.name} ont été réinitialisées.`);
}

export async function transformSettlementToRoot(settlement) {
  if (!settlement) return null;
  const oldParentId = settlement.getFlag(MODULE_ID, "config")?.parentSettlementId;
  if (!oldParentId) return settlement;
  await setParentSettlement(settlement, "");
  for (const loc of getLocations().filter(l => getLocationConfig(l).districtId === settlement.id)) {
    await setLocationParent(loc, settlement.id, "");
  }
  for (const faction of getFactions()) {
    const cfg = getFactionConfig(faction);
    let changed = false;
    cfg.influences = cfg.influences.map(i => {
      if (i.districtId !== settlement.id) return i;
      changed = true;
      return { ...i, settlementId: settlement.id, districtId: "" };
    });
    if (changed) await faction.update({ [`flags.${MODULE_ID}.factionConfig`]: cfg });
  }
  return settlement;
}

export async function transformRootToDistrict(settlement, parent) {
  if (!settlement || !parent || settlement.id === parent.id) return null;
  if (getDistricts(settlement).length) throw new Error("Cette ville possède encore des quartiers. Déplace ou convertis-les avant de transformer la ville en quartier.");
  await setParentSettlement(settlement, parent.id);
  for (const loc of getLocations().filter(l => {
    const c = getLocationConfig(l); return c.settlementId === settlement.id && !c.districtId;
  })) await setLocationParent(loc, parent.id, settlement.id);
  for (const faction of getFactions()) {
    const cfg = getFactionConfig(faction);
    let changed = false;
    cfg.influences = cfg.influences.map(i => {
      if (i.settlementId !== settlement.id || i.districtId) return i;
      changed = true;
      return { ...i, settlementId: parent.id, districtId: settlement.id };
    });
    if (changed) await faction.update({ [`flags.${MODULE_ID}.factionConfig`]: cfg });
  }
  return settlement;
}

export function validateTemplateConfig(config = {}) {
  return Boolean(SETTLEMENT_TYPES[config.type] && ALIGNMENTS[config.alignment] && GOVERNMENTS[config.government]);
}
