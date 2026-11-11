import {
  MODULE_ID,
  FACTION_SHEET_CLASS_ID,
  defaultFactionConfig
} from "./data.mjs";

function mergeConfig(overrides = {}) {
  const config = foundry.utils.mergeObject(defaultFactionConfig(), overrides ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  config.influences = Array.isArray(config.influences) ? config.influences : [];
  config.relations = Array.isArray(config.relations) ? config.relations : [];
  return config;
}

function normalizeInfluence(row = {}) {
  return {
    settlementId: String(row.settlementId ?? ""),
    districtId: String(row.districtId ?? ""),
    level: String(row.level ?? "moderate"),
    notes: String(row.notes ?? "")
  };
}

function normalizeRelation(row = {}) {
  return {
    factionId: String(row.factionId ?? ""),
    status: String(row.status ?? "neutral"),
    notes: String(row.notes ?? "")
  };
}

export function getFactions() {
  return game.journal.filter(j => j.getFlag(MODULE_ID, "isFaction"));
}

export function getFactionConfig(journal) {
  const config = mergeConfig(journal?.getFlag(MODULE_ID, "factionConfig") ?? {});
  config.influences = config.influences.map(normalizeInfluence);
  config.relations = config.relations.map(normalizeRelation);
  return config;
}

export async function createFaction(parent = null, name = "Nouvelle faction", overrides = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn("Seul le MJ peut créer une faction.");
    return null;
  }

  const config = mergeConfig(overrides);
  if (parent) {
    const pc = parent.getFlag(MODULE_ID, "config") ?? {};
    const settlementId = pc.parentSettlementId || parent.id;
    const districtId = pc.parentSettlementId ? parent.id : "";
    if (!config.influences.length) {
      config.influences.push({ settlementId, districtId, level: "moderate", notes: "" });
    }
  }

  return JournalEntry.create({
    name,
    flags: {
      core: { sheetClass: FACTION_SHEET_CLASS_ID },
      [MODULE_ID]: {
        isFaction: true,
        factionConfig: config
      }
    }
  });
}

export function getFactionsForSettlement(settlement, { includeDistricts = true } = {}) {
  const id = typeof settlement === "string" ? settlement : settlement?.id;
  if (!id) return [];
  const doc = typeof settlement === "string" ? game.journal.get(id) : settlement;
  const sc = doc?.getFlag(MODULE_ID, "config") ?? {};
  const isDistrict = Boolean(sc.parentSettlementId);
  const rootId = isDistrict ? sc.parentSettlementId : id;

  return getFactions().filter(f => {
    const c = getFactionConfig(f);
    return c.influences.some(i => {
      if (i.settlementId !== rootId) return false;
      if (isDistrict) return i.districtId === id;
      return includeDistricts ? true : !i.districtId;
    });
  });
}

export async function addFactionInfluence(faction, settlementId, districtId = "", level = "moderate", notes = "") {
  if (!faction) return null;
  const config = getFactionConfig(faction);
  const next = normalizeInfluence({ settlementId, districtId, level, notes });
  const index = config.influences.findIndex(i => i.settlementId === next.settlementId && i.districtId === next.districtId);
  if (index >= 0) config.influences[index] = next;
  else config.influences.push(next);
  await faction.update({ [`flags.${MODULE_ID}.factionConfig`]: config });
  return faction;
}

export async function removeFactionInfluenceAt(faction, index) {
  if (!faction) return null;
  const config = getFactionConfig(faction);
  if (index < 0 || index >= config.influences.length) return faction;
  config.influences.splice(index, 1);
  await faction.update({ [`flags.${MODULE_ID}.factionConfig`]: config });
  return faction;
}

export async function removeFactionInfluencesForArea(faction, settlement) {
  if (!faction || !settlement) return null;
  const sc = settlement.getFlag(MODULE_ID, "config") ?? {};
  const isDistrict = Boolean(sc.parentSettlementId);
  const rootId = isDistrict ? sc.parentSettlementId : settlement.id;
  const config = getFactionConfig(faction);
  config.influences = config.influences.filter(i => {
    if (i.settlementId !== rootId) return true;
    if (isDistrict) return i.districtId !== settlement.id;
    return false;
  });
  await faction.update({ [`flags.${MODULE_ID}.factionConfig`]: config });
  return faction;
}

async function writeRelation(faction, targetId, status, notes) {
  const config = getFactionConfig(faction);
  const next = normalizeRelation({ factionId: targetId, status, notes });
  const index = config.relations.findIndex(r => r.factionId === targetId);
  if (index >= 0) config.relations[index] = next;
  else config.relations.push(next);
  await faction.update({ [`flags.${MODULE_ID}.factionConfig`]: config });
}

export async function setFactionRelation(source, target, status = "neutral", notes = "") {
  if (!source || !target || source.id === target.id) return null;
  await writeRelation(source, target.id, status, notes);
  await writeRelation(target, source.id, status, notes);
  return source;
}

export async function removeFactionRelation(source, targetId) {
  if (!source || !targetId) return null;
  const sourceConfig = getFactionConfig(source);
  sourceConfig.relations = sourceConfig.relations.filter(r => r.factionId !== targetId);
  await source.update({ [`flags.${MODULE_ID}.factionConfig`]: sourceConfig });

  const target = game.journal.get(targetId);
  if (target?.getFlag(MODULE_ID, "isFaction")) {
    const targetConfig = getFactionConfig(target);
    targetConfig.relations = targetConfig.relations.filter(r => r.factionId !== source.id);
    await target.update({ [`flags.${MODULE_ID}.factionConfig`]: targetConfig });
  }
  return source;
}

export async function convertJournalToFaction(journal) {
  if (!journal) return null;
  const existing = mergeConfig(journal.getFlag(MODULE_ID, "factionConfig") ?? {});
  await journal.update({
    "flags.core.sheetClass": FACTION_SHEET_CLASS_ID,
    [`flags.${MODULE_ID}.isFaction`]: true,
    [`flags.${MODULE_ID}.factionConfig`]: existing
  });
  return journal;
}
