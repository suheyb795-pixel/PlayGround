/* --------------------------------------------------------------------------
   Pocket Empire — the Cinder Court
   -------------------------------------------------------------------------- */

function aiChooseProduction(city) {
  const faction = getFaction('ai');
  const army = unitsOf('ai').length;
  const fighters = unitsOf('ai').filter(canFight).length;
  if (fighters < 2) return 'warrior';
  if (city.pop >= 2 && !hasBuilding(city, 'granary')) return 'granary';
  if (state.turn >= 5 && !hasBuilding(city, 'workshop')) return 'workshop';
  if (faction.techs.includes('writing') && !hasBuilding(city, 'library')) return 'library';
  if (state.turn >= 10 && !hasBuilding(city, 'walls')) return 'walls';
  if (faction.techs.includes('currency') && !hasBuilding(city, 'market')) return 'market';
  if (!hasBuilding(city, 'monument')) return 'monument';
  if (faction.techs.includes('bronze') && army < 4) return 'spearman';
  return army < 4 ? 'warrior' : 'scout';
}

function aiChooseAttackTarget(unit) {
  if (!canFight(unit) || unit.moves <= 0) return null;
  const adjacentUnits = state.units
    .filter(other => other.owner === 'player' && isAdjacent(unit.x, unit.y, other.x, other.y))
    .sort((a, b) => a.hp - b.hp || unitStrength(a) - unitStrength(b));
  if (adjacentUnits.length) {
    return { type: 'unit', id: adjacentUnits[0].id };
  }
  const city = state.cities.find(other => other.owner === 'player' && isAdjacent(unit.x, unit.y, other.x, other.y));
  if (city && !unitAt(city.x, city.y)) {
    return { type: 'city', id: city.id };
  }
  return null;
}

function aiRouteTo(unit, target) {
  const targetTile = tileAt(target.x, target.y);
  if (!targetTile) return null;
  let best = null;
  for (const n of neighbors(target.x, target.y)) {
    const tile = tileAt(n.x, n.y);
    if (!tile || !TERRAIN[tile.t].passable) continue;
    if (unitAt(n.x, n.y)) continue;
    const city = cityAt(n.x, n.y);
    if (city && city.owner !== 'ai') continue;
    if (n.x === unit.x && n.y === unit.y) {
      return { path: [], cost: 0 };
    }
    const route = findPath(unit, n.x, n.y, Infinity, true);
    if (!route || !route.path.length) continue;
    if (!best || route.cost < best.cost) best = route;
  }
  return best;
}

function aiChooseRoute(unit) {
  const targets = [
    ...citiesOf('player').map(city => ({ kind: 'city', ref: city, x: city.x, y: city.y, weight: 0.82 })),
    ...unitsOf('player').map(other => ({ kind: 'unit', ref: other, x: other.x, y: other.y, weight: 1.05 }))
  ];
  if (!targets.length) return null;
  targets.sort((a, b) => {
    const da = distance(unit, a) * a.weight;
    const db = distance(unit, b) * b.weight;
    return da - db;
  });
  for (const target of targets) {
    const route = aiRouteTo(unit, target);
    if (route) return route;
  }
  return null;
}

async function aiMoveAlong(unit, path) {
  let remaining = unit.moves;
  unit.acted = true;
  unit.fortified = false;
  for (const step of path) {
    const tile = tileAt(step.x, step.y);
    if (!tile || !TERRAIN[tile.t].passable) break;
    const cost = TERRAIN[tile.t].move || 1;
    if (cost > remaining) break;
    const enemy = unitAt(step.x, step.y);
    const city = cityAt(step.x, step.y);
    if (enemy && enemy.owner !== 'ai') break;
    if (city && city.owner !== 'ai') break;
    remaining -= cost;
    unit.x = step.x;
    unit.y = step.y;
    unit.moves = remaining;
    syncTokens();
    updateBoard();
    if (tile.feature) {
      collectFeature(unit, tile);
      renderAll();
    }
    await sleep(135);
    if (remaining <= 0) break;
  }
  unit.moves = Math.max(0, remaining);
  sfx('move');
  renderAll();
}

function aiMakeImprovements() {
  if (state.turn % 4 !== 0) return;
  const faction = getFaction('ai');
  const candidates = state.map.flat()
    .filter(tile => tile.owner === 'ai' && !tile.improvement && TERRAIN[tile.t].passable)
    .filter(tile => {
      const improvement = improvementForTile(tile);
      return improvement && improvementUnlocked(improvement, 'ai');
    })
    .sort((a, b) => tileWeight(b) - tileWeight(a));
  const tile = candidates[0];
  if (!tile) return;
  const improvement = improvementForTile(tile);
  tile.improvement = improvement;
  makeLog(`Cinder workers improved a tile at <b>${formatCoord(tile.x, tile.y)}</b>.`, 'war');
}

function aiIsThreatened() {
  return unitsOf('player').some(unit =>
    citiesOf('ai').some(city => distance(unit, city) <= 3)
  );
}

async function runAiMoves() {
  aiMakeImprovements();
  const aggression = state.turn >= 9 || aiIsThreatened();
  if (!aggression) {
    for (const unit of unitsOf('ai')) {
      unit.fortified = true;
      unit.moves = 0;
      unit.acted = true;
    }
    renderAll();
    return;
  }
  const queue = [...unitsOf('ai')];
  for (const unit of queue) {
    if (state.ended) return;
    if (!getUnit(unit.id) || unit.moves <= 0) continue;

    const target = aiChooseAttackTarget(unit);
    if (target) {
      if (target.type === 'unit') {
        const defender = getUnit(target.id);
        if (defender) resolveUnitAttack(unit, defender);
      } else {
        const city = getCity(target.id);
        if (city) resolveCityAttack(unit, city);
      }
      await sleep(430);
      if (state.ended) return;
      continue;
    }

    const route = aiChooseRoute(unit);
    if (route && route.path.length) {
      await aiMoveAlong(unit, route.path);
      if (state.ended) return;
      await sleep(220);
      if (!getUnit(unit.id)) continue;
      const secondTarget = aiChooseAttackTarget(unit);
      if (secondTarget && unit.moves > 0) {
        if (secondTarget.type === 'unit') {
          const defender = getUnit(secondTarget.id);
          if (defender) resolveUnitAttack(unit, defender);
        } else {
          const city = getCity(secondTarget.id);
          if (city) resolveCityAttack(unit, city);
        }
        await sleep(430);
      }
    } else {
      unit.fortified = true;
      unit.moves = 0;
      unit.acted = true;
      renderAll();
    }
  }
}
