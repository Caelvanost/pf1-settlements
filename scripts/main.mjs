import { MODULE_ID, SHEET_CLASS_ID, LOCATION_SHEET_CLASS_ID, FACTION_SHEET_CLASS_ID } from "./data.mjs";
import { SettlementSheet } from "./sheet.mjs";
import { LocationSheet } from "./location-sheet.mjs";
import { FactionSheet } from "./faction-sheet.mjs";
import { SettlementManager } from "./manager.mjs";
import { SettlementGenerator } from "./generator.mjs";
import { FactionNetwork } from "./faction-network.mjs";
import {
  TRAIT_LIBRARY_SETTING,
  TRAIT_SOURCE_TYPES,
  TraitLibrary,
  getTraitLibrary,
  getCustomTraitLibrary,
  createLibraryTrait,
  updateLibraryTrait,
  deleteLibraryTrait,
  saveSettlementTraitToLibrary,
  applyTraitToSettlement,
  downloadTraitLibrary,
  importTraitLibraryFile
} from "./trait-library.mjs";
import {
  TEMPLATE_SETTING,
  BUILTIN_TEMPLATES,
  getCommunityTemplates,
  saveSettlementAsTemplate,
  deleteCommunityTemplate,
  createSettlementFromTemplate,
  duplicateSettlement,
  buildSettlementExport,
  downloadSettlementExport,
  importSettlementData,
  importSettlementFile,
  resetGeneratedData,
  transformSettlementToRoot,
  transformRootToDistrict
} from "./transfer.mjs";
import {
  createSettlement,
  createDistrict,
  getSettlements,
  getRootSettlements,
  getDistricts,
  getParentSettlement,
  setParentSettlement,
  convertJournalToSettlement
} from "./settlements.mjs";
import {
  createLocation,
  getLocations,
  getLocationsForSettlement,
  getLocationsForDistrict,
  getRootSettlementForLocation,
  getDistrictForLocation,
  setLocationParent,
  convertJournalToLocation
} from "./locations.mjs";
import { calculateSettlement } from "./calculator.mjs";
import {
  createFaction,
  getFactions,
  getFactionConfig,
  getFactionsForSettlement,
  addFactionInfluence,
  removeFactionInfluenceAt,
  removeFactionInfluencesForArea,
  setFactionRelation,
  removeFactionRelation,
  convertJournalToFaction
} from "./factions.mjs";
import {
  RUMOR_TRUTH,
  URBAN_EVENT_STATUS,
  URBAN_EVENT_SEVERITY,
  URBAN_ENCOUNTER_TABLES,
  URBAN_EVENT_INSPIRATIONS,
  getUrbanState,
  saveUrbanState,
  addRumor,
  updateRumor,
  removeRumor,
  addUrbanEvent,
  updateUrbanEvent,
  removeUrbanEvent,
  rollUrbanEncounter,
  clearEncounterHistory,
  getRandomUrbanEventInspiration
} from "./urban.mjs";
import {
  LAW_ALERT_LEVELS,
  LAW_ALERT_DESCRIPTIONS,
  CRIME_STATUS,
  CRIME_SEVERITY,
  AUTHORITY_ROLES,
  GUARD_FORMATIONS,
  getLawState,
  saveLawState,
  setAlertLevel,
  setAuthorityActor,
  clearAuthorityActor,
  addCrime,
  updateCrime,
  removeCrime,
  recordPatrol,
  clearPatrolHistory
} from "./law.mjs";
import {
  CALENDAR_ENTRY_TYPES,
  CALENDAR_ENTRY_STATUS,
  PROJECT_TYPES,
  PROJECT_STATUS,
  POPULATION_CHANGE_TYPES,
  getCalendarState,
  saveCalendarState,
  configureCalendar,
  setCalendarDate,
  advanceCalendar,
  addCalendarEntry,
  updateCalendarEntry,
  removeCalendarEntry,
  addProject,
  updateProject,
  removeProject,
  applyPopulationChange,
  clearPopulationHistory,
  clearTimeline,
  formatCalendarDate,
  getProjectProgress
} from "./calendar.mjs";

import {
  PUBLIC_OPINION_LEVELS,
  UNREST_LEVELS,
  UNREST_DESCRIPTIONS,
  FACTION_TENSION_LEVELS,
  TENSION_TRENDS,
  COMMUNITY_SKILL_CHECKS,
  opinionForScore,
  getPoliticsState,
  savePoliticsState,
  setPublicOpinion,
  setUnrestLevel,
  addLocalReputation,
  updateLocalReputation,
  removeLocalReputation,
  addFactionTension,
  updateFactionTension,
  removeFactionTension,
  applyPoliticalConsequence,
  removePoliticalConsequence,
  clearPoliticalHistory
} from "./politics.mjs";


import {
  LEGISLATION_TYPES,
  LEGISLATION_STATUS,
  LEVY_TYPES,
  LEVY_MODES,
  LEVY_FREQUENCIES,
  getLegislationState,
  saveLegislationState,
  addLegislation,
  updateLegislation,
  setLegislationStatus,
  removeLegislation,
  addLevy,
  updateLevy,
  removeLevy,
  calculateLevy,
  getActiveLegislation,
  getActiveLevies,
  clearLegislationHistory
} from "./legislation.mjs";

import {
  getMarketState,
  saveMarketState,
  generateMarketSlots,
  advanceMarketWeek,
  addMarketItem,
  updateMarketItem,
  removeMarketItem,
  getItemPrice
} from "./markets.mjs";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initialisation`);

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntry,
    MODULE_ID,
    SettlementSheet,
    {
      label: "PF1 — Fiche de ville",
      makeDefault: false
    }
  );

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntry,
    MODULE_ID,
    LocationSheet,
    {
      label: "PF1 — Fiche de lieu",
      makeDefault: false
    }
  );


  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntry,
    MODULE_ID,
    FactionSheet,
    {
      label: "PF1 — Fiche de faction",
      makeDefault: false
    }
  );

  game.settings.register(MODULE_ID, TEMPLATE_SETTING, {
    name: "Modèles de communautés personnalisés",
    scope: "world",
    config: false,
    type: String,
    default: "[]"
  });

  game.settings.register(MODULE_ID, TRAIT_LIBRARY_SETTING, {
    name: "Bibliothèque de traits de communautés",
    scope: "world",
    config: false,
    type: String,
    default: "[]"
  });

  game.settings.registerMenu(MODULE_ID, "manager", {
    name: "Gestionnaire de villes PF1",
    label: "Ouvrir le gestionnaire",
    hint: "Créer et ouvrir les fiches de villes, quartiers, lieux et factions.",
    icon: "fas fa-city",
    type: SettlementManager,
    restricted: true
  });
});

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api = {
      createSettlement,
      createDistrict,
      getSettlements,
      getRootSettlements,
      getDistricts,
      getParentSettlement,
      setParentSettlement,
      convertJournalToSettlement,
      createLocation,
      getLocations,
      getLocationsForSettlement,
      getLocationsForDistrict,
      getRootSettlementForLocation,
      getDistrictForLocation,
      setLocationParent,
      convertJournalToLocation,
      calculateSettlement,
      SettlementManager,
      SettlementGenerator,
      FactionNetwork,
      TraitLibrary,
      TRAIT_LIBRARY_SETTING,
      TRAIT_SOURCE_TYPES,
      getTraitLibrary,
      getCustomTraitLibrary,
      createLibraryTrait,
      updateLibraryTrait,
      deleteLibraryTrait,
      saveSettlementTraitToLibrary,
      applyTraitToSettlement,
      downloadTraitLibrary,
      importTraitLibraryFile,
      TEMPLATE_SETTING,
      BUILTIN_TEMPLATES,
      getCommunityTemplates,
      saveSettlementAsTemplate,
      deleteCommunityTemplate,
      createSettlementFromTemplate,
      duplicateSettlement,
      buildSettlementExport,
      downloadSettlementExport,
      importSettlementData,
      importSettlementFile,
      resetGeneratedData,
      transformSettlementToRoot,
      transformRootToDistrict,
      SettlementSheet,
      LocationSheet,
      createFaction,
      getFactions,
      getFactionConfig,
      getFactionsForSettlement,
      addFactionInfluence,
      removeFactionInfluenceAt,
      removeFactionInfluencesForArea,
      setFactionRelation,
      removeFactionRelation,
      convertJournalToFaction,
      FactionSheet,
      getMarketState,
      saveMarketState,
      generateMarketSlots,
      advanceMarketWeek,
      addMarketItem,
      updateMarketItem,
      removeMarketItem,
      getItemPrice,
      RUMOR_TRUTH,
      URBAN_EVENT_STATUS,
      URBAN_EVENT_SEVERITY,
      URBAN_ENCOUNTER_TABLES,
      URBAN_EVENT_INSPIRATIONS,
      getUrbanState,
      saveUrbanState,
      addRumor,
      updateRumor,
      removeRumor,
      addUrbanEvent,
      updateUrbanEvent,
      removeUrbanEvent,
      rollUrbanEncounter,
      clearEncounterHistory,
      getRandomUrbanEventInspiration,
      LAW_ALERT_LEVELS,
      LAW_ALERT_DESCRIPTIONS,
      CRIME_STATUS,
      CRIME_SEVERITY,
      AUTHORITY_ROLES,
      GUARD_FORMATIONS,
      getLawState,
      saveLawState,
      setAlertLevel,
      setAuthorityActor,
      clearAuthorityActor,
      addCrime,
      updateCrime,
      removeCrime,
      recordPatrol,
      clearPatrolHistory,
      CALENDAR_ENTRY_TYPES,
      CALENDAR_ENTRY_STATUS,
      PROJECT_TYPES,
      PROJECT_STATUS,
      POPULATION_CHANGE_TYPES,
      getCalendarState,
      saveCalendarState,
      configureCalendar,
      setCalendarDate,
      advanceCalendar,
      addCalendarEntry,
      updateCalendarEntry,
      removeCalendarEntry,
      addProject,
      updateProject,
      removeProject,
      applyPopulationChange,
      clearPopulationHistory,
      clearTimeline,
      formatCalendarDate,
      getProjectProgress,
      PUBLIC_OPINION_LEVELS,
      UNREST_LEVELS,
      UNREST_DESCRIPTIONS,
      FACTION_TENSION_LEVELS,
      TENSION_TRENDS,
      COMMUNITY_SKILL_CHECKS,
      opinionForScore,
      getPoliticsState,
      savePoliticsState,
      setPublicOpinion,
      setUnrestLevel,
      addLocalReputation,
      updateLocalReputation,
      removeLocalReputation,
      addFactionTension,
      updateFactionTension,
      removeFactionTension,
      applyPoliticalConsequence,
      removePoliticalConsequence,
      clearPoliticalHistory,
      LEGISLATION_TYPES,
      LEGISLATION_STATUS,
      LEVY_TYPES,
      LEVY_MODES,
      LEVY_FREQUENCIES,
      getLegislationState,
      saveLegislationState,
      addLegislation,
      updateLegislation,
      setLegislationStatus,
      removeLegislation,
      addLevy,
      updateLevy,
      removeLevy,
      calculateLevy,
      getActiveLegislation,
      getActiveLevies,
      clearLegislationHistory
    };
  }
});

Hooks.on("renderJournalDirectory", (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".pf1-settlement-create")) return;

  const headerActions = root.querySelector(".directory-header .header-actions")
    ?? root.querySelector(".directory-header")
    ?? root;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pf1-settlement-create";
  button.innerHTML = '<i class="fas fa-city"></i> Ville PF1';
  button.title = "Créer une fiche de ville Pathfinder 1";
  button.addEventListener("click", async () => {
    const doc = await createSettlement();
    doc?.sheet.render(true);
  });
  headerActions.appendChild(button);

  if (!root.querySelector(".pf1-faction-create")) {
    const factionButton = document.createElement("button");
    factionButton.type = "button";
    factionButton.className = "pf1-faction-create";
    factionButton.innerHTML = '<i class="fas fa-people-group"></i> Faction PF1';
    factionButton.title = "Créer une faction ou organisation Pathfinder 1";
    factionButton.addEventListener("click", async () => {
      const doc = await createFaction();
      doc?.sheet.render(true);
    });
    headerActions.appendChild(factionButton);
  }
});

Hooks.on("createJournalEntry", async journal => {
  if (journal.getFlag(MODULE_ID, "isSettlement")) {
    if (journal.getFlag("core", "sheetClass") !== SHEET_CLASS_ID) {
      await journal.setFlag("core", "sheetClass", SHEET_CLASS_ID);
    }
    return;
  }
  if (journal.getFlag(MODULE_ID, "isLocation")) {
    if (journal.getFlag("core", "sheetClass") !== LOCATION_SHEET_CLASS_ID) {
      await journal.setFlag("core", "sheetClass", LOCATION_SHEET_CLASS_ID);
    }
    return;
  }
  if (journal.getFlag(MODULE_ID, "isFaction")) {
    if (journal.getFlag("core", "sheetClass") !== FACTION_SHEET_CLASS_ID) {
      await journal.setFlag("core", "sheetClass", FACTION_SHEET_CLASS_ID);
    }
  }
});
