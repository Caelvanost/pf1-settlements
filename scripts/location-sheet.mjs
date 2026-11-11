import {
  MODULE_ID,
  LOCATION_TYPES,
  PRICE_LEVELS,
  defaultLocationConfig
} from "./data.mjs";
import { getRootSettlements, getDistricts } from "./settlements.mjs";
import { getLocationConfig } from "./locations.mjs";

const { BaseSheet } = foundry.applications.sheets;

function deepMerge(base, incoming) {
  return foundry.utils.mergeObject(base, incoming ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
}

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

export class LocationSheet extends BaseSheet {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-location-sheet"],
    position: { width: 820, height: 780 },
    window: { resizable: true },
    form: {
      closeOnSubmit: false,
      submitOnChange: false,
      handler: LocationSheet._onSubmitLocation
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/location-sheet.hbs` }
  };

  get title() {
    return `${this.document.name} — Lieu PF1`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = deepMerge(defaultLocationConfig(), getLocationConfig(this.document));
    const roots = getRootSettlements().slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const root = config.settlementId ? game.journal.get(config.settlementId) : null;
    const districts = root ? getDistricts(root).slice().sort((a, b) => a.name.localeCompare(b.name, "fr")) : [];
    const district = config.districtId ? game.journal.get(config.districtId) : null;

    let proprietor = null;
    if (config.proprietorUuid) {
      try { proprietor = await fromUuid(config.proprietorUuid); }
      catch (err) { console.warn(`${MODULE_ID} | Propriétaire introuvable`, err); }
    }

    context.name = this.document.name;
    context.config = config;
    context.locationTypes = Object.entries(LOCATION_TYPES).map(([key, label]) => ({ key, label, selected: config.type === key }));
    context.priceLevels = Object.entries(PRICE_LEVELS).map(([key, label]) => ({ key, label, selected: config.priceLevel === key }));
    context.settlements = roots.map(j => ({ id: j.id, name: j.name, selected: j.id === config.settlementId }));
    context.districts = districts.map(j => ({ id: j.id, name: j.name, selected: j.id === config.districtId }));
    context.rootSettlement = root ? { id: root.id, name: root.name } : null;
    context.district = district ? { id: district.id, name: district.name } : null;
    context.proprietor = proprietor ? {
      uuid: proprietor.uuid,
      name: proprietor.name,
      img: proprietor.img ?? "icons/svg/mystery-man.svg"
    } : null;
    context.proprietorMissing = Boolean(config.proprietorUuid && !proprietor);
    return context;
  }

  static async _onSubmitLocation(event, form, formData) {
    event.preventDefault();
    const data = foundry.utils.expandObject(formData.object ?? {});
    const current = deepMerge(defaultLocationConfig(), getLocationConfig(this.document));
    const config = deepMerge(current, data.location ?? {});
    const name = String(data.name ?? this.document.name ?? "Nouveau lieu").trim() || "Nouveau lieu";

    if (config.districtId) {
      const district = game.journal.get(config.districtId);
      const dc = district?.getFlag(MODULE_ID, "config") ?? {};
      if (!district || dc.parentSettlementId !== config.settlementId) config.districtId = "";
    }

    await this.document.update({
      name,
      [`flags.${MODULE_ID}.isLocation`]: true,
      [`flags.${MODULE_ID}.locationConfig`]: config
    });
    ui.notifications.info("Fiche de lieu enregistrée.");
    this.render();
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    root.querySelector('[data-action="open-settlement"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true);
    });
    root.querySelector('[data-action="open-district"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true);
    });
    root.querySelector('[data-action="pick-proprietor"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._pickProprietor();
    });
    root.querySelector('[data-action="open-proprietor"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._openProprietor();
    });
    root.querySelector('[data-action="remove-proprietor"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._removeProprietor();
    });
    root.querySelector('[data-action="post-location"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      this._postLocation();
    });

    const dropZone = root.querySelector(".location-owner-drop-zone");
    if (dropZone) {
      dropZone.addEventListener("dragover", ev => {
        ev.preventDefault();
        dropZone.classList.add("drag-over");
      });
      dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
      dropZone.addEventListener("drop", ev => {
        ev.preventDefault();
        dropZone.classList.remove("drag-over");
        this._handleOwnerDrop(ev);
      });
    }
  }

  _current() {
    return deepMerge(defaultLocationConfig(), getLocationConfig(this.document));
  }

  async _saveConfig(config) {
    await this.document.update({ [`flags.${MODULE_ID}.locationConfig`]: config });
    this.render();
  }

  _pickProprietor() {
    const actors = game.actors.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!actors.length) {
      ui.notifications.warn("Aucun Actor n'existe dans ce monde.");
      return;
    }
    const options = actors.map(a => `<option value="${escapeHtml(a.uuid)}">${escapeHtml(a.name)}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog"><div class="form-group"><label>Propriétaire / responsable</label><select name="uuid">${options}</select></div></form>`;
    new Dialog({
      title: `Responsable — ${this.document.name}`,
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-link"></i>',
          label: "Lier",
          callback: async html => {
            const fd = new FormData(html.find("form")[0]);
            const actor = await fromUuid(String(fd.get("uuid") || ""));
            if (actor?.documentName !== "Actor") return;
            const config = this._current();
            config.proprietorUuid = actor.uuid;
            config.proprietorName = actor.name;
            await this._saveConfig(config);
          }
        },
        cancel: { label: "Annuler" }
      },
      default: "add"
    }).render(true);
  }

  async _handleOwnerDrop(event) {
    const raw = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("application/json") || "";
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); }
    catch (_) { return; }
    const uuid = data.uuid ?? (data.type === "Actor" && data.id ? `Actor.${data.id}` : "");
    if (!uuid) return;
    try {
      const actor = await fromUuid(uuid);
      if (actor?.documentName !== "Actor") return;
      const config = this._current();
      config.proprietorUuid = actor.uuid;
      config.proprietorName = actor.name;
      await this._saveConfig(config);
    } catch (err) {
      console.error(`${MODULE_ID} | Drop propriétaire`, err);
      ui.notifications.warn("Impossible de lier cet Actor.");
    }
  }

  async _openProprietor() {
    const config = this._current();
    if (!config.proprietorUuid) return;
    try {
      const actor = await fromUuid(config.proprietorUuid);
      actor?.sheet.render(true);
    } catch (_) {
      ui.notifications.warn("Le responsable lié est introuvable.");
    }
  }

  async _removeProprietor() {
    const config = this._current();
    config.proprietorUuid = "";
    config.proprietorName = "";
    await this._saveConfig(config);
  }

  async _postLocation() {
    const config = this._current();
    const type = LOCATION_TYPES[config.type] ?? "Lieu";
    const price = PRICE_LEVELS[config.priceLevel] ?? "Standard";
    const content = `
      <div class="pf1-location-chat">
        <h2>${escapeHtml(this.document.name)}</h2>
        <p><strong>${escapeHtml(type)}</strong>${config.address ? ` · ${escapeHtml(config.address)}` : ""}</p>
        ${config.description ? `<p>${escapeHtml(config.description).replace(/\n/g, "<br>")}</p>` : ""}
        ${config.services ? `<h3>Services</h3><p>${escapeHtml(config.services).replace(/\n/g, "<br>")}</p>` : ""}
        <p><small>Niveau de prix : ${escapeHtml(price)}</small></p>
      </div>`;
    await ChatMessage.create({ speaker: { alias: this.document.name }, content });
  }
}
