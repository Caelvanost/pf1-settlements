import { MODULE_ID, LOCATION_TYPES, FACTION_TYPES } from "./data.mjs";
import { createSettlement, createDistrict, getSettlements, getRootSettlements } from "./settlements.mjs";
import { createLocation, getLocations, getLocationConfig } from "./locations.mjs";
import { createFaction, getFactions, getFactionConfig } from "./factions.mjs";
import { SettlementGenerator } from "./generator.mjs";
import { FactionNetwork } from "./faction-network.mjs";
import { TraitLibrary } from "./trait-library.mjs";
import {
  getCommunityTemplates,
  saveSettlementAsTemplate,
  deleteCommunityTemplate,
  createSettlementFromTemplate,
  duplicateSettlement,
  downloadSettlementExport,
  importSettlementFile,
  resetGeneratedData,
  transformSettlementToRoot,
  transformRootToDistrict
} from "./transfer.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function settlementRow(journal) {
  const d = journal.getFlag(MODULE_ID, "derived");
  const c = journal.getFlag(MODULE_ID, "config") ?? {};
  return {
    id: journal.id,
    name: journal.name,
    type: d?.typeLabel ?? "Communauté",
    population: c.population || "—",
    parentSettlementId: c.parentSettlementId || "",
    isDistrict: Boolean(c.parentSettlementId)
  };
}

function locationRow(journal) {
  const c = getLocationConfig(journal);
  const district = c.districtId ? game.journal.get(c.districtId) : null;
  return {
    id: journal.id,
    name: journal.name,
    type: LOCATION_TYPES[c.type] ?? "Lieu",
    settlementId: c.settlementId || "",
    districtId: c.districtId || "",
    districtName: district?.name ?? "",
    address: c.address || ""
  };
}

function factionRow(journal) {
  const c = getFactionConfig(journal);
  return {
    id: journal.id,
    name: journal.name,
    type: FACTION_TYPES[c.type] ?? "Organisation",
    leaderName: c.leaderName || "",
    influenceCount: c.influences.length,
    relationCount: c.relations.length
  };
}

function checked(form, name) {
  return Boolean(form.querySelector(`[name="${name}"]`)?.checked);
}

export class SettlementManager extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-settlement-manager"],
    position: { width: 940, height: 820 },
    window: { title: "PF1 — Gestionnaire de villes", resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/manager.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const all = getSettlements();
    const allLocations = getLocations();
    const allFactions = getFactions();
    const roots = all.filter(j => !j.getFlag(MODULE_ID, "config")?.parentSettlementId);
    const rootIds = new Set(roots.map(j => j.id));

    context.settlements = roots
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(j => {
        const districts = all
          .filter(d => d.getFlag(MODULE_ID, "config")?.parentSettlementId === j.id)
          .sort((a, b) => a.name.localeCompare(b.name, "fr"));
        const locations = allLocations
          .filter(l => getLocationConfig(l).settlementId === j.id)
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
          .map(locationRow);
        return {
          ...settlementRow(j),
          districts: districts.map(d => ({
            ...settlementRow(d),
            locationCount: allLocations.filter(l => getLocationConfig(l).districtId === d.id).length,
            factionCount: allFactions.filter(f => getFactionConfig(f).influences.some(i => i.districtId === d.id)).length
          })),
          locations,
          locationCount: locations.length,
          factionCount: allFactions.filter(f => getFactionConfig(f).influences.some(i => i.settlementId === j.id)).length
        };
      });

    context.orphans = all
      .filter(j => {
        const parentId = j.getFlag(MODULE_ID, "config")?.parentSettlementId;
        return parentId && !rootIds.has(parentId) && !game.journal.get(parentId);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(settlementRow);

    context.factions = allFactions
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(factionRow);

    context.orphanLocations = allLocations
      .filter(j => {
        const c = getLocationConfig(j);
        return !c.settlementId || !game.journal.get(c.settlementId);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(locationRow);

    context.templates = getCommunityTemplates().map(t => ({
      id: t.id,
      label: t.label,
      description: t.description || "",
      builtin: Boolean(t.builtin)
    }));
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    root?.querySelector('[data-action="generator"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      new SettlementGenerator().render(true);
    });

    root?.querySelector('[data-action="network"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      new FactionNetwork().render(true);
    });

    root?.querySelector('[data-action="trait-library"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      new TraitLibrary().render(true);
    });

    root?.querySelector('[data-action="create"]')?.addEventListener("click", async ev => {
      ev.preventDefault();
      const doc = await createSettlement();
      doc?.sheet.render(true);
      this.render();
    });

    root?.querySelector('[data-action="create-faction"]')?.addEventListener("click", async ev => {
      ev.preventDefault();
      const doc = await createFaction();
      doc?.sheet.render(true);
      this.render();
    });

    root?.querySelector('[data-action="import"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._pickImportFile();
    });

    root?.querySelectorAll('[data-action="create-district"]').forEach(el => el.addEventListener("click", async ev => {
      ev.preventDefault();
      const parent = game.journal.get(ev.currentTarget.dataset.id);
      if (!parent) return;
      const doc = await createDistrict(parent);
      doc?.sheet.render(true);
      this.render();
    }));

    root?.querySelectorAll('[data-action="create-location"]').forEach(el => el.addEventListener("click", async ev => {
      ev.preventDefault();
      const parent = game.journal.get(ev.currentTarget.dataset.id);
      if (!parent) return;
      const doc = await createLocation(parent);
      doc?.sheet.render(true);
      this.render();
    }));

    root?.querySelectorAll('[data-action="open"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true);
    }));

    root?.querySelectorAll('[data-action="duplicate"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const doc = game.journal.get(ev.currentTarget.dataset.id);
      if (doc) this._duplicateDialog(doc);
    }));

    root?.querySelectorAll('[data-action="export"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const doc = game.journal.get(ev.currentTarget.dataset.id);
      if (doc) downloadSettlementExport(doc);
    }));

    root?.querySelectorAll('[data-action="save-template"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const doc = game.journal.get(ev.currentTarget.dataset.id);
      if (doc) this._saveTemplateDialog(doc);
    }));

    root?.querySelectorAll('[data-action="reset-generated"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const doc = game.journal.get(ev.currentTarget.dataset.id);
      if (doc) this._resetGeneratedDialog(doc);
    }));

    root?.querySelectorAll('[data-action="transform"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const doc = game.journal.get(ev.currentTarget.dataset.id);
      if (doc) this._transformDialog(doc);
    }));

    root?.querySelectorAll('[data-action="create-from-template"]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      this._createFromTemplateDialog(ev.currentTarget.dataset.id);
    }));

    root?.querySelectorAll('[data-action="delete-template"]').forEach(el => el.addEventListener("click", async ev => {
      ev.preventDefault();
      await deleteCommunityTemplate(ev.currentTarget.dataset.id);
      ui.notifications.info("Modèle personnel supprimé.");
      this.render();
    }));
  }

  _duplicateDialog(doc) {
    const content = `
      <form class="pf1-settlements-dialog">
        <p>Choisis les éléments à recopier avec <strong>${doc.name}</strong>.</p>
        <div class="form-group"><label><input type="checkbox" name="districts" checked> Quartiers</label></div>
        <div class="form-group"><label><input type="checkbox" name="locations" checked> Lieux</label></div>
        <div class="form-group"><label><input type="checkbox" name="factions" checked> Factions liées</label></div>
        <hr>
        <div class="form-group"><label><input type="checkbox" name="market" checked> Marché</label></div>
        <div class="form-group"><label><input type="checkbox" name="rumors" checked> Rumeurs et vie urbaine</label></div>
        <div class="form-group"><label><input type="checkbox" name="law" checked> Garde et criminalité</label></div>
        <div class="form-group"><label><input type="checkbox" name="calendar" checked> Calendrier et évolution</label></div>
        <div class="form-group"><label><input type="checkbox" name="politics" checked> Politique et opinion</label></div>
        <div class="form-group"><label><input type="checkbox" name="legislation" checked> Lois et taxes</label></div>
      </form>`;
    new Dialog({
      title: `Dupliquer — ${doc.name}`,
      content,
      buttons: {
        duplicate: {
          icon: '<i class="fas fa-copy"></i>', label: "Dupliquer",
          callback: async html => {
            const form = html[0]?.querySelector("form") ?? html.querySelector?.("form");
            const next = await duplicateSettlement(doc, {
              districts: checked(form, "districts"), locations: checked(form, "locations"), factions: checked(form, "factions"),
              market: checked(form, "market"), rumors: checked(form, "rumors"), law: checked(form, "law"), calendar: checked(form, "calendar"),
              politics: checked(form, "politics"), legislation: checked(form, "legislation")
            });
            this.render();
            next?.sheet.render(true);
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "duplicate"
    }).render(true);
  }

  _saveTemplateDialog(doc) {
    const content = `<form><div class="form-group"><label>Nom du modèle</label><input type="text" name="name" value="Modèle — ${doc.name}"></div></form>`;
    new Dialog({
      title: `Enregistrer comme modèle — ${doc.name}`,
      content,
      buttons: {
        save: { label: "Enregistrer", callback: async html => {
          const form = html[0]?.querySelector("form") ?? html.querySelector?.("form");
          await saveSettlementAsTemplate(doc, form?.querySelector('[name="name"]')?.value ?? "");
          ui.notifications.info("Modèle personnel enregistré.");
          this.render();
        }},
        cancel: { label: "Annuler" }
      },
      default: "save"
    }).render(true);
  }

  _createFromTemplateDialog(templateId) {
    const template = getCommunityTemplates().find(t => t.id === templateId);
    if (!template) return;
    const content = `<form><p>${template.description || ""}</p><div class="form-group"><label>Nom de la nouvelle communauté</label><input type="text" name="name" value="${template.label}"></div></form>`;
    new Dialog({
      title: `Créer depuis le modèle — ${template.label}`,
      content,
      buttons: {
        create: { label: "Créer", callback: async html => {
          const form = html[0]?.querySelector("form") ?? html.querySelector?.("form");
          const doc = await createSettlementFromTemplate(templateId, form?.querySelector('[name="name"]')?.value ?? "");
          this.render();
          doc?.sheet.render(true);
        }},
        cancel: { label: "Annuler" }
      },
      default: "create"
    }).render(true);
  }

  _pickImportFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.pf1-settlement.json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const doc = await importSettlementFile(file);
        this.render();
        doc?.sheet.render(true);
      } catch (err) {
        console.error(`${MODULE_ID} | Échec import`, err);
        ui.notifications.error(err.message || "Impossible d'importer ce fichier.");
      }
    }, { once: true });
    input.click();
  }

  _resetGeneratedDialog(doc) {
    new Dialog({
      title: `Réinitialiser les données générées — ${doc.name}`,
      content: `<p>Cette action supprime uniquement les lieux, factions, rumeurs et lois identifiés comme créés automatiquement par l'assistant. Les éléments manuels sont conservés.</p>`,
      buttons: {
        reset: { label: "Réinitialiser", callback: async () => { await resetGeneratedData(doc); this.render(); } },
        cancel: { label: "Annuler" }
      }
    }).render(true);
  }

  _transformDialog(doc) {
    const isDistrict = Boolean(doc.getFlag(MODULE_ID, "config")?.parentSettlementId);
    if (isDistrict) {
      new Dialog({
        title: `Transformer en ville — ${doc.name}`,
        content: `<p>Le quartier deviendra une communauté indépendante. Ses lieux et influences locales seront transférés avec lui.</p>`,
        buttons: {
          transform: { label: "Transformer en ville", callback: async () => { await transformSettlementToRoot(doc); this.render(); doc.sheet.render(true); } },
          cancel: { label: "Annuler" }
        }
      }).render(true);
      return;
    }
    const roots = getRootSettlements().filter(r => r.id !== doc.id);
    if (!roots.length) return ui.notifications.warn("Aucune autre ville ne peut servir de ville parente.");
    const options = roots.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
    const content = `<form><p>La ville deviendra un quartier de la communauté choisie.</p><div class="form-group"><label>Ville parente</label><select name="parent">${options}</select></div></form>`;
    new Dialog({
      title: `Transformer en quartier — ${doc.name}`,
      content,
      buttons: {
        transform: { label: "Transformer en quartier", callback: async html => {
          const form = html[0]?.querySelector("form") ?? html.querySelector?.("form");
          const parent = game.journal.get(form?.querySelector('[name="parent"]')?.value);
          try {
            await transformRootToDistrict(doc, parent);
            this.render();
            doc.sheet.render(true);
          } catch (err) {
            ui.notifications.error(err.message || "Transformation impossible.");
          }
        }},
        cancel: { label: "Annuler" }
      }
    }).render(true);
  }
}
