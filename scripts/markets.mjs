import { MODULE_ID } from "./data.mjs";
import { calculateSettlement, rollMagicAvailability } from "./calculator.mjs";

export const MARKET_TIERS = {
  minor: "Faible puissance",
  medium: "Intermédiaire",
  major: "Forte puissance"
};

export function defaultMarketState() {
  return {
    version: 1,
    week: 1,
    generatedAt: 0,
    slots: {
      minor: { formula: null, total: 0 },
      medium: { formula: null, total: 0 },
      major: { formula: null, total: 0 }
    },
    stock: [],
    availabilityChecks: []
  };
}

function mergeState(raw = {}) {
  const state = foundry.utils.mergeObject(defaultMarketState(), raw ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  state.stock = Array.isArray(state.stock) ? state.stock : [];
  state.availabilityChecks = Array.isArray(state.availabilityChecks) ? state.availabilityChecks : [];
  state.week = Math.max(1, Number(state.week ?? 1) || 1);
  return state;
}

export function getMarketState(settlement) {
  return mergeState(settlement?.getFlag(MODULE_ID, "marketState") ?? {});
}

export async function saveMarketState(settlement, state) {
  if (!settlement) return null;
  const clean = mergeState(state);
  await settlement.setFlag(MODULE_ID, "marketState", clean);
  return clean;
}

export async function generateMarketSlots(settlement) {
  if (!settlement) return null;
  const config = settlement.getFlag(MODULE_ID, "config") ?? {};
  const derived = settlement.getFlag(MODULE_ID, "derived") ?? calculateSettlement(config);
  const rolled = await rollMagicAvailability(derived);
  const state = getMarketState(settlement);
  state.generatedAt = Date.now();
  state.slots = Object.fromEntries(Object.entries(rolled).map(([tier, result]) => [tier, {
    formula: result.formula ?? null,
    total: result.total === "Tous" ? "all" : Number(result.total ?? 0)
  }]));
  await saveMarketState(settlement, state);
  return state;
}

export async function advanceMarketWeek(settlement, { rerollSlots = true, clearSold = true } = {}) {
  if (!settlement) return null;
  let state = getMarketState(settlement);
  state.week += 1;
  state.availabilityChecks = state.availabilityChecks.filter(c => Boolean(c.keepHistory));
  if (clearSold) state.stock = state.stock.filter(entry => !entry.sold);
  await saveMarketState(settlement, state);
  if (rerollSlots) state = await generateMarketSlots(settlement);
  return state;
}

export function getItemPrice(item) {
  if (!item) return 0;
  const candidates = [
    item.system?.price,
    item.system?.price?.value,
    item.system?.cost,
    item.system?.cost?.value,
    item.system?.value,
    item.system?.value?.value
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

export async function addMarketItem(settlement, item, {
  tier = "minor",
  merchantLocationId = "",
  quantity = 1,
  price = null,
  notes = ""
} = {}) {
  if (!settlement || !item) return null;
  const state = getMarketState(settlement);
  const entry = {
    id: foundry.utils.randomID(),
    uuid: item.uuid ?? "",
    name: item.name ?? "Objet",
    img: item.img ?? "icons/svg/item-bag.svg",
    price: price == null ? getItemPrice(item) : Math.max(0, Number(price) || 0),
    tier: MARKET_TIERS[tier] ? tier : "minor",
    merchantLocationId: String(merchantLocationId ?? ""),
    quantity: Math.max(1, Number(quantity) || 1),
    sold: false,
    notes: String(notes ?? ""),
    addedAt: Date.now()
  };
  state.stock.push(entry);
  await saveMarketState(settlement, state);
  return entry;
}

export async function updateMarketItem(settlement, entryId, changes = {}) {
  const state = getMarketState(settlement);
  const entry = state.stock.find(e => e.id === entryId);
  if (!entry) return null;
  Object.assign(entry, changes);
  entry.quantity = Math.max(1, Number(entry.quantity) || 1);
  entry.price = Math.max(0, Number(entry.price) || 0);
  entry.tier = MARKET_TIERS[entry.tier] ? entry.tier : "minor";
  await saveMarketState(settlement, state);
  return entry;
}

export async function removeMarketItem(settlement, entryId) {
  const state = getMarketState(settlement);
  const before = state.stock.length;
  state.stock = state.stock.filter(e => e.id !== entryId);
  if (state.stock.length !== before) await saveMarketState(settlement, state);
  return before !== state.stock.length;
}

export function findAvailabilityCheck(state, itemKey) {
  const key = String(itemKey ?? "").trim().toLocaleLowerCase("fr");
  return state.availabilityChecks.find(c => c.week === state.week && String(c.key ?? "").toLocaleLowerCase("fr") === key) ?? null;
}

export async function recordAvailabilityCheck(settlement, { item, price, result, rollTotal }) {
  const state = getMarketState(settlement);
  const key = `${String(item ?? "Objet").trim()}|${Number(price ?? 0)}`.toLocaleLowerCase("fr");
  const previousIndex = state.availabilityChecks.findIndex(c => c.week === state.week && c.key === key);
  const record = {
    id: foundry.utils.randomID(),
    key,
    item: String(item ?? "Objet"),
    price: Number(price ?? 0) || 0,
    result: Boolean(result),
    rollTotal: Number(rollTotal ?? 0) || 0,
    week: state.week,
    checkedAt: Date.now()
  };
  if (previousIndex >= 0) state.availabilityChecks[previousIndex] = record;
  else state.availabilityChecks.push(record);
  await saveMarketState(settlement, state);
  return record;
}

export function countStockByTier(state, { aboveBaseValue = null } = {}) {
  const counts = { minor: 0, medium: 0, major: 0 };
  for (const entry of state.stock ?? []) {
    if (entry.sold) continue;
    if (aboveBaseValue != null && Number(entry.price ?? 0) <= Number(aboveBaseValue)) continue;
    if (counts[entry.tier] != null) counts[entry.tier] += Number(entry.quantity ?? 1) || 1;
  }
  return counts;
}
