import { MODULE_ID, SHEET_CLASS_ID, defaultSettlementConfig } from "./data.mjs";
import { calculateSettlement } from "./calculator.mjs";

function mergeConfig(overrides = {}) {
  return foundry.utils.mergeObject(defaultSettlementConfig(), overrides ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
}

export function getSettlements() {
  return game.journal.filter(j => j.getFlag(MODULE_ID, "isSettlement"));
}

export function getRootSettlements() {
  return getSettlements().filter(j => !j.getFlag(MODULE_ID, "config")?.parentSettlementId);
}

export function getDistricts(parent) {
  const parentId = typeof parent === "string" ? parent : parent?.id;
  if (!parentId) return [];
  return getSettlements().filter(j => j.getFlag(MODULE_ID, "config")?.parentSettlementId === parentId);
}

export function getParentSettlement(journal) {
  const parentId = journal?.getFlag(MODULE_ID, "config")?.parentSettlementId;
  return parentId ? game.journal.get(parentId) ?? null : null;
}

export async function createSettlement(name = "Nouvelle ville", overrides = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn("Seul le MJ peut créer une fiche de ville.");
    return null;
  }
  const config = mergeConfig(overrides);
  const derived = calculateSettlement(config);
  const doc = await JournalEntry.create({
    name,
    flags: {
      core: { sheetClass: SHEET_CLASS_ID },
      [MODULE_ID]: {
        isSettlement: true,
        config,
        derived
      }
    }
  });
  return doc;
}

export async function createDistrict(parent, name = "Nouveau quartier") {
  if (!parent) return null;
  if (!game.user.isGM) {
    ui.notifications.warn("Seul le MJ peut créer un quartier.");
    return null;
  }
  return createSettlement(name, {
    parentSettlementId: parent.id,
    campaignRole: `Quartier de ${parent.name}`
  });
}

export async function setParentSettlement(journal, parentId = "") {
  if (!journal) return null;
  if (parentId === journal.id) {
    ui.notifications.warn("Une ville ne peut pas être son propre quartier.");
    return journal;
  }
  const saved = mergeConfig(journal.getFlag(MODULE_ID, "config") ?? {});
  saved.parentSettlementId = parentId || "";
  await journal.update({
    [`flags.${MODULE_ID}.config`]: saved,
    [`flags.${MODULE_ID}.derived`]: calculateSettlement(saved)
  });
  return journal;
}

export async function convertJournalToSettlement(journal) {
  if (!journal) return null;
  const existing = mergeConfig(journal.getFlag(MODULE_ID, "config") ?? {});
  await journal.update({
    "flags.core.sheetClass": SHEET_CLASS_ID,
    [`flags.${MODULE_ID}.isSettlement`]: true,
    [`flags.${MODULE_ID}.config`]: existing,
    [`flags.${MODULE_ID}.derived`]: calculateSettlement(existing)
  });
  return journal;
}
