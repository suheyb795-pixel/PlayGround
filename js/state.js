/* --------------------------------------------------------------------------
   Pocket Empire — state, yields, and small rules helpers
   -------------------------------------------------------------------------- */

let state = null;

const ui = {
  reachable: new Set(),
  attackable: new Set(),
  spawning: new Set(),
  flashing: new Set(),
  hoverKey: null,
  busy: false,
  modalOpen: false,
  sound: true,
  audio: null,
  turnToken: 0
};

function tileKey(x, y) { return `${x},${y}`; }
function inBounds(x, y) { return x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE; }
function tileAt(x, y) { return inBounds(x, y) ? state.map[y][x] : null; }
function getFaction(id) { return state.factions[id]; }
function getCity(id) { return state.cities.find(city => city.id === id) || null; }
function getUnit(id) { return state.units.find(unit => unit.id === id) || null; }
function unitAt(x, y) { return state.units.find(unit => unit.x === x && unit.y === y) || null; }
function cityAt(x, y) { return state.cities.find(city => city.x === x && city.y === y) || null; }
function unitsOf(factionId) { return state.units.filter(unit => unit.owner === factionId); }
function citiesOf(factionId) { return state.cities.filter(city => city.owner === factionId); }
function tilesOf(factionId) { return state.map.flat().filter(tile => tile.owner === factionId); }
function ownedTiles(city) { return state.map.flat().filter(tile => tile.cityId === city.id); }
function workableTiles(city) {
  return state.map.flat().filter(tile =>
    tile.cityId === city.id &&
    !(tile.x === city.x && tile.y === city.y) &&
    TERRAIN[tile.t].passable
  );
}
function formatCoord(x, y) { return `${String.fromCharCode(65 + x)}${y + 1}`; }
function distance(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function isAdjacent(x1, y1, x2, y2) { return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)) === 1; }

function neighbors(x, y) {
  const list = [];
  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(nx, ny)) list.push({ x: nx, y: ny });
  }
  return list;
}

function tileYields(tile) {
  const base = TERRAIN[tile.t];
  const out = { food: base.food, prod: base.prod, gold: base.gold, science: base.science };
  if (tile.improvement && IMPROVEMENTS[tile.improvement]) {
    const added = IMPROVEMENTS[tile.improvement].yields;
    out.food += added.food;
    out.prod += added.prod;
    out.gold += added.gold;
    out.science += added.science;
  }
  return out;
}

function tileWeight(tile) {
  const y = tileYields(tile);
  return y.food * 2.2 + y.prod * 2.1 + y.gold * 1.25 + y.science * 1.5;
}

function cityYields(city) {
  const faction = getFaction(city.owner);
  const total = { food: 3, prod: 2, gold: 2, science: 2 };
  const worked = workableTiles(city)
    .map(tile => ({ tile, weight: tileWeight(tile), yields: tileYields(tile) }))
    .sort((a, b) => b.weight - a.weight || b.yields.food - a.yields.food || a.tile.y - b.tile.y || a.tile.x - b.tile.x)
    .slice(0, Math.max(1, city.pop));

  for (const item of worked) {
    total.food += item.yields.food;
    total.prod += item.yields.prod;
    total.gold += item.yields.gold;
    total.science += item.yields.science;
  }

  for (const buildingId of city.buildings) {
    const building = BUILDINGS[buildingId];
    if (!building?.yields) continue;
    total.food += building.yields.food || 0;
    total.prod += building.yields.prod || 0;
    total.gold += building.yields.gold || 0;
    total.science += building.yields.science || 0;
  }

  if (faction.techs.includes('agriculture')) total.food += 2;
  if (faction.techs.includes('mining')) total.prod += 2;
  if (faction.techs.includes('writing')) total.science += 2;
  if (faction.techs.includes('currency')) total.gold += 2;

  total.surplus = total.food - city.pop * 2;
  total.worked = worked;
  total.threshold = growthThreshold(city);
  return total;
}

function factionYields(factionId) {
  const total = { food: 0, prod: 0, gold: 0, science: 0, surplus: 0 };
  for (const city of citiesOf(factionId)) {
    const y = cityYields(city);
    total.food += y.food;
    total.prod += y.prod;
    total.gold += y.gold;
    total.science += y.science;
    total.surplus += y.surplus;
  }
  return total;
}

function growthThreshold(city) { return 8 + city.pop * 3; }
function currentResearch(faction) {
  if (!faction.research) return null;
  if (faction.techs.includes(faction.research)) return null;
  return TECHS[faction.research] ? faction.research : null;
}
function researchProgress(faction, techId) {
  return Math.max(0, Math.floor(faction.progress?.[techId] || 0));
}
function researchTurns(faction) {
  const techId = currentResearch(faction);
  if (!techId) return null;
  const rate = factionYields(faction.id).science;
  if (rate <= 0) return null;
  return Math.max(1, Math.ceil((TECHS[techId].cost - researchProgress(faction, techId)) / rate));
}
function nextResearch(faction) {
  return TECH_ORDER.find(id => !faction.techs.includes(id)) || null;
}
function availableTechs(faction) {
  return TECH_ORDER.filter(id => !faction.techs.includes(id));
}
function improvementUnlocked(improvementId, factionId) {
  const faction = getFaction(factionId);
  if (improvementId === 'farm') return faction.techs.includes('agriculture');
  if (improvementId === 'mine') return faction.techs.includes('mining');
  return true;
}
function improvementForTile(tile) {
  const base = TERRAIN[tile.t];
  return base?.improvement || null;
}
function canImproveTile(tile, factionId) {
  if (!tile || tile.owner !== factionId || tile.improvement) return false;
  const improvement = improvementForTile(tile);
  return Boolean(improvement && improvementUnlocked(improvement, factionId));
}
function improvementCost(tile) { return 0; }

function unitStrength(unit) {
  const base = UNIT_TYPES[unit.type]?.strength || 0;
  const faction = getFaction(unit.owner);
  return base + (faction.techs.includes('bronze') ? 2 : 0) + (unit.fortified ? 4 : 0);
}
function terrainDefence(tile) {
  if (!tile) return 0;
  if (tile.t === 'F' || tile.t === 'H') return 2;
  return 0;
}
function cityDefence(city) {
  const faction = getFaction(city.owner);
  let defence = 6;
  if (city.buildings.includes('walls')) defence += 4;
  if (faction.techs.includes('bronze')) defence += 1;
  return defence;
}
function cityMaxHp(city) {
  return 20 + (city.buildings.includes('walls') ? 10 : 0);
}
function canFight(unit) {
  return UNIT_TYPES[unit.type]?.role === 'melee' || UNIT_TYPES[unit.type]?.role === 'scout';
}

function productionCost(item) {
  return PRODUCTION_DEFS[item]?.cost || 999;
}
function isBuilding(item) { return Boolean(BUILDINGS[item]); }
function hasBuilding(city, item) { return city.buildings.includes(item); }
function canProduce(city, item) {
  const def = PRODUCTION_DEFS[item];
  if (!def) return false;
  if (isBuilding(item)) {
    if (hasBuilding(city, item)) return false;
    if (def.requires && !getFaction(city.owner).techs.includes(def.requires)) return false;
    return true;
  }
  if (def.requires && !getFaction(city.owner).techs.includes(def.requires)) return false;
  return true;
}
function productionLock(city, item) {
  const def = PRODUCTION_DEFS[item];
  if (!def) return 'Unknown';
  if (isBuilding(item) && hasBuilding(city, item)) return 'Built';
  if (def.requires && !getFaction(city.owner).techs.includes(def.requires)) {
    return `${TECHS[def.requires].name} required`;
  }
  return '';
}
function productionTurns(city, item) {
  const y = cityYields(city);
  const remaining = Math.max(0, productionCost(item) - city.prod);
  return y.prod > 0 ? Math.max(1, Math.ceil(remaining / y.prod)) : '∞';
}

function cityDefenceBonus(city) {
  return city.buildings.includes('walls') ? 3 : 0;
}

function claimRing(city, radius = CITY_WORK_RADIUS) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = city.x + dx;
      const y = city.y + dy;
      const tile = tileAt(x, y);
      if (!tile || !TERRAIN[tile.t].land) continue;
      if (tile.owner) continue;
      tile.owner = city.owner;
      tile.cityId = city.id;
    }
  }
}

function claimBestTile(city) {
  const candidates = [];
  const cityTiles = ownedTiles(city);
  const seen = new Set();
  for (const owned of cityTiles) {
    for (const n of neighbors(owned.x, owned.y)) {
      const tile = tileAt(n.x, n.y);
      if (!tile || !TERRAIN[tile.t].land || !TERRAIN[tile.t].passable) continue;
      if (tile.owner) continue;
      const key = tileKey(tile.x, tile.y);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ tile, score: tileWeight(tile) - distance(tile, city) * 0.2 });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.tile.y - b.tile.y || a.tile.x - b.tile.x);
  const chosen = candidates[0]?.tile;
  if (!chosen) return null;
  chosen.owner = city.owner;
  chosen.cityId = city.id;
  return chosen;
}

function adjacentToFaction(x, y, factionId) {
  return neighbors(x, y).some(n => tileAt(n.x, n.y)?.owner === factionId);
}
function nearestCityId(factionId, x, y) {
  const cities = citiesOf(factionId);
  if (!cities.length) return null;
  return [...cities].sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }))[0].id;
}
function claimCost() {
  const owned = tilesOf('player').length;
  return 15 + Math.floor(owned / 7) * 5;
}

function canFoundCity(unit) {
  const tile = tileAt(unit.x, unit.y);
  if (!tile || !TERRAIN[tile.t].land || !TERRAIN[tile.t].passable) return { ok: false, why: 'Found cities on open land.' };
  if (unit.type !== 'settler' || unit.owner !== 'player') return { ok: false, why: 'Only settlers can found cities.' };
  if (tile.owner && tile.owner !== 'player') return { ok: false, why: 'This land belongs to the Cinder Court.' };
  for (const city of state.cities) {
    if (distance(city, unit) < 3) return { ok: false, why: 'Too close to another city.' };
  }
  if (cityAt(unit.x, unit.y)) return { ok: false, why: 'A city already stands here.' };
  return { ok: true, why: '' };
}

function findPath(unit, targetX, targetY, maxCost = Infinity, blockedByUnits = true) {
  const start = tileKey(unit.x, unit.y);
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const open = [{ x: unit.x, y: unit.y, cost: 0 }];
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const node = open.shift();
    if (node.cost > (dist.get(tileKey(node.x, node.y)) ?? Infinity)) continue;
    if (node.cost > maxCost) continue;
    if (node.x === targetX && node.y === targetY) break;
    for (const n of neighbors(node.x, node.y)) {
      const tile = tileAt(n.x, n.y);
      if (!tile || !TERRAIN[tile.t].passable) continue;
      const otherUnit = unitAt(n.x, n.y);
      if (blockedByUnits && otherUnit && !(otherUnit.id === unit.id)) continue;
      const city = cityAt(n.x, n.y);
      if (city && city.owner !== unit.owner) continue;
      const cost = node.cost + (TERRAIN[tile.t].move || 1);
      if (cost > maxCost) continue;
      const key = tileKey(n.x, n.y);
      if (cost < (dist.get(key) ?? Infinity)) {
        dist.set(key, cost);
        prev.set(key, { x: node.x, y: node.y });
        open.push({ x: n.x, y: n.y, cost });
      }
    }
  }
  const goal = tileKey(targetX, targetY);
  if (!dist.has(goal)) return null;
  if (dist.get(goal) > maxCost) return null;
  const path = [];
  let cursor = goal;
  while (cursor !== start) {
    const [x, y] = cursor.split(',').map(Number);
    path.unshift({ x, y });
    const p = prev.get(cursor);
    if (!p) return null;
    cursor = tileKey(p.x, p.y);
  }
  return { path, cost: dist.get(goal) };
}

function reachableFor(unit) {
  const result = new Map();
  const start = tileKey(unit.x, unit.y);
  const open = [{ x: unit.x, y: unit.y, cost: 0 }];
  const dist = new Map([[start, 0]]);
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const node = open.shift();
    if (node.cost > (dist.get(tileKey(node.x, node.y)) ?? Infinity)) continue;
    for (const n of neighbors(node.x, node.y)) {
      const tile = tileAt(n.x, n.y);
      if (!tile || !TERRAIN[tile.t].passable) continue;
      if (unitAt(n.x, n.y)) continue;
      const city = cityAt(n.x, n.y);
      if (city && city.owner !== unit.owner) continue;
      const cost = node.cost + (TERRAIN[tile.t].move || 1);
      if (cost > unit.moves) continue;
      const key = tileKey(n.x, n.y);
      if (cost < (dist.get(key) ?? Infinity)) {
        dist.set(key, cost);
        open.push({ x: n.x, y: n.y, cost });
      }
    }
  }
  for (const [key, cost] of dist) {
    if (key === start) continue;
    result.set(key, cost);
  }
  return result;
}

function attackTargetsFor(unit) {
  if (!canFight(unit) || unit.moves <= 0) return [];
  const targets = [];
  for (const n of neighbors(unit.x, unit.y)) {
    const enemy = unitAt(n.x, n.y);
    if (enemy && enemy.owner !== unit.owner) targets.push({ type: 'unit', id: enemy.id, x: n.x, y: n.y });
    const city = cityAt(n.x, n.y);
    if (city && city.owner !== unit.owner && !enemy) targets.push({ type: 'city', id: city.id, x: n.x, y: n.y });
  }
  return targets;
}

function calcLegacy(factionId) {
  const faction = getFaction(factionId);
  const cities = citiesOf(factionId);
  const pop = cities.reduce((sum, city) => sum + city.pop, 0);
  const buildings = cities.reduce((sum, city) => sum + city.buildings.length, 0);
  const units = unitsOf(factionId).length;
  const tiles = tilesOf(factionId).length;
  const techs = faction.techs.length;
  const gold = Math.floor(faction.gold / 10);
  const legacyBonus = faction.legacyBonus || 0;
  const total = pop * 4 + techs * 8 + buildings * 4 + units * 2 + tiles * 2 + gold + legacyBonus;
  return { total, pop, buildings, units, tiles, techs, gold, legacyBonus, cities: cities.length };
}

function makeLog(html, type = 'info') {
  state.logs.unshift({ turn: state.turn, type, html });
  if (state.logs.length > 40) state.logs.length = 40;
}

function addProgress(faction, techId, amount) {
  if (!faction.progress) faction.progress = {};
  faction.progress[techId] = (faction.progress[techId] || 0) + amount;
}

function createInitialState() {
  const map = MAP_ROWS.map((row, y) => [...row].map((code, x) => ({
    x, y, t: code, owner: null, cityId: null, improvement: null, feature: null
  })));

  const featureMap = {
    '1,4': 'ruin',
    '5,1': 'ruin',
    '7,6': 'ruin',
    '4,8': 'village',
    '7,4': 'village'
  };
  for (const [key, feature] of Object.entries(featureMap)) {
    const [x, y] = key.split(',').map(Number);
    map[y][x].feature = feature;
  }

  const fresh = {
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: 'player',
    ended: false,
    endReason: null,
    map,
    cities: [],
    units: [],
    nextUnitId: 1,
    nextCityId: 1,
    selected: { type: 'city', id: 'sunfall' },
    logs: [],
    factions: {
      player: {
        id: 'player',
        gold: 24,
        techs: ['agriculture'],
        research: 'mining',
        progress: { mining: 2 },
        legacyBonus: 4,
        capitalId: 'sunfall'
      },
      ai: {
        id: 'ai',
        gold: 20,
        techs: ['agriculture'],
        research: 'mining',
        progress: { mining: 1 },
        legacyBonus: 0,
        capitalId: 'cinderhold'
      }
    },
    stats: {
      citiesFounded: 0,
      ruinsFound: 0,
      battles: 0,
      kills: 0,
      losses: 0,
      improvements: 0
    },
    seenFeatures: new Set()
  };
  state = fresh;

  const sunfall = {
    id: 'sunfall',
    name: 'Sunfall',
    owner: 'player',
    x: 2,
    y: 7,
    pop: 2,
    food: 2,
    prod: 8,
    prodItem: 'warrior',
    hp: 20,
    maxHp: 20,
    buildings: ['palace'],
    capital: true,
    damagedTurn: 0,
    foundedTurn: 1
  };
  const cinderhold = {
    id: 'cinderhold',
    name: 'Cinderhold',
    owner: 'ai',
    x: 7,
    y: 2,
    pop: 2,
    food: 1,
    prod: 6,
    prodItem: 'warrior',
    hp: 20,
    maxHp: 20,
    buildings: [],
    capital: true,
    damagedTurn: 0,
    foundedTurn: 1
  };
  state.cities.push(sunfall, cinderhold);

  for (const city of state.cities) {
    claimRing(city);
    city.maxHp = cityMaxHp(city);
  }

  state.units.push(
    { id: 'u1', type: 'warrior', owner: 'player', x: 3, y: 7, hp: 10, maxHp: 10, moves: 2, maxMoves: 2, fortified: false, acted: false },
    { id: 'u2', type: 'worker', owner: 'player', x: 2, y: 6, hp: 8, maxHp: 8, moves: 2, maxMoves: 2, fortified: false, acted: false },
    { id: 'u3', type: 'scout', owner: 'player', x: 3, y: 8, hp: 8, maxHp: 8, moves: 3, maxMoves: 3, fortified: false, acted: false },
    { id: 'u4', type: 'warrior', owner: 'ai', x: 6, y: 3, hp: 10, maxHp: 10, moves: 2, maxMoves: 2, fortified: false, acted: false },
    { id: 'u5', type: 'scout', owner: 'ai', x: 6, y: 2, hp: 8, maxHp: 8, moves: 3, maxMoves: 3, fortified: false, acted: false }
  );
  state.nextUnitId = 6;

  makeLog('The <b>Sunfall Reach</b> awakens on a quiet green shore.', 'good');
  makeLog('<b>Cinderhold</b> raises red banners beyond the eastern forest.', 'info');
  makeLog('Your scholars are studying <b>Mining</b>. The world is small; make it count.', 'info');

  return fresh;
}

function createCity({ owner, x, y, name, pop = 1 }) {
  const id = `city-${state.nextCityId++}`;
  const seat = tileAt(x, y);
  if (seat) {
    seat.owner = owner;
    seat.cityId = id;
    seat.feature = null;
  }
  const city = {
    id,
    name: name || CITY_NAMES[(state.nextCityId - 2) % CITY_NAMES.length],
    owner,
    x,
    y,
    pop,
    food: 0,
    prod: 0,
    prodItem: 'warrior',
    hp: 20,
    maxHp: 20,
    buildings: [],
    capital: false,
    damagedTurn: state.turn,
    foundedTurn: state.turn
  };
  state.cities.push(city);
  claimRing(city);
  city.maxHp = cityMaxHp(city);
  return city;
}

function createUnit({ type, owner, x, y, moves = 0 }) {
  const def = UNIT_TYPES[type];
  const id = `u${state.nextUnitId++}`;
  const unit = {
    id, type, owner, x, y,
    hp: def.hp, maxHp: def.hp,
    moves, maxMoves: def.moves,
    fortified: false,
    acted: true
  };
  state.units.push(unit);
  ui.spawning.add(id);
  return unit;
}

function availableSpawnTile(city) {
  const own = tileAt(city.x, city.y);
  if (own && !unitAt(city.x, city.y)) return own;
  const options = neighbors(city.x, city.y)
    .map(n => tileAt(n.x, n.y))
    .filter(tile => tile && TERRAIN[tile.t].passable && !unitAt(tile.x, tile.y) && !cityAt(tile.x, tile.y));
  options.sort((a, b) => tileWeight(b) - tileWeight(a));
  return options[0] || null;
}

function resetForNewTurn(factionId) {
  for (const unit of unitsOf(factionId)) {
    unit.moves = unit.maxMoves;
    unit.acted = false;
  }
}

function playerSeat() {
  const capital = getCity(getFaction('player').capitalId);
  if (capital && capital.owner === 'player') return capital;
  return citiesOf('player')[0] || null;
}

function selectedEntity() {
  if (!state.selected) return null;
  if (state.selected.type === 'city') return getCity(state.selected.id);
  if (state.selected.type === 'unit') return getUnit(state.selected.id);
  if (state.selected.type === 'tile') return tileAt(state.selected.x, state.selected.y);
  return null;
}
