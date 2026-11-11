import { MODULE_ID } from "./data.mjs";

export const RUMOR_TRUTH = {
  unknown: "Non déterminée",
  true: "Vraie",
  partial: "Partiellement vraie",
  false: "Fausse"
};

export const URBAN_EVENT_STATUS = {
  planned: "À venir",
  active: "En cours",
  resolved: "Résolu"
};

export const URBAN_EVENT_SEVERITY = {
  1: "Mineur",
  2: "Notable",
  3: "Important",
  4: "Grave",
  5: "Crise"
};

// Ces huit tables reprennent les tables 7-41 à 7-48 du Guide du Maître (p. 212-213 VF).
// Pour la table 7-42, les plages 59-63, 64-68 et 69-71 suivent l'original anglais :
// la VF imprimée contient des plages manifestement chevauchantes/erronées.
export const URBAN_ENCOUNTER_TABLES = {
  arena: {
    label: "Arène",
    source: "Guide du Maître, table 7-41, p. 212",
    entries: [
      [1,5,"1 ettercap","3","Bestiaire p. 133"],
      [6,11,"1 lion","3","Bestiaire p. 202"],
      [12,15,"1 ogre","3","Bestiaire p. 230"],
      [16,22,"1 minotaure","4","Bestiaire p. 206"],
      [23,27,"1 tigre","4","Bestiaire p. 273"],
      [28,29,"1 yéti","4","Bestiaire p. 288"],
      [30,33,"1d4 mantes géantes","5","Bestiaire p. 207"],
      [34,37,"1d6 sahuagins","5","Bestiaire p. 251"],
      [38,42,"1d4 scorpions géants","5","Bestiaire p. 256"],
      [43,45,"1 troll","5","Bestiaire p. 277"],
      [46,50,"1d6 gloutons","5","Bestiaire p. 160"],
      [51,55,"1d6 worgs","5","Bestiaire p. 285"],
      [56,57,"1 basilic","5","Bestiaire p. 33"],
      [58,59,"1d4 centaures","5","Bestiaire p. 39"],
      [60,61,"1 golem de bois","6","Bestiaire p. 166"],
      [62,68,"1 girallon","6","Bestiaire p. 159"],
      [69,73,"1d4 ours-hiboux","6","Bestiaire p. 236"],
      [74,77,"1d4 rhinocéros","6","Bestiaire p. 249"],
      [78,81,"1d8 prisonniers","6","Guide du Maître p. 274"],
      [82,83,"1d4 lions sanguinaires","7","Bestiaire p. 202"],
      [84,87,"1 gorgone","8","Bestiaire p. 171"],
      [88,92,"1d4 lamies","8","Bestiaire p. 191"],
      [93,98,"1d6 gladiateurs","8","Guide du Maître p. 258"],
      [99,100,"1 champion","9","Guide du Maître p. 259"]
    ]
  },
  castle: {
    label: "Château / domaine",
    source: "Guide du Maître, table 7-42, p. 212",
    entries: [
      [1,5,"1 écuyer","1/3","Guide du Maître p. 270"],
      [6,11,"1d4 héritiers nobles","4","Guide du Maître p. 292"],
      [12,17,"1d6 gardes","4","Guide du Maître p. 262"],
      [18,20,"1 médium","4","Guide du Maître p. 273"],
      [21,26,"1 ménestrel","5","Guide du Maître p. 257"],
      [27,31,"1d6 officiers de la garde","6","Guide du Maître p. 291"],
      [32,34,"1 guerrier saint","6","Guide du Maître p. 271"],
      [35,41,"1 princesse","6","Guide du Maître p. 296"],
      [42,43,"1 capitaine de la garde","6","Guide du Maître p. 291"],
      [44,46,"1d4 gardes de caravane","7","Guide du Maître p. 288"],
      [47,52,"1 chevalier","7","Guide du Maître p. 293"],
      [53,54,"1 maire","8","Guide du Maître p. 309"],
      [55,58,"1 prince marchand","9","Guide du Maître p. 285"],
      [59,63,"1d4 prêtres","10","Guide du Maître p. 303"],
      [64,68,"1 barde célèbre","10","Guide du Maître p. 257"],
      [69,71,"1 général","10","Guide du Maître p. 261"],
      [72,74,"1 maître de guilde","10","Guide du Maître p. 269"],
      [75,77,"1 reine","10","Guide du Maître p. 297"],
      [78,82,"1 saint homme","11","Guide du Maître p. 271"],
      [83,88,"1d6 nobles","11","Guide du Maître p. 293"],
      [89,92,"1 capitaine","11","Guide du Maître p. 287"],
      [93,95,"1 sage","11","Guide du Maître p. 279"],
      [96,98,"1 haut prêtre","12","Guide du Maître p. 303"],
      [99,100,"1 roi","14","Guide du Maître p. 297"]
    ]
  },
  menagerie: {
    label: "Ménagerie / musée",
    source: "Guide du Maître, table 7-43, p. 212",
    entries: [
      [1,3,"1d8 squelettes","1","Bestiaire p. 264"],
      [4,8,"1 objet animé","3","Bestiaire p. 229"],
      [9,14,"1 mante géante","3","Bestiaire p. 207"],
      [15,19,"1d4 pseudodragons","3","Bestiaire p. 229"],
      [20,24,"1 licorne","3","Bestiaire p. 195"],
      [25,30,"1 glouton sanguinaire","4","Bestiaire p. 160"],
      [31,35,"1 griffon","4","Bestiaire p. 175"],
      [36,39,"1 tigre","4","Bestiaire p. 273"],
      [40,42,"1 momie","5","Bestiaire p. 221"],
      [43,45,"1d4 cockatrices","5","Bestiaire p. 48"],
      [46,50,"1 lézard à collerette géant","5","Bestiaire p. 194"],
      [51,55,"1 manticore","5","Bestiaire p. 210"],
      [56,61,"1d4 pégases","5","Bestiaire p. 239"],
      [62,64,"1d6 cobras de fer","5","Bestiaire p. 47"],
      [65,67,"1d6 champions squelettes","5","Bestiaire p. 263"],
      [68,72,"1d4 ours-hiboux","6","Bestiaire p. 236"],
      [73,75,"1d4 rhinocéros","6","Bestiaire p. 249"],
      [76,82,"1 chimère","7","Bestiaire p. 45"],
      [83,84,"1 béhir","8","Bestiaire p. 35"],
      [85,87,"1 gorgone","8","Bestiaire p. 171"],
      [88,91,"1d4 éléphants","9","Bestiaire p. 130"],
      [92,95,"1d6 girallons","9","Bestiaire p. 159"],
      [96,98,"1 golem d’argile","10","Bestiaire p. 165"],
      [99,100,"1 golem de fer","13","Bestiaire p. 168"]
    ]
  },
  rooftops: {
    label: "Toits",
    source: "Guide du Maître, table 7-44, p. 212",
    entries: [
      [1,4,"1 tieffelin","1/2","Bestiaire p. 272"],
      [5,7,"1 cannibale","1/2","Guide du Maître p. 306"],
      [8,13,"1d4 chiens","1/2","Bestiaire p. 87"],
      [14,19,"1 ivrogne","1","Guide du Maître p. 301"],
      [20,24,"1 annonciateur de malheurs","1","Guide du Maître p. 272"],
      [25,27,"1 conteur","1","Guide du Maître p. 256"],
      [28,33,"1 doppelganger","2","Bestiaire p. 92"],
      [34,39,"1 loup-garou","2","Bestiaire p. 205"],
      [40,44,"1d6 bandits","2","Guide du Maître p. 264"],
      [45,49,"1d4 araignées géantes","3","Bestiaire p. 20"],
      [50,52,"1d4 malfrats","3","Guide du Maître p. 267"],
      [53,55,"1d4 vagabonds","3","Guide du Maître p. 295"],
      [56,61,"1 ombre","3","Bestiaire p. 245"],
      [62,65,"1 aigle géant","3","Bestiaire p. 9"],
      [66,72,"1d4 cambrioleurs","4","Guide du Maître p. 267"],
      [73,77,"1d6 adorateurs","4","Guide du Maître p. 280"],
      [78,81,"1d6 fureteurs obscurs","5","Bestiaire p. 145"],
      [82,84,"1d6 nuées de rats","5","Bestiaire p. 246"],
      [85,87,"1d4 traqueurs obscurs","6","Bestiaire p. 275"],
      [88,91,"1d6 gargouilles","7","Bestiaire p. 146"],
      [92,93,"1 fantôme","7","Bestiaire p. 138"],
      [94,96,"1 rakshasa","10","Bestiaire p. 245"],
      [97,98,"1 seigneur bandit","11","Guide du Maître p. 265"],
      [99,100,"1 chef du culte","11","Guide du Maître p. 281"]
    ]
  },
  sewers: {
    label: "Égouts",
    source: "Guide du Maître, table 7-45, p. 213",
    entries: [
      [1,5,"1 nuée de chauves-souris","2","Bestiaire p. 30"],
      [6,10,"1 rat-garou","2","Bestiaire p. 206"],
      [11,13,"1 oxydeur","3","Bestiaire p. 237"],
      [14,19,"2d6 rats sanguinaires","3","Bestiaire p. 246"],
      [20,23,"1 cube gélatineux","3","Bestiaire p. 53"],
      [24,28,"1d4 chiens gobelins","3","Bestiaire p. 43"],
      [29,30,"1 méphite de la vase","3","Bestiaire p. 212"],
      [31,34,"1 nuée de mille-pattes","4","Bestiaire p. 214"],
      [35,41,"1d4 nuées de rats","4","Bestiaire p. 246"],
      [42,43,"1d4 étrangleurs","4","Bestiaire p. 45"],
      [44,46,"1d6 grenouilles géantes","4","Bestiaire p. 135"],
      [47,51,"1 vase grise","4","Bestiaire p. 166"],
      [52,55,"1 hydre","4","Bestiaire p. 186"],
      [56,62,"1 otyugh","4","Bestiaire p. 234"],
      [63,67,"1d6 crocodiles","5","Bestiaire p. 52"],
      [68,72,"1 babélien","5","Bestiaire p. 30"],
      [73,76,"1 gelée ocre","5","Bestiaire p. 153"],
      [77,79,"1d8 sangsues géantes","6","Bestiaire p. 254"],
      [80,82,"1 pouding noir","7","Bestiaire p. 243"],
      [83,85,"1 golem de chair","7","Bestiaire p. 167"],
      [86,89,"1d6 nuées de sangsues","7","Bestiaire p. 254"],
      [90,94,"1d4 chuuls","9","Bestiaire p. 46"],
      [95,98,"1d3 crocodiles sanguinaires","9","Bestiaire p. 52"],
      [99,100,"1 froghémoth","13","Bestiaire p. 144"]
    ]
  },
  slums: {
    label: "Bas-quartiers",
    source: "Guide du Maître, table 7-46, p. 213",
    entries: [
      [1,6,"1 pickpocket","1/2","Guide du Maître p. 266"],
      [7,9,"1 serveuse","1/2","Guide du Maître p. 300"],
      [10,14,"1 ivrogne","1","Guide du Maître p. 301"],
      [15,19,"1 mendiant","1","Guide du Maître p. 298"],
      [20,23,"1d6 rats sanguinaires","1","Bestiaire p. 246"],
      [24,26,"1d4 tieffelins","1","Bestiaire p. 272"],
      [27,33,"1d6 chiens","1","Bestiaire p. 87"],
      [34,39,"2d4 chats","1","Bestiaire p. 131"],
      [40,42,"1 vagabond","2","Guide du Maître p. 295"],
      [43,44,"1 cambrioleur","2","Guide du Maître p. 267"],
      [45,51,"1 nuée de rats","2","Bestiaire p. 246"],
      [52,56,"1d6 tengus","2","Bestiaire p. 270"],
      [57,59,"1 conteur","2","Guide du Maître p. 256"],
      [60,65,"1d4 prostituées","3","Guide du Maître p. 299"],
      [66,68,"1 revendeur","3","Guide du Maître p. 299"],
      [69,70,"1 ombre","3","Bestiaire p. 231"],
      [71,74,"1d4 annonciateurs de malheurs","3","Guide du Maître p. 272"],
      [75,79,"2d4 bandits","3","Guide du Maître p. 264"],
      [80,81,"1 geôlier","3","Guide du Maître p. 275"],
      [82,87,"1 tavernier","3","Guide du Maître p. 301"],
      [88,90,"1d6 malfrats","4","Guide du Maître p. 267"],
      [91,95,"1d4 rats-garous","4","Bestiaire p. 206"],
      [96,98,"1 diseuse de bonne aventure","5","Guide du Maître p. 273"],
      [99,100,"1d6 adorateurs","5","Guide du Maître p. 280"]
    ]
  },
  tavern: {
    label: "Taverne",
    source: "Guide du Maître, table 7-47, p. 213",
    entries: [
      [1,5,"1 idiot du village","1/3","Guide du Maître p. 308"],
      [6,10,"1 écuyer","1/3","Guide du Maître p. 270"],
      [11,15,"1 serveuse","1/2","Guide du Maître p. 300"],
      [16,18,"1 pickpocket","1/2","Guide du Maître p. 266"],
      [19,22,"1 fermier","1/2","Guide du Maître p. 309"],
      [23,27,"1d4 soldats d’infanterie","1","Guide du Maître p. 260"],
      [28,32,"1 conteur","1","Guide du Maître p. 256"],
      [33,36,"1 prostituée","1","Guide du Maître p. 299"],
      [37,39,"1 commerçant","1","Guide du Maître p. 284"],
      [40,43,"1d6 matelots","2","Guide du Maître p. 286"],
      [44,51,"1d4 ivrognes","3","Guide du Maître p. 301"],
      [52,57,"1d4 vagabonds","3","Guide du Maître p. 295"],
      [58,60,"1 tavernier","3","Guide du Maître p. 301"],
      [61,62,"1 trappeur","3","Guide du Maître p. 304"],
      [63,65,"1 officier de la garde","3","Guide du Maître p. 291"],
      [66,67,"1 revendeur","3","Guide du Maître p. 299"],
      [68,70,"1 geôlier","3","Guide du Maître p. 275"],
      [71,76,"1d6 gardes","4","Guide du Maître p. 290"],
      [77,80,"1 diseuse de bonne aventure","5","Guide du Maître p. 273"],
      [81,84,"1 ménestrel","5","Guide du Maître p. 257"],
      [85,89,"1 marchand itinérant","5","Guide du Maître p. 285"],
      [90,94,"1 mercenaire armé","7","Guide du Maître p. 289"],
      [95,97,"1 second","8","Guide du Maître p. 287"],
      [98,100,"1 barde célèbre","10","Guide du Maître p. 257"]
    ]
  },
  thievesGuild: {
    label: "Guilde des voleurs",
    source: "Guide du Maître, table 7-48, p. 213",
    entries: [
      [1,4,"1d4 pickpockets","1","Guide du Maître p. 266"],
      [5,9,"1 malfrat","1","Guide du Maître p. 267"],
      [10,14,"1d6 bandits","2","Guide du Maître p. 264"],
      [15,18,"1d6 tieffelins","2","Bestiaire p. 272"],
      [19,21,"1 fureteur obscur","2","Bestiaire p. 145"],
      [22,25,"1d4 prostituées","3","Guide du Maître p. 299"],
      [26,28,"1 revendeur","3","Guide du Maître p. 299"],
      [29,32,"1 esclavagiste","3","Guide du Maître p. 268"],
      [33,37,"piège de flèche acide","3","Guide du Maître p. 426"],
      [38,43,"1d8 tengus","3","Bestiaire p. 270"],
      [44,48,"faux dissimulée dans un mur","4","Guide du Maître p. 427"],
      [49,52,"1 mimique","4","Bestiaire p. 215"],
      [53,56,"arc électrique","4","Guide du Maître p. 426"],
      [57,60,"1 pilleur de tombes","5","Guide du Maître p. 263"],
      [61,68,"1d8 cambrioleurs","6","Guide du Maître p. 267"],
      [69,73,"piège de colonne de feu","6","Guide du Maître p. 427"],
      [74,76,"1d4 traqueurs obscurs","6","Bestiaire p. 54"],
      [77,80,"1 méduse","7","Bestiaire p. 211"],
      [81,85,"1d4 bandits de grand chemin","8","Guide du Maître p. 265"],
      [86,90,"piège à décharge électrique","9","Guide du Maître p. 421"],
      [91,94,"1 rakshasa","10","Bestiaire p. 245"],
      [95,97,"1 maître de guilde","11","Guide du Maître p. 269"],
      [98,99,"1 seigneur bandit","11","Guide du Maître p. 265"],
      [100,100,"1 capitaine pirate","11","Guide du Maître p. 283"]
    ]
  }
};

export const URBAN_EVENT_INSPIRATIONS = [
  { title: "Vol à la tire", description: "Un tire-laine subtilise quelque chose et déclenche une poursuite à travers les rues ou sur les toits." },
  { title: "Animal affolé", description: "Un animal devient incontrôlable dans une rue fréquentée et menace passants et étals." },
  { title: "Émeute", description: "Une foule en colère bloque le passage et la tension peut dégénérer rapidement." },
  { title: "Duel", description: "Un duel, ordinaire ou magique, éclate en public et attire une foule." },
  { title: "Incendie", description: "Un incendie se déclare dans un bâtiment voisin et gagne rapidement les constructions proches." },
  { title: "Agitateur", description: "Un agitateur harangue la foule et provoque une réaction politique ou sociale imprévisible." },
  { title: "Procession de notables", description: "Une procession de nobles ou d'officiels interrompt la circulation et s'intéresse aux aventuriers." },
  { title: "Cadavre inquiétant", description: "Un corps découvert dans la rue porte des marques susceptibles d'ouvrir une enquête ou un mystère." }
];

function normalizeEntry(raw) {
  const [min, max, encounter, cr, source] = raw;
  return { min, max, encounter, cr, source };
}

export function defaultUrbanState() {
  return {
    version: 1,
    rumors: [],
    events: [],
    encounterHistory: []
  };
}

function mergeState(raw = {}) {
  const state = foundry.utils.mergeObject(defaultUrbanState(), raw ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  state.rumors = Array.isArray(state.rumors) ? state.rumors : [];
  state.events = Array.isArray(state.events) ? state.events : [];
  state.encounterHistory = Array.isArray(state.encounterHistory) ? state.encounterHistory : [];
  return state;
}

export function getUrbanState(settlement) {
  return mergeState(settlement?.getFlag(MODULE_ID, "urbanState") ?? {});
}

export async function saveUrbanState(settlement, state) {
  if (!settlement) return null;
  const clean = mergeState(state);
  await settlement.setFlag(MODULE_ID, "urbanState", clean);
  return clean;
}

export async function addRumor(settlement, data = {}) {
  const state = getUrbanState(settlement);
  const rumor = {
    id: foundry.utils.randomID(),
    text: String(data.text ?? "").trim(),
    truth: RUMOR_TRUTH[data.truth] ? data.truth : "unknown",
    visibility: data.visibility === "public" ? "public" : "gm",
    sourceLocationId: String(data.sourceLocationId ?? ""),
    sourceFactionId: String(data.sourceFactionId ?? ""),
    active: data.active !== false,
    notes: String(data.notes ?? ""),
    createdAt: Date.now()
  };
  state.rumors.push(rumor);
  await saveUrbanState(settlement, state);
  return rumor;
}

export async function updateRumor(settlement, rumorId, changes = {}) {
  const state = getUrbanState(settlement);
  const rumor = state.rumors.find(r => r.id === rumorId);
  if (!rumor) return null;
  Object.assign(rumor, changes);
  rumor.truth = RUMOR_TRUTH[rumor.truth] ? rumor.truth : "unknown";
  rumor.visibility = rumor.visibility === "public" ? "public" : "gm";
  rumor.text = String(rumor.text ?? "").trim();
  rumor.notes = String(rumor.notes ?? "");
  await saveUrbanState(settlement, state);
  return rumor;
}

export async function removeRumor(settlement, rumorId) {
  const state = getUrbanState(settlement);
  const before = state.rumors.length;
  state.rumors = state.rumors.filter(r => r.id !== rumorId);
  if (state.rumors.length !== before) await saveUrbanState(settlement, state);
  return state.rumors.length !== before;
}

export async function addUrbanEvent(settlement, data = {}) {
  const state = getUrbanState(settlement);
  const event = {
    id: foundry.utils.randomID(),
    title: String(data.title ?? "Événement urbain").trim() || "Événement urbain",
    description: String(data.description ?? ""),
    status: URBAN_EVENT_STATUS[data.status] ? data.status : "planned",
    severity: URBAN_EVENT_SEVERITY[Number(data.severity)] ? Number(data.severity) : 2,
    visibility: data.visibility === "public" ? "public" : "gm",
    locationId: String(data.locationId ?? ""),
    factionId: String(data.factionId ?? ""),
    notes: String(data.notes ?? ""),
    createdAt: Date.now()
  };
  state.events.push(event);
  await saveUrbanState(settlement, state);
  return event;
}

export async function updateUrbanEvent(settlement, eventId, changes = {}) {
  const state = getUrbanState(settlement);
  const event = state.events.find(e => e.id === eventId);
  if (!event) return null;
  Object.assign(event, changes);
  event.status = URBAN_EVENT_STATUS[event.status] ? event.status : "planned";
  event.severity = URBAN_EVENT_SEVERITY[Number(event.severity)] ? Number(event.severity) : 2;
  event.visibility = event.visibility === "public" ? "public" : "gm";
  event.title = String(event.title ?? "Événement urbain").trim() || "Événement urbain";
  event.description = String(event.description ?? "");
  event.notes = String(event.notes ?? "");
  await saveUrbanState(settlement, state);
  return event;
}

export async function removeUrbanEvent(settlement, eventId) {
  const state = getUrbanState(settlement);
  const before = state.events.length;
  state.events = state.events.filter(e => e.id !== eventId);
  if (state.events.length !== before) await saveUrbanState(settlement, state);
  return state.events.length !== before;
}

export async function rollUrbanEncounter(settlement, tableKey, dangerModifier = 0) {
  const table = URBAN_ENCOUNTER_TABLES[tableKey];
  if (!table) throw new Error(`Table de rencontre urbaine inconnue : ${tableKey}`);
  const roll = await new Roll("1d100").evaluate();
  const raw = Number(roll.total ?? 1);
  const danger = Number(dangerModifier ?? 0) || 0;
  const adjusted = Math.max(1, Math.min(100, raw + danger));
  const row = table.entries.map(normalizeEntry).find(e => adjusted >= e.min && adjusted <= e.max);
  if (!row) throw new Error(`Aucune entrée trouvée pour ${adjusted} dans ${table.label}`);

  const record = {
    id: foundry.utils.randomID(),
    tableKey,
    tableLabel: table.label,
    tableSource: table.source,
    raw,
    danger,
    adjusted,
    encounter: row.encounter,
    cr: row.cr,
    source: row.source,
    rolledAt: Date.now()
  };
  const state = getUrbanState(settlement);
  state.encounterHistory.unshift(record);
  state.encounterHistory = state.encounterHistory.slice(0, 30);
  await saveUrbanState(settlement, state);
  return { roll, record };
}

export async function clearEncounterHistory(settlement) {
  const state = getUrbanState(settlement);
  state.encounterHistory = [];
  await saveUrbanState(settlement, state);
  return state;
}

export function getRandomUrbanEventInspiration() {
  const index = Math.floor(Math.random() * URBAN_EVENT_INSPIRATIONS.length);
  return URBAN_EVENT_INSPIRATIONS[index];
}
