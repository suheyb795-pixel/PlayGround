/* --------------------------------------------------------------------------
   Pocket Empire — world rules and content
   A 10 × 10 civilization played in 20 turns.
   -------------------------------------------------------------------------- */

const MAP_ROWS = [
  'OOCFFHMMCO',
  'OCGFHHMFCO',
  'OCGGFFHFCO',
  'CGGPFPPPCO',
  'CGPPDDPPCC',
  'OCGPDDPGCC',
  'OCPPPPGFCO',
  'OCGPGPFFCO',
  'OOCPPFFCOO',
  'OOOCCCCOOO'
];

const MAP_SIZE = 10;
const MAX_TURNS = 20;
const CITY_WORK_RADIUS = 1;

const TERRAIN = {
  O: {
    name: 'Open Sea', key: 'ocean', glyph: '≈', food: 0, prod: 0, gold: 0, science: 0,
    passable: false, land: false, move: 1,
    note: 'Deep water. Your people have not mastered the sea.'
  },
  C: {
    name: 'Coast', key: 'coast', glyph: '~', food: 1, prod: 0, gold: 1, science: 0,
    passable: false, land: false, move: 1,
    note: 'Shallow water. Rich fishing grounds, but unreachable for now.'
  },
  G: {
    name: 'Grassland', key: 'grass', glyph: '·', food: 3, prod: 0, gold: 0, science: 0,
    passable: true, land: true, move: 1, improvement: 'farm',
    note: 'Soft earth. The best land for feeding a growing city.'
  },
  P: {
    name: 'Plains', key: 'plains', glyph: '·', food: 2, prod: 1, gold: 0, science: 0,
    passable: true, land: true, move: 1, improvement: 'farm',
    note: 'Open country. A little food, a little labour.'
  },
  F: {
    name: 'Forest', key: 'forest', glyph: '▲', food: 1, prod: 2, gold: 0, science: 0,
    passable: true, land: true, move: 2, improvement: 'camp',
    note: 'Old timber. Slow to cross, rich in production.'
  },
  H: {
    name: 'Hills', key: 'hills', glyph: '⌒', food: 1, prod: 2, gold: 1, science: 0,
    passable: true, land: true, move: 2, improvement: 'mine',
    note: 'Broken ground. Hard marching, good mining.'
  },
  M: {
    name: 'Mountains', key: 'mountain', glyph: 'Λ', food: 0, prod: 0, gold: 0, science: 1,
    passable: false, land: true, move: 1,
    note: 'A high, impassable ridge. Wise people study the stars from below.'
  },
  D: {
    name: 'Desert', key: 'desert', glyph: '·', food: 0, prod: 0, gold: 2, science: 0,
    passable: true, land: true, move: 1, improvement: null,
    note: 'Dry and unforgiving, but caravans cross it with treasure.'
  }
};

const IMPROVEMENTS = {
  farm: {
    name: 'Farm', icon: 'wheat', yields: { food: 2, prod: 0, gold: 0, science: 0 },
    terrains: ['G', 'P'], note: 'Irrigated fields. +2 Food.'
  },
  mine: {
    name: 'Mine', icon: 'pick', yields: { food: 0, prod: 2, gold: 0, science: 0 },
    terrains: ['H'], note: 'A cut into the hills. +2 Production.'
  },
  camp: {
    name: 'Camp', icon: 'camp', yields: { food: 0, prod: 0, gold: 2, science: 0 },
    terrains: ['F'], note: 'Fur trappers and foresters. +2 Gold.'
  }
};

const FEATURES = {
  ruin: {
    name: 'Ancient Ruins', icon: 'ruin',
    reward: { gold: 12, science: 8 },
    note: 'Broken stones of a forgotten people. Enter to recover their wisdom.'
  },
  village: {
    name: 'Wandering Village', icon: 'village',
    reward: { gold: 22, science: 0 },
    note: 'A small free settlement. Enter to trade and fill your treasury.'
  }
};

const UNIT_TYPES = {
  warrior: {
    name: 'Warrior', plural: 'Warriors', icon: 'sword', cost: 16,
    strength: 8, moves: 2, hp: 10, role: 'melee',
    note: 'A dependable fighter. Strong enough to take a city with support.'
  },
  scout: {
    name: 'Scout', plural: 'Scouts', icon: 'scout', cost: 12,
    strength: 4, moves: 3, hp: 8, role: 'scout',
    note: 'Fast and far-sighted. Excellent for reaching ruins first.'
  },
  settler: {
    name: 'Settler', plural: 'Settlers', icon: 'cart', cost: 28,
    strength: 0, moves: 2, hp: 8, role: 'settler',
    note: 'Found a new city on open land at least two tiles from another city.'
  },
  worker: {
    name: 'Worker', plural: 'Workers', icon: 'pick', cost: 18,
    strength: 0, moves: 2, hp: 8, role: 'worker',
    note: 'Improve owned tiles. Farms add food, mines add production, camps add gold.'
  },
  spearman: {
    name: 'Spearman', plural: 'Spearmen', icon: 'shield', cost: 24,
    strength: 11, moves: 2, hp: 12, requires: 'bronze', role: 'melee',
    note: 'A disciplined line-holder. Requires Bronze Working.'
  }
};

const BUILDINGS = {
  palace: {
    name: 'Palace of Dawn', icon: 'sun', cost: 0, effect: '+1 Production · +1 Science',
    yields: { prod: 1, science: 1 }, legacy: 4,
    note: 'The seat of the Sunfall Reach. Its hearth never goes cold.'
  },
  monument: {
    name: 'Monument', icon: 'crown', cost: 18, effect: '+4 Legacy',
    legacy: 4, note: 'A stone promise to the future. Adds 4 Legacy when completed.'
  },
  granary: {
    name: 'Granary', icon: 'wheat', cost: 22, effect: '+2 Food',
    yields: { food: 2 }, note: 'Stores the harvest against lean years. +2 Food in this city.'
  },
  workshop: {
    name: 'Workshop', icon: 'hammer', cost: 26, effect: '+2 Production',
    yields: { prod: 2 }, note: 'Craftsmen and tools. +2 Production in this city.'
  },
  library: {
    name: 'Library', icon: 'scroll', cost: 24, effect: '+2 Science',
    yields: { science: 2 }, requires: 'writing',
    note: 'A quiet hall of scrolls. +2 Science in this city.'
  },
  market: {
    name: 'Market', icon: 'coin', cost: 28, effect: '+3 Gold',
    yields: { gold: 3 }, requires: 'currency',
    note: 'A crossroads of coin and gossip. +3 Gold in this city.'
  },
  walls: {
    name: 'Walls', icon: 'shield', cost: 30, effect: '+10 HP · +4 defence',
    hp: 10, defence: 4, note: 'Earthworks and timber palisades. Tougher to capture.'
  }
};

const PRODUCTION_ORDER = [
  'warrior', 'scout', 'settler', 'worker', 'spearman',
  'monument', 'granary', 'workshop', 'library', 'market', 'walls'
];

const TECHS = {
  agriculture: {
    name: 'Agriculture', icon: 'wheat', cost: 12,
    effect: '+2 Food in every city', unlock: 'Farms',
    note: 'Sowing and reaping. Your people eat a little better.'
  },
  mining: {
    name: 'Mining', icon: 'pick', cost: 18,
    effect: '+2 Production in every city', unlock: 'Mines',
    note: 'Shafts and spoil heaps. Your cities work stone and ore.'
  },
  writing: {
    name: 'Writing', icon: 'scroll', cost: 24,
    effect: '+2 Science in every city', unlock: 'Libraries',
    note: 'Marks that outlive a memory. Ideas begin to accumulate.'
  },
  bronze: {
    name: 'Bronze Working', icon: 'shield', cost: 30,
    effect: '+2 Strength for all units', unlock: 'Spearmen',
    note: 'Harder blades and better shields. War becomes a craft.'
  },
  currency: {
    name: 'Currency', icon: 'coin', cost: 36,
    effect: '+2 Gold in every city', unlock: 'Markets',
    note: 'A common coin for a common world. Trade quickens.'
  }
};

const PRODUCTION_DEFS = { ...UNIT_TYPES, ...BUILDINGS };
const TECH_ORDER = ['agriculture', 'mining', 'writing', 'bronze', 'currency'];

const FACTIONS = {
  player: {
    id: 'player',
    name: 'The Sunfall Reach',
    short: 'Sunfall',
    cityName: 'Sunfall',
    color: '#51c3a0',
    deep: '#1c725b',
    rival: false,
    motto: 'Light remembers.'
  },
  ai: {
    id: 'ai',
    name: 'The Cinder Court',
    short: 'Cinder Court',
    cityName: 'Cinderhold',
    color: '#d76f51',
    deep: '#8e3d2f',
    rival: true,
    motto: 'Ash outlasts the flame.'
  }
};

const DIRECTIONS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1]
];

const CITY_NAMES = ['Dawnwatch', 'Mossgate', 'Highvale', 'Redwater', 'Stonefield', 'Amberford'];

const ERA_NAMES = [
  'THE DAWN OF THE REACH',
  'THE FIRST BORDERS',
  'THE GROWING REALM',
  'THE FINAL YEARS'
];

const BUILD_ORDER = PRODUCTION_ORDER;
