import {
  MODULE_ID,
  FACTION_TYPES,
  FACTION_RELATIONS,
  INFLUENCE_LEVELS
} from "./data.mjs";
import { getRootSettlements } from "./settlements.mjs";
import { getFactions, getFactionConfig } from "./factions.mjs";
import {
  getPoliticsState,
  FACTION_TENSION_LEVELS,
  TENSION_TRENDS
} from "./politics.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function pairKey(a, b) {
  return [String(a ?? ""), String(b ?? "")].sort().join("::");
}

function shortLabel(value, max = 19) {
  const text = String(value ?? "");
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function relationWeight(status) {
  switch (status) {
    case "allied": return 0;
    case "friendly": return 1;
    case "rival": return 2;
    case "enemy": return 3;
    case "neutral": return 4;
    default: return 5;
  }
}

function positionNodes(count) {
  const width = 900;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  if (count <= 0) return [];
  if (count === 1) return [{ x: cx, y: cy }];

  const positions = [];
  if (count <= 10) {
    const radius = Math.min(235, 120 + count * 13);
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
      positions.push({
        x: Math.round(cx + Math.cos(angle) * radius),
        y: Math.round(cy + Math.sin(angle) * radius)
      });
    }
    return positions;
  }

  const innerCount = Math.min(8, Math.ceil(count * 0.4));
  const outerCount = count - innerCount;
  for (let i = 0; i < innerCount; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / innerCount;
    positions.push({
      x: Math.round(cx + Math.cos(angle) * 150),
      y: Math.round(cy + Math.sin(angle) * 150)
    });
  }
  for (let i = 0; i < outerCount; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / outerCount;
    positions.push({
      x: Math.round(cx + Math.cos(angle) * 255),
      y: Math.round(cy + Math.sin(angle) * 255)
    });
  }
  return positions;
}

function influenceSummary(config, settlementId = "") {
  const rows = settlementId
    ? config.influences.filter(i => i.settlementId === settlementId)
    : config.influences;
  if (!rows.length) return "Aucune influence";

  if (!settlementId) {
    const roots = new Set(rows.map(i => i.settlementId).filter(Boolean));
    return `${rows.length} zone(s) · ${roots.size} communauté(s)`;
  }

  const details = rows.map(i => {
    const district = i.districtId ? game.journal.get(i.districtId) : null;
    const area = district?.name ?? "Ensemble de la ville";
    const level = INFLUENCE_LEVELS[i.level] ?? i.level ?? "Influence";
    return `${area} — ${level}`;
  });
  return details.join(" · ");
}

function tensionClass(level) {
  const n = Number(level) || 0;
  if (n >= 5) return "war";
  if (n >= 4) return "clash";
  if (n >= 3) return "hostile";
  if (n >= 2) return "rival";
  if (n >= 1) return "friction";
  return "cooperation";
}

export class FactionNetwork extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.settlementId = String(options.settlementId ?? "");
    this.showNeutral = Boolean(options.showNeutral ?? false);
  }

  static DEFAULT_OPTIONS = {
    classes: ["pf1-faction-network"],
    position: { width: 1180, height: 860 },
    window: { title: "PF1 — Réseau politique", resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/faction-network.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const roots = getRootSettlements().slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (this.settlementId && !roots.some(r => r.id === this.settlementId)) this.settlementId = "";

    const allFactions = getFactions().slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const factionDocs = this.settlementId
      ? allFactions.filter(f => getFactionConfig(f).influences.some(i => i.settlementId === this.settlementId))
      : allFactions;

    const positions = positionNodes(factionDocs.length);
    const nodes = factionDocs.map((f, index) => {
      const config = getFactionConfig(f);
      const position = positions[index] ?? { x: 450, y: 300 };
      return {
        id: f.id,
        name: f.name,
        shortName: shortLabel(f.name),
        type: FACTION_TYPES[config.type] ?? "Organisation",
        leaderName: config.leaderName || "—",
        influenceSummary: influenceSummary(config, this.settlementId),
        relationCount: config.relations.length,
        x: position.x,
        y: position.y
      };
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const relationSeen = new Set();
    const relationEdges = [];

    for (const faction of factionDocs) {
      const source = nodeById.get(faction.id);
      if (!source) continue;
      const config = getFactionConfig(faction);
      for (const relation of config.relations) {
        const target = nodeById.get(relation.factionId);
        if (!target || target.id === source.id) continue;
        if (!this.showNeutral && relation.status === "neutral") continue;
        const key = pairKey(source.id, target.id);
        if (relationSeen.has(key)) continue;
        relationSeen.add(key);
        relationEdges.push({
          key,
          sourceId: source.id,
          targetId: target.id,
          sourceName: source.name,
          targetName: target.name,
          status: relation.status || "neutral",
          statusLabel: FACTION_RELATIONS[relation.status] ?? "Neutre",
          notes: relation.notes || "",
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          mx: Math.round((source.x + target.x) / 2),
          my: Math.round((source.y + target.y) / 2)
        });
      }
    }

    relationEdges.sort((a, b) => {
      const w = relationWeight(a.status) - relationWeight(b.status);
      if (w !== 0) return w;
      return `${a.sourceName}${a.targetName}`.localeCompare(`${b.sourceName}${b.targetName}`, "fr");
    });

    const tensionRows = [];
    const tensionEdges = [];
    if (this.settlementId) {
      const settlement = game.journal.get(this.settlementId);
      const state = settlement ? getPoliticsState(settlement) : null;
      for (const tension of state?.tensions ?? []) {
        const source = nodeById.get(tension.factionAId);
        const target = nodeById.get(tension.factionBId);
        if (!source || !target || source.id === target.id) continue;
        const level = Number(tension.level) || 0;
        const row = {
          id: tension.id,
          sourceId: source.id,
          targetId: target.id,
          sourceName: source.name,
          targetName: target.name,
          level,
          levelLabel: FACTION_TENSION_LEVELS[level] ?? String(level),
          trend: tension.trend || "stable",
          trendLabel: TENSION_TRENDS[tension.trend] ?? "Stable",
          issue: tension.issue || "",
          notes: tension.notes || "",
          visibility: tension.visibility || "public",
          cssClass: tensionClass(level),
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y
        };
        tensionRows.push(row);
        if (level > 0) tensionEdges.push(row);
      }
      tensionRows.sort((a, b) => b.level - a.level || `${a.sourceName}${a.targetName}`.localeCompare(`${b.sourceName}${b.targetName}`, "fr"));
    }

    const degrees = new Map(nodes.map(n => [n.id, 0]));
    for (const edge of relationEdges) {
      degrees.set(edge.sourceId, (degrees.get(edge.sourceId) ?? 0) + 1);
      degrees.set(edge.targetId, (degrees.get(edge.targetId) ?? 0) + 1);
    }

    const factionCards = nodes.map(n => ({
      ...n,
      visibleRelationCount: degrees.get(n.id) ?? 0
    }));

    context.settlements = [
      { id: "", name: "Toutes les communautés", selected: !this.settlementId },
      ...roots.map(r => ({ id: r.id, name: r.name, selected: r.id === this.settlementId }))
    ];
    context.selectedSettlementId = this.settlementId;
    context.selectedSettlementName = this.settlementId ? game.journal.get(this.settlementId)?.name ?? "Communauté" : "Toutes les communautés";
    context.showNeutral = this.showNeutral;
    context.nodes = nodes;
    context.relationEdges = relationEdges;
    context.tensionEdges = tensionEdges;
    context.tensions = tensionRows;
    context.factionCards = factionCards;
    context.hasFactions = nodes.length > 0;
    context.hasRelations = relationEdges.length > 0;
    context.hasTensions = tensionRows.length > 0;
    context.stats = {
      factions: nodes.length,
      relations: relationEdges.length,
      tensions: tensionRows.filter(t => t.level > 0).length,
      conflicts: tensionRows.filter(t => t.level >= 3).length
    };
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    root?.querySelector('[data-action="settlement-filter"]')?.addEventListener("change", ev => {
      this.settlementId = String(ev.currentTarget.value ?? "");
      this.render();
    });

    root?.querySelector('[data-action="toggle-neutral"]')?.addEventListener("change", ev => {
      this.showNeutral = Boolean(ev.currentTarget.checked);
      this.render();
    });

    const openFaction = id => {
      const faction = game.journal.get(id);
      if (faction?.getFlag(MODULE_ID, "isFaction")) faction.sheet.render(true);
    };

    root?.querySelectorAll('[data-action="open-faction"]').forEach(el => {
      el.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        openFaction(ev.currentTarget.dataset.id);
      });
      el.addEventListener("keydown", ev => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        openFaction(ev.currentTarget.dataset.id);
      });
    });
  }
}
