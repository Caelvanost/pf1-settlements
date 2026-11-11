import {
  MODULE_ID,
  SETTLEMENT_TYPES,
  ALIGNMENTS,
  GOVERNMENTS,
  ADVANTAGES,
  DRAWBACKS,
  MODIFIER_LABELS,
  LOCATION_TYPES,
  FACTION_TYPES,
  INFLUENCE_LEVELS,
  defaultSettlementConfig
} from "./data.mjs";
import { calculateSettlement } from "./calculator.mjs";
import { createDistrict, getDistricts, getSettlements } from "./settlements.mjs";
import { createLocation, getLocationsForSettlement, getLocationsForDistrict, getLocationConfig } from "./locations.mjs";
import { createFaction, getFactions, getFactionConfig, getFactionsForSettlement, addFactionInfluence, removeFactionInfluencesForArea } from "./factions.mjs";
import { FactionNetwork } from "./faction-network.mjs";
import {
  RUMOR_TRUTH,
  URBAN_EVENT_STATUS,
  URBAN_EVENT_SEVERITY,
  URBAN_ENCOUNTER_TABLES,
  getUrbanState,
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
  compareDates,
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
  addLegislation,
  updateLegislation,
  removeLegislation,
  addLevy,
  updateLevy,
  removeLevy,
  calculateLevy,
  clearLegislationHistory
} from "./legislation.mjs";

import {
  MARKET_TIERS,
  getMarketState,
  generateMarketSlots,
  advanceMarketWeek,
  addMarketItem,
  updateMarketItem,
  removeMarketItem,
  getItemPrice,
  recordAvailabilityCheck,
  countStockByTier
} from "./markets.mjs";

import { saveSettlementTraitToLibrary } from "./trait-library.mjs";

const { BaseSheet } = foundry.applications.sheets;

function deepMerge(base, incoming) {
  return foundry.utils.mergeObject(base, incoming ?? {}, { inplace: false, insertKeys: true, insertValues: true, overwrite: true });
}

function signed(value) {
  const n = Number(value ?? 0);
  return n >= 0 ? `+${n}` : `${n}`;
}

function gp(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value ?? 0));
}

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function normalizedNpcLink(link = {}) {
  return {
    uuid: String(link.uuid ?? ""),
    name: String(link.name ?? "PNJ"),
    img: String(link.img ?? "icons/svg/mystery-man.svg"),
    role: String(link.role ?? "")
  };
}

export class SettlementSheet extends BaseSheet {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-settlement-sheet"],
    position: { width: 1020, height: 880 },
    window: { resizable: true },
    form: {
      closeOnSubmit: false,
      submitOnChange: false,
      handler: SettlementSheet._onSubmitSettlement
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/settlement-sheet.hbs` }
  };

  get title() {
    return `${this.document.name} — Fiche de ville PF1`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const saved = this.document.getFlag(MODULE_ID, "config") ?? {};
    const config = deepMerge(defaultSettlementConfig(), saved);
    config.linkedNpcs = Array.isArray(config.linkedNpcs) ? config.linkedNpcs.map(normalizedNpcLink) : [];
    const derived = calculateSettlement(config);

    const allSettlements = getSettlements();
    const districts = getDistricts(this.document);
    const parent = config.parentSettlementId ? game.journal.get(config.parentSettlementId) : null;
    const rootParentCandidates = allSettlements.filter(j => {
      if (j.id === this.document.id) return false;
      const parentId = j.getFlag(MODULE_ID, "config")?.parentSettlementId;
      return !parentId || j.id === config.parentSettlementId;
    });

    const linkedNpcs = [];
    for (const link of config.linkedNpcs) {
      let actor = null;
      try {
        if (link.uuid) actor = await fromUuid(link.uuid);
      } catch (err) {
        console.warn(`${MODULE_ID} | Impossible de résoudre ${link.uuid}`, err);
      }
      linkedNpcs.push({
        ...link,
        name: actor?.name ?? link.name ?? "PNJ introuvable",
        img: actor?.img ?? link.img ?? "icons/svg/mystery-man.svg",
        role: link.role ?? "",
        missing: !actor
      });
    }

    const locationDocs = config.parentSettlementId
      ? getLocationsForDistrict(this.document)
      : getLocationsForSettlement(this.document, { includeDistricts: true });
    const locationRows = locationDocs
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(j => {
        const lc = getLocationConfig(j);
        const districtDoc = lc.districtId ? game.journal.get(lc.districtId) : null;
        return {
          id: j.id,
          name: j.name,
          type: LOCATION_TYPES[lc.type] ?? "Lieu",
          districtName: districtDoc?.name ?? "",
          address: lc.address || ""
        };
      });

    const marketState = getMarketState(this.document);
    const stockCounts = countStockByTier(marketState, { aboveBaseValue: derived.market.baseValue });
    const stockRows = [];
    for (const entry of marketState.stock) {
      let item = null;
      try {
        if (entry.uuid) item = await fromUuid(entry.uuid);
      } catch (err) {
        console.warn(`${MODULE_ID} | Impossible de résoudre l'objet de marché ${entry.uuid}`, err);
      }
      const merchant = entry.merchantLocationId ? game.journal.get(entry.merchantLocationId) : null;
      stockRows.push({
        ...entry,
        name: item?.name ?? entry.name ?? "Objet introuvable",
        img: item?.img ?? entry.img ?? "icons/svg/item-bag.svg",
        missing: !item,
        merchantName: merchant?.name ?? (entry.merchantLocationId ? "Lieu introuvable" : "Marché général"),
        tierLabel: MARKET_TIERS[entry.tier] ?? entry.tier,
        priceLabel: gp(entry.price),
        soldClass: entry.sold ? "sold" : "",
        statusLabel: entry.sold ? "Vendu" : "Disponible"
      });
    }
    const marketSlotRows = Object.entries(MARKET_TIERS).map(([tier, label]) => {
      const slot = marketState.slots?.[tier] ?? { formula: null, total: 0 };
      const total = slot.total === "all" ? "all" : Number(slot.total ?? 0);
      const used = Number(stockCounts[tier] ?? 0);
      const remaining = total === "all" ? "all" : Math.max(0, total - used);
      return {
        tier, label,
        formula: slot.formula === "all" ? "Tous" : (slot.formula ?? "—"),
        totalLabel: total === "all" ? "Tous" : (slot.formula ? String(total) : "Non généré"),
        used,
        remainingLabel: total === "all" ? "Sans limite" : String(remaining)
      };
    });
    const merchantOptions = locationRows.map(r => ({ id: r.id, name: r.name }));
    const currentWeekChecks = marketState.availabilityChecks
      .filter(c => Number(c.week) === Number(marketState.week))
      .map(c => ({
        ...c,
        priceLabel: gp(c.price),
        resultLabel: c.result ? "Disponible" : "Indisponible",
        resultClass: c.result ? "available" : "unavailable"
      }));

    const factionDocs = getFactionsForSettlement(this.document, { includeDistricts: true });
    const factionRows = factionDocs
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(j => {
        const fc = getFactionConfig(j);
        const relevant = fc.influences.filter(i => {
          if (config.parentSettlementId) return i.settlementId === config.parentSettlementId && i.districtId === this.document.id;
          return i.settlementId === this.document.id;
        });
        const zones = relevant.map(i => {
          const d = i.districtId ? game.journal.get(i.districtId) : null;
          const where = d?.name ?? "Ville entière";
          return `${where} : ${INFLUENCE_LEVELS[i.level] ?? i.level}`;
        });
        return {
          id: j.id,
          name: j.name,
          type: FACTION_TYPES[fc.type] ?? "Organisation",
          leaderName: fc.leaderName || "",
          influenceSummary: zones.join(" · ")
        };
      });

    const urbanState = getUrbanState(this.document);
    const rumorRows = urbanState.rumors
      .filter(r => game.user.isGM || r.visibility === "public")
      .slice()
      .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))
      .map(r => {
        const loc = r.sourceLocationId ? game.journal.get(r.sourceLocationId) : null;
        const fac = r.sourceFactionId ? game.journal.get(r.sourceFactionId) : null;
        return {
          ...r,
          truthLabel: RUMOR_TRUTH[r.truth] ?? RUMOR_TRUTH.unknown,
          visibilityLabel: r.visibility === "public" ? "Publique" : "MJ",
          locationName: loc?.name ?? "",
          factionName: fac?.name ?? "",
          stateLabel: r.active ? "Active" : "Classée",
          stateClass: r.active ? "active" : "inactive"
        };
      });
    const urbanEventRows = urbanState.events
      .filter(e => game.user.isGM || e.visibility === "public")
      .slice()
      .sort((a, b) => {
        const order = { active: 0, planned: 1, resolved: 2 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || Number(b.severity ?? 0) - Number(a.severity ?? 0);
      })
      .map(e => {
        const loc = e.locationId ? game.journal.get(e.locationId) : null;
        const fac = e.factionId ? game.journal.get(e.factionId) : null;
        return {
          ...e,
          statusLabel: URBAN_EVENT_STATUS[e.status] ?? URBAN_EVENT_STATUS.planned,
          severityLabel: URBAN_EVENT_SEVERITY[Number(e.severity)] ?? URBAN_EVENT_SEVERITY[2],
          visibilityLabel: e.visibility === "public" ? "Publique" : "MJ",
          locationName: loc?.name ?? "",
          factionName: fac?.name ?? "",
          statusClass: e.status ?? "planned",
          severityClass: `severity-${Number(e.severity) || 2}`
        };
      });
    const encounterHistoryRows = (game.user.isGM ? urbanState.encounterHistory : []).map(h => ({
      ...h,
      dangerLabel: signed(h.danger),
      timeLabel: h.rolledAt ? new Date(h.rolledAt).toLocaleString("fr-FR") : ""
    }));

    const lawState = getLawState(this.document);
    const authorityRows = [];
    for (const [role, label] of Object.entries(AUTHORITY_ROLES)) {
      const uuid = String(lawState.authorityActors?.[role] ?? "");
      let actor = null;
      if (uuid) {
        try { actor = await fromUuid(uuid); }
        catch (err) { console.warn(`${MODULE_ID} | Impossible de résoudre l'autorité ${uuid}`, err); }
      }
      authorityRows.push({
        role, label, uuid,
        name: actor?.name ?? (uuid ? "Actor introuvable" : "Non assigné"),
        img: actor?.img ?? "icons/svg/mystery-man.svg",
        missing: Boolean(uuid && !actor),
        assigned: Boolean(uuid)
      });
    }
    const crimeRows = [];
    for (const crime of lawState.crimes) {
      let suspect = null;
      if (crime.suspectUuid) {
        try { suspect = await fromUuid(crime.suspectUuid); } catch (_) {}
      }
      const loc = crime.locationId ? game.journal.get(crime.locationId) : null;
      const fac = crime.factionId ? game.journal.get(crime.factionId) : null;
      crimeRows.push({
        ...crime,
        suspectDisplay: suspect?.name ?? crime.suspectName ?? "Inconnu",
        suspectImg: suspect?.img ?? "icons/svg/mystery-man.svg",
        suspectMissing: Boolean(crime.suspectUuid && !suspect),
        statusLabel: CRIME_STATUS[crime.status] ?? crime.status,
        severityLabel: CRIME_SEVERITY[Number(crime.severity)] ?? CRIME_SEVERITY[2],
        statusClass: crime.status ?? "reported",
        severityClass: `severity-${Number(crime.severity) || 2}`,
        locationName: loc?.name ?? "",
        factionName: fac?.name ?? "",
        bountyLabel: gp(crime.bounty),
        fineLabel: gp(crime.fine),
        timeLabel: crime.createdAt ? new Date(crime.createdAt).toLocaleString("fr-FR") : ""
      });
    }
    crimeRows.sort((a, b) => {
      const order = { wanted: 0, reported: 1, arrested: 2, judged: 3, closed: 4 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || Number(b.severity) - Number(a.severity);
    });
    const patrolHistoryRows = lawState.patrolHistory.map(h => ({
      ...h,
      locationName: h.locationId ? (game.journal.get(h.locationId)?.name ?? "Lieu introuvable") : "Ville / quartier",
      timeLabel: h.dispatchedAt ? new Date(h.dispatchedAt).toLocaleString("fr-FR") : ""
    }));

    const calendarState = getCalendarState(this.document);
    const calendarEntries = calendarState.entries
      .filter(e => game.user.isGM || e.visibility === "public")
      .slice()
      .sort((a, b) => compareDates(a.date, b.date, calendarState.config))
      .map(e => ({
        ...e,
        typeLabel: CALENDAR_ENTRY_TYPES[e.type] ?? e.type,
        statusLabel: CALENDAR_ENTRY_STATUS[e.status] ?? e.status,
        dateLabel: formatCalendarDate(e.date, calendarState.config, { includeWeekday: false }),
        recurrenceLabel: e.recurrence === "yearly" ? "Annuel" : "Ponctuel",
        locationName: e.locationId ? (game.journal.get(e.locationId)?.name ?? "Lieu introuvable") : "",
        factionName: e.factionId ? (game.journal.get(e.factionId)?.name ?? "Faction introuvable") : "",
        statusClass: e.status ?? "planned"
      }));
    const calendarProjects = calendarState.projects
      .slice()
      .sort((a, b) => compareDates(a.startDate, b.startDate, calendarState.config))
      .map(p => {
        const progress = getProjectProgress(p, calendarState);
        return {
          ...p,
          typeLabel: PROJECT_TYPES[p.type] ?? p.type,
          statusLabel: PROJECT_STATUS[p.status] ?? p.status,
          startLabel: formatCalendarDate(p.startDate, calendarState.config, { includeWeekday: false }),
          finishLabel: formatCalendarDate(progress.finishDate, calendarState.config, { includeWeekday: false }),
          progressPct: progress.percent,
          progressText: `${progress.elapsed}/${progress.duration} jour(s)`,
          locationName: p.locationId ? (game.journal.get(p.locationId)?.name ?? "Lieu introuvable") : "",
          factionName: p.factionId ? (game.journal.get(p.factionId)?.name ?? "Faction introuvable") : "",
          statusClass: p.status ?? "planned"
        };
      });
    const populationHistoryRows = (game.user.isGM ? calendarState.populationHistory : []).map(r => ({
      ...r,
      typeLabel: POPULATION_CHANGE_TYPES[r.type] ?? r.type,
      dateLabel: formatCalendarDate(r.date, calendarState.config, { includeWeekday: false }),
      deltaLabel: signed(r.delta),
      previousLabel: gp(r.previous),
      nextLabel: gp(r.next)
    }));
    const timelineRows = (game.user.isGM ? calendarState.timeline : []).map(r => ({
      ...r,
      dateLabel: formatCalendarDate(r.date, calendarState.config, { includeWeekday: false })
    }));

    const politicsState = getPoliticsState(this.document);
    const politicsOpinion = opinionForScore(politicsState.publicOpinion);
    const politicsReputationRows = [];
    for (const rep of politicsState.reputations
      .filter(r => game.user.isGM || r.visibility === "public")
      .slice()
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))) {
      let actor = null;
      if (rep.actorUuid) {
        try { actor = await fromUuid(rep.actorUuid); }
        catch (err) { console.warn(`${MODULE_ID} | Impossible de résoudre la réputation ${rep.actorUuid}`, err); }
      }
      const attitude = opinionForScore(rep.score);
      politicsReputationRows.push({
        ...rep,
        subjectDisplay: actor?.name ?? rep.subjectName ?? "Personnage / groupe",
        img: actor?.img ?? "icons/svg/mystery-man.svg",
        missing: Boolean(rep.actorUuid && !actor),
        scoreLabel: signed(rep.score),
        attitudeLabel: attitude.label,
        attitudeClass: attitude.className,
        visibilityLabel: rep.visibility === "public" ? "Publique" : "MJ"
      });
    }

    const politicsTensionRows = politicsState.tensions
      .filter(t => game.user.isGM || t.visibility === "public")
      .slice()
      .sort((a, b) => Number(b.level ?? 0) - Number(a.level ?? 0))
      .map(t => {
        const factionA = t.factionAId ? game.journal.get(t.factionAId) : null;
        const factionB = t.factionBId ? game.journal.get(t.factionBId) : null;
        return {
          ...t,
          factionAName: factionA?.name ?? (t.factionAId ? "Faction introuvable" : "Faction A"),
          factionBName: factionB?.name ?? (t.factionBId ? "Faction introuvable" : "Faction B"),
          levelLabel: FACTION_TENSION_LEVELS[Number(t.level)] ?? FACTION_TENSION_LEVELS[1],
          trendLabel: TENSION_TRENDS[t.trend] ?? TENSION_TRENDS.stable,
          levelClass: `tension-${Number(t.level) || 0}`,
          trendClass: t.trend ?? "stable",
          visibilityLabel: t.visibility === "public" ? "Publique" : "MJ"
        };
      });

    const politicsConsequenceRows = politicsState.consequences
      .filter(c => game.user.isGM || c.visibility === "public")
      .slice()
      .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))
      .map(c => ({
        ...c,
        publicOpinionDeltaLabel: signed(c.publicOpinionDelta),
        unrestDeltaLabel: signed(c.unrestDelta),
        factionName: c.factionId ? (game.journal.get(c.factionId)?.name ?? "Faction introuvable") : "",
        timeLabel: c.createdAt ? new Date(c.createdAt).toLocaleString("fr-FR") : "",
        visibilityLabel: c.visibility === "public" ? "Publique" : "MJ"
      }));

    const communitySkillCheckRows = Object.entries(COMMUNITY_SKILL_CHECKS).map(([key, check]) => ({
      key,
      ...check,
      modifierValue: Number(derived.modifiers?.[check.modifier] ?? 0),
      modifierLabel: signed(derived.modifiers?.[check.modifier] ?? 0),
      modifierName: MODIFIER_LABELS[check.modifier] ?? check.modifier
    }));

    const legislationState = getLegislationState(this.document);
    const legislationLawRows = legislationState.laws
      .filter(l => game.user.isGM || l.visibility === "public")
      .slice()
      .sort((a, b) => {
        const order = { active: 0, draft: 1, suspended: 2, repealed: 3 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(a.title).localeCompare(String(b.title), "fr");
      })
      .map(l => {
        const faction = l.issuingFactionId ? game.journal.get(l.issuingFactionId) : null;
        const location = l.locationId ? game.journal.get(l.locationId) : null;
        return {
          ...l,
          typeLabel: LEGISLATION_TYPES[l.type] ?? l.type,
          statusLabel: LEGISLATION_STATUS[l.status] ?? l.status,
          statusClass: l.status ?? "active",
          visibilityLabel: l.visibility === "public" ? "Publique" : "MJ",
          factionName: faction?.name ?? (l.issuingFactionId ? "Faction introuvable" : ""),
          locationName: location?.name ?? (l.locationId ? "Lieu introuvable" : ""),
          fineLabel: gp(l.defaultFine),
          publicOpinionDeltaLabel: signed(l.publicOpinionDelta),
          unrestDeltaLabel: signed(l.unrestDelta)
        };
      });
    const legislationLevyRows = legislationState.levies
      .filter(l => game.user.isGM || l.visibility === "public")
      .slice()
      .sort((a, b) => Number(b.active) - Number(a.active) || String(a.title).localeCompare(String(b.title), "fr"))
      .map(l => {
        const faction = l.collectorFactionId ? game.journal.get(l.collectorFactionId) : null;
        const location = l.locationId ? game.journal.get(l.locationId) : null;
        const rateLabel = l.mode === "flat" ? `${gp(l.rate)} po` : `${Number(l.rate) || 0} %`;
        return {
          ...l,
          typeLabel: LEVY_TYPES[l.type] ?? l.type,
          modeLabel: LEVY_MODES[l.mode] ?? l.mode,
          frequencyLabel: LEVY_FREQUENCIES[l.frequency] ?? l.frequency,
          rateLabel,
          activeLabel: l.active ? "En vigueur" : "Inactive",
          activeClass: l.active ? "active" : "inactive",
          visibilityLabel: l.visibility === "public" ? "Publique" : "MJ",
          factionName: faction?.name ?? (l.collectorFactionId ? "Faction introuvable" : ""),
          locationName: location?.name ?? (l.locationId ? "Lieu introuvable" : "")
        };
      });
    const legislationHistoryRows = (game.user.isGM ? legislationState.history : []).map(h => ({
      ...h,
      timeLabel: h.createdAt ? new Date(h.createdAt).toLocaleString("fr-FR") : ""
    }));

    context.name = this.document.name;
    context.config = config;
    context.derived = derived;
    context.types = Object.entries(SETTLEMENT_TYPES).map(([key, v]) => ({ key, ...v, selected: config.type === key }));
    context.alignments = Object.entries(ALIGNMENTS).map(([key, label]) => ({ key, label, selected: config.alignment === key }));
    context.governments = Object.entries(GOVERNMENTS).map(([key, v]) => ({ key, ...v, selected: config.government === key }));
    context.cursedModifiers = Object.entries(MODIFIER_LABELS).map(([key, label]) => ({ key, label, selected: config.cursedModifier === key }));
    context.advantages = Object.entries(ADVANTAGES).map(([key, v]) => ({ key, ...v, source: "Guide du Maître", checked: Boolean(config.advantages?.[key]) }));
    context.customAdvantages = Object.entries(config.customAdvantages ?? {}).map(([id, value]) => ({
      id,
      label: String(value?.label ?? "Avantage personnalisé"),
      active: value?.active !== false,
      notes: String(value?.notes ?? ""),
      source: String(value?.source ?? value?.notes ?? "Campagne maison"),
      sourceType: String(value?.sourceType ?? "homebrew"),
      sourceIsGmg: String(value?.sourceType ?? "homebrew") === "gmg",
      sourceIsSupplement: String(value?.sourceType ?? "homebrew") === "supplement",
      sourceIsHomebrew: String(value?.sourceType ?? "homebrew") === "homebrew",
      sourceIsOther: String(value?.sourceType ?? "homebrew") === "other",
      corruption: Number(value?.corruption ?? value?.mods?.corruption ?? 0) || 0,
      crime: Number(value?.crime ?? value?.mods?.crime ?? 0) || 0,
      economy: Number(value?.economy ?? value?.mods?.economy ?? 0) || 0,
      law: Number(value?.law ?? value?.mods?.law ?? 0) || 0,
      lore: Number(value?.lore ?? value?.mods?.lore ?? 0) || 0,
      society: Number(value?.society ?? value?.mods?.society ?? 0) || 0,
      danger: Number(value?.danger ?? 0) || 0,
      baseValuePct: Number(value?.baseValuePct ?? 0) || 0,
      purchaseLimitPct: Number(value?.purchaseLimitPct ?? 0) || 0,
      spellcasting: Number(value?.spellcasting ?? 0) || 0
    }));
    context.hasCustomAdvantages = context.customAdvantages.length > 0;
    context.drawbacks = Object.entries(DRAWBACKS).map(([key, v]) => ({ key, ...v, source: key === "drought" ? "Skull & Shackles" : "Guide du Maître", checked: Boolean(config.drawbacks?.[key]) }));
    context.customDrawbacks = Object.entries(config.customDrawbacks ?? {}).map(([id, value]) => ({
      id,
      label: String(value?.label ?? "Inconvénient personnalisé"),
      active: value?.active !== false,
      notes: String(value?.notes ?? ""),
      source: String(value?.source ?? value?.notes ?? "Campagne maison"),
      sourceType: String(value?.sourceType ?? "homebrew"),
      sourceIsGmg: String(value?.sourceType ?? "homebrew") === "gmg",
      sourceIsSupplement: String(value?.sourceType ?? "homebrew") === "supplement",
      sourceIsHomebrew: String(value?.sourceType ?? "homebrew") === "homebrew",
      sourceIsOther: String(value?.sourceType ?? "homebrew") === "other",
      corruption: Number(value?.corruption ?? value?.mods?.corruption ?? 0) || 0,
      crime: Number(value?.crime ?? value?.mods?.crime ?? 0) || 0,
      economy: Number(value?.economy ?? value?.mods?.economy ?? 0) || 0,
      law: Number(value?.law ?? value?.mods?.law ?? 0) || 0,
      lore: Number(value?.lore ?? value?.mods?.lore ?? 0) || 0,
      society: Number(value?.society ?? value?.mods?.society ?? 0) || 0,
      danger: Number(value?.danger ?? 0) || 0,
      baseValuePct: Number(value?.baseValuePct ?? 0) || 0,
      purchaseLimitPct: Number(value?.purchaseLimitPct ?? 0) || 0,
      spellcasting: Number(value?.spellcasting ?? 0) || 0
    }));
    context.hasCustomDrawbacks = context.customDrawbacks.length > 0;
    context.modifierLabels = MODIFIER_LABELS;
    context.signed = Object.fromEntries(Object.entries(derived.modifiers).map(([k, v]) => [k, signed(v)]));
    context.formatted = {
      baseValue: gp(derived.market.baseValue),
      purchaseLimit: gp(derived.market.purchaseLimit),
      danger: signed(derived.danger)
    };
    context.magicLabels = {
      minor: derived.market.magic.minor === "all" ? "Tous" : (derived.market.magic.minor ?? "—"),
      medium: derived.market.magic.medium ?? "—",
      major: derived.market.magic.major ?? "—"
    };
    context.parentOptions = rootParentCandidates
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(j => ({ id: j.id, name: j.name, selected: j.id === config.parentSettlementId }));
    context.parentSettlement = parent ? { id: parent.id, name: parent.name } : null;
    context.isDistrict = Boolean(config.parentSettlementId);
    context.parentMissing = Boolean(config.parentSettlementId && !parent);
    context.parentSelectDisabled = districts.length > 0 && !config.parentSettlementId;
    context.districts = districts
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(j => ({
        id: j.id,
        name: j.name,
        type: j.getFlag(MODULE_ID, "derived")?.typeLabel ?? "Communauté",
        population: j.getFlag(MODULE_ID, "config")?.population || "—"
      }));
    context.hasDistricts = districts.length > 0;
    context.canCreateDistrict = !config.parentSettlementId;
    context.linkedNpcs = linkedNpcs;
    context.hasLinkedNpcs = linkedNpcs.length > 0;
    context.locations = locationRows;
    context.hasLocations = locationRows.length > 0;
    context.locationCount = locationRows.length;
    context.factionsStructured = factionRows;
    context.hasFactionsStructured = factionRows.length > 0;
    context.factionCount = factionRows.length;
    context.marketState = marketState;
    context.marketWeek = marketState.week;
    context.marketGeneratedAt = marketState.generatedAt ? new Date(marketState.generatedAt).toLocaleString("fr-FR") : "Jamais";
    context.marketSlots = marketSlotRows;
    context.marketStock = stockRows;
    context.hasMarketStock = stockRows.length > 0;
    context.marketStockCount = stockRows.filter(r => !r.sold).reduce((n, r) => n + (Number(r.quantity) || 1), 0);
    context.marketChecks = currentWeekChecks;
    context.hasMarketChecks = currentWeekChecks.length > 0;
    context.marketMerchantOptions = merchantOptions;
    context.urbanState = urbanState;
    context.urbanRumors = rumorRows;
    context.urbanRumorCount = rumorRows.length;
    context.hasUrbanRumors = rumorRows.length > 0;
    context.urbanEvents = urbanEventRows;
    context.urbanEventCount = urbanEventRows.length;
    context.hasUrbanEvents = urbanEventRows.length > 0;
    context.urbanEncounterTables = Object.entries(URBAN_ENCOUNTER_TABLES).map(([key, value]) => ({ key, label: value.label, source: value.source }));
    context.urbanEncounterHistory = encounterHistoryRows;
    context.hasUrbanEncounterHistory = encounterHistoryRows.length > 0;
    context.urbanDanger = Number(derived.danger ?? 0);
    context.urbanDangerLabel = signed(derived.danger);
    context.lawState = lawState;
    context.lawAlertLevel = lawState.alertLevel;
    context.lawAlertLabel = LAW_ALERT_LEVELS[lawState.alertLevel] ?? LAW_ALERT_LEVELS[0];
    context.lawAlertDescription = LAW_ALERT_DESCRIPTIONS[lawState.alertLevel] ?? LAW_ALERT_DESCRIPTIONS[0];
    context.lawAlertOptions = Object.entries(LAW_ALERT_LEVELS).map(([key, label]) => ({ key: Number(key), label, selected: Number(key) === Number(lawState.alertLevel) }));
    context.lawAuthorityActors = authorityRows;
    context.lawCrimes = game.user.isGM ? crimeRows : [];
    context.hasLawCrimes = game.user.isGM && crimeRows.length > 0;
    context.lawWantedCount = game.user.isGM ? crimeRows.filter(c => c.status === "wanted").length : 0;
    context.guardFormations = Object.entries(GUARD_FORMATIONS).map(([key, value]) => ({ key, ...value }));
    context.lawPatrolHistory = game.user.isGM ? patrolHistoryRows : [];
    context.hasLawPatrolHistory = game.user.isGM && patrolHistoryRows.length > 0;
    context.lawModifierLabel = signed(derived.modifiers.law);
    context.crimeModifierLabel = signed(derived.modifiers.crime);
    context.corruptionModifierLabel = signed(derived.modifiers.corruption);
    context.calendarState = calendarState;
    context.calendarDateLabel = formatCalendarDate(calendarState.current, calendarState.config);
    context.calendarYearLabel = calendarState.config.yearLabel;
    context.calendarMonthCount = calendarState.config.months.length;
    context.calendarWeekdayCount = calendarState.config.weekdays.length;
    context.calendarSyncMarket = Boolean(calendarState.config.syncMarketWeeks);
    context.calendarEntries = calendarEntries;
    context.hasCalendarEntries = calendarEntries.length > 0;
    context.calendarProjects = calendarProjects;
    context.hasCalendarProjects = context.calendarProjects.length > 0;
    context.calendarPopulationHistory = populationHistoryRows;
    context.hasCalendarPopulationHistory = populationHistoryRows.length > 0;
    context.calendarTimeline = timelineRows;
    context.hasCalendarTimeline = timelineRows.length > 0;
    context.politicsState = politicsState;
    context.politicsOpinionScore = politicsState.publicOpinion;
    context.politicsOpinionScoreLabel = signed(politicsState.publicOpinion);
    context.politicsOpinionLabel = politicsOpinion.label;
    context.politicsOpinionClass = politicsOpinion.className;
    context.politicsOpinionNotes = politicsState.opinionNotes;
    context.politicsUnrestLevel = politicsState.unrestLevel;
    context.politicsUnrestLabel = UNREST_LEVELS[politicsState.unrestLevel] ?? UNREST_LEVELS[0];
    context.politicsUnrestDescription = UNREST_DESCRIPTIONS[politicsState.unrestLevel] ?? UNREST_DESCRIPTIONS[0];
    context.politicsUnrestNotes = politicsState.unrestNotes;
    context.politicsReputations = politicsReputationRows;
    context.hasPoliticsReputations = politicsReputationRows.length > 0;
    context.politicsTensions = politicsTensionRows;
    context.hasPoliticsTensions = politicsTensionRows.length > 0;
    context.politicsConsequences = politicsConsequenceRows;
    context.hasPoliticsConsequences = politicsConsequenceRows.length > 0;
    context.politicsCommunityChecks = communitySkillCheckRows;
    context.politicsSocietyLabel = signed(derived.modifiers.society);
    context.politicsLawLabel = signed(derived.modifiers.law);
    context.politicsLoreLabel = signed(derived.modifiers.lore);
    context.politicsCorruptionLabel = signed(derived.modifiers.corruption);
    context.politicsCrimeLabel = signed(derived.modifiers.crime);
    context.politicsEconomyLabel = signed(derived.modifiers.economy);
    context.legislationState = legislationState;
    context.legislationLaws = legislationLawRows;
    context.hasLegislationLaws = legislationLawRows.length > 0;
    context.legislationActiveLawCount = legislationState.laws.filter(l => l.status === "active").length;
    context.legislationLevies = legislationLevyRows;
    context.hasLegislationLevies = legislationLevyRows.length > 0;
    context.legislationActiveLevyCount = legislationState.levies.filter(l => l.active).length;
    context.legislationHistory = legislationHistoryRows;
    context.hasLegislationHistory = legislationHistoryRows.length > 0;
    context.legislationLawModifierLabel = signed(derived.modifiers.law);

    // v2.2 — tableau de bord synthétique. Ces valeurs ne créent aucune
    // nouvelle donnée : elles résument uniquement les sous-systèmes existants.
    const activeRumors = urbanState.rumors.filter(r => r.active && (game.user.isGM || r.visibility === "public")).length;
    const activeEvents = urbanState.events.filter(e => e.status === "active" && (game.user.isGM || e.visibility === "public")).length;
    const openCrimes = game.user.isGM ? lawState.crimes.filter(c => !["judged", "closed"].includes(c.status)).length : 0;
    const activeProjects = calendarState.projects.filter(p => ["planned", "active", "paused"].includes(p.status)).length;
    const alerts = [];
    if (Number(politicsState.unrestLevel) >= 3) alerts.push({ icon: "fa-people-group", label: politicsState.unrestLevel >= 4 ? "Troubles graves" : "Manifestations", target: "pf1-section-politics", tone: "danger" });
    if (Number(lawState.alertLevel) >= 3) alerts.push({ icon: "fa-shield-halved", label: `Garde : ${LAW_ALERT_LEVELS[lawState.alertLevel] ?? "Alerte"}`, target: "pf1-section-law", tone: "warning" });
    if (activeEvents > 0) alerts.push({ icon: "fa-bolt", label: `${activeEvents} événement(s) en cours`, target: "pf1-section-urban", tone: "warning" });
    if (game.user.isGM && lawState.crimes.some(c => c.status === "wanted")) alerts.push({ icon: "fa-user-secret", label: `${lawState.crimes.filter(c => c.status === "wanted").length} personne(s) recherchée(s)`, target: "pf1-section-law", tone: "danger" });
    if (derived.advantageOverflow) alerts.push({ icon: "fa-triangle-exclamation", label: "Trop d'avantages pour la taille", target: "pf1-section-traits", tone: "warning" });
    if (config.parentSettlementId && !parent) alerts.push({ icon: "fa-link-slash", label: "Ville parente introuvable", target: "pf1-section-profile", tone: "danger" });

    context.dashboard = {
      population: config.population || "—",
      danger: signed(derived.danger),
      marketStock: context.marketStockCount,
      activeRumors,
      activeEvents,
      wanted: context.lawWantedCount,
      openCrimes,
      activeProjects,
      opinion: politicsOpinion.label,
      opinionScore: signed(politicsState.publicOpinion),
      unrest: UNREST_LEVELS[politicsState.unrestLevel] ?? UNREST_LEVELS[0],
      activeLaws: context.legislationActiveLawCount,
      activeLevies: context.legislationActiveLevyCount,
      alerts
    };
    context.hasDashboardAlerts = alerts.length > 0;
    context.isGM = game.user.isGM;
    return context;
  }

  static async _onSubmitSettlement(event, form, formData) {
    event.preventDefault();
    const data = foundry.utils.expandObject(formData.object ?? {});
    const current = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    const config = deepMerge(current, data.settlement ?? {});
    config.linkedNpcs = Array.isArray(current.linkedNpcs) ? current.linkedNpcs.map(normalizedNpcLink) : [];

    if (config.parentSettlementId === this.document.id) config.parentSettlementId = "";
    const children = getDistricts(this.document);
    if (config.parentSettlementId && children.length) {
      config.parentSettlementId = current.parentSettlementId || "";
      ui.notifications.warn("Une ville qui possède déjà des quartiers ne peut pas devenir elle-même un quartier.");
    }

    const derived = calculateSettlement(config);
    const name = String(data.name ?? this.document.name ?? "Nouvelle ville").trim() || "Nouvelle ville";

    await this.document.update({
      name,
      [`flags.${MODULE_ID}.isSettlement`]: true,
      [`flags.${MODULE_ID}.config`]: config,
      [`flags.${MODULE_ID}.derived`]: derived
    });
    ui.notifications.info("Fiche de ville enregistrée et recalculée.");
    this.render();
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    root.querySelector('[data-action="market-roll"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._rollMarket();
    });
    root.querySelector('[data-action="availability-check"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._availabilityCheck();
    });
    root.querySelector('[data-action="market-add-item"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._pickMarketItem();
    });
    root.querySelector('[data-action="market-next-week"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._advanceMarketWeek();
    });
    root.querySelectorAll('[data-action="market-open-item"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._openMarketItem(ev.currentTarget.dataset.uuid);
    }));
    root.querySelectorAll('[data-action="market-edit-item"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._editMarketItem(ev.currentTarget.dataset.id);
    }));
    root.querySelectorAll('[data-action="market-toggle-sold"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._toggleMarketSold(ev.currentTarget.dataset.id);
    }));
    root.querySelectorAll('[data-action="market-remove-item"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._removeMarketItem(ev.currentTarget.dataset.id);
    }));
    root.querySelector('[data-action="call-guard"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._callGuard();
    });
    root.querySelector('[data-action="post-profile"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._postProfile();
    });
    root.querySelector('[data-action="copy-profile"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._copyProfile();
    });
    root.querySelector('[data-action="add-custom-advantage"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._addCustomAdvantage();
    });
    root.querySelectorAll('[data-action="toggle-custom-advantage"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._toggleCustomAdvantage(ev.currentTarget.dataset.id);
    }));
    root.querySelectorAll('[data-action="remove-custom-advantage"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._removeCustomAdvantage(ev.currentTarget.dataset.id);
    }));
    root.querySelectorAll('[data-action="save-custom-advantage-library"]').forEach(el => el.addEventListener("click", async ev => {
      ev.preventDefault();
      await saveSettlementTraitToLibrary(this.document, "advantage", ev.currentTarget.dataset.id);
    }));
    root.querySelector('[data-action="add-custom-drawback"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._addCustomDrawback();
    });
    root.querySelectorAll('[data-action="toggle-custom-drawback"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._toggleCustomDrawback(ev.currentTarget.dataset.id);
    }));
    root.querySelectorAll('[data-action="remove-custom-drawback"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._removeCustomDrawback(ev.currentTarget.dataset.id);
    }));
    root.querySelectorAll('[data-action="save-custom-drawback-library"]').forEach(el => el.addEventListener("click", async ev => {
      ev.preventDefault();
      await saveSettlementTraitToLibrary(this.document, "drawback", ev.currentTarget.dataset.id);
    }));
    root.querySelector('[data-action="create-district"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._createDistrict();
    });
    root.querySelector('[data-action="open-parent"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      const parentId = ev.currentTarget.dataset.id;
      game.journal.get(parentId)?.sheet.render(true);
    });
    root.querySelectorAll('[data-action="open-district"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true);
    }));
    root.querySelectorAll('[data-action="detach-district"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._detachDistrict(ev.currentTarget.dataset.id);
    }));

    root.querySelector('[data-action="create-location"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._createLocation();
    });
    root.querySelectorAll('[data-action="open-location"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true);
    }));

    root.querySelector('[data-action="open-faction-network"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      const config = this.document.getFlag(MODULE_ID, "config") ?? {};
      new FactionNetwork({ settlementId: config.parentSettlementId || this.document.id }).render(true);
    });
    root.querySelector('[data-action="create-faction"]')?.addEventListener("click", ev => { ev.preventDefault(); this._createFaction(); });
    root.querySelector('[data-action="link-faction"]')?.addEventListener("click", ev => { ev.preventDefault(); this._linkFaction(); });
    root.querySelectorAll('[data-action="open-faction"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true);
    }));
    root.querySelectorAll('[data-action="unlink-faction"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._unlinkFaction(ev.currentTarget.dataset.id);
    }));

    root.querySelector('[data-action="urban-roll-encounter"]')?.addEventListener("click", ev => { ev.preventDefault(); this._rollUrbanEncounter(); });
    root.querySelector('[data-action="urban-clear-history"]')?.addEventListener("click", ev => { ev.preventDefault(); this._clearUrbanEncounterHistory(); });
    root.querySelector('[data-action="urban-add-rumor"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editUrbanRumor(); });
    root.querySelectorAll('[data-action="urban-edit-rumor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editUrbanRumor(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="urban-toggle-rumor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._toggleUrbanRumor(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="urban-post-rumor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postUrbanRumor(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="urban-remove-rumor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeUrbanRumor(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="urban-add-event"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editUrbanEvent(); });
    root.querySelector('[data-action="urban-inspire-event"]')?.addEventListener("click", ev => { ev.preventDefault(); this._inspireUrbanEvent(); });
    root.querySelectorAll('[data-action="urban-edit-event"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editUrbanEvent(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="urban-cycle-event"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._cycleUrbanEvent(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="urban-post-event"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postUrbanEvent(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="urban-remove-event"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeUrbanEvent(ev.currentTarget.dataset.id); }));

    root.querySelector('[data-action="law-set-alert"]')?.addEventListener("click", ev => { ev.preventDefault(); this._setLawAlert(); });
    root.querySelector('[data-action="law-dispatch"]')?.addEventListener("click", ev => { ev.preventDefault(); this._dispatchGuard(); });
    root.querySelector('[data-action="law-clear-patrol-history"]')?.addEventListener("click", ev => { ev.preventDefault(); this._clearLawPatrolHistory(); });
    root.querySelector('[data-action="law-add-crime"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editLawCrime(); });
    root.querySelectorAll('[data-action="law-set-actor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._setLawActor(ev.currentTarget.dataset.role); }));
    root.querySelectorAll('[data-action="law-open-actor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._openLawActor(ev.currentTarget.dataset.uuid); }));
    root.querySelectorAll('[data-action="law-clear-actor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._clearLawActor(ev.currentTarget.dataset.role); }));
    root.querySelectorAll('[data-action="law-edit-crime"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editLawCrime(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="law-cycle-crime"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._cycleLawCrime(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="law-post-crime"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postLawCrime(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="law-remove-crime"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeLawCrime(ev.currentTarget.dataset.id); }));

    root.querySelector('[data-action="calendar-settings"]')?.addEventListener("click", ev => { ev.preventDefault(); this._calendarSettings(); });
    root.querySelector('[data-action="calendar-set-date"]')?.addEventListener("click", ev => { ev.preventDefault(); this._calendarSetDate(); });
    root.querySelectorAll('[data-action="calendar-advance"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._calendarAdvance(Number(ev.currentTarget.dataset.days || 1)); }));
    root.querySelector('[data-action="calendar-advance-custom"]')?.addEventListener("click", ev => { ev.preventDefault(); this._calendarAdvanceCustom(); });
    root.querySelector('[data-action="calendar-add-entry"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editCalendarEntry(); });
    root.querySelectorAll('[data-action="calendar-edit-entry"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editCalendarEntry(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="calendar-post-entry"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postCalendarEntry(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="calendar-remove-entry"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeCalendarEntry(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="calendar-add-project"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editCalendarProject(); });
    root.querySelectorAll('[data-action="calendar-edit-project"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editCalendarProject(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="calendar-remove-project"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeCalendarProject(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="calendar-population-change"]')?.addEventListener("click", ev => { ev.preventDefault(); this._calendarPopulationChange(); });
    root.querySelector('[data-action="calendar-clear-population"]')?.addEventListener("click", ev => { ev.preventDefault(); this._calendarClearPopulation(); });
    root.querySelector('[data-action="calendar-clear-timeline"]')?.addEventListener("click", ev => { ev.preventDefault(); this._calendarClearTimeline(); });

    root.querySelector('[data-action="politics-set-opinion"]')?.addEventListener("click", ev => { ev.preventDefault(); this._setPoliticsOpinion(); });
    root.querySelector('[data-action="politics-set-unrest"]')?.addEventListener("click", ev => { ev.preventDefault(); this._setPoliticsUnrest(); });
    root.querySelector('[data-action="politics-community-check"]')?.addEventListener("click", ev => { ev.preventDefault(); this._politicsCommunityCheck(); });
    root.querySelector('[data-action="politics-post-overview"]')?.addEventListener("click", ev => { ev.preventDefault(); this._postPoliticsOverview(); });
    root.querySelector('[data-action="politics-add-reputation"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editPoliticsReputation(); });
    root.querySelectorAll('[data-action="politics-edit-reputation"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editPoliticsReputation(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="politics-post-reputation"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postPoliticsReputation(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="politics-open-actor"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._openPoliticsActor(ev.currentTarget.dataset.uuid); }));
    root.querySelectorAll('[data-action="politics-remove-reputation"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removePoliticsReputation(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="politics-add-tension"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editPoliticsTension(); });
    root.querySelectorAll('[data-action="politics-edit-tension"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editPoliticsTension(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="politics-post-tension"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postPoliticsTension(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="politics-remove-tension"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removePoliticsTension(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="politics-add-consequence"]')?.addEventListener("click", ev => { ev.preventDefault(); this._addPoliticsConsequence(); });
    root.querySelectorAll('[data-action="politics-post-consequence"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postPoliticsConsequence(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="politics-remove-consequence"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removePoliticsConsequence(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="politics-clear-history"]')?.addEventListener("click", ev => { ev.preventDefault(); this._clearPoliticsHistory(); });

    root.querySelector('[data-action="legislation-add-law"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editLegislationLaw(); });
    root.querySelectorAll('[data-action="legislation-edit-law"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editLegislationLaw(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="legislation-post-law"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postLegislationLaw(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="legislation-violation"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._recordLegislationViolation(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="legislation-political-impact"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._applyLegislationPoliticalImpact(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="legislation-remove-law"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeLegislationLaw(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="legislation-add-levy"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editLegislationLevy(); });
    root.querySelectorAll('[data-action="legislation-edit-levy"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editLegislationLevy(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="legislation-post-levy"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._postLegislationLevy(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="legislation-remove-levy"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeLegislationLevy(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="legislation-calc-levy"]')?.addEventListener("click", ev => { ev.preventDefault(); this._calculateLegislationLevy(); });
    root.querySelector('[data-action="legislation-post-code"]')?.addEventListener("click", ev => { ev.preventDefault(); this._postLegislationCode(); });
    root.querySelector('[data-action="legislation-clear-history"]')?.addEventListener("click", ev => { ev.preventDefault(); this._clearLegislationHistory(); });

    // v2.2 — navigation rapide dans les fiches très longues.
    root.querySelectorAll('[data-jump-section]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const id = ev.currentTarget.dataset.jumpSection;
      const target = id ? root.querySelector(`#${CSS.escape(id)}`) : null;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      root.querySelectorAll('[data-jump-section]').forEach(btn => btn.classList.toggle("active", btn === ev.currentTarget));
    }));

    root.querySelector('[data-action="add-npc"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._pickNpc();
    });
    root.querySelectorAll('[data-action="open-npc"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._openNpc(ev.currentTarget.dataset.uuid);
    }));
    root.querySelectorAll('[data-action="edit-npc-role"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._editNpcRole(ev.currentTarget.dataset.uuid);
    }));
    root.querySelectorAll('[data-action="remove-npc"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._removeNpc(ev.currentTarget.dataset.uuid);
    }));

    const dropZone = root.querySelector(".npc-drop-zone");
    if (dropZone) {
      dropZone.addEventListener("dragover", ev => {
        ev.preventDefault();
        dropZone.classList.add("drag-over");
      });
      dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
      dropZone.addEventListener("drop", ev => {
        ev.preventDefault();
        dropZone.classList.remove("drag-over");
        this._handleNpcDrop(ev);
      });
    }

    const marketDropZone = root.querySelector(".market-drop-zone");
    if (marketDropZone) {
      marketDropZone.addEventListener("dragover", ev => {
        ev.preventDefault();
        marketDropZone.classList.add("drag-over");
      });
      marketDropZone.addEventListener("dragleave", () => marketDropZone.classList.remove("drag-over"));
      marketDropZone.addEventListener("drop", ev => {
        ev.preventDefault();
        marketDropZone.classList.remove("drag-over");
        this._handleMarketDrop(ev);
      });
    }
  }

  _current() {
    const config = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    config.linkedNpcs = Array.isArray(config.linkedNpcs) ? config.linkedNpcs.map(normalizedNpcLink) : [];
    return { config, derived: calculateSettlement(config) };
  }

  async _saveConfig(config, { render = true } = {}) {
    config.linkedNpcs = Array.isArray(config.linkedNpcs) ? config.linkedNpcs.map(normalizedNpcLink) : [];
    await this.document.update({
      [`flags.${MODULE_ID}.config`]: config,
      [`flags.${MODULE_ID}.derived`]: calculateSettlement(config)
    });
    if (render) this.render();
  }

  async _createLocation() {
    const doc = await createLocation(this.document);
    doc?.sheet.render(true);
    this.render();
  }

  async _createDistrict() {
    const { config } = this._current();
    if (config.parentSettlementId) {
      ui.notifications.warn("Un quartier ne peut pas contenir d'autres quartiers.");
      return;
    }
    const doc = await createDistrict(this.document);
    doc?.sheet.render(true);
    this.render();
  }

  async _detachDistrict(id) {
    const district = game.journal.get(id);
    if (!district) return;
    const config = deepMerge(defaultSettlementConfig(), district.getFlag(MODULE_ID, "config") ?? {});
    config.parentSettlementId = "";
    await district.update({
      [`flags.${MODULE_ID}.config`]: config,
      [`flags.${MODULE_ID}.derived`]: calculateSettlement(config)
    });
    ui.notifications.info(`${district.name} n'est plus rattaché à ${this.document.name}.`);
    this.render();
  }

  async _pickNpc() {
    const actors = game.actors.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!actors.length) {
      ui.notifications.warn("Aucun Actor n'existe dans ce monde.");
      return;
    }
    const options = actors.map(a => `<option value="${escapeHtml(a.uuid)}">${escapeHtml(a.name)}</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog">
        <div class="form-group"><label>PNJ</label><select name="uuid">${options}</select></div>
        <div class="form-group"><label>Rôle / fonction dans la ville</label><input type="text" name="role" placeholder="ex. Capitaine de la garde"></div>
        <p class="hint">Tu peux aussi glisser-déposer directement une fiche d'Actor sur la zone « PNJ liés ».</p>
      </form>`;

    new Dialog({
      title: `Ajouter un PNJ — ${this.document.name}`,
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-link"></i>',
          label: "Lier",
          callback: async html => {
            const form = html.find("form")[0];
            const fd = new FormData(form);
            const uuid = String(fd.get("uuid") || "");
            const role = String(fd.get("role") || "");
            const actor = uuid ? await fromUuid(uuid) : null;
            if (actor?.documentName !== "Actor") return;
            await this._addNpcDocument(actor, role);
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "add"
    }).render(true);
  }

  async _handleNpcDrop(event) {
    const raw = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("application/json") || "";
    if (!raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (data.type !== "Actor" && !String(data.uuid ?? "").startsWith("Actor.") && !String(data.uuid ?? "").includes(".Actor.")) return;
    const uuid = data.uuid ?? (data.id ? `Actor.${data.id}` : "");
    if (!uuid) return;
    try {
      const actor = await fromUuid(uuid);
      if (actor?.documentName !== "Actor") return;
      await this._addNpcDocument(actor, "");
    } catch (err) {
      console.error(`${MODULE_ID} | Drop Actor`, err);
      ui.notifications.warn("Impossible de lier cette fiche de PNJ.");
    }
  }

  async _addNpcDocument(actor, role = "") {
    const { config } = this._current();
    if (config.linkedNpcs.some(link => link.uuid === actor.uuid)) {
      ui.notifications.warn(`${actor.name} est déjà lié à cette ville.`);
      return;
    }
    config.linkedNpcs.push({ uuid: actor.uuid, name: actor.name, img: actor.img, role });
    await this._saveConfig(config);
    ui.notifications.info(`${actor.name} a été lié à ${this.document.name}.`);
  }

  async _openNpc(uuid) {
    try {
      const actor = await fromUuid(uuid);
      if (!actor) {
        ui.notifications.warn("La fiche de ce PNJ est introuvable.");
        return;
      }
      actor.sheet.render(true);
    } catch (err) {
      console.error(`${MODULE_ID} | Open Actor`, err);
      ui.notifications.warn("Impossible d'ouvrir ce PNJ.");
    }
  }

  _editNpcRole(uuid) {
    const { config } = this._current();
    const link = config.linkedNpcs.find(n => n.uuid === uuid);
    if (!link) return;
    const content = `
      <form class="pf1-settlement-dialog">
        <div class="form-group"><label>Rôle / fonction</label><input type="text" name="role" value="${escapeHtml(link.role)}" placeholder="ex. Maire, marchand, chef de guilde..."></div>
      </form>`;
    new Dialog({
      title: `Rôle de ${link.name}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-floppy-disk"></i>',
          label: "Enregistrer",
          callback: async html => {
            const fd = new FormData(html.find("form")[0]);
            link.role = String(fd.get("role") || "");
            await this._saveConfig(config);
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  async _removeNpc(uuid) {
    const { config } = this._current();
    const before = config.linkedNpcs.length;
    config.linkedNpcs = config.linkedNpcs.filter(n => n.uuid !== uuid);
    if (config.linkedNpcs.length === before) return;
    await this._saveConfig(config);
  }

  async _rollMarket() {
    const state = await generateMarketSlots(this.document);
    const tierLabel = MARKET_TIERS;
    const rows = Object.entries(state.slots).map(([tier, result]) =>
      `<tr><td>${tierLabel[tier]}</td><td>${result.formula === "all" ? "Tous" : (result.formula ?? "—")}</td><td><strong>${result.total === "all" ? "Tous" : result.total}</strong></td></tr>`
    ).join("");
    const { derived } = this._current();
    const poverty = derived.market.poverty ? `<p><em>Pauvreté : le nombre obtenu est réduit de moitié.</em></p>` : "";
    await ChatMessage.create({
      speaker: { alias: this.document.name },
      content: `<div class="pf1-settlement-chat"><h3>Marché — ${escapeHtml(this.document.name)}</h3><p>Semaine de marché <strong>${state.week}</strong>.</p>${poverty}<table><thead><tr><th>Puissance</th><th>Jet</th><th>Emplacements</th></tr></thead><tbody>${rows}</tbody></table><p>Ces emplacements représentent les objets magiques dont la valeur dépasse la valeur de base de la communauté.</p></div>`
    });
    this.render();
  }

  async _advanceMarketWeek() {
    const state = await advanceMarketWeek(this.document, { rerollSlots: true, clearSold: true });
    ui.notifications.info(`Marché avancé à la semaine ${state.week}. Les tests de disponibilité peuvent être retentés.`);
    this.render();
  }

  async _pickMarketItem() {
    const items = game.items.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!items.length) {
      ui.notifications.warn("Aucun Item n'existe dans le monde. Tu peux glisser-déposer un objet depuis un compendium PF1 sur la zone de stock.");
      return;
    }
    const options = items.map(i => `<option value="${escapeHtml(i.uuid)}">${escapeHtml(i.name)}</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog">
        <div class="form-group"><label>Objet PF1 du monde</label><select name="uuid">${options}</select></div>
        <p class="hint">Pour un objet de compendium, glisse-dépose directement l'objet sur la zone « Stock structuré ».</p>
      </form>`;
    new Dialog({
      title: `Ajouter au marché — ${this.document.name}`,
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Continuer",
          callback: async html => {
            const fd = new FormData(html.find("form")[0]);
            const uuid = String(fd.get("uuid") || "");
            const item = uuid ? await fromUuid(uuid) : null;
            if (item?.documentName !== "Item") return;
            await this._promptMarketItemSettings(item);
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "add"
    }).render(true);
  }

  async _handleMarketDrop(event) {
    const raw = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("application/json") || "";
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch (_) { return; }
    const uuid = data.uuid ?? (data.type === "Item" && data.id ? `Item.${data.id}` : "");
    if (!uuid) return;
    try {
      const item = await fromUuid(uuid);
      if (item?.documentName !== "Item") return;
      await this._promptMarketItemSettings(item);
    } catch (err) {
      console.error(`${MODULE_ID} | Drop Item`, err);
      ui.notifications.warn("Impossible d'ajouter cet objet au marché.");
    }
  }

  async _promptMarketItemSettings(item, existing = null) {
    const locations = (this._current().config.parentSettlementId
      ? getLocationsForDistrict(this.document)
      : getLocationsForSettlement(this.document, { includeDistricts: true }))
      .slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const tier = existing?.tier ?? "minor";
    const merchantId = existing?.merchantLocationId ?? "";
    const tierOptions = Object.entries(MARKET_TIERS).map(([key, label]) => `<option value="${key}" ${key === tier ? "selected" : ""}>${label}</option>`).join("");
    const locationOptions = [`<option value="">Marché général</option>`, ...locations.map(j => `<option value="${j.id}" ${j.id === merchantId ? "selected" : ""}>${escapeHtml(j.name)}</option>`)].join("");
    const itemPrice = existing?.price ?? getItemPrice(item);
    const content = `
      <form class="pf1-settlement-dialog">
        <p><strong>${escapeHtml(item.name)}</strong></p>
        <div class="form-group"><label>Puissance</label><select name="tier">${tierOptions}</select></div>
        <div class="form-group"><label>Vendeur / établissement</label><select name="merchantLocationId">${locationOptions}</select></div>
        <div class="form-group"><label>Prix (po)</label><input type="number" name="price" min="0" step="1" value="${Number(itemPrice) || 0}"></div>
        <div class="form-group"><label>Quantité</label><input type="number" name="quantity" min="1" step="1" value="${Number(existing?.quantity ?? 1) || 1}"></div>
        <div class="form-group"><label>Notes MJ</label><input type="text" name="notes" value="${escapeHtml(existing?.notes ?? "")}"></div>
      </form>`;
    new Dialog({
      title: existing ? `Modifier — ${item.name}` : `Ajouter — ${item.name}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-floppy-disk"></i>',
          label: existing ? "Enregistrer" : "Ajouter",
          callback: async html => {
            const fd = new FormData(html.find("form")[0]);
            const changes = {
              tier: String(fd.get("tier") || "minor"),
              merchantLocationId: String(fd.get("merchantLocationId") || ""),
              price: Number(fd.get("price") || 0),
              quantity: Number(fd.get("quantity") || 1),
              notes: String(fd.get("notes") || "")
            };
            if (existing) await updateMarketItem(this.document, existing.id, changes);
            else await addMarketItem(this.document, item, changes);
            this.render();
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  async _openMarketItem(uuid) {
    try {
      const item = uuid ? await fromUuid(uuid) : null;
      if (!item) return ui.notifications.warn("Objet introuvable.");
      item.sheet.render(true);
    } catch (err) {
      console.error(`${MODULE_ID} | Open market item`, err);
      ui.notifications.warn("Impossible d'ouvrir cet objet.");
    }
  }

  async _editMarketItem(entryId) {
    const state = getMarketState(this.document);
    const entry = state.stock.find(e => e.id === entryId);
    if (!entry) return;
    let item = null;
    try { item = entry.uuid ? await fromUuid(entry.uuid) : null; } catch (_) {}
    item ??= { name: entry.name, img: entry.img, documentName: "Item" };
    await this._promptMarketItemSettings(item, entry);
  }

  async _toggleMarketSold(entryId) {
    const state = getMarketState(this.document);
    const entry = state.stock.find(e => e.id === entryId);
    if (!entry) return;
    await updateMarketItem(this.document, entryId, { sold: !entry.sold });
    this.render();
  }

  async _removeMarketItem(entryId) {
    await removeMarketItem(this.document, entryId);
    this.render();
  }

  _availabilityCheck() {
    const { derived } = this._current();
    const state = getMarketState(this.document);
    const content = `
      <form class="pf1-settlement-dialog">
        <div class="form-group"><label>Objet</label><input type="text" name="item" placeholder="Nom de l'objet"></div>
        <div class="form-group"><label>Prix (po)</label><input type="number" name="price" min="0" step="1" value="0"></div>
        <p>Valeur de base de la communauté : <strong>${gp(derived.market.baseValue)} po</strong>.</p>
        <p>Semaine de marché actuelle : <strong>${state.week}</strong>.</p>
      </form>`;
    new Dialog({
      title: `Disponibilité — ${this.document.name}`,
      content,
      buttons: {
        test: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Tester",
          callback: async html => {
            const form = html.find("form")[0];
            const fd = new FormData(form);
            const item = String(fd.get("item") || "Objet").trim() || "Objet";
            const price = Math.max(0, Number(fd.get("price") || 0));
            const currentState = getMarketState(this.document);
            const key = `${item}|${price}`.toLocaleLowerCase("fr");
            const previous = currentState.availabilityChecks.find(c => Number(c.week) === Number(currentState.week) && c.key === key);

            if (price > derived.market.baseValue) {
              const explicit = currentState.stock.find(e => !e.sold && String(e.name ?? "").toLocaleLowerCase("fr") === item.toLocaleLowerCase("fr") && Number(e.price ?? 0) === price);
              await ChatMessage.create({
                speaker: { alias: this.document.name },
                content: explicit
                  ? `<p><strong>${escapeHtml(item)}</strong> (${gp(price)} po) dépasse la valeur de base, mais figure dans le stock explicite du marché : <strong>Disponible</strong>.</p>`
                  : `<p><strong>${escapeHtml(item)}</strong> (${gp(price)} po) dépasse la valeur de base de ${gp(derived.market.baseValue)} po : la règle des 75 % ne s'applique pas. Il doit faire partie des objets explicitement disponibles de la communauté.</p>`
              });
              return;
            }

            if (previous) {
              ui.notifications.warn(`Un test a déjà été effectué pour ${item} cette semaine. Avance le marché d'une semaine pour retenter.`);
              await ChatMessage.create({
                speaker: { alias: this.document.name },
                content: `<p><strong>${escapeHtml(item)}</strong> a déjà été testé durant la semaine ${currentState.week} : <strong>${previous.result ? "Disponible" : "Indisponible"}</strong>. Un nouvel essai n'est possible qu'à la semaine suivante.</p>`
              });
              return;
            }

            const roll = await new Roll("1d100").evaluate();
            const ok = Number(roll.total) <= 75;
            await recordAvailabilityCheck(this.document, { item, price, result: ok, rollTotal: roll.total });
            await ChatMessage.create({
              speaker: { alias: this.document.name },
              rolls: [roll],
              content: `<p><strong>${escapeHtml(item)}</strong> — disponibilité 75 % : <strong>${ok ? "Disponible" : "Indisponible"}</strong>.</p>${ok ? "" : `<p>Un nouveau test pourra être effectué à partir de la semaine ${currentState.week + 1}.</p>`}`
            });
            this.render();
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "test"
    }).render(true);
  }

  _callGuard() {
    const { derived } = this._current();
    const law = Number(derived.modifiers.law ?? 0);
    const content = `
      <form class="pf1-settlement-dialog">
        <div class="form-group"><label>Résultat du test de Diplomatie du PJ</label><input type="number" name="diplomacy" value="0"></div>
        <p>Le module ajoutera le modificateur de Loi de la ville : <strong>${signed(law)}</strong>. DD 5.</p>
      </form>`;
    new Dialog({
      title: `Appeler la garde — ${this.document.name}`,
      content,
      buttons: {
        test: {
          icon: '<i class="fas fa-shield-halved"></i>',
          label: "Appeler",
          callback: async html => {
            const form = html.find("form")[0];
            const fd = new FormData(form);
            const diplomacy = Number(fd.get("diplomacy") || 0);
            const total = diplomacy + law;
            if (total < 5) {
              await ChatMessage.create({
                speaker: { alias: this.document.name },
                content: `<p>Appel de la garde : Diplomatie ${diplomacy} ${signed(law)} (Loi) = <strong>${total}</strong> contre DD 5 — <strong>échec</strong>.</p>`
              });
              return;
            }
            const delayRoll = await new Roll("1d6").evaluate();
            let rounds = Number(delayRoll.total) * 10;
            const steps = Math.floor((total - 5) / 5);
            for (let i = 0; i < steps; i++) rounds = Math.max(0, rounds > 10 ? rounds - 10 : rounds - 1);
            const delayText = rounds >= 10 && rounds % 10 === 0 ? `${rounds / 10} minute(s)` : `${rounds} round(s)`;
            await ChatMessage.create({
              speaker: { alias: this.document.name },
              rolls: [delayRoll],
              content: `<p>Appel de la garde : Diplomatie ${diplomacy} ${signed(law)} (Loi) = <strong>${total}</strong> contre DD 5 — <strong>réussite</strong>.</p><p>La garde arrive dans <strong>${delayText}</strong>.</p>`
            });
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "test"
    }).render(true);
  }

  _setLawAlert() {
    const state = getLawState(this.document);
    const options = Object.entries(LAW_ALERT_LEVELS)
      .map(([key, label]) => `<option value="${key}" ${Number(key) === Number(state.alertLevel) ? "selected" : ""}>${key} — ${escapeHtml(label)}</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog law-dialog">
        <div class="form-group"><label>Niveau d'alerte</label><select name="level">${options}</select></div>
        <p class="hint">Le niveau d'alerte est un outil de suivi du module et non une règle officielle du Guide du Maître.</p>
      </form>`;
    new Dialog({
      title: `Niveau d'alerte — ${this.document.name}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-bell"></i>', label: "Appliquer",
          callback: async html => {
            const fd = new FormData(html.find("form")[0]);
            await setAlertLevel(this.document, Number(fd.get("level") || 0));
            this.render();
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  _setLawActor(role) {
    if (!AUTHORITY_ROLES[role]) return;
    const actors = game.actors.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!actors.length) {
      ui.notifications.warn("Aucun Actor n'existe dans ce monde.");
      return;
    }
    const currentUuid = getLawState(this.document).authorityActors?.[role] ?? "";
    const options = actors.map(a => `<option value="${escapeHtml(a.uuid)}" ${a.uuid === currentUuid ? "selected" : ""}>${escapeHtml(a.name)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog law-dialog"><div class="form-group"><label>${escapeHtml(AUTHORITY_ROLES[role])}</label><select name="uuid">${options}</select></div><p class="hint">Le module lie la fiche existante sans recopier ses caractéristiques PF1.</p></form>`;
    new Dialog({
      title: `Assigner — ${AUTHORITY_ROLES[role]}`,
      content,
      buttons: {
        save: { icon: '<i class="fas fa-link"></i>', label: "Assigner", callback: async html => {
          const fd = new FormData(html.find("form")[0]);
          await setAuthorityActor(this.document, role, String(fd.get("uuid") || ""));
          this.render();
        }},
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  async _openLawActor(uuid) {
    if (!uuid) return;
    try {
      const actor = await fromUuid(uuid);
      if (!actor) return ui.notifications.warn("Actor introuvable.");
      actor.sheet.render(true);
    } catch (err) {
      console.error(`${MODULE_ID} | Open authority actor`, err);
      ui.notifications.warn("Impossible d'ouvrir cette fiche.");
    }
  }

  async _clearLawActor(role) {
    if (!AUTHORITY_ROLES[role]) return;
    await clearAuthorityActor(this.document, role);
    this.render();
  }

  _dispatchGuard() {
    const formationOptions = Object.entries(GUARD_FORMATIONS)
      .map(([key, f]) => `<option value="${key}">${escapeHtml(f.label)} — ${escapeHtml(f.summary)} (FP ${escapeHtml(f.cr)})</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog law-dialog">
        <div class="form-group"><label>Formation</label><select name="formationKey">${formationOptions}</select></div>
        <div class="form-group"><label>Lieu</label><select name="locationId">${this._urbanLocationOptions("")}</select></div>
        <div class="form-group"><label>Motif</label><input type="text" name="reason" placeholder="Rixe, recherche, arrestation, renfort..."></div>
        <p class="hint">Les compositions proposées sont celles de la section Milice du Guide du Maître. Le Guide laisse au MJ le choix de la formation selon la dangerosité de la ville ou du quartier.</p>
      </form>`;
    new Dialog({
      title: `Déployer la garde — ${this.document.name}`,
      content,
      buttons: {
        dispatch: { icon: '<i class="fas fa-shield-halved"></i>', label: "Déployer", callback: async html => {
          const fd = new FormData(html.find("form")[0]);
          const formationKey = String(fd.get("formationKey") || "single");
          const locationId = String(fd.get("locationId") || "");
          const reason = String(fd.get("reason") || "");
          const formation = GUARD_FORMATIONS[formationKey];
          if (!formation) return;
          const record = await recordPatrol(this.document, formationKey, { locationId, reason });
          const loc = locationId ? game.journal.get(locationId) : null;
          const where = loc?.name ? `<p><strong>Lieu :</strong> ${escapeHtml(loc.name)}</p>` : "";
          const why = reason ? `<p><strong>Motif :</strong> ${escapeHtml(reason)}</p>` : "";
          await ChatMessage.create({
            speaker: { alias: this.document.name },
            content: `<div class="pf1-settlement-chat"><h3>Déploiement de la garde — ${escapeHtml(this.document.name)}</h3><p><strong>${escapeHtml(record.formationLabel)}</strong> : ${escapeHtml(record.summary)} — FP ${escapeHtml(record.cr)}</p>${where}${why}<p><small>${escapeHtml(formation.source)}</small></p></div>`
          });
          this.render();
        }},
        cancel: { label: "Annuler" }
      },
      default: "dispatch"
    }).render(true);
  }

  async _clearLawPatrolHistory() {
    await clearPatrolHistory(this.document);
    this.render();
  }

  _editLawCrime(crimeId = null) {
    const state = getLawState(this.document);
    const existing = crimeId ? state.crimes.find(c => c.id === crimeId) : null;
    const crime = existing ?? { offense: "", suspectUuid: "", suspectName: "", severity: 2, status: "reported", locationId: "", factionId: "", bounty: 0, fine: 0, sentence: "", evidence: "", notes: "" };
    const actorOptions = [`<option value="">— Aucun Actor / nom libre —</option>`, ...game.actors.contents.slice().sort((a,b)=>a.name.localeCompare(b.name,"fr")).map(a => `<option value="${escapeHtml(a.uuid)}" ${a.uuid === crime.suspectUuid ? "selected" : ""}>${escapeHtml(a.name)}</option>`)].join("");
    const severityOptions = Object.entries(CRIME_SEVERITY).map(([k,v]) => `<option value="${k}" ${Number(k) === Number(crime.severity) ? "selected" : ""}>${k} — ${escapeHtml(v)}</option>`).join("");
    const statusOptions = Object.entries(CRIME_STATUS).map(([k,v]) => `<option value="${k}" ${k === crime.status ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog law-dialog">
        <div class="form-group"><label>Infraction / crime</label><input type="text" name="offense" required value="${escapeHtml(crime.offense)}"></div>
        <div class="form-group"><label>Suspect lié</label><select name="suspectUuid">${actorOptions}</select></div>
        <div class="form-group"><label>Nom libre du suspect</label><input type="text" name="suspectName" value="${escapeHtml(crime.suspectName)}" placeholder="Utilisé si aucun Actor n'est lié"></div>
        <div class="form-group"><label>Gravité</label><select name="severity">${severityOptions}</select></div>
        <div class="form-group"><label>État</label><select name="status">${statusOptions}</select></div>
        <div class="form-group"><label>Lieu</label><select name="locationId">${this._urbanLocationOptions(crime.locationId)}</select></div>
        <div class="form-group"><label>Faction / autorité liée</label><select name="factionId">${this._urbanFactionOptions(crime.factionId)}</select></div>
        <div class="form-group"><label>Prime (po)</label><input type="number" min="0" step="1" name="bounty" value="${Number(crime.bounty) || 0}"></div>
        <div class="form-group"><label>Amende (po)</label><input type="number" min="0" step="1" name="fine" value="${Number(crime.fine) || 0}"></div>
        <div class="form-group"><label>Peine / jugement</label><input type="text" name="sentence" value="${escapeHtml(crime.sentence)}"></div>
        <div class="form-group"><label>Preuves / témoins</label><textarea name="evidence" rows="3">${escapeHtml(crime.evidence)}</textarea></div>
        <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3">${escapeHtml(crime.notes)}</textarea></div>
        <p class="hint">Le registre criminel, les niveaux de gravité, primes et peines sont des outils de suivi du module. Le Guide du Maître ne fournit pas de barème universel de crimes et sentences.</p>
      </form>`;
    new Dialog({
      title: `${existing ? "Modifier" : "Ajouter"} une affaire — ${this.document.name}`,
      content,
      buttons: {
        save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
          const fd = new FormData(html.find("form")[0]);
          const suspectUuid = String(fd.get("suspectUuid") || "");
          let suspectName = String(fd.get("suspectName") || "");
          if (suspectUuid) {
            try { suspectName = (await fromUuid(suspectUuid))?.name ?? suspectName; } catch (_) {}
          }
          const data = {
            offense: String(fd.get("offense") || "Infraction sans nom"),
            suspectUuid, suspectName,
            severity: Number(fd.get("severity") || 2),
            status: String(fd.get("status") || "reported"),
            locationId: String(fd.get("locationId") || ""),
            factionId: String(fd.get("factionId") || ""),
            bounty: Number(fd.get("bounty") || 0),
            fine: Number(fd.get("fine") || 0),
            sentence: String(fd.get("sentence") || ""),
            evidence: String(fd.get("evidence") || ""),
            notes: String(fd.get("notes") || "")
          };
          if (existing) await updateCrime(this.document, existing.id, data); else await addCrime(this.document, data);
          this.render();
        }},
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  async _cycleLawCrime(crimeId) {
    const state = getLawState(this.document);
    const crime = state.crimes.find(c => c.id === crimeId);
    if (!crime) return;
    const order = ["reported", "wanted", "arrested", "judged", "closed"];
    const current = Math.max(0, order.indexOf(crime.status));
    await updateCrime(this.document, crimeId, { status: order[(current + 1) % order.length] });
    this.render();
  }

  async _postLawCrime(crimeId) {
    const state = getLawState(this.document);
    const crime = state.crimes.find(c => c.id === crimeId);
    if (!crime) return;
    let suspectName = crime.suspectName || "Inconnu";
    if (crime.suspectUuid) { try { suspectName = (await fromUuid(crime.suspectUuid))?.name ?? suspectName; } catch (_) {} }
    const loc = crime.locationId ? game.journal.get(crime.locationId) : null;
    const publicLines = [
      `<p><strong>Suspect :</strong> ${escapeHtml(suspectName)}</p>`,
      `<p><strong>État :</strong> ${escapeHtml(CRIME_STATUS[crime.status] ?? crime.status)} · <strong>Gravité :</strong> ${escapeHtml(CRIME_SEVERITY[Number(crime.severity)] ?? "")}</p>`,
      loc ? `<p><strong>Lieu :</strong> ${escapeHtml(loc.name)}</p>` : "",
      Number(crime.bounty) > 0 ? `<p><strong>Prime :</strong> ${gp(crime.bounty)} po</p>` : "",
      Number(crime.fine) > 0 ? `<p><strong>Amende :</strong> ${gp(crime.fine)} po</p>` : "",
      crime.sentence ? `<p><strong>Peine :</strong> ${escapeHtml(crime.sentence)}</p>` : ""
    ].join("");
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>Avis des autorités — ${escapeHtml(crime.offense)}</h3>${publicLines}</div>` });
  }

  async _removeLawCrime(crimeId) {
    await removeCrime(this.document, crimeId);
    this.render();
  }

  _urbanLocationOptions(selected = "") {
    const { config } = this._current();
    const docs = config.parentSettlementId
      ? getLocationsForDistrict(this.document)
      : getLocationsForSettlement(this.document, { includeDistricts: true });
    const rows = docs.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return [`<option value="">— Aucun lieu —</option>`, ...rows.map(j => `<option value="${escapeHtml(j.id)}" ${j.id === selected ? "selected" : ""}>${escapeHtml(j.name)}</option>`)].join("");
  }

  _urbanFactionOptions(selected = "") {
    const docs = getFactionsForSettlement(this.document, { includeDistricts: true })
      .slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return [`<option value="">— Aucune faction —</option>`, ...docs.map(j => `<option value="${escapeHtml(j.id)}" ${j.id === selected ? "selected" : ""}>${escapeHtml(j.name)}</option>`)].join("");
  }

  _rollUrbanEncounter() {
    const { derived } = this._current();
    const danger = Number(derived.danger ?? 0);
    const options = Object.entries(URBAN_ENCOUNTER_TABLES)
      .map(([key, t]) => `<option value="${key}">${escapeHtml(t.label)}</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog">
        <div class="form-group"><label>Zone / table</label><select name="tableKey">${options}</select></div>
        <p>Jet effectué : <strong>1d100 ${signed(danger)}</strong> (Danger), limité entre 1 et 100.</p>
        <p class="hint">Le Guide du Maître indique d'ajouter le modificateur de Danger aux tables urbaines classées du FP le plus faible au plus élevé.</p>
      </form>`;
    new Dialog({
      title: `Rencontre urbaine — ${this.document.name}`,
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>', label: "Lancer",
          callback: async html => {
            const fd = new FormData(html.find("form")[0]);
            const tableKey = String(fd.get("tableKey") || "tavern");
            try {
              const { roll, record } = await rollUrbanEncounter(this.document, tableKey, danger);
              await ChatMessage.create({
                speaker: { alias: this.document.name },
                rolls: [roll],
                content: `<div class="pf1-settlement-chat"><h3>Rencontre urbaine — ${escapeHtml(record.tableLabel)}</h3><p>d100 : <strong>${record.raw}</strong> ${signed(record.danger)} (Danger) = <strong>${record.adjusted}</strong></p><p><strong>${escapeHtml(record.encounter)}</strong> — FP moyen ${escapeHtml(record.cr)}</p><p><small>${escapeHtml(record.source)}</small></p></div>`
              });
              this.render();
            } catch (err) {
              console.error(`${MODULE_ID} | Rencontre urbaine`, err);
              ui.notifications.error("Impossible de résoudre cette rencontre urbaine.");
            }
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "roll"
    }).render(true);
  }

  async _clearUrbanEncounterHistory() {
    await clearEncounterHistory(this.document);
    ui.notifications.info("Historique des rencontres urbaines effacé.");
    this.render();
  }

  _editUrbanRumor(rumorId = null, preset = null) {
    const state = getUrbanState(this.document);
    const existing = rumorId ? state.rumors.find(r => r.id === rumorId) : null;
    const rumor = existing ?? {
      text: preset?.text ?? "",
      truth: preset?.truth ?? "unknown",
      visibility: preset?.visibility ?? "gm",
      sourceLocationId: preset?.sourceLocationId ?? "",
      sourceFactionId: preset?.sourceFactionId ?? "",
      active: true,
      notes: preset?.notes ?? ""
    };
    const truthOptions = Object.entries(RUMOR_TRUTH).map(([k, v]) => `<option value="${k}" ${rumor.truth === k ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
    const visibilityOptions = [
      ["gm", "MJ uniquement"], ["public", "Publique / partageable"]
    ].map(([k, v]) => `<option value="${k}" ${rumor.visibility === k ? "selected" : ""}>${v}</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog urban-dialog">
        <div class="form-group"><label>Rumeur</label><textarea name="text" rows="4" required>${escapeHtml(rumor.text)}</textarea></div>
        <div class="form-group"><label>Véracité (MJ)</label><select name="truth">${truthOptions}</select></div>
        <div class="form-group"><label>Visibilité</label><select name="visibility">${visibilityOptions}</select></div>
        <div class="form-group"><label>Lieu d'origine</label><select name="sourceLocationId">${this._urbanLocationOptions(rumor.sourceLocationId)}</select></div>
        <div class="form-group"><label>Faction liée</label><select name="sourceFactionId">${this._urbanFactionOptions(rumor.sourceFactionId)}</select></div>
        <div class="form-group"><label><input type="checkbox" name="active" ${rumor.active !== false ? "checked" : ""}> Rumeur active</label></div>
        <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3">${escapeHtml(rumor.notes)}</textarea></div>
      </form>`;
    new Dialog({
      title: `${existing ? "Modifier" : "Ajouter"} une rumeur — ${this.document.name}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer",
          callback: async html => {
            const form = html.find("form")[0];
            const fd = new FormData(form);
            const changes = {
              text: String(fd.get("text") || "").trim(),
              truth: String(fd.get("truth") || "unknown"),
              visibility: String(fd.get("visibility") || "gm"),
              sourceLocationId: String(fd.get("sourceLocationId") || ""),
              sourceFactionId: String(fd.get("sourceFactionId") || ""),
              active: fd.get("active") === "on",
              notes: String(fd.get("notes") || "")
            };
            if (!changes.text) return ui.notifications.warn("La rumeur ne peut pas être vide.");
            if (existing) await updateRumor(this.document, existing.id, changes);
            else await addRumor(this.document, changes);
            this.render();
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  async _toggleUrbanRumor(rumorId) {
    const state = getUrbanState(this.document);
    const rumor = state.rumors.find(r => r.id === rumorId);
    if (!rumor) return;
    await updateRumor(this.document, rumorId, { active: !rumor.active });
    this.render();
  }

  async _postUrbanRumor(rumorId) {
    const state = getUrbanState(this.document);
    const rumor = state.rumors.find(r => r.id === rumorId);
    if (!rumor) return;
    const location = rumor.sourceLocationId ? game.journal.get(rumor.sourceLocationId) : null;
    const source = location ? `<p><small>Entendue à : ${escapeHtml(location.name)}</small></p>` : "";
    await ChatMessage.create({
      speaker: { alias: this.document.name },
      content: `<div class="pf1-settlement-chat"><h3>Rumeur — ${escapeHtml(this.document.name)}</h3><p>${escapeHtml(rumor.text)}</p>${source}</div>`
    });
  }

  async _removeUrbanRumor(rumorId) {
    await removeRumor(this.document, rumorId);
    this.render();
  }

  _editUrbanEvent(eventId = null, preset = null) {
    const state = getUrbanState(this.document);
    const existing = eventId ? state.events.find(e => e.id === eventId) : null;
    const evt = existing ?? {
      title: preset?.title ?? "Événement urbain",
      description: preset?.description ?? "",
      status: preset?.status ?? "planned",
      severity: Number(preset?.severity ?? 2),
      visibility: preset?.visibility ?? "gm",
      locationId: preset?.locationId ?? "",
      factionId: preset?.factionId ?? "",
      notes: preset?.notes ?? ""
    };
    const statusOptions = Object.entries(URBAN_EVENT_STATUS).map(([k, v]) => `<option value="${k}" ${evt.status === k ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
    const severityOptions = Object.entries(URBAN_EVENT_SEVERITY).map(([k, v]) => `<option value="${k}" ${Number(evt.severity) === Number(k) ? "selected" : ""}>${k} — ${escapeHtml(v)}</option>`).join("");
    const visibilityOptions = [["gm","MJ uniquement"],["public","Publique / partageable"]].map(([k,v]) => `<option value="${k}" ${evt.visibility === k ? "selected" : ""}>${v}</option>`).join("");
    const content = `
      <form class="pf1-settlement-dialog urban-dialog">
        <div class="form-group"><label>Titre</label><input type="text" name="title" value="${escapeHtml(evt.title)}" required></div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="4">${escapeHtml(evt.description)}</textarea></div>
        <div class="form-group"><label>État</label><select name="status">${statusOptions}</select></div>
        <div class="form-group"><label>Gravité</label><select name="severity">${severityOptions}</select></div>
        <div class="form-group"><label>Visibilité</label><select name="visibility">${visibilityOptions}</select></div>
        <div class="form-group"><label>Lieu</label><select name="locationId">${this._urbanLocationOptions(evt.locationId)}</select></div>
        <div class="form-group"><label>Faction impliquée</label><select name="factionId">${this._urbanFactionOptions(evt.factionId)}</select></div>
        <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3">${escapeHtml(evt.notes)}</textarea></div>
      </form>`;
    new Dialog({
      title: `${existing ? "Modifier" : "Ajouter"} un événement — ${this.document.name}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer",
          callback: async html => {
            const fd = new FormData(html.find("form")[0]);
            const changes = {
              title: String(fd.get("title") || "Événement urbain").trim(),
              description: String(fd.get("description") || ""),
              status: String(fd.get("status") || "planned"),
              severity: Number(fd.get("severity") || 2),
              visibility: String(fd.get("visibility") || "gm"),
              locationId: String(fd.get("locationId") || ""),
              factionId: String(fd.get("factionId") || ""),
              notes: String(fd.get("notes") || "")
            };
            if (existing) await updateUrbanEvent(this.document, existing.id, changes);
            else await addUrbanEvent(this.document, changes);
            this.render();
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  _inspireUrbanEvent() {
    const idea = getRandomUrbanEventInspiration();
    this._editUrbanEvent(null, { ...idea, status: "planned", severity: 2, visibility: "gm" });
  }

  async _cycleUrbanEvent(eventId) {
    const state = getUrbanState(this.document);
    const evt = state.events.find(e => e.id === eventId);
    if (!evt) return;
    const next = { planned: "active", active: "resolved", resolved: "planned" }[evt.status] ?? "planned";
    await updateUrbanEvent(this.document, eventId, { status: next });
    this.render();
  }

  async _postUrbanEvent(eventId) {
    const state = getUrbanState(this.document);
    const evt = state.events.find(e => e.id === eventId);
    if (!evt) return;
    const location = evt.locationId ? game.journal.get(evt.locationId) : null;
    const where = location ? `<p><small>Lieu : ${escapeHtml(location.name)}</small></p>` : "";
    await ChatMessage.create({
      speaker: { alias: this.document.name },
      content: `<div class="pf1-settlement-chat"><h3>${escapeHtml(evt.title)}</h3>${evt.description ? `<p>${escapeHtml(evt.description)}</p>` : ""}${where}</div>`
    });
  }

  async _removeUrbanEvent(eventId) {
    await removeUrbanEvent(this.document, eventId);
    this.render();
  }

  _calendarMonthOptions(selected = 1) {
    const state = getCalendarState(this.document);
    return state.config.months.map((m, i) => `<option value="${i + 1}" ${Number(selected) === i + 1 ? "selected" : ""}>${escapeHtml(m.name)} (${m.days} j)</option>`).join("");
  }

  _calendarDateFields(prefix, date) {
    const state = getCalendarState(this.document);
    const d = date ?? state.current;
    return `<div class="calendar-date-fields"><label>Jour <input type="number" min="1" name="${prefix}Day" value="${Number(d.day) || 1}"></label><label>Mois <select name="${prefix}Month">${this._calendarMonthOptions(d.month)}</select></label><label>Année <input type="number" min="1" name="${prefix}Year" value="${Number(d.year) || 1}"></label></div>`;
  }

  _calendarSettings() {
    const state = getCalendarState(this.document);
    const monthNames = state.config.months.map(m => m.name).join(", ");
    const monthDays = state.config.months.map(m => m.days).join(", ");
    const weekdays = state.config.weekdays.join(", ");
    const content = `<form class="pf1-settlement-dialog calendar-dialog">
      <div class="form-group"><label>Nom de l'année</label><input type="text" name="yearLabel" value="${escapeHtml(state.config.yearLabel)}"></div>
      <div class="form-group"><label>Noms des mois</label><textarea name="monthNames" rows="3">${escapeHtml(monthNames)}</textarea></div>
      <div class="form-group"><label>Durée des mois (jours)</label><textarea name="monthDays" rows="2">${escapeHtml(monthDays)}</textarea></div>
      <div class="form-group"><label>Jours de la semaine</label><textarea name="weekdays" rows="2">${escapeHtml(weekdays)}</textarea></div>
      <div class="form-group"><label><input type="checkbox" name="syncMarketWeeks" ${state.config.syncMarketWeeks ? "checked" : ""}> Synchroniser chaque tranche de 7 jours avec une nouvelle semaine de marché</label></div>
      <p class="hint">Le Guide du Maître recommande de définir la longueur des années, saisons, mois et semaines, mais ne fixe pas ici un calendrier universel. Les valeurs par défaut du module sont donc volontairement génériques et entièrement modifiables.</p>
    </form>`;
    new Dialog({ title: `Configurer le calendrier — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const names = String(fd.get("monthNames") || "").split(",").map(v => v.trim()).filter(Boolean);
        const days = String(fd.get("monthDays") || "").split(",").map(v => Math.max(1, Number(v.trim()) || 30));
        const count = Math.max(1, Math.min(24, names.length || days.length || 12));
        const months = Array.from({ length: count }, (_, i) => ({ name: names[i] || `Mois ${i + 1}`, days: days[i] || 30 }));
        const week = String(fd.get("weekdays") || "").split(",").map(v => v.trim()).filter(Boolean);
        await configureCalendar(this.document, { yearLabel: String(fd.get("yearLabel") || "année"), months, weekdays: week.length ? week : undefined, syncMarketWeeks: fd.get("syncMarketWeeks") === "on" });
        this.render();
      }},
      cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  _calendarSetDate() {
    const state = getCalendarState(this.document);
    const content = `<form class="pf1-settlement-dialog calendar-dialog">${this._calendarDateFields("date", state.current)}<p class="hint">Changer directement la date ne fait pas progresser automatiquement le marché. Pour simuler le passage du temps, utilise plutôt « Avancer ».</p></form>`;
    new Dialog({ title: `Date de campagne — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-calendar-check"></i>', label: "Définir", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        await setCalendarDate(this.document, { year: Number(fd.get("dateYear") || 1), month: Number(fd.get("dateMonth") || 1), day: Number(fd.get("dateDay") || 1) });
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _calendarAdvance(days) {
    if (!game.user.isGM) return;
    const result = await advanceCalendar(this.document, days);
    for (let i = 0; i < Number(result.marketWeeksElapsed || 0); i++) await advanceMarketWeek(this.document);
    if (result.marketWeeksElapsed) ui.notifications.info(`${result.marketWeeksElapsed} semaine(s) de marché renouvelée(s).`);
    this.render();
  }

  _calendarAdvanceCustom() {
    const content = `<form class="pf1-settlement-dialog calendar-dialog"><div class="form-group"><label>Nombre de jours</label><input type="number" min="1" name="days" value="1"></div></form>`;
    new Dialog({ title: `Avancer le temps — ${this.document.name}`, content, buttons: {
      go: { icon: '<i class="fas fa-forward"></i>', label: "Avancer", callback: async html => { const fd = new FormData(html.find("form")[0]); await this._calendarAdvance(Math.max(1, Number(fd.get("days") || 1))); } },
      cancel: { label: "Annuler" }
    }, default: "go" }).render(true);
  }

  _editCalendarEntry(entryId = null) {
    const state = getCalendarState(this.document);
    const existing = entryId ? state.entries.find(e => e.id === entryId) : null;
    const e = existing ?? { title: "", type: "festival", date: state.current, recurrence: "none", visibility: "public", status: "planned", locationId: "", factionId: "", description: "", notes: "" };
    const typeOptions = Object.entries(CALENDAR_ENTRY_TYPES).map(([k,v]) => `<option value="${k}" ${e.type === k ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog calendar-dialog">
      <div class="form-group"><label>Titre</label><input type="text" name="title" value="${escapeHtml(e.title)}" required></div>
      <div class="form-group"><label>Type</label><select name="type">${typeOptions}</select></div>
      ${this._calendarDateFields("entry", e.date)}
      <div class="form-group"><label>Récurrence</label><select name="recurrence"><option value="none" ${e.recurrence === "none" ? "selected" : ""}>Ponctuel</option><option value="yearly" ${e.recurrence === "yearly" ? "selected" : ""}>Annuel</option></select></div>
      <div class="form-group"><label>Visibilité</label><select name="visibility"><option value="public" ${e.visibility === "public" ? "selected" : ""}>Publique</option><option value="gm" ${e.visibility === "gm" ? "selected" : ""}>MJ uniquement</option></select></div>
      <div class="form-group"><label>Lieu</label><select name="locationId">${this._urbanLocationOptions(e.locationId)}</select></div>
      <div class="form-group"><label>Faction</label><select name="factionId">${this._urbanFactionOptions(e.factionId)}</select></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="3">${escapeHtml(e.description)}</textarea></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3">${escapeHtml(e.notes)}</textarea></div>
    </form>`;
    new Dialog({ title: `${existing ? "Modifier" : "Ajouter"} une date — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const changes = { title: String(fd.get("title") || "Événement"), type: String(fd.get("type") || "event"), date: { year: Number(fd.get("entryYear") || 1), month: Number(fd.get("entryMonth") || 1), day: Number(fd.get("entryDay") || 1) }, recurrence: String(fd.get("recurrence") || "none"), visibility: String(fd.get("visibility") || "public"), locationId: String(fd.get("locationId") || ""), factionId: String(fd.get("factionId") || ""), description: String(fd.get("description") || ""), notes: String(fd.get("notes") || "") };
        if (existing) await updateCalendarEntry(this.document, existing.id, changes); else await addCalendarEntry(this.document, changes);
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _postCalendarEntry(entryId) {
    const state = getCalendarState(this.document);
    const e = state.entries.find(x => x.id === entryId);
    if (!e) return;
    const where = e.locationId ? game.journal.get(e.locationId)?.name : "";
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>${escapeHtml(e.title)}</h3><p><strong>${escapeHtml(CALENDAR_ENTRY_TYPES[e.type] ?? e.type)}</strong> · ${escapeHtml(formatCalendarDate(e.date, state.config))}</p>${e.description ? `<p>${escapeHtml(e.description)}</p>` : ""}${where ? `<p><small>Lieu : ${escapeHtml(where)}</small></p>` : ""}</div>` });
  }

  async _removeCalendarEntry(entryId) { await removeCalendarEntry(this.document, entryId); this.render(); }

  _editCalendarProject(projectId = null) {
    const state = getCalendarState(this.document);
    const existing = projectId ? state.projects.find(p => p.id === projectId) : null;
    const p = existing ?? { title: "", type: "construction", startDate: state.current, durationDays: 30, status: "planned", locationId: "", factionId: "", description: "", notes: "" };
    const typeOptions = Object.entries(PROJECT_TYPES).map(([k,v]) => `<option value="${k}" ${p.type === k ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
    const statusOptions = Object.entries(PROJECT_STATUS).map(([k,v]) => `<option value="${k}" ${p.status === k ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog calendar-dialog">
      <div class="form-group"><label>Projet</label><input type="text" name="title" value="${escapeHtml(p.title)}" required></div>
      <div class="form-group"><label>Type</label><select name="type">${typeOptions}</select></div>
      ${this._calendarDateFields("project", p.startDate)}
      <div class="form-group"><label>Durée (jours)</label><input type="number" min="1" name="durationDays" value="${Number(p.durationDays) || 30}"></div>
      <div class="form-group"><label>État</label><select name="status">${statusOptions}</select></div>
      <div class="form-group"><label>Lieu</label><select name="locationId">${this._urbanLocationOptions(p.locationId)}</select></div>
      <div class="form-group"><label>Faction responsable</label><select name="factionId">${this._urbanFactionOptions(p.factionId)}</select></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="3">${escapeHtml(p.description)}</textarea></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3">${escapeHtml(p.notes)}</textarea></div>
      <p class="hint">Les travaux et leur durée sont un outil de campagne du module. Le Guide du Maître recommande de faire vivre le monde pendant les périodes d'immobilisation, sans fournir ici un barème universel de construction.</p>
    </form>`;
    new Dialog({ title: `${existing ? "Modifier" : "Ajouter"} un projet — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const changes = { title: String(fd.get("title") || "Projet"), type: String(fd.get("type") || "construction"), startDate: { year: Number(fd.get("projectYear") || 1), month: Number(fd.get("projectMonth") || 1), day: Number(fd.get("projectDay") || 1) }, durationDays: Number(fd.get("durationDays") || 30), status: String(fd.get("status") || "planned"), locationId: String(fd.get("locationId") || ""), factionId: String(fd.get("factionId") || ""), description: String(fd.get("description") || ""), notes: String(fd.get("notes") || "") };
        if (existing) await updateProject(this.document, existing.id, changes); else await addProject(this.document, changes);
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _removeCalendarProject(projectId) { await removeProject(this.document, projectId); this.render(); }

  _calendarPopulationChange() {
    const state = getCalendarState(this.document);
    const cfg = this.document.getFlag(MODULE_ID, "config") ?? {};
    const typeOptions = Object.entries(POPULATION_CHANGE_TYPES).map(([k,v]) => `<option value="${k}">${escapeHtml(v)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog calendar-dialog">
      <div class="form-group"><label>Population actuelle</label><input type="text" name="basePopulation" value="${escapeHtml(cfg.population || "")}" placeholder="Ex. 43270"></div>
      <div class="form-group"><label>Variation</label><input type="number" name="delta" value="0"></div>
      <div class="form-group"><label>Type</label><select name="type">${typeOptions}</select></div>
      <div class="form-group"><label>Raison</label><input type="text" name="reason" value="Évolution de population"></div>
      ${this._calendarDateFields("pop", state.current)}
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3"></textarea></div>
      <p class="hint">Cette fonction met aussi à jour le champ « Population » de la fiche. Les variations démographiques sont un outil de suivi du module, pas un barème imposé par le Guide du Maître.</p>
    </form>`;
    new Dialog({ title: `Évolution de population — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-users"></i>', label: "Appliquer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        try {
          await applyPopulationChange(this.document, Number(fd.get("delta") || 0), { basePopulation: String(fd.get("basePopulation") || ""), type: String(fd.get("type") || "other"), reason: String(fd.get("reason") || "Évolution de population"), date: { year: Number(fd.get("popYear") || 1), month: Number(fd.get("popMonth") || 1), day: Number(fd.get("popDay") || 1) }, notes: String(fd.get("notes") || "") });
          this.render();
        } catch (err) { ui.notifications.warn(err?.message || "Impossible d'appliquer la variation de population."); }
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _calendarClearPopulation() { await clearPopulationHistory(this.document); this.render(); }
  async _calendarClearTimeline() { await clearTimeline(this.document); this.render(); }

  _politicsActorOptions(selected = "") {
    const actors = game.actors.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return [`<option value="">— Aucun Actor / groupe libre —</option>`, ...actors.map(a => `<option value="${escapeHtml(a.uuid)}" ${a.uuid === selected ? "selected" : ""}>${escapeHtml(a.name)}</option>`)].join("");
  }

  _setPoliticsOpinion() {
    const state = getPoliticsState(this.document);
    const current = opinionForScore(state.publicOpinion);
    const content = `<form class="pf1-settlement-dialog politics-dialog">
      <div class="form-group"><label>Opinion publique (-100 à +100)</label><input type="number" min="-100" max="100" step="1" name="score" value="${Number(state.publicOpinion) || 0}"></div>
      <p>Attitude actuelle : <strong>${escapeHtml(current.label)}</strong>.</p>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="4">${escapeHtml(state.opinionNotes)}</textarea></div>
      <p class="hint">Le score et ses seuils sont un outil de suivi du module. Les termes hostile, inamicale, indifférente, amicale et serviable reprennent le vocabulaire d'attitude de Pathfinder, mais Pathfinder ne donne pas ici de score global d'opinion pour une ville.</p>
    </form>`;
    new Dialog({ title: `Opinion publique — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        await setPublicOpinion(this.document, Number(fd.get("score") || 0), String(fd.get("notes") || ""));
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  _setPoliticsUnrest() {
    const state = getPoliticsState(this.document);
    const options = Object.entries(UNREST_LEVELS).map(([k, label]) => `<option value="${k}" ${Number(k) === Number(state.unrestLevel) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog politics-dialog">
      <div class="form-group"><label>Troubles sociaux</label><select name="level">${options}</select></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="4">${escapeHtml(state.unrestNotes)}</textarea></div>
      <p class="hint">Cette échelle de 0 à 5 sert à suivre l'état politique de la communauté. Ce n'est pas une mécanique officielle du Guide du Maître.</p>
    </form>`;
    new Dialog({ title: `Troubles sociaux — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        await setUnrestLevel(this.document, Number(fd.get("level") || 0), String(fd.get("notes") || ""));
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  _politicsCommunityCheck() {
    const { derived } = this._current();
    const options = Object.entries(COMMUNITY_SKILL_CHECKS).map(([key, check]) => {
      const value = Number(derived.modifiers?.[check.modifier] ?? 0);
      return `<option value="${key}">${escapeHtml(check.label)} — ${escapeHtml(MODIFIER_LABELS[check.modifier] ?? check.modifier)} ${signed(value)}</option>`;
    }).join("");
    const content = `<form class="pf1-settlement-dialog politics-dialog">
      <div class="form-group"><label>Situation</label><select name="checkKey">${options}</select></div>
      <div class="form-group"><label>Bonus du personnage à la compétence</label><input type="number" name="skillBonus" value="0" step="1"></div>
      <p class="hint">Le module lance 1d20 + bonus de compétence + modificateur de communauté approprié. Il ne fixe pas le DD : utilise celui de la règle ou de la situation concernée.</p>
    </form>`;
    new Dialog({ title: `Test de communauté — ${this.document.name}`, content, buttons: {
      roll: { icon: '<i class="fas fa-dice-d20"></i>', label: "Lancer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const key = String(fd.get("checkKey") || "diplomacyNonGovernment");
        const check = COMMUNITY_SKILL_CHECKS[key];
        if (!check) return;
        const skillBonus = Number(fd.get("skillBonus") || 0);
        const community = Number(derived.modifiers?.[check.modifier] ?? 0);
        const roll = await new Roll("1d20 + @skill + @community", { skill: skillBonus, community }).evaluate();
        await ChatMessage.create({
          speaker: { alias: this.document.name },
          rolls: [roll],
          content: `<div class="pf1-settlement-chat"><h3>${escapeHtml(check.label)}</h3><p><strong>${escapeHtml(check.skill)}</strong> ${signed(skillBonus)} + <strong>${escapeHtml(MODIFIER_LABELS[check.modifier] ?? check.modifier)}</strong> ${signed(community)}</p><p>${escapeHtml(check.rule)}</p><p><small>Le DD dépend de la situation et n'est pas déterminé par cet outil.</small></p></div>`
        });
      }}, cancel: { label: "Annuler" }
    }, default: "roll" }).render(true);
  }

  async _postPoliticsOverview() {
    const state = getPoliticsState(this.document);
    const opinion = opinionForScore(state.publicOpinion);
    const unrest = UNREST_LEVELS[state.unrestLevel] ?? UNREST_LEVELS[0];
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>Climat politique — ${escapeHtml(this.document.name)}</h3><p><strong>Opinion publique :</strong> ${escapeHtml(opinion.label)} (${signed(state.publicOpinion)})</p><p><strong>Troubles sociaux :</strong> ${escapeHtml(unrest)}</p></div>` });
  }

  _editPoliticsReputation(reputationId = null) {
    const state = getPoliticsState(this.document);
    const existing = reputationId ? state.reputations.find(r => r.id === reputationId) : null;
    const rep = existing ?? { subjectName: "", actorUuid: "", score: 0, visibility: "public", notes: "" };
    const attitude = opinionForScore(rep.score);
    const content = `<form class="pf1-settlement-dialog politics-dialog">
      <div class="form-group"><label>Actor PF1 (optionnel)</label><select name="actorUuid">${this._politicsActorOptions(rep.actorUuid)}</select></div>
      <div class="form-group"><label>Nom du personnage / groupe</label><input type="text" name="subjectName" value="${escapeHtml(rep.subjectName)}" placeholder="Ex. Les héros de la Baie"></div>
      <div class="form-group"><label>Réputation locale (-100 à +100)</label><input type="number" min="-100" max="100" step="1" name="score" value="${Number(rep.score) || 0}"></div>
      <p>Attitude correspondante actuellement : <strong>${escapeHtml(attitude.label)}</strong>.</p>
      <div class="form-group"><label>Visibilité</label><select name="visibility"><option value="public" ${rep.visibility !== "gm" ? "selected" : ""}>Publique</option><option value="gm" ${rep.visibility === "gm" ? "selected" : ""}>MJ uniquement</option></select></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="4">${escapeHtml(rep.notes)}</textarea></div>
      <p class="hint">La réputation locale chiffrée est un outil du module ; elle ne remplace pas les règles normales de Diplomatie et d'attitude des PNJ.</p>
    </form>`;
    new Dialog({ title: `${existing ? "Modifier" : "Ajouter"} une réputation — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const actorUuid = String(fd.get("actorUuid") || "");
        let subjectName = String(fd.get("subjectName") || "").trim();
        if (actorUuid) {
          try { subjectName ||= (await fromUuid(actorUuid))?.name ?? ""; } catch (_) {}
        }
        subjectName ||= "Personnage / groupe";
        const changes = { actorUuid, subjectName, score: Number(fd.get("score") || 0), visibility: String(fd.get("visibility") || "public"), notes: String(fd.get("notes") || "") };
        if (existing) await updateLocalReputation(this.document, existing.id, changes); else await addLocalReputation(this.document, changes);
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _openPoliticsActor(uuid) {
    if (!uuid) return;
    try {
      const actor = await fromUuid(uuid);
      actor?.sheet?.render(true);
    } catch (err) {
      console.error(`${MODULE_ID} | Open politics actor`, err);
      ui.notifications.warn("Actor introuvable.");
    }
  }

  async _postPoliticsReputation(reputationId) {
    const state = getPoliticsState(this.document);
    const rep = state.reputations.find(r => r.id === reputationId);
    if (!rep) return;
    let name = rep.subjectName || "Personnage / groupe";
    if (rep.actorUuid) { try { name = (await fromUuid(rep.actorUuid))?.name ?? name; } catch (_) {} }
    const attitude = opinionForScore(rep.score);
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>Réputation locale</h3><p><strong>${escapeHtml(name)}</strong> : ${escapeHtml(attitude.label)} (${signed(rep.score)})</p></div>` });
  }

  async _removePoliticsReputation(reputationId) {
    await removeLocalReputation(this.document, reputationId);
    this.render();
  }

  _editPoliticsTension(tensionId = null) {
    const state = getPoliticsState(this.document);
    const existing = tensionId ? state.tensions.find(t => t.id === tensionId) : null;
    const tension = existing ?? { factionAId: "", factionBId: "", level: 1, trend: "stable", issue: "", visibility: "public", notes: "" };
    const factionDocs = getFactionsForSettlement(this.document, { includeDistricts: true });
    if (factionDocs.length < 2 && !existing) {
      ui.notifications.warn("Il faut au moins deux factions liées à cette ville ou ce quartier pour enregistrer une tension structurée.");
      return;
    }
    const levelOptions = Object.entries(FACTION_TENSION_LEVELS).map(([k, label]) => `<option value="${k}" ${Number(k) === Number(tension.level) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const trendOptions = Object.entries(TENSION_TRENDS).map(([k, label]) => `<option value="${k}" ${k === tension.trend ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog politics-dialog">
      <div class="form-group"><label>Faction A</label><select name="factionAId" required>${this._urbanFactionOptions(tension.factionAId)}</select></div>
      <div class="form-group"><label>Faction B</label><select name="factionBId" required>${this._urbanFactionOptions(tension.factionBId)}</select></div>
      <div class="form-group"><label>Niveau de tension</label><select name="level">${levelOptions}</select></div>
      <div class="form-group"><label>Tendance</label><select name="trend">${trendOptions}</select></div>
      <div class="form-group"><label>Enjeu / cause</label><input type="text" name="issue" value="${escapeHtml(tension.issue)}" placeholder="Ex. contrôle des quais"></div>
      <div class="form-group"><label>Visibilité</label><select name="visibility"><option value="public" ${tension.visibility !== "gm" ? "selected" : ""}>Publique</option><option value="gm" ${tension.visibility === "gm" ? "selected" : ""}>MJ uniquement</option></select></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="4">${escapeHtml(tension.notes)}</textarea></div>
      <p class="hint">L'échelle de tension est un outil narratif du module et ne modifie pas automatiquement les statistiques PF1 des factions ou de la communauté.</p>
    </form>`;
    new Dialog({ title: `${existing ? "Modifier" : "Ajouter"} une tension — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const changes = { factionAId: String(fd.get("factionAId") || ""), factionBId: String(fd.get("factionBId") || ""), level: Number(fd.get("level") || 1), trend: String(fd.get("trend") || "stable"), issue: String(fd.get("issue") || ""), visibility: String(fd.get("visibility") || "public"), notes: String(fd.get("notes") || "") };
        if (!changes.factionAId || !changes.factionBId) return ui.notifications.warn("Choisis deux factions.");
        try {
          if (existing) await updateFactionTension(this.document, existing.id, changes); else await addFactionTension(this.document, changes);
          this.render();
        } catch (err) { ui.notifications.warn(err?.message || "Impossible d'enregistrer la tension."); }
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _postPoliticsTension(tensionId) {
    const state = getPoliticsState(this.document);
    const tension = state.tensions.find(t => t.id === tensionId);
    if (!tension) return;
    const a = tension.factionAId ? game.journal.get(tension.factionAId)?.name : "Faction A";
    const b = tension.factionBId ? game.journal.get(tension.factionBId)?.name : "Faction B";
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>Tension politique</h3><p><strong>${escapeHtml(a ?? "Faction A")}</strong> ↔ <strong>${escapeHtml(b ?? "Faction B")}</strong></p><p>${escapeHtml(FACTION_TENSION_LEVELS[Number(tension.level)] ?? "Tension")} · ${escapeHtml(TENSION_TRENDS[tension.trend] ?? "Stable")}</p>${tension.issue ? `<p>${escapeHtml(tension.issue)}</p>` : ""}</div>` });
  }

  async _removePoliticsTension(tensionId) {
    await removeFactionTension(this.document, tensionId);
    this.render();
  }

  _addPoliticsConsequence() {
    const state = getPoliticsState(this.document);
    const calendarState = getCalendarState(this.document);
    const campaignDate = formatCalendarDate(calendarState.current, calendarState.config, { includeWeekday: false });
    const content = `<form class="pf1-settlement-dialog politics-dialog">
      <div class="form-group"><label>Action / conséquence</label><input type="text" name="title" value="" placeholder="Ex. Les PJ sauvent le quartier des Docks" required></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="3"></textarea></div>
      <div class="form-group"><label>Variation d'opinion publique</label><input type="number" min="-100" max="100" step="1" name="publicOpinionDelta" value="0"></div>
      <div class="form-group"><label>Variation des troubles sociaux</label><input type="number" min="-5" max="5" step="1" name="unrestDelta" value="0"></div>
      <div class="form-group"><label>Faction principalement concernée</label><select name="factionId">${this._urbanFactionOptions("")}</select></div>
      <div class="form-group"><label>Visibilité</label><select name="visibility"><option value="public">Publique</option><option value="gm">MJ uniquement</option></select></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3"></textarea></div>
      <p>État actuel : opinion <strong>${signed(state.publicOpinion)}</strong> · troubles <strong>${escapeHtml(UNREST_LEVELS[state.unrestLevel] ?? UNREST_LEVELS[0])}</strong>.</p>
      <p class="hint">Les variations sont choisies par le MJ et constituent un outil de suivi narratif. Elles ne sont pas un barème officiel de Pathfinder.</p>
    </form>`;
    new Dialog({ title: `Conséquence politique — ${this.document.name}`, content, buttons: {
      apply: { icon: '<i class="fas fa-scale-balanced"></i>', label: "Appliquer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        await applyPoliticalConsequence(this.document, {
          title: String(fd.get("title") || "Conséquence politique"),
          description: String(fd.get("description") || ""),
          publicOpinionDelta: Number(fd.get("publicOpinionDelta") || 0),
          unrestDelta: Number(fd.get("unrestDelta") || 0),
          factionId: String(fd.get("factionId") || ""),
          visibility: String(fd.get("visibility") || "public"),
          notes: String(fd.get("notes") || ""),
          campaignDate
        });
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "apply" }).render(true);
  }

  async _postPoliticsConsequence(consequenceId) {
    const state = getPoliticsState(this.document);
    const c = state.consequences.find(x => x.id === consequenceId);
    if (!c) return;
    const faction = c.factionId ? game.journal.get(c.factionId)?.name : "";
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>${escapeHtml(c.title)}</h3>${c.campaignDate ? `<p><small>${escapeHtml(c.campaignDate)}</small></p>` : ""}${c.description ? `<p>${escapeHtml(c.description)}</p>` : ""}<p><strong>Opinion :</strong> ${signed(c.publicOpinionDelta)} · <strong>Troubles :</strong> ${signed(c.unrestDelta)}</p>${faction ? `<p><small>Faction concernée : ${escapeHtml(faction)}</small></p>` : ""}</div>` });
  }

  async _removePoliticsConsequence(consequenceId) {
    await removePoliticalConsequence(this.document, consequenceId);
    this.render();
  }

  async _clearPoliticsHistory() {
    await clearPoliticalHistory(this.document);
    this.render();
  }

  _legislationCampaignDate() {
    const state = getCalendarState(this.document);
    return formatCalendarDate(state.current, state.config, { includeWeekday: false });
  }

  _editLegislationLaw(lawId = null) {
    const state = getLegislationState(this.document);
    const existing = lawId ? state.laws.find(l => l.id === lawId) : null;
    const law = existing ?? {
      title: "", type: "law", status: "active", description: "", scope: "Toute la communauté",
      enforcement: "", penalty: "", issuingFactionId: "", locationId: "", effectiveDate: this._legislationCampaignDate(),
      visibility: "public", crimeSeverity: 2, defaultFine: 0, defaultSentence: "", publicOpinionDelta: 0,
      unrestDelta: 0, notes: ""
    };
    const typeOptions = Object.entries(LEGISLATION_TYPES).map(([k, label]) => `<option value="${k}" ${k === law.type ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const statusOptions = Object.entries(LEGISLATION_STATUS).map(([k, label]) => `<option value="${k}" ${k === law.status ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const severityOptions = Object.entries(CRIME_SEVERITY).map(([k, label]) => `<option value="${k}" ${Number(k) === Number(law.crimeSeverity) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog legislation-dialog">
      <div class="form-group"><label>Nom du texte</label><input type="text" name="title" value="${escapeHtml(law.title)}" placeholder="Ex. Édit sur le port d'armes" required></div>
      <div class="form-group"><label>Type</label><select name="type">${typeOptions}</select></div>
      <div class="form-group"><label>Statut</label><select name="status">${statusOptions}</select></div>
      <div class="form-group"><label>Champ d'application</label><input type="text" name="scope" value="${escapeHtml(law.scope)}" placeholder="Toute la ville, quais, étrangers, marchands..."></div>
      <div class="form-group"><label>Description publique</label><textarea name="description" rows="4">${escapeHtml(law.description)}</textarea></div>
      <div class="form-group"><label>Application / contrôle</label><textarea name="enforcement" rows="3" placeholder="Qui contrôle, comment, à quelle fréquence...">${escapeHtml(law.enforcement)}</textarea></div>
      <div class="form-group"><label>Peine / sanction publique</label><textarea name="penalty" rows="3">${escapeHtml(law.penalty)}</textarea></div>
      <div class="form-group"><label>Autorité émettrice</label><select name="issuingFactionId">${this._urbanFactionOptions(law.issuingFactionId)}</select></div>
      <div class="form-group"><label>Lieu principalement concerné</label><select name="locationId">${this._urbanLocationOptions(law.locationId)}</select></div>
      <div class="form-group"><label>Date d'effet (texte libre / calendrier)</label><input type="text" name="effectiveDate" value="${escapeHtml(law.effectiveDate)}"></div>
      <hr>
      <p><strong>Paramètres pour enregistrer une infraction</strong></p>
      <div class="form-group"><label>Gravité par défaut</label><select name="crimeSeverity">${severityOptions}</select></div>
      <div class="form-group"><label>Amende par défaut (po)</label><input type="number" min="0" step="1" name="defaultFine" value="${Number(law.defaultFine) || 0}"></div>
      <div class="form-group"><label>Peine par défaut</label><input type="text" name="defaultSentence" value="${escapeHtml(law.defaultSentence)}"></div>
      <hr>
      <p><strong>Impact politique optionnel</strong></p>
      <div class="form-group"><label>Variation d'opinion</label><input type="number" min="-100" max="100" step="1" name="publicOpinionDelta" value="${Number(law.publicOpinionDelta) || 0}"></div>
      <div class="form-group"><label>Variation des troubles</label><input type="number" min="-5" max="5" step="1" name="unrestDelta" value="${Number(law.unrestDelta) || 0}"></div>
      <div class="form-group"><label>Visibilité</label><select name="visibility"><option value="public" ${law.visibility !== "gm" ? "selected" : ""}>Publique</option><option value="gm" ${law.visibility === "gm" ? "selected" : ""}>MJ uniquement</option></select></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="4">${escapeHtml(law.notes)}</textarea></div>
      <p class="hint">Le Guide du Maître décrit la Loi comme la rigidité des édits et l'efficacité des autorités, mais ne fournit pas de code juridique universel. Les sanctions, amendes et impacts politiques sont donc définis par le MJ.</p>
    </form>`;
    new Dialog({ title: `${existing ? "Modifier" : "Ajouter"} une loi — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-floppy-disk"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const changes = {
          title: String(fd.get("title") || "Nouvelle loi").trim() || "Nouvelle loi",
          type: String(fd.get("type") || "law"), status: String(fd.get("status") || "active"),
          scope: String(fd.get("scope") || ""), description: String(fd.get("description") || ""),
          enforcement: String(fd.get("enforcement") || ""), penalty: String(fd.get("penalty") || ""),
          issuingFactionId: String(fd.get("issuingFactionId") || ""), locationId: String(fd.get("locationId") || ""),
          effectiveDate: String(fd.get("effectiveDate") || ""), visibility: String(fd.get("visibility") || "public"),
          crimeSeverity: Number(fd.get("crimeSeverity") || 2), defaultFine: Number(fd.get("defaultFine") || 0),
          defaultSentence: String(fd.get("defaultSentence") || ""), publicOpinionDelta: Number(fd.get("publicOpinionDelta") || 0),
          unrestDelta: Number(fd.get("unrestDelta") || 0), notes: String(fd.get("notes") || "")
        };
        const opts = { campaignDate: this._legislationCampaignDate() };
        if (existing) await updateLegislation(this.document, existing.id, changes, opts);
        else await addLegislation(this.document, changes, opts);
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _postLegislationLaw(lawId) {
    const law = getLegislationState(this.document).laws.find(l => l.id === lawId);
    if (!law) return;
    const faction = law.issuingFactionId ? game.journal.get(law.issuingFactionId)?.name : "";
    const location = law.locationId ? game.journal.get(law.locationId)?.name : "";
    const lines = [
      `<p><strong>${escapeHtml(LEGISLATION_TYPES[law.type] ?? law.type)}</strong> · ${escapeHtml(LEGISLATION_STATUS[law.status] ?? law.status)}</p>`,
      law.effectiveDate ? `<p><small>Effet : ${escapeHtml(law.effectiveDate)}</small></p>` : "",
      law.scope ? `<p><strong>Champ :</strong> ${escapeHtml(law.scope)}</p>` : "",
      law.description ? `<p>${escapeHtml(law.description)}</p>` : "",
      law.enforcement ? `<p><strong>Application :</strong> ${escapeHtml(law.enforcement)}</p>` : "",
      law.penalty ? `<p><strong>Sanction :</strong> ${escapeHtml(law.penalty)}</p>` : "",
      faction ? `<p><small>Autorité : ${escapeHtml(faction)}</small></p>` : "",
      location ? `<p><small>Lieu : ${escapeHtml(location)}</small></p>` : ""
    ].join("");
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>${escapeHtml(law.title)}</h3>${lines}</div>` });
  }

  _recordLegislationViolation(lawId) {
    const law = getLegislationState(this.document).laws.find(l => l.id === lawId);
    if (!law) return;
    const crimeState = getLawState(this.document);
    const statusOptions = Object.entries(CRIME_STATUS).map(([k, label]) => `<option value="${k}" ${k === "reported" ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const severityOptions = Object.entries(CRIME_SEVERITY).map(([k, label]) => `<option value="${k}" ${Number(k) === Number(law.crimeSeverity) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog legislation-dialog">
      <p>Infraction à : <strong>${escapeHtml(law.title)}</strong></p>
      <div class="form-group"><label>Suspect (Actor PF1 optionnel)</label><select name="suspectUuid">${this._politicsActorOptions("")}</select></div>
      <div class="form-group"><label>Nom libre du suspect</label><input type="text" name="suspectName" value=""></div>
      <div class="form-group"><label>Gravité</label><select name="severity">${severityOptions}</select></div>
      <div class="form-group"><label>État du dossier</label><select name="status">${statusOptions}</select></div>
      <div class="form-group"><label>Lieu</label><select name="locationId">${this._urbanLocationOptions(law.locationId)}</select></div>
      <div class="form-group"><label>Prime (po)</label><input type="number" min="0" name="bounty" value="0"></div>
      <div class="form-group"><label>Amende (po)</label><input type="number" min="0" name="fine" value="${Number(law.defaultFine) || 0}"></div>
      <div class="form-group"><label>Peine</label><input type="text" name="sentence" value="${escapeHtml(law.defaultSentence)}"></div>
      <div class="form-group"><label>Preuves / témoignages</label><textarea name="evidence" rows="3"></textarea></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="3"></textarea></div>
    </form>`;
    new Dialog({ title: `Enregistrer une infraction — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-gavel"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const suspectUuid = String(fd.get("suspectUuid") || "");
        let suspectName = String(fd.get("suspectName") || "").trim();
        if (suspectUuid) { try { suspectName ||= (await fromUuid(suspectUuid))?.name ?? ""; } catch (_) {} }
        await addCrime(this.document, {
          offense: `Infraction : ${law.title}`,
          suspectUuid, suspectName: suspectName || "Inconnu",
          severity: Number(fd.get("severity") || law.crimeSeverity || 2), status: String(fd.get("status") || "reported"),
          locationId: String(fd.get("locationId") || law.locationId || ""), factionId: law.issuingFactionId || "",
          bounty: Number(fd.get("bounty") || 0), fine: Number(fd.get("fine") || 0),
          sentence: String(fd.get("sentence") || ""), evidence: String(fd.get("evidence") || ""),
          notes: `Texte enfreint : ${law.title}${fd.get("notes") ? `\n${String(fd.get("notes"))}` : ""}`
        });
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _applyLegislationPoliticalImpact(lawId) {
    const law = getLegislationState(this.document).laws.find(l => l.id === lawId);
    if (!law) return;
    if (!Number(law.publicOpinionDelta) && !Number(law.unrestDelta)) return ui.notifications.info("Aucun impact politique n'est défini pour ce texte.");
    await applyPoliticalConsequence(this.document, {
      title: `Impact juridique : ${law.title}`,
      description: `${LEGISLATION_TYPES[law.type] ?? law.type} — ${LEGISLATION_STATUS[law.status] ?? law.status}`,
      publicOpinionDelta: Number(law.publicOpinionDelta) || 0,
      unrestDelta: Number(law.unrestDelta) || 0,
      factionId: law.issuingFactionId || "",
      visibility: law.visibility || "public",
      notes: "Impact appliqué depuis le registre des lois.",
      campaignDate: this._legislationCampaignDate()
    });
    ui.notifications.info("Impact politique appliqué.");
    this.render();
  }

  async _removeLegislationLaw(lawId) {
    await removeLegislation(this.document, lawId, { campaignDate: this._legislationCampaignDate() });
    this.render();
  }

  _editLegislationLevy(levyId = null) {
    const state = getLegislationState(this.document);
    const existing = levyId ? state.levies.find(l => l.id === levyId) : null;
    const levy = existing ?? { title: "", type: "tax", mode: "percent", rate: 0, frequency: "transaction", appliesTo: "", exemptions: "", collectorFactionId: "", locationId: "", active: true, marketApplicable: true, effectiveDate: this._legislationCampaignDate(), visibility: "public", notes: "" };
    const typeOptions = Object.entries(LEVY_TYPES).map(([k, label]) => `<option value="${k}" ${k === levy.type ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const modeOptions = Object.entries(LEVY_MODES).map(([k, label]) => `<option value="${k}" ${k === levy.mode ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const frequencyOptions = Object.entries(LEVY_FREQUENCIES).map(([k, label]) => `<option value="${k}" ${k === levy.frequency ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog legislation-dialog">
      <div class="form-group"><label>Nom</label><input type="text" name="title" value="${escapeHtml(levy.title)}" placeholder="Ex. Droit de quai" required></div>
      <div class="form-group"><label>Type</label><select name="type">${typeOptions}</select></div>
      <div class="form-group"><label>Mode</label><select name="mode">${modeOptions}</select></div>
      <div class="form-group"><label>Taux / montant</label><input type="number" min="0" step="0.01" name="rate" value="${Number(levy.rate) || 0}"></div>
      <div class="form-group"><label>Fréquence</label><select name="frequency">${frequencyOptions}</select></div>
      <div class="form-group"><label>S'applique à</label><textarea name="appliesTo" rows="3" placeholder="Marchandises, étrangers, navires, transactions...">${escapeHtml(levy.appliesTo)}</textarea></div>
      <div class="form-group"><label>Exemptions</label><textarea name="exemptions" rows="2">${escapeHtml(levy.exemptions)}</textarea></div>
      <div class="form-group"><label>Percepteur / faction</label><select name="collectorFactionId">${this._urbanFactionOptions(levy.collectorFactionId)}</select></div>
      <div class="form-group"><label>Lieu</label><select name="locationId">${this._urbanLocationOptions(levy.locationId)}</select></div>
      <div class="form-group"><label>Date d'effet</label><input type="text" name="effectiveDate" value="${escapeHtml(levy.effectiveDate)}"></div>
      <div class="form-group"><label><input type="checkbox" name="active" ${levy.active ? "checked" : ""}> Prélèvement en vigueur</label></div>
      <div class="form-group"><label><input type="checkbox" name="marketApplicable" ${levy.marketApplicable ? "checked" : ""}> Peut s'appliquer aux transactions du marché</label></div>
      <div class="form-group"><label>Visibilité</label><select name="visibility"><option value="public" ${levy.visibility !== "gm" ? "selected" : ""}>Publique</option><option value="gm" ${levy.visibility === "gm" ? "selected" : ""}>MJ uniquement</option></select></div>
      <div class="form-group"><label>Notes MJ</label><textarea name="notes" rows="4">${escapeHtml(levy.notes)}</textarea></div>
      <p class="hint">Les taxes et leur taux ne sont pas fixés par le Guide du Maître : le module les enregistre et calcule simplement les montants décidés par le MJ.</p>
    </form>`;
    new Dialog({ title: `${existing ? "Modifier" : "Ajouter"} un prélèvement — ${this.document.name}`, content, buttons: {
      save: { icon: '<i class="fas fa-coins"></i>', label: "Enregistrer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const changes = {
          title: String(fd.get("title") || "Nouveau prélèvement").trim() || "Nouveau prélèvement",
          type: String(fd.get("type") || "tax"), mode: String(fd.get("mode") || "percent"),
          rate: Number(fd.get("rate") || 0), frequency: String(fd.get("frequency") || "transaction"),
          appliesTo: String(fd.get("appliesTo") || ""), exemptions: String(fd.get("exemptions") || ""),
          collectorFactionId: String(fd.get("collectorFactionId") || ""), locationId: String(fd.get("locationId") || ""),
          effectiveDate: String(fd.get("effectiveDate") || ""), active: fd.get("active") === "on",
          marketApplicable: fd.get("marketApplicable") === "on", visibility: String(fd.get("visibility") || "public"),
          notes: String(fd.get("notes") || "")
        };
        const opts = { campaignDate: this._legislationCampaignDate() };
        if (existing) await updateLevy(this.document, existing.id, changes, opts);
        else await addLevy(this.document, changes, opts);
        this.render();
      }}, cancel: { label: "Annuler" }
    }, default: "save" }).render(true);
  }

  async _postLegislationLevy(levyId) {
    const levy = getLegislationState(this.document).levies.find(l => l.id === levyId);
    if (!levy) return;
    const faction = levy.collectorFactionId ? game.journal.get(levy.collectorFactionId)?.name : "";
    const rate = levy.mode === "flat" ? `${gp(levy.rate)} po` : `${Number(levy.rate) || 0} %`;
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>${escapeHtml(levy.title)}</h3><p><strong>${escapeHtml(LEVY_TYPES[levy.type] ?? levy.type)}</strong> · ${escapeHtml(rate)} · ${escapeHtml(LEVY_FREQUENCIES[levy.frequency] ?? levy.frequency)}</p>${levy.appliesTo ? `<p><strong>S'applique à :</strong> ${escapeHtml(levy.appliesTo)}</p>` : ""}${levy.exemptions ? `<p><strong>Exemptions :</strong> ${escapeHtml(levy.exemptions)}</p>` : ""}${faction ? `<p><small>Percepteur : ${escapeHtml(faction)}</small></p>` : ""}</div>` });
  }

  async _removeLegislationLevy(levyId) {
    await removeLevy(this.document, levyId, { campaignDate: this._legislationCampaignDate() });
    this.render();
  }

  _calculateLegislationLevy() {
    const levies = getLegislationState(this.document).levies.filter(l => l.active);
    if (!levies.length) return ui.notifications.warn("Aucun prélèvement actif.");
    const options = levies.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.title)} — ${escapeHtml(l.mode === "flat" ? `${gp(l.rate)} po` : `${Number(l.rate) || 0} %`)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog legislation-dialog">
      <div class="form-group"><label>Prélèvement</label><select name="levyId">${options}</select></div>
      <div class="form-group"><label>Montant de base (po)</label><input type="number" min="0" step="0.01" name="base" value="0"></div>
      <p class="hint">Pour un prélèvement fixe, le montant est ajouté une fois. Pour un pourcentage, il est calculé sur le montant de base.</p>
    </form>`;
    new Dialog({ title: `Calcul de taxe — ${this.document.name}`, content, buttons: {
      calc: { icon: '<i class="fas fa-calculator"></i>', label: "Calculer", callback: async html => {
        const fd = new FormData(html.find("form")[0]);
        const levy = levies.find(l => l.id === String(fd.get("levyId") || ""));
        if (!levy) return;
        const result = calculateLevy(levy, Number(fd.get("base") || 0));
        await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>${escapeHtml(levy.title)}</h3><p>Base : <strong>${gp(result.base)} po</strong></p><p>Prélèvement : <strong>${gp(result.amount)} po</strong></p><p>Total : <strong>${gp(result.total)} po</strong></p></div>` });
      }}, cancel: { label: "Annuler" }
    }, default: "calc" }).render(true);
  }

  async _postLegislationCode() {
    const state = getLegislationState(this.document);
    const laws = state.laws.filter(l => l.status === "active" && l.visibility === "public");
    const levies = state.levies.filter(l => l.active && l.visibility === "public");
    const lawsHtml = laws.length ? `<ul>${laws.map(l => `<li><strong>${escapeHtml(l.title)}</strong> — ${escapeHtml(LEGISLATION_TYPES[l.type] ?? l.type)}${l.penalty ? ` ; ${escapeHtml(l.penalty)}` : ""}</li>`).join("")}</ul>` : "<p>Aucun texte public en vigueur.</p>";
    const leviesHtml = levies.length ? `<ul>${levies.map(l => `<li><strong>${escapeHtml(l.title)}</strong> — ${escapeHtml(l.mode === "flat" ? `${gp(l.rate)} po` : `${Number(l.rate) || 0} %`)}</li>`).join("")}</ul>` : "<p>Aucun prélèvement public en vigueur.</p>";
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: `<div class="pf1-settlement-chat"><h3>Code local — ${escapeHtml(this.document.name)}</h3><h4>Lois et édits</h4>${lawsHtml}<h4>Taxes et prélèvements</h4>${leviesHtml}</div>` });
  }

  async _clearLegislationHistory() {
    await clearLegislationHistory(this.document);
    this.render();
  }

  async _addCustomAdvantage() {
    const current = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    current.customAdvantages ??= {};
    const id = foundry.utils.randomID();
    current.customAdvantages[id] = {
      label: "Nouvel avantage",
      active: true,
      corruption: 0,
      crime: 0,
      economy: 0,
      law: 0,
      lore: 0,
      society: 0,
      danger: 0,
      baseValuePct: 0,
      purchaseLimitPct: 0,
      spellcasting: 0,
      notes: "",
      sourceType: "homebrew",
      source: "Campagne maison"
    };
    const derived = calculateSettlement(current);
    await this.document.update({
      [`flags.${MODULE_ID}.config`]: current,
      [`flags.${MODULE_ID}.derived`]: derived
    });
    ui.notifications.info("Avantage personnalisé ajouté.");
    this.render();
  }

  async _toggleCustomAdvantage(id) {
    if (!id) return;
    const current = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    const advantage = current.customAdvantages?.[id];
    if (!advantage) return;
    advantage.active = advantage.active === false;
    const derived = calculateSettlement(current);
    await this.document.update({
      [`flags.${MODULE_ID}.config`]: current,
      [`flags.${MODULE_ID}.derived`]: derived
    });
    this.render();
  }

  async _removeCustomAdvantage(id) {
    if (!id) return;
    const current = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    if (!current.customAdvantages?.[id]) return;
    delete current.customAdvantages[id];
    const derived = calculateSettlement(current);
    await this.document.update({
      [`flags.${MODULE_ID}.config`]: current,
      [`flags.${MODULE_ID}.derived`]: derived
    });
    ui.notifications.info("Avantage personnalisé supprimé.");
    this.render();
  }

  async _addCustomDrawback() {
    const current = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    current.customDrawbacks ??= {};
    const id = foundry.utils.randomID();
    current.customDrawbacks[id] = {
      label: "Nouvel inconvénient",
      active: true,
      corruption: 0,
      crime: 0,
      economy: 0,
      law: 0,
      lore: 0,
      society: 0,
      danger: 0,
      baseValuePct: 0,
      purchaseLimitPct: 0,
      spellcasting: 0,
      notes: "",
      sourceType: "homebrew",
      source: "Campagne maison"
    };
    const derived = calculateSettlement(current);
    await this.document.update({
      [`flags.${MODULE_ID}.config`]: current,
      [`flags.${MODULE_ID}.derived`]: derived
    });
    ui.notifications.info("Inconvénient personnalisé ajouté.");
    this.render();
  }

  async _toggleCustomDrawback(id) {
    if (!id) return;
    const current = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    const drawback = current.customDrawbacks?.[id];
    if (!drawback) return;
    drawback.active = drawback.active === false;
    const derived = calculateSettlement(current);
    await this.document.update({
      [`flags.${MODULE_ID}.config`]: current,
      [`flags.${MODULE_ID}.derived`]: derived
    });
    this.render();
  }

  async _removeCustomDrawback(id) {
    if (!id) return;
    const current = deepMerge(defaultSettlementConfig(), this.document.getFlag(MODULE_ID, "config") ?? {});
    if (!current.customDrawbacks?.[id]) return;
    delete current.customDrawbacks[id];
    const derived = calculateSettlement(current);
    await this.document.update({
      [`flags.${MODULE_ID}.config`]: current,
      [`flags.${MODULE_ID}.derived`]: derived
    });
    ui.notifications.info("Inconvénient personnalisé supprimé.");
    this.render();
  }

  _profileHtml() {
    const { config, derived } = this._current();
    const builtInAdvantageNames = derived.chosenAdvantages.map(k => ADVANTAGES[k]?.label).filter(Boolean);
    const customAdvantageNames = (derived.customAdvantages ?? []).map(a => a.label).filter(Boolean);
    const advantageNames = [...builtInAdvantageNames, ...customAdvantageNames].join(", ") || "—";
    const builtInDrawbackNames = derived.chosenDrawbacks.map(k => DRAWBACKS[k]?.label).filter(Boolean);
    const customDrawbackNames = (derived.customDrawbacks ?? []).map(d => d.label).filter(Boolean);
    const drawbackNames = [...builtInDrawbackNames, ...customDrawbackNames].join(", ") || "—";
    const government = config.drawbacks?.anarchic ? "Anarchie" : (GOVERNMENTS[config.government]?.label ?? "—");
    const alignment = config.alignment ?? "N";
    const parent = config.parentSettlementId ? game.journal.get(config.parentSettlementId) : null;
    const districts = getDistricts(this.document).map(j => j.name).join(", ");
    const npcNames = (config.linkedNpcs ?? []).map(n => n.role ? `${n.name} (${n.role})` : n.name).join(", ");
    return `
      <div class="pf1-settlement-chat">
        <h2>${escapeHtml(this.document.name)}</h2>
        ${parent ? `<p><em>Quartier de ${escapeHtml(parent.name)}</em></p>` : ""}
        <p><strong>${escapeHtml(alignment)} ${escapeHtml(derived.typeLabel)}</strong></p>
        <p><strong>Corruption</strong> ${signed(derived.modifiers.corruption)} ; <strong>Criminalité</strong> ${signed(derived.modifiers.crime)} ; <strong>Économie</strong> ${signed(derived.modifiers.economy)} ; <strong>Loi</strong> ${signed(derived.modifiers.law)} ; <strong>Folklore</strong> ${signed(derived.modifiers.lore)} ; <strong>Société</strong> ${signed(derived.modifiers.society)}</p>
        <p><strong>Avantages</strong> ${escapeHtml(advantageNames)}</p>
        <p><strong>Danger</strong> ${signed(derived.danger)}${(builtInDrawbackNames.length || customDrawbackNames.length) ? ` ; <strong>Inconvénients</strong> ${escapeHtml(drawbackNames)}` : ""}</p>
        <h3>Démographie</h3>
        <p><strong>Gouvernement</strong> ${escapeHtml(government)}<br><strong>Population</strong> ${escapeHtml(config.population || "—")}${config.populationBreakdown ? ` (${escapeHtml(config.populationBreakdown)})` : ""}</p>
        ${npcNames ? `<p><strong>PNJ liés</strong> ${escapeHtml(npcNames)}</p>` : ""}
        ${districts ? `<p><strong>Quartiers</strong> ${escapeHtml(districts)}</p>` : ""}
        <h3>Place du marché</h3>
        <p><strong>Valeur de base</strong> ${gp(derived.market.baseValue)} po ; <strong>Limite d'achat</strong> ${gp(derived.market.purchaseLimit)} po ; <strong>Incantation</strong> ${derived.market.spellcasting}</p>
      </div>`;
  }

  async _postProfile() {
    await ChatMessage.create({ speaker: { alias: this.document.name }, content: this._profileHtml() });
  }

  async _copyProfile() {
    const temp = document.createElement("div");
    temp.innerHTML = this._profileHtml();
    const text = temp.innerText;
    try {
      await navigator.clipboard.writeText(text);
      ui.notifications.info("Profil de ville copié dans le presse-papiers.");
    } catch (err) {
      console.error(`${MODULE_ID} | Clipboard error`, err);
      ui.notifications.warn("Impossible de copier automatiquement le profil.");
    }
  }
}
