import {
  SETTLEMENT_TYPES,
  GOVERNMENTS,
  ADVANTAGES,
  DRAWBACKS,
  MODIFIER_LABELS
} from "./data.mjs";

const MOD_KEYS = Object.keys(MODIFIER_LABELS);

function addMods(target, mods = {}) {
  for (const [key, value] of Object.entries(mods)) {
    target[key] = Number(target[key] ?? 0) + Number(value ?? 0);
  }
}

function alignmentMods(alignment) {
  const mods = { corruption: 0, crime: 0, economy: 0, law: 0, lore: 0, society: 0 };
  if (alignment === "N") {
    mods.lore += 2;
    return mods;
  }
  if (alignment?.startsWith("L")) mods.law += 1;
  if (alignment?.startsWith("C")) mods.crime += 1;
  if (alignment?.endsWith("G")) mods.society += 1;
  if (alignment?.endsWith("E")) mods.corruption += 1;
  if (alignment?.startsWith("N") || alignment?.endsWith("N")) mods.lore += 1;
  return mods;
}

export function calculateSettlement(config) {
  const type = SETTLEMENT_TYPES[config.type] ?? SETTLEMENT_TYPES.village;
  const government = GOVERNMENTS[config.government] ?? GOVERNMENTS.autocracy;

  const modifiers = Object.fromEntries(MOD_KEYS.map(k => [k, type.modifier]));
  const breakdown = {
    base: Object.fromEntries(MOD_KEYS.map(k => [k, type.modifier])),
    alignment: alignmentMods(config.alignment),
    government: {},
    advantages: {},
    drawbacks: {},
    adjustments: {}
  };

  addMods(modifiers, breakdown.alignment);

  const hasAnarchy = Boolean(config.drawbacks?.anarchic);
  if (hasAnarchy) {
    breakdown.government = { corruption: 4, crime: 4, economy: -4, law: -6, society: -4 };
  } else {
    breakdown.government = { ...(government.mods ?? {}) };
  }
  addMods(modifiers, breakdown.government);

  let danger = type.danger;
  let baseValuePct = 0;
  let purchaseLimitPct = 0;
  let spellcasting = type.spellcasting;

  const chosenAdvantages = [];
  for (const [key, chosen] of Object.entries(config.advantages ?? {})) {
    if (!chosen || !ADVANTAGES[key]) continue;
    const a = ADVANTAGES[key];
    chosenAdvantages.push(key);
    addMods(breakdown.advantages, a.mods);
    addMods(modifiers, a.mods);
    danger += Number(a.danger ?? 0);
    baseValuePct += Number(a.baseValuePct ?? 0);
    purchaseLimitPct += Number(a.purchaseLimitPct ?? 0);
    spellcasting += Number(a.spellcasting ?? 0);
  }

  const customAdvantages = Object.values(config.customAdvantages ?? {}).filter(a => a && a.active !== false);
  for (const advantage of customAdvantages) {
    const mods = {};
    for (const key of MOD_KEYS) {
      const value = Number(advantage[key] ?? advantage.mods?.[key] ?? 0) || 0;
      if (value) mods[key] = value;
    }
    addMods(breakdown.advantages, mods);
    addMods(modifiers, mods);
    danger += Number(advantage.danger ?? 0) || 0;
    baseValuePct += Number(advantage.baseValuePct ?? 0) || 0;
    purchaseLimitPct += Number(advantage.purchaseLimitPct ?? 0) || 0;
    spellcasting += Number(advantage.spellcasting ?? 0) || 0;
  }

  if (!hasAnarchy) spellcasting += Number(government.spellcasting ?? 0);

  const chosenDrawbacks = [];
  for (const [key, chosen] of Object.entries(config.drawbacks ?? {})) {
    if (!chosen || !DRAWBACKS[key]) continue;
    chosenDrawbacks.push(key);
    if (key === "anarchic") {
      danger += 20;
    } else if (key === "cursed") {
      const target = MOD_KEYS.includes(config.cursedModifier) ? config.cursedModifier : "corruption";
      breakdown.drawbacks[target] = Number(breakdown.drawbacks[target] ?? 0) - 4;
      modifiers[target] -= 4;
    } else if (key === "huntingGround") {
      const mods = { economy: -4, law: -4, society: -4 };
      addMods(breakdown.drawbacks, mods);
      addMods(modifiers, mods);
      danger += 20;
      baseValuePct -= 20;
    } else if (key === "impoverished") {
      const mods = { corruption: 1, crime: 1 };
      addMods(breakdown.drawbacks, mods);
      addMods(modifiers, mods);
      baseValuePct -= 50;
      purchaseLimitPct -= 50;
    } else if (key === "plague") {
      const mods = Object.fromEntries(MOD_KEYS.map(k => [k, -2]));
      addMods(breakdown.drawbacks, mods);
      addMods(modifiers, mods);
      baseValuePct -= 20;
    } else if (key === "drought") {
      const mods = { law: -4 };
      addMods(breakdown.drawbacks, mods);
      addMods(modifiers, mods);
      danger += 10;
    }
  }

  const customDrawbacks = Object.values(config.customDrawbacks ?? {}).filter(d => d && d.active !== false);
  for (const drawback of customDrawbacks) {
    const mods = {};
    for (const key of MOD_KEYS) {
      const value = Number(drawback[key] ?? drawback.mods?.[key] ?? 0) || 0;
      if (value) mods[key] = value;
    }
    addMods(breakdown.drawbacks, mods);
    addMods(modifiers, mods);
    danger += Number(drawback.danger ?? 0) || 0;
    baseValuePct += Number(drawback.baseValuePct ?? 0) || 0;
    purchaseLimitPct += Number(drawback.purchaseLimitPct ?? 0) || 0;
    spellcasting += Number(drawback.spellcasting ?? 0) || 0;
  }

  const adjustments = config.adjustments ?? {};
  for (const key of MOD_KEYS) {
    const value = Number(adjustments[key] ?? 0) || 0;
    breakdown.adjustments[key] = value;
    modifiers[key] += value;
  }

  danger += Number(adjustments.danger ?? 0) || 0;
  spellcasting += Number(adjustments.spellcasting ?? 0) || 0;

  const baseValue = Math.max(0, Math.round(type.baseValue * (1 + baseValuePct / 100) + (Number(adjustments.baseValue ?? 0) || 0)));
  const purchaseLimit = Math.max(0, Math.round(type.purchaseLimit * (1 + purchaseLimitPct / 100) + (Number(adjustments.purchaseLimit ?? 0) || 0)));
  spellcasting = Math.max(0, spellcasting);

  const magic = structuredClone(type.magic);
  const poverty = Boolean(config.drawbacks?.impoverished);

  return {
    typeKey: config.type,
    typeLabel: type.label,
    populationRange: type.population,
    baseModifier: type.modifier,
    maxAdvantages: type.advantages,
    chosenAdvantageCount: chosenAdvantages.length + customAdvantages.length,
    advantageOverflow: (chosenAdvantages.length + customAdvantages.length) > type.advantages,
    chosenAdvantages,
    customAdvantages: customAdvantages.map(a => ({ ...a })),
    chosenDrawbacks,
    customDrawbacks: customDrawbacks.map(d => ({ ...d })),
    modifiers,
    breakdown,
    danger,
    market: {
      baseValue,
      purchaseLimit,
      spellcasting,
      baseValuePct,
      purchaseLimitPct,
      magic,
      poverty
    }
  };
}

export async function rollMagicAvailability(derived) {
  const results = {};
  for (const [tier, formula] of Object.entries(derived.market.magic)) {
    if (formula === "all") {
      results[tier] = { formula: "all", total: "Tous" };
      continue;
    }
    if (!formula) {
      results[tier] = { formula: null, total: 0 };
      continue;
    }
    const roll = await new Roll(formula).evaluate();
    let total = Number(roll.total ?? 0);
    if (derived.market.poverty) total = Math.floor(total / 2);
    results[tier] = { formula, total, roll };
  }
  return results;
}
