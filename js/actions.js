/* --------------------------------------------------------------------------
   Pocket Empire — player actions, economy, and combat
   -------------------------------------------------------------------------- */

function sleep(ms) { return new Promise(resolve => window.setTimeout(resolve, ms)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function ensureAudio() {
  if (!ui.sound) return null;
  try {
    if (!ui.audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ui.audio = new Ctx();
    }
    if (ui.audio.state === 'suspended') ui.audio.resume();
    return ui.audio;
  } catch {
    return null;
  }
}

function tone(freq, duration = 0.06, type = 'sine', volume = 0.025, delay = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function sfx(name) {
  if (!ui.sound) return;
  switch (name) {
    case 'select':
      tone(460, 0.045, 'triangle', 0.018);
      break;
    case 'move':
      tone(260, 0.07, 'sine', 0.018);
      tone(330, 0.06, 'sine', 0.012, 0.055);
      break;
    case 'coin':
      tone(880, 0.06, 'triangle', 0.02);
      tone(1320, 0.08, 'triangle', 0.014, 0.045);
      break;
    case 'build':
      tone(330, 0.08, 'square', 0.012);
      tone(440, 0.1, 'triangle', 0.015, 0.06);
      break;
    case 'attack':
      tone(92, 0.16, 'sawtooth', 0.035);
      tone(62, 0.22, 'sine', 0.03, 0.03);
      break;
    case 'win':
      tone(440, 0.11, 'triangle', 0.02);
      tone(554, 0.11, 'triangle', 0.02, 0.09);
      tone(659, 0.18, 'triangle', 0.02, 0.18);
      break;
    case 'lose':
      tone(220, 0.18, 'sine', 0.022);
      tone(164, 0.25, 'sine', 0.02, 0.14);
      break;
    case 'turn':
      tone(392, 0.08, 'triangle', 0.018);
      tone(523, 0.12, 'triangle', 0.018, 0.08);
      break;
    case 'research':
      tone(587, 0.08, 'sine', 0.018);
      tone(740, 0.1, 'sine', 0.018, 0.07);
      tone(880, 0.14, 'sine', 0.018, 0.14);
      break;
    default:
      break;
  }
}

function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`.trim();
  el.innerHTML = message;
  dom.toastLayer.appendChild(el);
  while (dom.toastLayer.children.length > 3) dom.toastLayer.firstElementChild.remove();
  window.setTimeout(() => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 260);
  }, 2500);
}

function pulseChip(chip, delay = 0) {
  window.setTimeout(() => {
    chip.classList.remove('pulse');
    void chip.offsetWidth;
    chip.classList.add('pulse');
    window.setTimeout(() => chip.classList.remove('pulse'), 500);
  }, delay);
}

function flashTile(x, y, entityId = null) {
  const key = tileKey(x, y);
  ui.flashing.add(key);
  if (entityId) ui.flashing.add(entityId);
  renderAll();
  window.setTimeout(() => {
    ui.flashing.delete(key);
    if (entityId) ui.flashing.delete(entityId);
    renderAll();
  }, 420);
}

function selectUnit(id) {
  const unit = getUnit(id);
  if (!unit) return;
  state.selected = { type: 'unit', id };
  sfx('select');
  renderAll();
}

function selectCity(id) {
  const city = getCity(id);
  if (!city) return;
  state.selected = { type: 'city', id };
  sfx('select');
  renderAll();
}

function selectTile(x, y) {
  if (!inBounds(x, y)) return;
  state.selected = { type: 'tile', x, y };
  sfx('select');
  renderAll();
}

function handleBoardClick(event) {
  if (state.phase !== 'player' || state.ended || ui.busy) return;
  const target = event.target.closest('.tile');
  if (!target) return;
  const x = Number(target.dataset.x);
  const y = Number(target.dataset.y);
  const selected = state.selected;
  const selectedUnit = selected?.type === 'unit' ? getUnit(selected.id) : null;

  if (selectedUnit && selectedUnit.owner === 'player' && selectedUnit.moves > 0) {
    const enemy = unitAt(x, y);
    const city = cityAt(x, y);
    const adjacent = isAdjacent(selectedUnit.x, selectedUnit.y, x, y);
    if (adjacent && enemy && enemy.owner === 'ai' && canFight(selectedUnit)) {
      attackUnit(selectedUnit.id, enemy.id);
      return;
    }
    if (adjacent && city && city.owner === 'ai' && !enemy && canFight(selectedUnit)) {
      attackCity(selectedUnit.id, city.id);
      return;
    }
    if (ui.reachable.has(tileKey(x, y))) {
      moveUnitTo(selectedUnit, x, y);
      return;
    }
  }

  const unit = unitAt(x, y);
  if (unit) {
    selectUnit(unit.id);
    return;
  }
  const city = cityAt(x, y);
  if (city) {
    selectCity(city.id);
    return;
  }
  selectTile(x, y);
}

async function moveUnitTo(unit, x, y) {
  if (state.phase !== 'player' || state.ended || ui.busy) return;
  const pathInfo = findPath(unit, x, y, unit.moves);
  if (!pathInfo || !pathInfo.path.length) return;
  ui.busy = true;
  unit.acted = true;
  unit.fortified = false;
  let remaining = unit.moves;
  for (const step of pathInfo.path) {
    const tile = tileAt(step.x, step.y);
    const cost = TERRAIN[tile.t].move || 1;
    if (cost > remaining) break;
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
    await sleep(125);
  }
  unit.moves = Math.max(0, remaining);
  sfx('move');
  ui.busy = false;
  renderAll();
}

function collectFeature(unit, tile) {
  const feature = FEATURES[tile.feature];
  if (!feature) return;
  const faction = getFaction(unit.owner);
  faction.gold += feature.reward.gold || 0;
  if (feature.reward.science) addScience(unit.owner, feature.reward.science);
  if (unit.owner === 'player') {
    state.stats.ruinsFound += 1;
    toast(`<b>${feature.name}</b> · +${feature.reward.gold} gold${feature.reward.science ? ` · +${feature.reward.science} science` : ''}`, 'good');
    makeLog(`Your ${UNIT_TYPES[unit.type].name.toLowerCase()} found <b>${feature.name}</b> at ${formatCoord(tile.x, tile.y)}.`, 'good');
    pulseChip(dom.goldChip);
    pulseChip(dom.scienceChip, 90);
    sfx('coin');
  } else {
    makeLog(`Cinder scouts picked over the <b>${feature.name.toLowerCase()}</b> at ${formatCoord(tile.x, tile.y)}.`, 'war');
  }
  tile.feature = null;
}

function addScience(factionId, amount) {
  if (amount <= 0) return;
  const faction = getFaction(factionId);
  let remaining = amount;
  let guard = 0;
  while (remaining > 0 && guard < 10) {
    guard += 1;
    let techId = currentResearch(faction);
    if (!techId) {
      const next = nextResearch(faction);
      if (!next) {
        faction.bankedScience = (faction.bankedScience || 0) + remaining;
        break;
      }
      faction.research = next;
      techId = next;
    }
    const tech = TECHS[techId];
    const progress = researchProgress(faction, techId);
    const needed = tech.cost - progress;
    if (remaining >= needed) {
      remaining -= needed;
      faction.techs.push(techId);
      faction.progress[techId] = 0;
      if (factionId === 'player') {
        toast(`<b>Discovery:</b> ${tech.name} · ${tech.effect}`, 'good');
        makeLog(`Your scholars mastered <b>${tech.name}</b>. ${tech.effect}.`, 'good');
        sfx('research');
        pulseChip(dom.scienceChip);
      }
      faction.research = nextResearch(faction);
    } else {
      faction.progress[techId] = progress + remaining;
      remaining = 0;
    }
  }
}

function processFactionTurn(factionId) {
  const faction = getFaction(factionId);
  const cities = citiesOf(factionId);
  let incomeGold = 0;
  let incomeScience = 0;
  for (const city of cities) {
    const y = cityYields(city);
    incomeGold += y.gold;
    incomeScience += y.science;
    city.maxHp = cityMaxHp(city);

    if (y.surplus !== 0) {
      city.food = Math.max(0, city.food + y.surplus);
    }
    let threshold = growthThreshold(city);
    let grew = false;
    while (city.food >= threshold && city.pop < 7) {
      city.food -= threshold;
      city.pop += 1;
      grew = true;
      const claimed = claimBestTile(city);
      if (factionId === 'player') {
        toast(`<b>${city.name}</b> grew to population ${city.pop}${claimed ? ` · borders reached ${formatCoord(claimed.x, claimed.y)}` : ''}.`, 'good');
        makeLog(`<b>${city.name}</b> grew to population ${city.pop}${claimed ? ` and claimed ${formatCoord(claimed.x, claimed.y)}` : ''}.`, 'good');
      } else if (claimed) {
        makeLog(`<b>${city.name}</b> expanded toward ${formatCoord(claimed.x, claimed.y)}.`, 'war');
      }
      threshold = growthThreshold(city);
    }
    if (city.pop >= 7 && city.food >= threshold) city.food = threshold - 1;
    if (grew && factionId === 'player') sfx('build');

    if (city.hp < city.maxHp && city.damagedTurn < state.turn) {
      city.hp = Math.min(city.maxHp, city.hp + 2);
    }

    city.prod += y.prod;
    let guard = 0;
    while (city.prod >= productionCost(city.prodItem) && guard < 3) {
      guard += 1;
      const finished = completeProduction(city, factionId);
      if (!finished) break;
    }
  }
  faction.gold += incomeGold;
  addScience(factionId, incomeScience);
  if (factionId === 'player') {
    pulseChip(dom.goldChip);
    pulseChip(dom.scienceChip, 80);
  }
}

function completeProduction(city, factionId) {
  const itemId = city.prodItem;
  const def = PRODUCTION_DEFS[itemId];
  if (!def) {
    city.prodItem = factionId === 'ai' ? aiChooseProduction(city) : 'warrior';
    return false;
  }
  if (factionId === 'ai' && !isBuilding(itemId) && unitsOf('ai').length >= 4) {
    city.prod = 0;
    city.prodItem = aiChooseProduction(city);
    return false;
  }
  const cost = productionCost(itemId);

  if (isBuilding(itemId)) {
    if (hasBuilding(city, itemId)) {
      city.prod = 0;
      city.prodItem = factionId === 'ai' ? aiChooseProduction(city) : 'warrior';
      return false;
    }
    city.buildings.push(itemId);
    if (def.legacy) getFaction(factionId).legacyBonus = (getFaction(factionId).legacyBonus || 0) + def.legacy;
    if (itemId === 'walls') {
      city.maxHp = cityMaxHp(city);
      city.hp = Math.min(city.maxHp, city.hp + 10);
    }
    city.prod = Math.max(0, city.prod - cost);
    if (factionId === 'player') {
      toast(`<b>${city.name}</b> completed the <b>${def.name}</b>. ${def.effect}.`, 'good');
      makeLog(`<b>${def.name}</b> was completed in ${city.name}.`, 'good');
      sfx('build');
    } else {
      makeLog(`Cinderhold completed the <b>${def.name}</b>.`, 'war');
    }
    city.prodItem = factionId === 'ai' ? aiChooseProduction(city) : 'warrior';
    return true;
  }

  const tile = availableSpawnTile(city);
  if (!tile) {
    if (factionId === 'player') {
      toast(`<b>${city.name}</b> needs room for its ${def.name}.`, 'war');
      makeLog(`${city.name} trained a <b>${def.name}</b>, but there was no room to muster it.`, 'war');
    }
    return false;
  }
  createUnit({ type: itemId, owner: factionId, x: tile.x, y: tile.y, moves: 0 });
  city.prod = Math.max(0, city.prod - cost);
  if (factionId === 'player') {
    toast(`<b>${city.name}</b> mustered a <b>${def.name}</b>.`, 'good');
    makeLog(`${city.name} mustered a <b>${def.name}</b> at ${formatCoord(tile.x, tile.y)}.`, 'good');
    sfx('build');
  } else {
    makeLog(`Cinderhold mustered a <b>${def.name}</b>.`, 'war');
  }
  city.prodItem = factionId === 'ai' ? aiChooseProduction(city) : 'warrior';
  return true;
}

function setProduction(cityId, itemId) {
  const city = getCity(cityId);
  if (!city || city.owner !== 'player' || state.phase !== 'player' || state.ended) return;
  if (!canProduce(city, itemId)) return;
  city.prodItem = itemId;
  sfx('select');
  renderAll();
}

function chooseResearch(techId) {
  const faction = getFaction('player');
  if (!TECHS[techId] || faction.techs.includes(techId)) return;
  faction.research = techId;
  toast(`Scholars turn to <b>${TECHS[techId].name}</b>.`, 'good');
  closeModal();
  sfx('select');
  renderAll();
}

function foundCity(unitId) {
  const unit = getUnit(unitId);
  if (!unit || unit.owner !== 'player' || unit.type !== 'settler' || state.phase !== 'player') return;
  const check = canFoundCity(unit);
  if (!check.ok) {
    toast(check.why, 'war');
    return;
  }
  const tile = tileAt(unit.x, unit.y);
  const name = CITY_NAMES.find(candidate => !state.cities.some(city => city.name === candidate)) || `Sunfall ${state.cities.length + 1}`;
  state.units = state.units.filter(other => other.id !== unit.id);
  const city = createCity({ owner: 'player', x: unit.x, y: unit.y, name, pop: 1 });
  city.food = 2;
  state.stats.citiesFounded += 1;
  state.selected = { type: 'city', id: city.id };
  makeLog(`<b>${city.name}</b> was founded at ${formatCoord(city.x, city.y)}.`, 'good');
  toast(`<b>${city.name}</b> is founded. A new banner rises.`, 'good');
  sfx('win');
  renderAll();
}

function improveTile(unitId) {
  const unit = getUnit(unitId);
  if (!unit || unit.owner !== 'player' || unit.type !== 'worker' || state.phase !== 'player') return;
  const tile = tileAt(unit.x, unit.y);
  const improvement = improvementForTile(tile);
  if (!canImproveTile(tile, 'player')) {
    toast('No improvement can be built on this tile.', 'war');
    return;
  }
  if (unit.moves <= 0) {
    toast('This worker has no moves left.', 'war');
    return;
  }
  tile.improvement = improvement;
  unit.moves = 0;
  unit.acted = true;
  unit.fortified = false;
  state.stats.improvements += 1;
  const def = IMPROVEMENTS[improvement];
  toast(`<b>${def.name}</b> built at ${formatCoord(tile.x, tile.y)} · ${def.note}`, 'good');
  makeLog(`A worker built a <b>${def.name.toLowerCase()}</b> at ${formatCoord(tile.x, tile.y)}.`, 'good');
  sfx('build');
  renderAll();
}

function claimTile(x, y) {
  if (state.phase !== 'player' || state.ended) return;
  const tile = tileAt(x, y);
  if (!tile || tile.owner || !TERRAIN[tile.t].land || !adjacentToFaction(x, y, 'player')) return;
  const faction = getFaction('player');
  const cost = claimCost();
  if (faction.gold < cost) {
    toast(`You need <b>${cost} gold</b> to claim this tile.`, 'war');
    return;
  }
  faction.gold -= cost;
  tile.owner = 'player';
  tile.cityId = nearestCityId('player', x, y);
  toast(`<b>${formatCoord(x, y)}</b> joined the Sunfall Reach.`, 'good');
  makeLog(`The Sunfall Reach claimed <b>${formatCoord(x, y)}</b> for ${cost} gold.`, 'good');
  pulseChip(dom.goldChip);
  sfx('coin');
  renderAll();
}

function fortifyUnit(unitId) {
  const unit = getUnit(unitId);
  if (!unit || unit.owner !== 'player' || state.phase !== 'player') return;
  unit.fortified = true;
  unit.moves = 0;
  unit.acted = true;
  toast(`<b>${UNIT_TYPES[unit.type].name}</b> digs in. +4 defence until it moves.`, 'good');
  sfx('build');
  renderAll();
}

function restUnit(unitId) {
  const unit = getUnit(unitId);
  if (!unit || unit.owner !== 'player' || state.phase !== 'player') return;
  const before = unit.hp;
  unit.hp = Math.min(unit.maxHp, unit.hp + 2);
  unit.moves = 0;
  unit.acted = true;
  toast(`<b>${UNIT_TYPES[unit.type].name}</b> rests · +${unit.hp - before} HP.`, 'good');
  renderAll();
}

function attackUnit(attackerId, defenderId) {
  const attacker = getUnit(attackerId);
  const defender = getUnit(defenderId);
  if (!attacker || !defender || attacker.owner === defender.owner || attacker.moves <= 0 || state.ended) return;
  resolveUnitAttack(attacker, defender);
}

function attackCity(attackerId, cityId) {
  const attacker = getUnit(attackerId);
  const city = getCity(cityId);
  if (!attacker || !city || attacker.owner === city.owner || attacker.moves <= 0 || state.ended) return;
  if (!isAdjacent(attacker.x, attacker.y, city.x, city.y)) return;
  if (unitAt(city.x, city.y) && unitAt(city.x, city.y).owner !== attacker.owner) {
    attackUnit(attacker.id, unitAt(city.x, city.y).id);
    return;
  }
  resolveCityAttack(attacker, city);
}

function resolveUnitAttack(attacker, defender) {
  const tile = tileAt(defender.x, defender.y);
  const atk = unitStrength(attacker);
  const def = unitStrength(defender) + terrainDefence(tile) + (cityAt(defender.x, defender.y)?.owner === defender.owner ? cityDefenceBonus(cityAt(defender.x, defender.y)) : 0);
  const damage = clamp(5 + Math.round((atk - def) / 2), 3, 9);
  const retaliation = defender.hp - damage > 0 ? clamp(2 + Math.round((def - atk) / 2), 0, 4) : 0;
  state.stats.battles += 1;
  sfx('attack');
  defender.hp -= damage;
  if (retaliation > 0) attacker.hp -= retaliation;
  attacker.moves = 0;
  attacker.acted = true;
  attacker.fortified = false;

  const attackerName = UNIT_TYPES[attacker.type].name;
  const defenderName = UNIT_TYPES[defender.type].name;
  const attackerSide = attacker.owner === 'player' ? 'Your' : 'Cinder';
  const defenderSide = defender.owner === 'player' ? 'your' : 'Cinder';

  if (defender.hp <= 0) {
    state.units = state.units.filter(unit => unit.id !== defender.id);
    const defenderCity = cityAt(defender.x, defender.y);
    if (attacker.owner === 'player') {
      state.stats.kills += 1;
      makeLog(`Your <b>${attackerName}</b> slew a Cinder <b>${defenderName}</b> at ${formatCoord(defender.x, defender.y)}.`, 'good');
      toast(`<b>${defenderName} slain.</b> Your warrior takes the ground.`, 'good');
      if (!defenderCity || defenderCity.owner === attacker.owner) {
        attacker.x = defender.x;
        attacker.y = defender.y;
        if (tile.feature) collectFeature(attacker, tile);
      }
    } else {
      state.stats.losses += 1;
      makeLog(`A Cinder <b>${defenderName}</b> slew your <b>${attackerName}</b> at ${formatCoord(defender.x, defender.y)}.`, 'war');
      toast(`Your <b>${attackerName}</b> was slain.`, 'war');
    }
    flashTile(defender.x, defender.y, defender.id);
  } else {
    const summary = `${attackerSide} ${attackerName} struck a ${defenderSide} ${defenderName} at ${formatCoord(defender.x, defender.y)} for <b>${damage}</b> damage.`;
    makeLog(summary, attacker.owner === 'player' ? 'good' : 'war');
    flashTile(defender.x, defender.y, defender.id);
    if (attacker.hp <= 0) {
      state.units = state.units.filter(unit => unit.id !== attacker.id);
      state.stats.losses += attacker.owner === 'player' ? 1 : 0;
      state.stats.kills += attacker.owner === 'ai' ? 1 : 0;
      makeLog(`${attackerSide} <b>${attackerName}</b> fell in the exchange.`, attacker.owner === 'player' ? 'war' : 'good');
    }
  }

  if (!getUnit(state.selected?.id) && state.selected?.type === 'unit') {
    const capital = playerSeat();
    state.selected = capital ? { type: 'city', id: capital.id } : null;
  }
  renderAll();
}

function resolveCityAttack(attacker, city) {
  const atk = unitStrength(attacker);
  const def = cityDefence(city) + cityDefenceBonus(city);
  const damage = clamp(4 + Math.round((atk - def) / 2), 2, 9);
  city.hp -= damage;
  city.damagedTurn = state.turn;
  attacker.hp -= 1;
  attacker.moves = 0;
  attacker.acted = true;
  attacker.fortified = false;
  state.stats.battles += 1;
  sfx('attack');
  flashTile(city.x, city.y, city.id);

  if (attacker.owner === 'player') {
    makeLog(`Your <b>${UNIT_TYPES[attacker.type].name}</b> struck <b>${city.name}</b> for ${damage} damage.`, 'good');
  } else {
    makeLog(`Cinder forces struck <b>${city.name}</b> for ${damage} damage.`, 'war');
    toast(`<b>${city.name}</b> is under attack.`, 'war');
  }

  if (city.hp <= 0) {
    captureCity(city, attacker.owner, attacker);
  } else {
    if (attacker.hp <= 0) {
      state.units = state.units.filter(unit => unit.id !== attacker.id);
      makeLog(`Your <b>${UNIT_TYPES[attacker.type].name}</b> fell beneath the walls of ${city.name}.`, 'war');
      state.stats.losses += attacker.owner === 'player' ? 1 : 0;
    }
    renderAll();
  }
}

function captureCity(city, newOwner, attacker) {
  const oldOwner = city.owner;
  city.owner = newOwner;
  city.hp = Math.ceil(cityMaxHp(city) * 0.5);
  city.prod = 0;
  city.prodItem = 'warrior';
  city.damagedTurn = state.turn;
  for (const tile of state.map.flat()) {
    if (tile.cityId === city.id) tile.owner = newOwner;
  }
  if (attacker) {
    attacker.x = city.x;
    attacker.y = city.y;
  }
  const oldFaction = getFaction(oldOwner);
  const newFaction = getFaction(newOwner);
  if (oldOwner === 'player') {
    makeLog(`<b>${city.name}</b> has fallen to the Cinder Court.`, 'war');
    toast(`<b>${city.name}</b> has fallen.`, 'war');
    sfx('lose');
  } else {
    makeLog(`<b>${city.name}</b> has fallen. The Sunfall Reach takes the city.`, 'good');
    toast(`<b>${city.name}</b> is yours. The Cinder Court reels.`, 'good');
    sfx('win');
    state.stats.citiesFounded += 1;
  }

  if (!citiesOf(oldOwner).length) {
    finishGame(newOwner === 'player' ? 'conquest' : 'defeat');
    return;
  }

  const capital = playerSeat();
  if (newOwner === 'player') state.selected = { type: 'city', id: city.id };
  else if (capital) state.selected = { type: 'city', id: capital.id };
  renderAll();
}

function checkElimination() {
  if (state.ended) return true;
  if (!citiesOf('player').length) {
    finishGame('defeat');
    return true;
  }
  if (!citiesOf('ai').length) {
    finishGame('conquest');
    return true;
  }
  return false;
}

function finishGame(reason) {
  if (state.ended) return;
  state.ended = true;
  state.phase = 'ended';
  state.endReason = reason;
  ui.busy = false;
  dom.phaseBanner.hidden = true;
  renderAll();
  renderEndScreen();
  if (reason === 'defeat') sfx('lose');
  else sfx('win');
}

function beginPlayerTurn() {
  state.phase = 'player';
  for (const unit of unitsOf('player')) {
    if (!unit.acted && unit.hp < unit.maxHp) {
      unit.hp = Math.min(unit.maxHp, unit.hp + (unit.fortified ? 4 : 2));
    }
  }
  resetForNewTurn('player');
  renderAll();
}

function startPhaseBanner(text) {
  dom.phaseText.textContent = text;
  dom.phaseBanner.hidden = false;
}

function stopPhaseBanner() {
  dom.phaseBanner.hidden = true;
}

async function endTurn() {
  if (state.phase !== 'player' || state.ended || ui.busy) return;
  ui.busy = true;
  state.phase = 'ai';
  dom.endTurnBtn.disabled = true;
  sfx('turn');
  startPhaseBanner('The Cinder Court is moving');
  renderAll();
  await sleep(320);

  processFactionTurn('player');
  renderAll();
  await sleep(430);

  if (state.ended) {
    ui.busy = false;
    stopPhaseBanner();
    return;
  }

  resetForNewTurn('ai');
  processFactionTurn('ai');
  renderAll();
  await sleep(320);

  await runAiMoves();
  if (state.ended) {
    ui.busy = false;
    stopPhaseBanner();
    return;
  }

  stopPhaseBanner();
  if (state.turn >= state.maxTurns) {
    ui.busy = false;
    finishGame('time');
    return;
  }

  state.turn += 1;
  beginPlayerTurn();
  pulseChip(dom.turnValue?.parentElement?.parentElement);
  ui.busy = false;
  renderAll();
}
