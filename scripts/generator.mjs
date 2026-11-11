import {
  MODULE_ID,
  SETTLEMENT_TYPES,
  ALIGNMENTS,
  GOVERNMENTS,
  ADVANTAGES,
  DRAWBACKS
} from "./data.mjs";
import { createSettlement, createDistrict } from "./settlements.mjs";
import { createLocation } from "./locations.mjs";
import { createFaction } from "./factions.mjs";
import { addRumor } from "./urban.mjs";
import { addLegislation } from "./legislation.mjs";
import { GENERATED_MARKER } from "./transfer.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const POPULATION_RANGES = {
  thorpe: [1, 20], hamlet: [21, 60], village: [61, 200], smallTown: [201, 2000],
  largeTown: [2001, 5000], smallCity: [5001, 10000], largeCity: [10001, 25000], metropolis: [25001, 60000]
};

const LOCATION_SETS = [
  ["tavern", "Taverne"], ["inn", "Auberge"], ["shop", "Boutique générale"], ["market", "Marché"],
  ["temple", "Temple"], ["government", "Maison commune"], ["workshop", "Atelier"], ["harbor", "Quais"],
  ["fortification", "Poste de garde"], ["landmark", "Place principale"]
];
const FACTION_SETS = [
  ["authority", "Autorité locale"], ["guild", "Guilde des artisans"], ["mercantile", "Compagnie marchande"],
  ["religious", "Clergé local"], ["criminal", "Réseau clandestin"], ["military", "Milice locale"]
];
const RUMOR_SEEDS = [
  "Une cargaison précieuse aurait disparu sans laisser de trace.",
  "On raconte qu'un notable local paie discrètement des aventuriers.",
  "Des bruits étranges proviennent d'un bâtiment fermé après la tombée de la nuit.",
  "Deux groupes influents se disputeraient le contrôle d'une activité lucrative.",
  "Un voyageur affirme avoir découvert quelque chose d'inhabituel à proximité de la communauté.",
  "La garde chercherait quelqu'un, mais personne ne sait exactement pourquoi."
];
const LAW_SEEDS = [
  ["law", "Ordonnance sur l'ordre public", "Les troubles manifestes dans les rues peuvent entraîner l'intervention des autorités."],
  ["trade", "Réglementation du marché", "Les échanges commerciaux importants doivent respecter les règles locales et les droits en vigueur."],
  ["license", "Permis pour activités sensibles", "Certaines activités dangereuses ou perturbatrices exigent l'autorisation des autorités locales."]
];

function randomKey(obj) {
  const keys = Object.keys(obj);
  return keys[Math.floor(Math.random() * keys.length)];
}
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(values) { return [...values].sort(() => Math.random() - 0.5); }
function populationFor(type) {
  const [min, max] = POPULATION_RANGES[type] ?? POPULATION_RANGES.village;
  return randomInt(min, max);
}
function optionRows(obj, selected = "") { return Object.entries(obj).map(([key, value]) => ({ key, label: value.label ?? value, selected: key === selected })); }

export class SettlementGenerator extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-settlement-generator"],
    position: { width: 780, height: 760 },
    window: { title: "PF1 — Assistant de création de communauté", resizable: true }
  };
  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/generator.hbs` } };

  constructor(options = {}) {
    super(options);
    this.step = 1;
    this.state = {
      name: "Nouvelle communauté",
      kind: "settlement",
      parentSettlementId: "",
      type: "village",
      alignment: "N",
      government: "autocracy",
      population: populationFor("village"),
      advantages: [],
      drawbacks: [],
      generateLocations: true,
      generateFactions: true,
      generateRumors: true,
      generateLaws: true,
      locationCount: 4,
      factionCount: 2,
      rumorCount: 3,
      lawCount: 1
    };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const maxAdvantages = SETTLEMENT_TYPES[this.state.type]?.advantages ?? 2;
    return {
      ...context,
      step: this.step,
      isStep1: this.step === 1,
      isStep2: this.step === 2,
      isStep3: this.step === 3,
      isStep4: this.step === 4,
      state: { ...this.state, kindSettlement: this.state.kind === "settlement", kindDistrict: this.state.kind === "district" },
      types: optionRows(SETTLEMENT_TYPES, this.state.type),
      alignments: optionRows(ALIGNMENTS, this.state.alignment),
      governments: optionRows(GOVERNMENTS, this.state.government),
      advantages: Object.entries(ADVANTAGES).map(([key, value]) => ({ key, label: value.label, description: value.description, checked: this.state.advantages.includes(key) })),
      drawbacks: Object.entries(DRAWBACKS).map(([key, value]) => ({ key, label: value.label, description: value.description, checked: this.state.drawbacks.includes(key) })),
      roots: game.journal.filter(j => j.getFlag(MODULE_ID, "isSettlement") && !j.getFlag(MODULE_ID, "config")?.parentSettlementId).map(j => ({ id: j.id, name: j.name, selected: j.id === this.state.parentSettlementId })),
      maxAdvantages,
      typeLabel: SETTLEMENT_TYPES[this.state.type]?.label ?? "Communauté",
      alignmentLabel: ALIGNMENTS[this.state.alignment] ?? this.state.alignment,
      governmentLabel: GOVERNMENTS[this.state.government]?.label ?? this.state.government,
      advantageLabels: this.state.advantages.map(k => ADVANTAGES[k]?.label ?? k).join(", ") || "Aucun",
      drawbackLabels: this.state.drawbacks.map(k => DRAWBACKS[k]?.label ?? k).join(", ") || "Aucun"
    };
  }

  _readInputs() {
    const root = this.element;
    if (!root) return;
    const get = name => root.querySelector(`[name="${name}"]`);
    for (const name of ["name", "kind", "parentSettlementId", "type", "alignment", "government"]) {
      const el = get(name); if (el) this.state[name] = el.value;
    }
    const pop = get("population"); if (pop) this.state.population = Math.max(0, Number(pop.value || 0));
    const selectedAdvantages = [...root.querySelectorAll('[name="advantages"]:checked')].map(el => el.value);
    if (root.querySelector('[name="advantages"]')) this.state.advantages = selectedAdvantages;
    const selectedDrawbacks = [...root.querySelectorAll('[name="drawbacks"]:checked')].map(el => el.value);
    if (root.querySelector('[name="drawbacks"]')) this.state.drawbacks = selectedDrawbacks;
    for (const key of ["generateLocations", "generateFactions", "generateRumors", "generateLaws"]) {
      const el = get(key); if (el) this.state[key] = el.checked;
    }
    for (const key of ["locationCount", "factionCount", "rumorCount", "lawCount"]) {
      const el = get(key); if (el) this.state[key] = Math.max(0, Number(el.value || 0));
    }
  }

  _randomizeProfile() {
    this.state.alignment = randomKey(ALIGNMENTS);
    this.state.government = randomKey(GOVERNMENTS);
    this.state.population = populationFor(this.state.type);
    const max = SETTLEMENT_TYPES[this.state.type]?.advantages ?? 2;
    this.state.advantages = shuffle(Object.keys(ADVANTAGES)).slice(0, max);
    this.state.drawbacks = Math.random() < 0.25 ? [randomKey(DRAWBACKS)] : [];
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root?.querySelector('[data-action="next"]')?.addEventListener("click", () => { this._readInputs(); this.step = Math.min(4, this.step + 1); this.render(); });
    root?.querySelector('[data-action="back"]')?.addEventListener("click", () => { this._readInputs(); this.step = Math.max(1, this.step - 1); this.render(); });
    root?.querySelector('[data-action="randomize"]')?.addEventListener("click", () => { this._readInputs(); this._randomizeProfile(); this.render(); });
    root?.querySelector('[name="type"]')?.addEventListener("change", ev => {
      this.state.type = ev.currentTarget.value;
      this.state.population = populationFor(this.state.type);
      this.render();
    });
    root?.querySelector('[data-action="create"]')?.addEventListener("click", async () => {
      this._readInputs();
      await this._createGeneratedCommunity();
    });
  }

  async _createGeneratedCommunity() {
    if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut utiliser l'assistant.");
    const max = SETTLEMENT_TYPES[this.state.type]?.advantages ?? 2;
    if (this.state.advantages.length > max) {
      return ui.notifications.warn(`Cette taille prévoit ${max} avantage(s). Réduis la sélection ou utilise ensuite les ajustements manuels.`);
    }
    const overrides = {
      type: this.state.type,
      alignment: this.state.alignment,
      government: this.state.government,
      population: String(this.state.population),
      advantages: Object.fromEntries(Object.keys(ADVANTAGES).map(k => [k, this.state.advantages.includes(k)])),
      drawbacks: Object.fromEntries(Object.keys(DRAWBACKS).map(k => [k, this.state.drawbacks.includes(k)])),
      notes: "Profil initial créé par l'assistant de génération PF1 Settlements v2.0. Les éléments narratifs générés sont des propositions du module, pas des règles officielles."
    };
    let doc;
    if (this.state.kind === "district" && this.state.parentSettlementId) {
      const parent = game.journal.get(this.state.parentSettlementId);
      doc = await createDistrict(parent, this.state.name || "Nouveau quartier");
      if (doc) await doc.update({ [`flags.${MODULE_ID}.config`]: { ...doc.getFlag(MODULE_ID, "config"), ...overrides, parentSettlementId: parent.id } });
    } else {
      doc = await createSettlement(this.state.name || "Nouvelle communauté", overrides);
    }
    if (!doc) return;

    const narrativeNote = `${GENERATED_MARKER} Proposition générée automatiquement par le module ; à adapter à la campagne.`;
    if (this.state.generateLocations) {
      for (const [type, label] of shuffle(LOCATION_SETS).slice(0, this.state.locationCount)) {
        const generated = await createLocation(doc, `${label} — ${doc.name}`, { type, description: narrativeNote });
        if (generated) await generated.setFlag(MODULE_ID, "generatedByAssistant", true);
      }
    }
    if (this.state.generateFactions) {
      for (const [type, label] of shuffle(FACTION_SETS).slice(0, this.state.factionCount)) {
        const generated = await createFaction(doc, `${label} de ${doc.name}`, { type, description: narrativeNote });
        if (generated) await generated.setFlag(MODULE_ID, "generatedByAssistant", true);
      }
    }
    if (this.state.generateRumors) {
      for (const text of shuffle(RUMOR_SEEDS).slice(0, this.state.rumorCount)) {
        await addRumor(doc, { text, truth: "unknown", visibility: "gm", notes: narrativeNote });
      }
    }
    if (this.state.generateLaws) {
      for (const [type, title, summary] of shuffle(LAW_SEEDS).slice(0, this.state.lawCount)) {
        await addLegislation(doc, { type, title, description: summary, status: "active", visibility: "public", notes: narrativeNote });
      }
    }

    ui.notifications.info(`${doc.name} a été créé avec son profil PF1 et ses propositions narratives.`);
    this.close();
    doc.sheet.render(true);
  }
}
