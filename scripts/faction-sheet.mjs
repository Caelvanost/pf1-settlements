import {
  MODULE_ID,
  FACTION_TYPES,
  INFLUENCE_LEVELS,
  FACTION_RELATIONS,
  defaultFactionConfig
} from "./data.mjs";
import { getRootSettlements, getDistricts } from "./settlements.mjs";
import { getLocations, getLocationConfig } from "./locations.mjs";
import {
  getFactions,
  getFactionConfig,
  addFactionInfluence,
  removeFactionInfluenceAt,
  setFactionRelation,
  removeFactionRelation
} from "./factions.mjs";
import { FactionNetwork } from "./faction-network.mjs";

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

export class FactionSheet extends BaseSheet {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-faction-sheet"],
    position: { width: 900, height: 840 },
    window: { resizable: true },
    form: {
      closeOnSubmit: false,
      submitOnChange: false,
      handler: FactionSheet._onSubmitFaction
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/faction-sheet.hbs` }
  };

  get title() {
    return `${this.document.name} — Faction PF1`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = deepMerge(defaultFactionConfig(), getFactionConfig(this.document));
    const roots = getRootSettlements().slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const allLocations = getLocations().slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));

    let leader = null;
    if (config.leaderUuid) {
      try { leader = await fromUuid(config.leaderUuid); }
      catch (err) { console.warn(`${MODULE_ID} | Chef de faction introuvable`, err); }
    }

    const influenceRows = config.influences.map((row, index) => {
      const settlement = row.settlementId ? game.journal.get(row.settlementId) : null;
      const district = row.districtId ? game.journal.get(row.districtId) : null;
      return {
        index,
        ...row,
        settlementName: settlement?.name ?? "Ville introuvable",
        districtName: district?.name ?? "",
        levelLabel: INFLUENCE_LEVELS[row.level] ?? row.level,
        missing: !settlement || Boolean(row.districtId && !district)
      };
    });

    const relationRows = config.relations.map(row => {
      const faction = row.factionId ? game.journal.get(row.factionId) : null;
      return {
        ...row,
        name: faction?.name ?? "Faction introuvable",
        statusLabel: FACTION_RELATIONS[row.status] ?? row.status,
        missing: !faction
      };
    });

    const hq = config.headquartersLocationId ? game.journal.get(config.headquartersLocationId) : null;
    context.name = this.document.name;
    context.config = config;
    context.factionTypes = Object.entries(FACTION_TYPES).map(([key, label]) => ({ key, label, selected: config.type === key }));
    context.locations = allLocations.map(j => {
      const lc = getLocationConfig(j);
      const settlement = lc.settlementId ? game.journal.get(lc.settlementId) : null;
      const district = lc.districtId ? game.journal.get(lc.districtId) : null;
      const suffix = [settlement?.name, district?.name].filter(Boolean).join(" — ");
      return { id: j.id, name: j.name, suffix, selected: j.id === config.headquartersLocationId };
    });
    context.headquarters = hq ? { id: hq.id, name: hq.name } : null;
    context.leader = leader ? { uuid: leader.uuid, name: leader.name, img: leader.img ?? "icons/svg/mystery-man.svg" } : null;
    context.leaderMissing = Boolean(config.leaderUuid && !leader);
    context.influences = influenceRows;
    context.hasInfluences = influenceRows.length > 0;
    context.relations = relationRows;
    context.hasRelations = relationRows.length > 0;
    context.dashboard = {
      type: FACTION_TYPES[config.type] ?? "Organisation",
      influenceCount: influenceRows.length,
      relationCount: relationRows.length,
      leaderName: leader?.name ?? (config.leaderName || "Aucun"),
      headquartersName: hq?.name ?? "Aucun"
    };
    context.isGM = game.user.isGM;
    return context;
  }

  static async _onSubmitFaction(event, form, formData) {
    event.preventDefault();
    const data = foundry.utils.expandObject(formData.object ?? {});
    const current = deepMerge(defaultFactionConfig(), getFactionConfig(this.document));
    const config = deepMerge(current, data.faction ?? {});
    config.influences = current.influences;
    config.relations = current.relations;
    config.leaderUuid = current.leaderUuid;
    config.leaderName = current.leaderName;
    const name = String(data.name ?? this.document.name ?? "Nouvelle faction").trim() || "Nouvelle faction";

    await this.document.update({
      name,
      [`flags.${MODULE_ID}.isFaction`]: true,
      [`flags.${MODULE_ID}.factionConfig`]: config
    });
    ui.notifications.info("Fiche de faction enregistrée.");
    this.render();
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    root.querySelector('[data-action="pick-leader"]')?.addEventListener("click", ev => { ev.preventDefault(); this._pickLeader(); });
    root.querySelector('[data-action="open-leader"]')?.addEventListener("click", ev => { ev.preventDefault(); this._openLeader(); });
    root.querySelector('[data-action="remove-leader"]')?.addEventListener("click", ev => { ev.preventDefault(); this._removeLeader(); });
    root.querySelector('[data-action="open-hq"]')?.addEventListener("click", ev => { ev.preventDefault(); game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true); });
    root.querySelector('[data-action="add-influence"]')?.addEventListener("click", ev => { ev.preventDefault(); this._addInfluence(); });
    root.querySelectorAll('[data-action="remove-influence"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeInfluence(Number(ev.currentTarget.dataset.index)); }));
    root.querySelectorAll('[data-action="open-influence"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true); }));
    root.querySelector('[data-action="open-faction-network"]')?.addEventListener("click", ev => {
      ev.preventDefault();
      const config = getFactionConfig(this.document);
      const settlementId = config.influences.find(i => i.settlementId)?.settlementId || "";
      new FactionNetwork({ settlementId }).render(true);
    });
    root.querySelector('[data-action="add-relation"]')?.addEventListener("click", ev => { ev.preventDefault(); this._addRelation(); });
    root.querySelectorAll('[data-action="open-relation"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); game.journal.get(ev.currentTarget.dataset.id)?.sheet.render(true); }));
    root.querySelectorAll('[data-action="remove-relation"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._removeRelation(ev.currentTarget.dataset.id); }));
    root.querySelector('[data-action="post-faction"]')?.addEventListener("click", ev => { ev.preventDefault(); this._postFaction(); });

    root.querySelectorAll('[data-jump-section]').forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const id = ev.currentTarget.dataset.jumpSection;
      const target = id ? root.querySelector(`#${CSS.escape(id)}`) : null;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      root.querySelectorAll('[data-jump-section]').forEach(btn => btn.classList.toggle("active", btn === ev.currentTarget));
    }));

    const dropZone = root.querySelector(".faction-leader-drop-zone");
    if (dropZone) {
      dropZone.addEventListener("dragover", ev => { ev.preventDefault(); dropZone.classList.add("drag-over"); });
      dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
      dropZone.addEventListener("drop", ev => { ev.preventDefault(); dropZone.classList.remove("drag-over"); this._handleLeaderDrop(ev); });
    }
  }

  _current() {
    return deepMerge(defaultFactionConfig(), getFactionConfig(this.document));
  }

  async _save(config) {
    await this.document.update({ [`flags.${MODULE_ID}.factionConfig`]: config });
    this.render();
  }

  _pickLeader() {
    const actors = game.actors.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!actors.length) return ui.notifications.warn("Aucun Actor n'existe dans ce monde.");
    const opts = actors.map(a => `<option value="${escapeHtml(a.uuid)}">${escapeHtml(a.name)}</option>`).join("");
    new Dialog({
      title: `Chef — ${this.document.name}`,
      content: `<form><div class="form-group"><label>Actor PF1</label><select name="uuid">${opts}</select></div></form>`,
      buttons: {
        add: { label: "Lier", icon: '<i class="fas fa-link"></i>', callback: async html => {
          const fd = new FormData(html.find("form")[0]);
          const actor = await fromUuid(String(fd.get("uuid") || ""));
          if (actor?.documentName !== "Actor") return;
          const config = this._current();
          config.leaderUuid = actor.uuid;
          config.leaderName = actor.name;
          await this._save(config);
        }},
        cancel: { label: "Annuler" }
      },
      default: "add"
    }).render(true);
  }

  async _handleLeaderDrop(event) {
    const raw = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("application/json") || "";
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch (_) { return; }
    const uuid = data.uuid ?? (data.type === "Actor" && data.id ? `Actor.${data.id}` : "");
    if (!uuid) return;
    try {
      const actor = await fromUuid(uuid);
      if (actor?.documentName !== "Actor") return;
      const config = this._current();
      config.leaderUuid = actor.uuid;
      config.leaderName = actor.name;
      await this._save(config);
    } catch (_) { ui.notifications.warn("Impossible de lier cet Actor."); }
  }

  async _openLeader() {
    const config = this._current();
    if (!config.leaderUuid) return;
    try { (await fromUuid(config.leaderUuid))?.sheet.render(true); }
    catch (_) { ui.notifications.warn("Le chef lié est introuvable."); }
  }

  async _removeLeader() {
    const config = this._current();
    config.leaderUuid = "";
    config.leaderName = "";
    await this._save(config);
  }

  _addInfluence() {
    const roots = getRootSettlements().slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!roots.length) return ui.notifications.warn("Crée d'abord une ville ou une communauté.");
    const zoneOptions = [];
    for (const root of roots) {
      zoneOptions.push(`<option value="${root.id}|">${escapeHtml(root.name)} — ville entière</option>`);
      for (const district of getDistricts(root).slice().sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
        zoneOptions.push(`<option value="${root.id}|${district.id}">${escapeHtml(root.name)} — ${escapeHtml(district.name)}</option>`);
      }
    }
    const levels = Object.entries(INFLUENCE_LEVELS).map(([key, label]) => `<option value="${key}" ${key === "moderate" ? "selected" : ""}>${label}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog">
      <div class="form-group"><label>Zone</label><select name="zone">${zoneOptions.join("")}</select></div>
      <div class="form-group"><label>Influence</label><select name="level">${levels}</select></div>
      <div class="form-group"><label>Notes</label><textarea name="notes" rows="4"></textarea></div>
    </form>`;
    new Dialog({
      title: `Ajouter une zone d'influence — ${this.document.name}`,
      content,
      buttons: {
        add: { label: "Ajouter", icon: '<i class="fas fa-plus"></i>', callback: async html => {
          const fd = new FormData(html.find("form")[0]);
          const [settlementId, districtId = ""] = String(fd.get("zone") || "").split("|");
          await addFactionInfluence(this.document, settlementId, districtId, String(fd.get("level") || "moderate"), String(fd.get("notes") || ""));
          this.render();
        }},
        cancel: { label: "Annuler" }
      }, default: "add"
    }).render(true);
  }

  async _removeInfluence(index) {
    await removeFactionInfluenceAt(this.document, index);
    this.render();
  }

  _addRelation() {
    const others = getFactions().filter(f => f.id !== this.document.id).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!others.length) return ui.notifications.warn("Aucune autre faction n'existe encore.");
    const factions = others.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("");
    const statuses = Object.entries(FACTION_RELATIONS).map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
    const content = `<form class="pf1-settlement-dialog">
      <div class="form-group"><label>Faction</label><select name="target">${factions}</select></div>
      <div class="form-group"><label>Relation</label><select name="status">${statuses}</select></div>
      <div class="form-group"><label>Notes</label><textarea name="notes" rows="4"></textarea></div>
    </form>`;
    new Dialog({
      title: `Relation — ${this.document.name}`,
      content,
      buttons: {
        add: { label: "Enregistrer", icon: '<i class="fas fa-link"></i>', callback: async html => {
          const fd = new FormData(html.find("form")[0]);
          const target = game.journal.get(String(fd.get("target") || ""));
          if (!target) return;
          await setFactionRelation(this.document, target, String(fd.get("status") || "neutral"), String(fd.get("notes") || ""));
          this.render();
        }},
        cancel: { label: "Annuler" }
      }, default: "add"
    }).render(true);
  }

  async _removeRelation(targetId) {
    await removeFactionRelation(this.document, targetId);
    this.render();
  }

  async _postFaction() {
    const config = this._current();
    const type = FACTION_TYPES[config.type] ?? "Organisation";
    const influences = config.influences.map(i => {
      const s = game.journal.get(i.settlementId);
      const d = game.journal.get(i.districtId);
      return `${s?.name ?? "?"}${d ? ` — ${d.name}` : ""} (${INFLUENCE_LEVELS[i.level] ?? i.level})`;
    }).filter(Boolean);
    const content = `<div class="pf1-faction-chat">
      <h2>${escapeHtml(this.document.name)}</h2>
      <p><strong>${escapeHtml(type)}</strong></p>
      ${config.description ? `<p>${escapeHtml(config.description).replace(/\n/g, "<br>")}</p>` : ""}
      ${config.goals ? `<h3>Objectifs</h3><p>${escapeHtml(config.goals).replace(/\n/g, "<br>")}</p>` : ""}
      ${influences.length ? `<h3>Zones d'influence</h3><p>${influences.map(escapeHtml).join("<br>")}</p>` : ""}
    </div>`;
    await ChatMessage.create({ speaker: { alias: this.document.name }, content });
  }
}
