export const MODULE_ID = "pf1-settlements";
export const SHEET_CLASS_ID = `${MODULE_ID}.SettlementSheet`;
export const LOCATION_SHEET_CLASS_ID = `${MODULE_ID}.LocationSheet`;
export const FACTION_SHEET_CLASS_ID = `${MODULE_ID}.FactionSheet`;

export const SETTLEMENT_TYPES = {
  thorpe: {
    label: "Lieu-dit",
    modifier: -4,
    advantages: 1,
    danger: -10,
    baseValue: 50,
    purchaseLimit: 500,
    spellcasting: 1,
    population: "moins de 20",
    magic: { minor: "1d4", medium: null, major: null }
  },
  hamlet: {
    label: "Hameau",
    modifier: -2,
    advantages: 1,
    danger: -5,
    baseValue: 200,
    purchaseLimit: 1000,
    spellcasting: 2,
    population: "21 à 60",
    magic: { minor: "1d6", medium: null, major: null }
  },
  village: {
    label: "Village",
    modifier: -1,
    advantages: 2,
    danger: 0,
    baseValue: 500,
    purchaseLimit: 2500,
    spellcasting: 3,
    population: "61 à 200",
    magic: { minor: "2d4", medium: "1d4", major: null }
  },
  smallTown: {
    label: "Petite bourgade",
    modifier: 0,
    advantages: 2,
    danger: 0,
    baseValue: 1000,
    purchaseLimit: 5000,
    spellcasting: 4,
    population: "201 à 2 000",
    magic: { minor: "3d4", medium: "1d6", major: null }
  },
  largeTown: {
    label: "Grosse bourgade",
    modifier: 0,
    advantages: 3,
    danger: 5,
    baseValue: 2000,
    purchaseLimit: 10000,
    spellcasting: 5,
    population: "2 001 à 5 000",
    magic: { minor: "3d4", medium: "2d4", major: "1d4" }
  },
  smallCity: {
    label: "Petite ville",
    modifier: 1,
    advantages: 4,
    danger: 5,
    baseValue: 4000,
    purchaseLimit: 25000,
    spellcasting: 6,
    population: "5 001 à 10 000",
    magic: { minor: "4d4", medium: "3d4", major: "1d6" }
  },
  largeCity: {
    label: "Grande ville",
    modifier: 2,
    advantages: 5,
    danger: 10,
    baseValue: 8000,
    purchaseLimit: 50000,
    spellcasting: 7,
    population: "10 001 à 25 000",
    magic: { minor: "4d4", medium: "3d4", major: "2d4" }
  },
  metropolis: {
    label: "Métropole",
    modifier: 4,
    advantages: 6,
    danger: 10,
    baseValue: 16000,
    purchaseLimit: 100000,
    spellcasting: 8,
    population: "plus de 25 000",
    magic: { minor: "all", medium: "4d4", major: "3d4" }
  }
};

export const ALIGNMENTS = {
  LG: "Loyal Bon",
  NG: "Neutre Bon",
  CG: "Chaotique Bon",
  LN: "Loyal Neutre",
  N: "Neutre",
  CN: "Chaotique Neutre",
  LE: "Loyal Mauvais",
  NE: "Neutre Mauvais",
  CE: "Chaotique Mauvais"
};

export const GOVERNMENTS = {
  autocracy: { label: "Autocratie", mods: {} },
  council: { label: "Conseil", mods: { society: 4, law: -2, lore: -2 } },
  magiocracy: { label: "Magiocratie", mods: { lore: 2, corruption: -2, society: -2 }, spellcasting: 1 },
  overlord: { label: "Seigneur", mods: { corruption: 2, law: 2, crime: -2, society: -2 } },
  secretSyndicate: { label: "Syndicat secret", mods: { corruption: 2, economy: 2, crime: 2, law: -6 } }
};

export const ADVANTAGES = {
  academic: {
    label: "Académique",
    description: "Folklore +1 ; incantation +1 niveau.",
    mods: { lore: 1 }, spellcasting: 1
  },
  holySite: {
    label: "Lieu saint / site sacré",
    description: "Corruption -2 ; incantation +2 niveaux.",
    mods: { corruption: -2 }, spellcasting: 2
  },
  insular: {
    label: "Insulaire",
    description: "Loi +1 ; Criminalité -1.",
    mods: { law: 1, crime: -1 }
  },
  magicallyAttuned: {
    label: "En harmonie avec la magie",
    description: "Valeur de base +20 % ; limite d'achat +20 % ; incantation +2 niveaux.",
    baseValuePct: 20, purchaseLimitPct: 20, spellcasting: 2
  },
  notorious: {
    label: "Célèbre",
    description: "Criminalité +1 ; Loi -1 ; Danger +10 ; valeur de base +30 % ; limite d'achat +50 %.",
    mods: { crime: 1, law: -1 }, danger: 10, baseValuePct: 30, purchaseLimitPct: 50
  },
  pious: {
    label: "Pieuse",
    description: "Incantation +1 niveau. Les religions trop éloignées de la religion officielle peuvent être malvenues ou interdites.",
    spellcasting: 1
  },
  prosperous: {
    label: "Prospère",
    description: "Économie +1 ; valeur de base +30 % ; limite d'achat +50 %.",
    mods: { economy: 1 }, baseValuePct: 30, purchaseLimitPct: 50
  },
  racist: {
    label: "Raciste",
    description: "Les races visées paient 150 % des marchandises et services et subissent l'hostilité locale."
  },
  rumorMongering: {
    label: "Colporteurs de rumeurs",
    description: "Folklore +1 ; Société -1.",
    mods: { lore: 1, society: -1 }
  },
  strategicLocation: {
    label: "Emplacement stratégique",
    description: "Économie +1 ; valeur de base +10 %.",
    mods: { economy: 1 }, baseValuePct: 10
  },
  superstitious: {
    label: "Superstitieuse",
    description: "Criminalité -4 ; Loi +2 ; Société +2 ; incantation -2 niveaux.",
    mods: { crime: -4, law: 2, society: 2 }, spellcasting: -2
  },
  touristAttraction: {
    label: "Attraction touristique",
    description: "Économie +1 ; valeur de base +20 %.",
    mods: { economy: 1 }, baseValuePct: 20
  }
};

export const DRAWBACKS = {
  anarchic: {
    label: "Anarchique",
    description: "Remplace le gouvernement : Corruption +4 ; Criminalité +4 ; Économie -4 ; Loi -6 ; Société -4 ; Danger +20."
  },
  cursed: {
    label: "Maudite",
    description: "Réduit de 4 un modificateur choisi."
  },
  huntingGround: {
    label: "Terrain de chasse",
    description: "Économie -4 ; Loi -4 ; Société -4 ; Danger +20 ; valeur de base -20 %."
  },
  impoverished: {
    label: "Pauvreté",
    description: "Corruption +1 ; Criminalité +1 ; valeur de base et limite d'achat -50 % ; moitié moins d'objets magiques disponibles."
  },
  plague: {
    label: "Épidémie",
    description: "Tous les modificateurs -2 ; valeur de base -20 %. Chaque jour, 5 % de chances d'exposition à la maladie choisie."
  },
  drought: {
    label: "Sécheresse",
    description: "Loi -4 ; Danger +10."
  }
};

export const LOCATION_TYPES = {
  tavern: "Taverne",
  inn: "Auberge",
  shop: "Boutique",
  market: "Marché",
  temple: "Temple",
  shrine: "Sanctuaire",
  guild: "Guilde / siège d'organisation",
  workshop: "Atelier / artisan",
  government: "Bâtiment officiel",
  fortification: "Fortification / caserne",
  harbor: "Port / quai / chantier naval",
  residence: "Résidence / manoir",
  landmark: "Lieu remarquable",
  other: "Autre"
};

export const PRICE_LEVELS = {
  poor: "Modeste",
  standard: "Standard",
  expensive: "Cher",
  luxury: "Luxe"
};

export function defaultLocationConfig() {
  return {
    settlementId: "",
    districtId: "",
    type: "tavern",
    priceLevel: "standard",
    address: "",
    tags: "",
    proprietorUuid: "",
    proprietorName: "",
    description: "",
    services: "",
    rumors: "",
    secrets: "",
    notes: ""
  };
}



export const FACTION_TYPES = {
  authority: "Autorité / administration",
  guild: "Guilde / corporation",
  religious: "Culte / organisation religieuse",
  noble: "Famille noble / maison",
  criminal: "Bande / organisation criminelle",
  mercantile: "Compagnie marchande",
  military: "Ordre militaire / milice",
  arcane: "Cercle arcanique / académie",
  secret: "Société secrète",
  political: "Mouvement politique",
  other: "Autre"
};

export const INFLUENCE_LEVELS = {
  presence: "Présence",
  weak: "Faible",
  moderate: "Modérée",
  strong: "Forte",
  dominant: "Dominante"
};

export const FACTION_RELATIONS = {
  allied: "Alliée",
  friendly: "Amicale",
  neutral: "Neutre",
  rival: "Rivale",
  enemy: "Ennemie"
};

export function defaultFactionConfig() {
  return {
    type: "guild",
    tags: "",
    leaderUuid: "",
    leaderName: "",
    headquartersLocationId: "",
    description: "",
    goals: "",
    resources: "",
    methods: "",
    rumors: "",
    secrets: "",
    notes: "",
    influences: [],
    relations: []
  };
}

export const MODIFIER_LABELS = {
  corruption: "Corruption",
  crime: "Criminalité",
  economy: "Économie",
  law: "Loi",
  lore: "Folklore",
  society: "Société"
};

export function defaultSettlementConfig() {
  return {
    type: "village",
    alignment: "N",
    government: "autocracy",
    nickname: "",
    campaignRole: "",
    parentSettlementId: "",
    linkedNpcs: [],
    population: "",
    populationBreakdown: "",
    importantNpcs: "",
    locations: "",
    factions: "",
    rumors: "",
    notes: "",
    officialReligion: "",
    racistTargets: "",
    plagueDisease: "",
    cursedModifier: "corruption",
    advantages: {},
    customAdvantages: {},
    drawbacks: {},
    customDrawbacks: {},
    adjustments: {
      corruption: 0,
      crime: 0,
      economy: 0,
      law: 0,
      lore: 0,
      society: 0,
      danger: 0,
      baseValue: 0,
      purchaseLimit: 0,
      spellcasting: 0
    }
  };
}
