import { MODULE_ID, ADVANTAGES, DRAWBACKS, defaultSettlementConfig } from "./data.mjs";
import { calculateSettlement } from "./calculator.mjs";
import { getSettlements } from "./settlements.mjs";

export const TRAIT_LIBRARY_SETTING = "traitLibrary";

export const TRAIT_SOURCE_TYPES = {
  gmg: "Guide du Maître",
  supplement: "Supplément / Adventure Path",
  homebrew: "Campagne maison",
  other: "Autre source"
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;


function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function clone(value) {
  return foundry.utils.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function numeric(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeTrait(row = {}) {
  const kind = row.kind === "drawback" ? "drawback" : "advantage";
  return {
    id: String(row.id || foundry.utils.randomID()),
    label: String(row.label || (kind === "drawback" ? "Nouvel inconvénient" : "Nouvel avantage")),
    kind,
    description: String(row.description || ""),
    sourceType: String(row.sourceType || "homebrew"),
    source: String(row.source || TRAIT_SOURCE_TYPES[row.sourceType] || "Campagne maison"),
    corruption: numeric(row.corruption ?? row.mods?.corruption),
    crime: numeric(row.crime ?? row.mods?.crime),
    economy: numeric(row.economy ?? row.mods?.economy),
    law: numeric(row.law ?? row.mods?.law),
    lore: numeric(row.lore ?? row.mods?.lore),
    society: numeric(row.society ?? row.mods?.society),
    danger: numeric(row.danger),
    baseValuePct: numeric(row.baseValuePct),
    purchaseLimitPct: numeric(row.purchaseLimitPct),
    spellcasting: numeric(row.spellcasting),
    notes: String(row.notes || ""),
    builtin: Boolean(row.builtin),
    builtinKey: String(row.builtinKey || "")
  };
}

function builtInRows() {
  const advantages = Object.entries(ADVANTAGES).map(([key, value]) => normalizeTrait({
    id: `builtin-advantage-${key}`,
    builtin: true,
    builtinKey: key,
    kind: "advantage",
    label: value.label,
    description: value.description,
    sourceType: "gmg",
    source: "Guide du Maître",
    ...value,
    ...value.mods
  }));
  const drawbacks = Object.entries(DRAWBACKS).map(([key, value]) => normalizeTrait({
    id: `builtin-drawback-${key}`,
    builtin: true,
    builtinKey: key,
    kind: "drawback",
    label: value.label,
    description: value.description,
    sourceType: key === "drought" ? "supplement" : "gmg",
    source: key === "drought" ? "Skull & Shackles" : "Guide du Maître",
    ...value,
    ...value.mods
  }));
  return [...advantages, ...drawbacks];
}

function readCustomRows() {
  try {
    const raw = game.settings.get(MODULE_ID, TRAIT_LIBRARY_SETTING) || "[]";
    const rows = JSON.parse(raw);
    return Array.isArray(rows) ? rows.map(normalizeTrait).map(r => ({ ...r, builtin: false, builtinKey: "" })) : [];
  } catch (err) {
    console.warn(`${MODULE_ID} | Bibliothèque de traits illisible`, err);
    return [];
  }
}

async function writeCustomRows(rows) {
  const cleaned = rows.map(normalizeTrait).map(r => ({ ...r, builtin: false, builtinKey: "" }));
  await game.settings.set(MODULE_ID, TRAIT_LIBRARY_SETTING, JSON.stringify(cleaned));
}

export function getTraitLibrary() {
  return [...builtInRows(), ...readCustomRows()];
}

export function getCustomTraitLibrary() {
  return readCustomRows();
}

export async function createLibraryTrait(data = {}) {
  if (!game.user.isGM) throw new Error("Seul le MJ peut modifier la bibliothèque de traits.");
  const rows = readCustomRows();
  const trait = normalizeTrait({ ...data, id: foundry.utils.randomID(), builtin: false, builtinKey: "" });
  rows.push(trait);
  await writeCustomRows(rows);
  return trait;
}

export async function updateLibraryTrait(id, patch = {}) {
  if (!game.user.isGM) throw new Error("Seul le MJ peut modifier la bibliothèque de traits.");
  const rows = readCustomRows();
  const index = rows.findIndex(r => r.id === id);
  if (index < 0) return null;
  rows[index] = normalizeTrait({ ...rows[index], ...patch, id, builtin: false, builtinKey: "" });
  await writeCustomRows(rows);
  return rows[index];
}

export async function deleteLibraryTrait(id) {
  if (!game.user.isGM) throw new Error("Seul le MJ peut modifier la bibliothèque de traits.");
  const before = readCustomRows();
  const after = before.filter(r => r.id !== id);
  if (after.length === before.length) return false;
  await writeCustomRows(after);
  return true;
}

export async function saveSettlementTraitToLibrary(settlement, kind, traitId) {
  if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut enregistrer un trait dans la bibliothèque.");
  if (!settlement || !traitId) return null;
  const config = settlement.getFlag(MODULE_ID, "config") ?? {};
  const bucket = kind === "drawback" ? config.customDrawbacks : config.customAdvantages;
  const source = bucket?.[traitId];
  if (!source) return null;
  const trait = await createLibraryTrait({
    ...clone(source),
    kind: kind === "drawback" ? "drawback" : "advantage",
    source: source.source || source.notes || "Campagne maison",
    sourceType: source.sourceType || "homebrew",
    description: source.description || ""
  });
  ui.notifications.info(`${trait.label} a été ajouté à la bibliothèque de traits.`);
  return trait;
}

export async function applyTraitToSettlement(traitOrId, settlement) {
  const trait = typeof traitOrId === "string" ? getTraitLibrary().find(t => t.id === traitOrId) : normalizeTrait(traitOrId);
  if (!trait || !settlement) return false;
  const current = foundry.utils.mergeObject(defaultSettlementConfig(), settlement.getFlag(MODULE_ID, "config") ?? {}, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true
  });

  if (trait.builtin && trait.builtinKey) {
    if (trait.kind === "drawback") {
      current.drawbacks ??= {};
      current.drawbacks[trait.builtinKey] = true;
    } else {
      current.advantages ??= {};
      current.advantages[trait.builtinKey] = true;
    }
  } else {
    const id = foundry.utils.randomID();
    const target = trait.kind === "drawback" ? (current.customDrawbacks ??= {}) : (current.customAdvantages ??= {});
    target[id] = {
      label: trait.label,
      active: true,
      description: trait.description,
      sourceType: trait.sourceType,
      source: trait.source,
      corruption: trait.corruption,
      crime: trait.crime,
      economy: trait.economy,
      law: trait.law,
      lore: trait.lore,
      society: trait.society,
      danger: trait.danger,
      baseValuePct: trait.baseValuePct,
      purchaseLimitPct: trait.purchaseLimitPct,
      spellcasting: trait.spellcasting,
      notes: trait.notes
    };
  }

  const derived = calculateSettlement(current);
  await settlement.update({
    [`flags.${MODULE_ID}.config`]: current,
    [`flags.${MODULE_ID}.derived`]: derived
  });
  ui.notifications.info(`${trait.label} appliqué à ${settlement.name}.`);
  return true;
}

export function downloadTraitLibrary() {
  const payload = {
    format: "pf1-settlements-trait-library",
    version: 1,
    exportedAt: new Date().toISOString(),
    traits: readCustomRows()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pf1-settlements-traits.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importTraitLibraryFile(file, { merge = true } = {}) {
  if (!game.user.isGM) throw new Error("Seul le MJ peut importer une bibliothèque de traits.");
  const payload = JSON.parse(await file.text());
  if (!payload || payload.format !== "pf1-settlements-trait-library" || !Array.isArray(payload.traits)) {
    throw new Error("Fichier de bibliothèque de traits non reconnu.");
  }
  const incoming = payload.traits.map(r => normalizeTrait({ ...r, builtin: false, builtinKey: "" }));
  let rows = merge ? readCustomRows() : [];
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const trait of incoming) {
    const id = byId.has(trait.id) ? foundry.utils.randomID() : trait.id;
    rows.push({ ...trait, id });
  }
  await writeCustomRows(rows);
  return incoming.length;
}

function effectsSummary(trait) {
  const rows = [
    ["Cor", trait.corruption], ["Cri", trait.crime], ["Éco", trait.economy], ["Loi", trait.law],
    ["Fol", trait.lore], ["Soc", trait.society], ["Danger", trait.danger],
    ["Base", trait.baseValuePct ? `${trait.baseValuePct}%` : 0],
    ["Achat", trait.purchaseLimitPct ? `${trait.purchaseLimitPct}%` : 0],
    ["Inc.", trait.spellcasting]
  ].filter(([, value]) => value !== 0 && value !== "0%" && value !== "");
  return rows.length ? rows.map(([k, v]) => `${k} ${typeof v === "number" && v > 0 ? "+" : ""}${v}`).join(" · ") : "Aucun modificateur chiffré";
}

export class TraitLibrary extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-trait-library"],
    position: { width: 900, height: 760 },
    window: { title: "PF1 — Bibliothèque de traits", resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/trait-library.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.traits = getTraitLibrary()
      .slice()
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label, "fr"))
      .map(t => ({
        ...t,
        kindLabel: t.kind === "drawback" ? "Inconvénient" : "Avantage",
        sourceTypeLabel: TRAIT_SOURCE_TYPES[t.sourceType] ?? "Autre source",
        effectsSummary: effectsSummary(t)
      }));
    context.customCount = readCustomRows().length;
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;
    root.querySelector('[data-action="create"]')?.addEventListener("click", ev => { ev.preventDefault(); this._editTrait(); });
    root.querySelector('[data-action="export"]')?.addEventListener("click", ev => { ev.preventDefault(); downloadTraitLibrary(); });
    root.querySelector('[data-action="import"]')?.addEventListener("click", ev => { ev.preventDefault(); this._pickImport(); });
    root.querySelectorAll('[data-action="edit"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._editTrait(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="delete"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._deleteTrait(ev.currentTarget.dataset.id); }));
    root.querySelectorAll('[data-action="apply"]').forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); this._applyTrait(ev.currentTarget.dataset.id); }));
  }

  _editTrait(id = "") {
    const existing = id ? readCustomRows().find(t => t.id === id) : null;
    if (id && !existing) return ui.notifications.warn("Seuls les traits personnalisés peuvent être modifiés.");
    const t = existing ?? normalizeTrait({ kind: "advantage", sourceType: "homebrew", source: "Campagne maison" });
    const sourceOptions = Object.entries(TRAIT_SOURCE_TYPES).map(([key, label]) => `<option value="${key}" ${t.sourceType === key ? "selected" : ""}>${label}</option>`).join("");
    const content = `<form class="pf1-trait-editor">
      <div class="form-group"><label>Type</label><select name="kind"><option value="advantage" ${t.kind === "advantage" ? "selected" : ""}>Avantage</option><option value="drawback" ${t.kind === "drawback" ? "selected" : ""}>Inconvénient</option></select></div>
      <div class="form-group"><label>Nom</label><input type="text" name="label" value="${escapeHtml(t.label)}"></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="3">${escapeHtml(t.description)}</textarea></div>
      <div class="form-group"><label>Type de source</label><select name="sourceType">${sourceOptions}</select></div>
      <div class="form-group"><label>Source</label><input type="text" name="source" value="${escapeHtml(t.source)}" placeholder="Livre, campagne, page..."></div>
      <div class="pf1-trait-editor-grid">
        <label>Corruption<input type="number" name="corruption" value="${t.corruption}"></label><label>Criminalité<input type="number" name="crime" value="${t.crime}"></label>
        <label>Économie<input type="number" name="economy" value="${t.economy}"></label><label>Loi<input type="number" name="law" value="${t.law}"></label>
        <label>Folklore<input type="number" name="lore" value="${t.lore}"></label><label>Société<input type="number" name="society" value="${t.society}"></label>
        <label>Danger<input type="number" name="danger" value="${t.danger}"></label><label>Valeur de base (%)<input type="number" name="baseValuePct" value="${t.baseValuePct}"></label>
        <label>Limite d'achat (%)<input type="number" name="purchaseLimitPct" value="${t.purchaseLimitPct}"></label><label>Incantation<input type="number" name="spellcasting" value="${t.spellcasting}"></label>
      </div>
      <div class="form-group"><label>Notes</label><textarea name="notes" rows="2">${escapeHtml(t.notes)}</textarea></div>
    </form>`;
    new Dialog({
      title: existing ? `Modifier — ${existing.label}` : "Nouveau trait de communauté",
      content,
      buttons: {
        save: { label: "Enregistrer", callback: async html => {
          const form = html[0]?.querySelector("form") ?? html.querySelector?.("form");
          const data = Object.fromEntries(new FormData(form).entries());
          const patch = { ...data };
          for (const key of ["corruption","crime","economy","law","lore","society","danger","baseValuePct","purchaseLimitPct","spellcasting"]) patch[key] = numeric(data[key]);
          if (existing) await updateLibraryTrait(existing.id, patch); else await createLibraryTrait(patch);
          this.render();
        }},
        cancel: { label: "Annuler" }
      }, default: "save"
    }).render(true);
  }

  _deleteTrait(id) {
    const trait = readCustomRows().find(t => t.id === id);
    if (!trait) return ui.notifications.warn("Ce trait intégré ne peut pas être supprimé.");
    new Dialog({
      title: `Supprimer — ${trait.label}`,
      content: `<p>Supprimer ce trait de la bibliothèque ? Les copies déjà appliquées aux villes ne seront pas supprimées.</p>`,
      buttons: {
        delete: { label: "Supprimer", callback: async () => { await deleteLibraryTrait(id); this.render(); } },
        cancel: { label: "Annuler" }
      }
    }).render(true);
  }

  _applyTrait(id) {
    const trait = getTraitLibrary().find(t => t.id === id);
    if (!trait) return;
    const settlements = getSettlements().slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!settlements.length) return ui.notifications.warn("Aucune communauté disponible.");
    const options = settlements.map(s => `<label class="pf1-trait-apply-row"><input type="checkbox" name="settlementIds" value="${s.id}"> ${escapeHtml(s.name)}</label>`).join("");
    new Dialog({
      title: `Appliquer — ${trait.label}`,
      content: `<form><p>Choisis une ou plusieurs communautés.</p><div class="pf1-trait-apply-list">${options}</div><p><strong>Source :</strong> ${escapeHtml(trait.source)}</p></form>`,
      buttons: {
        apply: { label: "Appliquer", callback: async html => {
          const form = html[0]?.querySelector("form") ?? html.querySelector?.("form");
          const ids = [...(form?.querySelectorAll('[name="settlementIds"]:checked') ?? [])].map(el => el.value);
          if (!ids.length) return ui.notifications.warn("Choisis au moins une communauté.");
          for (const id of ids) {
            const settlement = game.journal.get(id);
            if (settlement) await applyTraitToSettlement(trait, settlement);
          }
        }},
        cancel: { label: "Annuler" }
      }, default: "apply"
    }).render(true);
  }

  _pickImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const count = await importTraitLibraryFile(file, { merge: true });
        ui.notifications.info(`${count} trait(s) importé(s) dans la bibliothèque.`);
        this.render();
      } catch (err) {
        console.error(`${MODULE_ID} | Import de traits impossible`, err);
        ui.notifications.error(err.message || "Impossible d'importer cette bibliothèque.");
      }
    }, { once: true });
    input.click();
  }
}
