import { MODULE_ID, LOCATION_SHEET_CLASS_ID, defaultLocationConfig } from "./data.mjs";

function mergeConfig(overrides = {}) {
  return foundry.utils.mergeObject(defaultLocationConfig(), overrides ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
}

export function getLocations() {
  return game.journal.filter(j => j.getFlag(MODULE_ID, "isLocation"));
}

export function getLocationConfig(journal) {
  return mergeConfig(journal?.getFlag(MODULE_ID, "locationConfig") ?? {});
}

export function getRootSettlementForLocation(location) {
  const config = getLocationConfig(location);
  return config.settlementId ? game.journal.get(config.settlementId) ?? null : null;
}

export function getDistrictForLocation(location) {
  const config = getLocationConfig(location);
  return config.districtId ? game.journal.get(config.districtId) ?? null : null;
}

export function getLocationsForSettlement(settlement, { includeDistricts = true } = {}) {
  const id = typeof settlement === "string" ? settlement : settlement?.id;
  if (!id) return [];
  return getLocations().filter(j => {
    const c = getLocationConfig(j);
    if (c.settlementId !== id) return false;
    return includeDistricts || !c.districtId;
  });
}

export function getLocationsForDistrict(district) {
  const id = typeof district === "string" ? district : district?.id;
  if (!id) return [];
  return getLocations().filter(j => getLocationConfig(j).districtId === id);
}

export async function createLocation(parent, name = "Nouveau lieu", overrides = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn("Seul le MJ peut créer un lieu de ville.");
    return null;
  }

  let settlementId = "";
  let districtId = "";
  if (parent) {
    const parentConfig = parent.getFlag(MODULE_ID, "config") ?? {};
    if (parentConfig.parentSettlementId) {
      settlementId = parentConfig.parentSettlementId;
      districtId = parent.id;
    } else {
      settlementId = parent.id;
    }
  }

  const locationConfig = mergeConfig({ settlementId, districtId, ...overrides });
  return JournalEntry.create({
    name,
    flags: {
      core: { sheetClass: LOCATION_SHEET_CLASS_ID },
      [MODULE_ID]: {
        isLocation: true,
        locationConfig
      }
    }
  });
}

export async function setLocationParent(location, settlementId = "", districtId = "") {
  if (!location) return null;
  const config = getLocationConfig(location);
  config.settlementId = settlementId || "";
  config.districtId = districtId || "";

  if (config.districtId) {
    const district = game.journal.get(config.districtId);
    const districtConfig = district?.getFlag(MODULE_ID, "config") ?? {};
    if (!district || !districtConfig.parentSettlementId || districtConfig.parentSettlementId !== config.settlementId) {
      config.districtId = "";
    }
  }

  await location.update({ [`flags.${MODULE_ID}.locationConfig`]: config });
  return location;
}

export async function convertJournalToLocation(journal, parent = null) {
  if (!journal) return null;
  let settlementId = "";
  let districtId = "";
  if (parent) {
    const pc = parent.getFlag(MODULE_ID, "config") ?? {};
    if (pc.parentSettlementId) {
      settlementId = pc.parentSettlementId;
      districtId = parent.id;
    } else settlementId = parent.id;
  }
  const existing = mergeConfig(journal.getFlag(MODULE_ID, "locationConfig") ?? { settlementId, districtId });
  await journal.update({
    "flags.core.sheetClass": LOCATION_SHEET_CLASS_ID,
    [`flags.${MODULE_ID}.isLocation`]: true,
    [`flags.${MODULE_ID}.locationConfig`]: existing
  });
  return journal;
}
