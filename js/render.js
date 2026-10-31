/* --------------------------------------------------------------------------
   Pocket Empire — rendering
   -------------------------------------------------------------------------- */

const dom = {};
const tokenEls = new Map();

function cacheDom() {
  const ids = [
    'goldChip', 'goldValue', 'goldRate', 'scienceChip', 'scienceValue', 'scienceRate',
    'legacyChip', 'legacyValue', 'turnValue', 'turnProgress', 'endTurnBtn',
    'helpBtn', 'soundBtn', 'leftLegacy', 'legacyDelta', 'playerLegacySmall',
    'rivalLegacySmall', 'playerRaceBar', 'rivalRaceBar', 'cityList', 'cityCount',
    'legacyLedger',
    'researchCurrent', 'researchBar', 'researchTurns', 'researchTechCount',
    'researchBtn', 'researchNext', 'chronicleList', 'chronicleCount', 'boardEra',
    'boardTurn', 'boardFrame', 'board', 'tokenLayer', 'boardHint', 'hintText',
    'contextPanel', 'toastLayer', 'phaseBanner', 'phaseText', 'tooltip', 'modal',
    'modalCard', 'endOverlay', 'endCard'
  ];
  for (const id of ids) dom[id] = document.getElementById(id);
  dom.tiles = [];
}

function icon(name, cls = '') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function padTurn(value) { return String(value).padStart(2, '0'); }
function pct(value, max) { return `${Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))}%`; }

function useSymbol(id, x, y, width, height, opacity = 1) {
  return `<use href="#${id}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}"></use>`;
}

function tileArt(tile) {
  const t = tile.t;
  if (t === 'O') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#5a9ba1">
      ${useSymbol('i-wave', 8, 24, 30, 10, .6)}
      ${useSymbol('i-wave', 55, 48, 38, 12, .45)}
      ${useSymbol('i-wave', 20, 73, 26, 9, .35)}
    </svg>`;
  }
  if (t === 'C') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#9bc6bf">
      ${useSymbol('i-wave', 12, 28, 34, 11, .55)}
      ${useSymbol('i-wave', 50, 58, 39, 12, .4)}
      <path d="M0 84c18-7 39-7 58 0 16 6 29 5 42 1v15H0Z" fill="#b7a364" opacity=".24"/>
    </svg>`;
  }
  if (t === 'G') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#b4c775">
      ${useSymbol('i-tuft', 8, 56, 24, 24, .55)}
      ${useSymbol('i-tuft', 42, 63, 19, 19, .42)}
      ${useSymbol('i-tuft', 67, 48, 23, 23, .5)}
      ${useSymbol('i-pine', 56, 61, 12, 17, .3)}
      <circle cx="28" cy="39" r="1.1" fill="#e7d879" opacity=".55"/>
      <circle cx="78" cy="29" r="1" fill="#f2e7ae" opacity=".45"/>
    </svg>`;
  }
  if (t === 'P') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#ddc571">
      ${useSymbol('i-wheat', 11, 50, 23, 28, .62)}
      ${useSymbol('i-wheat', 40, 58, 19, 23, .45)}
      ${useSymbol('i-wheat', 70, 47, 21, 26, .55)}
      <path d="M0 86c24-5 46-5 71 0 12 2 22 2 29 1v13H0Z" fill="#756d36" opacity=".13"/>
    </svg>`;
  }
  if (t === 'F') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#1d4a30">
      ${useSymbol('i-pine', 12, 39, 31, 42, .96)}
      ${useSymbol('i-pine', 42, 20, 37, 58, .92)}
      ${useSymbol('i-pine', 70, 50, 25, 34, .85)}
      <path d="M0 87c18-5 31-4 47 0 18 4 34 4 53-1v14H0Z" fill="#102e1f" opacity=".27"/>
    </svg>`;
  }
  if (t === 'H') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#665a3d">
      ${useSymbol('i-hill', 2, 43, 59, 39, .76)}
      ${useSymbol('i-hill', 42, 57, 56, 34, .58)}
      <path d="M8 67c10-2 18-1 27 2M50 79c12-3 23-3 35-1" fill="none" stroke="#dfcf9a" stroke-width="1" opacity=".27"/>
    </svg>`;
  }
  if (t === 'M') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#565b55">
      ${useSymbol('i-peak', 2, 18, 74, 70, .9)}
      ${useSymbol('i-peak', 49, 40, 50, 52, .62)}
      <path d="M8 88c18-7 37-8 54-3 13 4 23 4 31 2v13H8Z" fill="#2f3730" opacity=".25"/>
    </svg>`;
  }
  if (t === 'D') {
    return `<svg class="tile-deco" viewBox="0 0 100 100" preserveAspectRatio="none" style="color:#a9864d">
      ${useSymbol('i-dune', 6, 46, 88, 45, .7)}
      ${useSymbol('i-dune', 38, 63, 70, 32, .42)}
      <circle cx="76" cy="25" r="7" fill="#f1d68c" opacity=".3"/>
    </svg>`;
  }
  return '';
}

function labelForTile(tile) {
  const terrain = TERRAIN[tile.t];
  return `${terrain.name} at ${formatCoord(tile.x, tile.y)}`;
}

function buildBoard() {
  dom.board.innerHTML = '';
  dom.tiles = [];
  for (let y = 0; y < MAP_SIZE; y += 1) {
    const row = [];
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const tile = tileAt(x, y);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile';
      button.dataset.x = String(x);
      button.dataset.y = String(y);
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', labelForTile(tile));
      button.innerHTML = `
        <span class="tile-tint"></span>
        <span class="tile-surface">${tileArt(tile)}</span>
        <span class="tile-improvement"></span>
        <span class="tile-feature"></span>
        <span class="move-dot"></span>
        <span class="edge t"></span><span class="edge r"></span>
        <span class="edge b"></span><span class="edge l"></span>
      `;
      dom.board.appendChild(button);
      row.push(button);
    }
    dom.tiles.push(row);
  }
}

function updateBoard() {
  const selected = state.selected;
  const selectedUnit = selected?.type === 'unit' ? getUnit(selected.id) : null;
  const isInteractive = state.phase === 'player' && !state.ended;

  ui.reachable = new Set();
  ui.attackable = new Set();
  if (isInteractive && selectedUnit && selectedUnit.owner === 'player') {
    if (selectedUnit.moves > 0) {
      for (const key of reachableFor(selectedUnit).keys()) ui.reachable.add(key);
      for (const target of attackTargetsFor(selectedUnit)) ui.attackable.add(tileKey(target.x, target.y));
    }
  }

  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const tile = tileAt(x, y);
      const el = dom.tiles[y][x];
      const key = tileKey(x, y);
      const city = cityAt(x, y);
      const selectedHere =
        (selected?.type === 'tile' && selected.x === x && selected.y === y) ||
        (selected?.type === 'unit' && selectedUnit?.x === x && selectedUnit?.y === y) ||
        (selected?.type === 'city' && city?.id === selected.id);
      const classes = ['tile', `t-${TERRAIN[tile.t].key}`];
      if (city) classes.push('city-tile');
      if (selectedHere) classes.push('selected');
      if (ui.reachable.has(key)) classes.push('reachable');
      if (ui.attackable.has(key)) classes.push('attackable');
      if (ui.flashing.has(key)) classes.push('flash-hit');
      el.className = classes.join(' ');
      el.setAttribute('aria-label', labelForTile(tile));

      for (const side of ['t', 'r', 'b', 'l']) {
        const edge = el.querySelector(`.edge.${side}`);
        const delta = side === 't' ? [0, -1] : side === 'r' ? [1, 0] : side === 'b' ? [0, 1] : [-1, 0];
        const neighbor = tileAt(x + delta[0], y + delta[1]);
        const show = Boolean(tile.owner) && neighbor?.owner !== tile.owner;
        edge.classList.toggle('on', show);
        if (show) edge.style.setProperty('--territory', getFaction(tile.owner).color);
      }

      const improvementEl = el.querySelector('.tile-improvement');
      if (tile.improvement) {
        improvementEl.innerHTML = icon(IMPROVEMENTS[tile.improvement].icon);
      } else {
        improvementEl.innerHTML = '';
      }
      const featureEl = el.querySelector('.tile-feature');
      if (tile.feature) {
        featureEl.innerHTML = icon(FEATURES[tile.feature].icon);
      } else {
        featureEl.innerHTML = '';
      }
    }
  }
}

function syncTokens() {
  const wanted = new Set();
  const stackByTile = new Map();
  for (const unit of state.units) {
    const key = tileKey(unit.x, unit.y);
    const list = stackByTile.get(key) || [];
    list.push(unit.id);
    stackByTile.set(key, list);
  }

  for (const city of state.cities) {
    const id = `city-${city.id}`;
    wanted.add(id);
    let el = tokenEls.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'city-token';
      el.innerHTML = `
        <svg class="city-sprite" aria-hidden="true"><use href="#i-city"></use></svg>
        <span class="city-star">${icon('crown')}</span>
        <span class="city-plate"></span>
        <span class="city-hp"><i></i></span>
      `;
      dom.tokenLayer.appendChild(el);
      tokenEls.set(id, el);
    }
    const selected = state.selected?.type === 'city' && state.selected.id === city.id;
    const cityHit = ui.flashing.has(city.id);
    const garrison = unitAt(city.x, city.y);
    el.className = `city-token ${city.owner}${selected ? ' selected' : ''}${city.capital ? ' capital' : ''}${cityHit ? ' hit' : ''}${garrison ? ' garrisoned' : ''}`;
    el.style.setProperty('--x', city.x);
    el.style.setProperty('--y', city.y);
    el.style.zIndex = String(16 + city.y * 2);
    el.querySelector('.city-plate').textContent = city.name;
    el.querySelector('.city-hp i').style.width = pct(city.hp, city.maxHp);
    el.setAttribute('title', `${city.name} · ${city.owner === 'player' ? 'Your city' : 'Cinder Court'} · Pop ${city.pop}`);
  }

  for (const unit of state.units) {
    const id = `unit-${unit.id}`;
    wanted.add(id);
    let el = tokenEls.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'unit-token';
      el.innerHTML = `
        <span class="unit-move"></span>
        <span class="unit-body">${icon(UNIT_TYPES[unit.type].icon)}</span>
        <span class="unit-strength"></span>
        <span class="unit-hp"><i></i></span>
      `;
      dom.tokenLayer.appendChild(el);
      tokenEls.set(id, el);
    }
    const selected = state.selected?.type === 'unit' && state.selected.id === unit.id;
    const spawning = ui.spawning.has(unit.id);
    const flashing = ui.flashing.has(unit.id);
    const cityHere = cityAt(unit.x, unit.y);
    const stack = stackByTile.get(tileKey(unit.x, unit.y)) || [];
    const stackIndex = Math.max(0, stack.indexOf(unit.id));
    const stacked = Boolean(cityHere) || stack.length > 1;
    let ox = cityHere ? 34 : 0;
    let oy = cityHere ? 24 : 0;
    if (stackIndex > 0) {
      ox += (stackIndex % 2 === 1 ? 20 : -8);
      oy += stackIndex * 13;
    }
    el.className = `unit-token ${unit.owner}${selected ? ' selected' : ''}${unit.fortified ? ' fortified' : ''}${spawning ? ' spawning' : ''}${flashing ? ' hit' : ''}${stacked ? ' stacked' : ''}`;
    el.style.setProperty('--x', unit.x);
    el.style.setProperty('--y', unit.y);
    el.style.setProperty('--ox', `${ox}%`);
    el.style.setProperty('--oy', `${oy}%`);
    el.style.zIndex = String(24 + unit.y * 2 + (selected ? 10 : 0));
    el.querySelector('.unit-body').innerHTML = icon(UNIT_TYPES[unit.type].icon);
    el.querySelector('.unit-hp i').style.width = pct(unit.hp, unit.maxHp);
    el.querySelector('.unit-strength').textContent = String(unitStrength(unit));
    const pips = [];
    for (let i = 0; i < unit.maxMoves; i += 1) {
      pips.push(`<i class="${i >= unit.moves ? 'spent' : ''}"></i>`);
    }
    el.querySelector('.unit-move').innerHTML = pips.join('');
    el.setAttribute('title', `${UNIT_TYPES[unit.type].name} · ${unit.hp}/${unit.maxHp} HP`);
    if (spawning && !el.dataset.spawnTimer) {
      el.dataset.spawnTimer = '1';
      window.setTimeout(() => {
        ui.spawning.delete(unit.id);
        el.classList.remove('spawning');
        delete el.dataset.spawnTimer;
      }, 620);
    }
  }

  for (const [id, el] of tokenEls) {
    if (!wanted.has(id)) {
      el.remove();
      tokenEls.delete(id);
    }
  }
}

function renderTopbar() {
  const faction = getFaction('player');
  const yields = factionYields('player');
  const score = calcLegacy('player');
  const research = currentResearch(faction);
  const progress = research ? researchProgress(faction, research) : 0;
  dom.goldValue.textContent = String(faction.gold);
  dom.goldRate.textContent = `+${yields.gold}`;
  dom.scienceValue.textContent = research ? String(progress) : '—';
  dom.scienceRate.textContent = `+${yields.science}`;
  dom.legacyValue.textContent = String(score.total);
  dom.turnValue.textContent = padTurn(state.turn);
  dom.turnProgress.style.width = pct(state.turn, state.maxTurns);
  dom.endTurnBtn.disabled = state.phase !== 'player' || state.ended;
  dom.endTurnBtn.classList.toggle('finish', state.turn >= state.maxTurns);
  const label = state.ended ? 'Chronicle Closed' : state.phase === 'ai' ? 'Their Move' : state.turn >= state.maxTurns ? 'Finish Reign' : 'End Turn';
  dom.endTurnBtn.querySelector('span').textContent = label;
  dom.endTurnBtn.setAttribute('aria-label', label);
  dom.endTurnBtn.title = label;
  dom.soundBtn.innerHTML = icon(ui.sound ? 'sound' : 'muted');
  dom.soundBtn.setAttribute('aria-label', ui.sound ? 'Mute sound' : 'Enable sound');
  dom.soundBtn.setAttribute('title', ui.sound ? 'Mute sound' : 'Enable sound');
}

function renderLeftPanel() {
  const player = calcLegacy('player');
  const rival = calcLegacy('ai');
  const delta = player.total - rival.total;
  dom.leftLegacy.textContent = String(player.total);
  dom.playerLegacySmall.textContent = String(player.total);
  dom.rivalLegacySmall.textContent = String(rival.total);
  dom.legacyDelta.textContent = delta === 0 ? 'Neck and neck' : delta > 0 ? `Ahead by ${delta}` : `Behind by ${Math.abs(delta)}`;
  dom.legacyDelta.classList.toggle('behind', delta < 0);
  const scale = Math.max(80, player.total, rival.total);
  dom.playerRaceBar.style.width = pct(player.total, scale);
  dom.rivalRaceBar.style.width = pct(rival.total, scale);

  const ledger = [
    ['People', player.pop],
    ['Land', player.tiles],
    ['Lore', player.techs],
    ['Works', player.buildings],
    ['Host', player.units]
  ];
  dom.legacyLedger.innerHTML = ledger.map(([label, value]) =>
    `<div class="ledger-cell" title="${label}: ${value} legacy"><small>${label}</small><strong>${value}</strong></div>`
  ).join('');

  const cityRows = [...citiesOf('player'), ...citiesOf('ai')];
  dom.cityCount.textContent = `${cityRows.length} ${cityRows.length === 1 ? 'city' : 'cities'}`;
  dom.cityList.innerHTML = cityRows.map(city => {
    const owner = getFaction(city.owner);
    const selected = state.selected?.type === 'city' && state.selected.id === city.id;
    const tiles = ownedTiles(city).length;
    return `<div class="city-row${selected ? ' selected' : ''}" data-city="${city.id}" role="button" tabindex="0">
      <span class="city-sigil ${city.owner}">${icon('city')}</span>
      <span class="city-copy"><strong>${city.name}</strong><small>${city.capital ? 'Capital' : 'City'} · ${tiles} tiles</small></span>
      <span class="city-pop">${city.pop}</span>
    </div>`;
  }).join('');

  const faction = getFaction('player');
  const techId = currentResearch(faction);
  if (techId) {
    const tech = TECHS[techId];
    const progress = researchProgress(faction, techId);
    dom.researchCurrent.innerHTML = `
      <span class="research-icon">${icon(tech.icon)}</span>
      <span class="research-copy"><strong>${tech.name}</strong><small>${tech.effect} · ${tech.unlock}</small></span>
    `;
    dom.researchBar.style.width = pct(progress, tech.cost);
    const turns = researchTurns(faction);
    dom.researchTurns.textContent = turns ? `${turns} ${turns === 1 ? 'turn' : 'turns'} · ${progress}/${tech.cost}` : `${progress}/${tech.cost}`;
    dom.researchNext.hidden = true;
  } else {
    const next = nextResearch(faction);
    dom.researchCurrent.innerHTML = `
      <span class="research-icon">${icon(next ? TECHS[next].icon : 'scroll')}</span>
      <span class="research-copy"><strong>${next ? 'Choose a discovery' : 'The archive is complete'}</strong><small>${next ? `Next: ${TECHS[next].name}` : 'Every known art has been mastered'}</small></span>
    `;
    dom.researchBar.style.width = '0%';
    dom.researchTurns.textContent = next ? 'Awaiting scholars' : 'All discoveries made';
    dom.researchNext.hidden = !next;
    if (next) dom.researchNext.textContent = `Begin ${TECHS[next].name} →`;
  }
  dom.researchTechCount.textContent = `${faction.techs.length} ${faction.techs.length === 1 ? 'discovery' : 'discoveries'}`;

  const logs = state.logs.slice(0, 8);
  dom.chronicleCount.textContent = `Turn ${padTurn(state.turn)}`;
  dom.chronicleList.innerHTML = logs.length
    ? logs.map(log => `<div class="log-item ${log.type}"><span class="log-turn">T${padTurn(log.turn)}</span><span class="log-copy">${log.html}</span></div>`).join('')
    : '<div class="log-item empty">The chronicle is still blank. Your first decision will be written here.</div>';
}

function renderHint() {
  dom.boardEra.textContent = ERA_NAMES[Math.min(ERA_NAMES.length - 1, Math.floor((state.turn - 1) / 5))];
  dom.boardTurn.textContent = `TURN ${padTurn(state.turn)}`;
  const selected = state.selected;
  let text = 'Choose production in Sunfall, then end your turn.';
  if (state.ended) {
    text = 'The chronicle has closed. Your legacy is written.';
  } else if (state.phase === 'ai') {
    text = 'The <b>Cinder Court</b> is moving. Watch the red banners.';
  } else if (selected?.type === 'city') {
    const city = getCity(selected.id);
    if (city?.owner === 'player') {
      const item = PRODUCTION_DEFS[city.prodItem];
      text = `<b>${city.name}</b> is growing. Producing <b>${item.name}</b> · choose a different project or end your turn.`;
    } else if (city) {
      text = `<b>${city.name}</b> is a rival stronghold. Select a warrior beside it to attack.`;
    }
  } else if (selected?.type === 'unit') {
    const unit = getUnit(selected.id);
    if (unit?.owner === 'player') {
      const targets = attackTargetsFor(unit);
      if (targets.length) {
        text = '<b>Enemy in reach.</b> Click a red tile to attack, or move a highlighted unit.';
      } else if (unit.moves > 0) {
        text = `<b>${UNIT_TYPES[unit.type].name}</b> selected · ${unit.moves} ${unit.moves === 1 ? 'move' : 'moves'} left. Click a highlighted tile.`;
      } else {
        text = `<b>${UNIT_TYPES[unit.type].name}</b> has no moves left. End your turn to refresh.`;
      }
    } else if (unit) {
      text = `<b>${UNIT_TYPES[unit.type].name}</b> of the Cinder Court. Its red banner marks a threat.`;
    }
  } else if (selected?.type === 'tile') {
    const tile = tileAt(selected.x, selected.y);
    if (tile && !tile.owner && TERRAIN[tile.t].land && adjacentToFaction(tile.x, tile.y, 'player')) {
      text = `Open land at <b>${formatCoord(tile.x, tile.y)}</b>. Claim it with gold to widen your realm.`;
    } else if (tile?.owner === 'player') {
      text = `Your land at <b>${formatCoord(tile.x, tile.y)}</b>. A worker can improve it.`;
    } else {
      text = 'Click a tile to inspect it, or select one of your units.';
    }
  }
  dom.hintText.innerHTML = text;
}

function renderContext() {
  const panel = dom.contextPanel;
  const scrollEl = panel.querySelector('.ctx-scroll');
  const scroll = scrollEl ? scrollEl.scrollTop : 0;
  const selected = state.selected;
  let html = '';

  if (selected?.type === 'city') {
    const city = getCity(selected.id);
    if (city) html = cityContextHTML(city);
  }
  if (!html && selected?.type === 'unit') {
    const unit = getUnit(selected.id);
    if (unit) html = unitContextHTML(unit);
  }
  if (!html && selected?.type === 'tile') {
    const tile = tileAt(selected.x, selected.y);
    if (tile) html = tileContextHTML(tile);
  }
  if (!html) {
    const capital = playerSeat();
    if (capital) {
      state.selected = { type: 'city', id: capital.id };
      html = cityContextHTML(capital);
    }
  }
  const notes = (!state.ended && citiesOf('player').length) ? advisorHTML() : '';
  panel.innerHTML = `<div class="ctx-scroll">${html}</div>${notes}`;
  const nextScroll = panel.querySelector('.ctx-scroll');
  if (nextScroll) nextScroll.scrollTop = scroll;
}

function advisorHTML() {
  const player = calcLegacy('player');
  const rival = calcLegacy('ai');
  const faction = getFaction('player');
  const delta = player.total - rival.total;
  const notes = [];
  const fighters = unitsOf('player').filter(canFight);
  const enemyFighters = unitsOf('ai').filter(canFight);
  const cost = claimCost();
  const techId = currentResearch(faction);
  const tech = techId ? TECHS[techId] : null;
  const turns = tech ? researchTurns(faction) : null;

  if (delta < 0) {
    notes.push(`<b>Cinderhold leads by ${Math.abs(delta)} legacy.</b> Population and claimed land are the fastest ways to close the gap.`);
  } else if (delta === 0) {
    notes.push('<b>The realms are level.</b> One discovery or a few claimed tiles can break the tie.');
  } else {
    notes.push(`<b>You lead by ${delta} legacy.</b> Hold the frontier and keep the Cinder banners at arm's length.`);
  }

  if (state.turn >= 4 && fighters.length < 2) {
    notes.push(`Only <b>${fighters.length} fighter${fighters.length === 1 ? '' : 's'}</b> guard the Reach. Raise a warrior before the Cinder Court marches.`);
  } else if (enemyFighters.length > fighters.length && state.turn >= 6) {
    notes.push(`The Cinder Court fields <b>${enemyFighters.length} fighters</b> to your ${fighters.length}. Fortify forest and hill tiles for extra defence.`);
  } else if (state.turn >= 6 && enemyFighters.length) {
    notes.push(`Cinder banners are on the move. Keep a fighter beside <b>Sunfall</b> and use hills or forests as shields.`);
  }

  if (faction.gold >= cost) {
    notes.push(`You hold <b>${faction.gold} gold</b>; a frontier tile costs ${cost}. Claiming land adds legacy and feeds a nearby city.`);
  } else if (tech) {
    notes.push(`Scholars need <b>${turns || '—'} ${turns === 1 ? 'turn' : 'turns'}</b> to master ${tech.name}. Libraries and mountain tiles add science.`);
  }

  if (notes.length < 3) {
    const worker = unitsOf('player').find(unit => unit.type === 'worker');
    if (worker) {
      const tile = tileAt(worker.x, worker.y);
      const improvement = tile ? improvementForTile(tile) : null;
      if (tile?.owner === 'player' && improvement && canImproveTile(tile, 'player')) {
        notes.push(`Your worker can raise a <b>${IMPROVEMENTS[improvement].name}</b> at ${formatCoord(tile.x, tile.y)} for a lasting yield bonus.`);
      }
    }
  }
  if (notes.length < 3) {
    const ready = unitsOf('player').filter(unit => unit.moves > 0).length;
    if (ready) notes.push(`<b>${ready} unit${ready === 1 ? '' : 's'}</b> still ${ready === 1 ? 'has' : 'have'} orders this turn. Unused moves are lost when the turn ends.`);
  }
  if (!notes.length) notes.push('The map is quiet. Grow a city, deepen your research, and prepare for the final years.');

  return `<div class="ctx-card notes-card">
    <div class="notes-head">
      <span class="notes-icon">${icon('compass')}</span>
      <div class="notes-head-copy"><small>Field notes</small><strong>Advisor's counsel</strong></div>
    </div>
    <ul class="notes-list">${notes.slice(0, 2).map(note => `<li>${note}</li>`).join('')}</ul>
    <div class="notes-foot"><span>Turn ${padTurn(state.turn)} · ${state.maxTurns - state.turn + 1} left</span><em>${FACTIONS[faction.id]?.motto || ''}</em></div>
  </div>`;
}

function cityContextHTML(city) {
  const isPlayer = city.owner === 'player';
  const faction = getFaction(city.owner);
  const y = cityYields(city);
  const item = PRODUCTION_DEFS[city.prodItem] ? city.prodItem : 'warrior';
  const def = PRODUCTION_DEFS[item];
  const cost = productionCost(item);
  const remaining = Math.max(0, cost - city.prod);
  const turns = isPlayer ? productionTurns(city, item) : '?';
  const popLabel = `${city.capital ? 'Capital' : 'City'} · Population ${city.pop}${city.buildings.includes('palace') ? ' · Palace of Dawn' : ''}`;

  let html = `<div class="ctx-card">
    <div class="ctx-head${isPlayer ? '' : ' rival-head'}">
      <span class="ctx-sigil${isPlayer ? '' : ' rival'}">${icon('city')}</span>
      <div class="ctx-head-copy">
        <div class="ctx-eyebrow">${isPlayer ? 'Your city' : 'Rival stronghold'} · ${city.capital ? 'Capital' : 'Settlement'}</div>
        <h2>${city.name}</h2>
        <p>${popLabel} · ${ownedTiles(city).length} tiles</p>
      </div>
      <span class="ctx-badge${isPlayer ? '' : ' rival'}">${isPlayer ? 'Yours' : 'Cinder'}</span>
    </div>
    <div class="ctx-body">
      <div class="hp-line${isPlayer ? '' : ' rival'}"><span>City HP</span><span class="progress-track"><i style="width:${pct(city.hp, city.maxHp)}"></i></span><b>${city.hp}/${city.maxHp}</b></div>
      <div class="yield-grid">
        <div class="yield-cell food"><small>Food</small><strong>${y.food}</strong><em>${y.surplus >= 0 ? '+' : ''}${y.surplus} surplus</em></div>
        <div class="yield-cell prod"><small>Prod</small><strong>${y.prod}</strong><em>per turn</em></div>
        <div class="yield-cell gold"><small>Gold</small><strong>${y.gold}</strong><em>per turn</em></div>
        <div class="yield-cell science"><small>Science</small><strong>${y.science}</strong><em>per turn</em></div>
      </div>`;

  if (isPlayer) {
    html += `<div class="growth-block">
      <div class="growth-top"><span>Growth to population ${city.pop + 1}</span><b>${city.food}/${y.threshold} food <span class="${y.surplus > 0 ? 'good' : 'bad'}">${y.surplus >= 0 ? '+' : ''}${y.surplus}/turn</span></b></div>
      <div class="progress-track growth"><i style="width:${pct(city.food, y.threshold)}"></i></div>
    </div>
    <div class="production-box${remaining === 0 ? ' done' : ''}">
      <div class="production-top">
        <span class="production-icon">${icon(def.icon)}</span>
        <span class="production-copy"><small>In production</small><strong>${def.name}</strong></span>
        <span class="production-turns">${turns === '∞' ? 'stalled' : `${turns} ${turns === 1 ? 'turn' : 'turns'}`}</span>
      </div>
      <div class="progress-track"><i style="width:${pct(city.prod, cost)}"></i></div>
      <div class="prod-detail"><span>${city.prod} / ${cost} production</span><span>${isBuilding(item) ? def.effect : `${def.strength} strength · ${def.moves} moves`}</span></div>
    </div>
    <div class="ctx-subhead"><span>Choose a project</span><b>${y.prod} per turn</b></div>
    <div class="build-grid">
      ${BUILD_ORDER.map(buildId => buildCard(city, buildId)).join('')}
    </div>
    <p class="build-note">Production carries over when you switch projects. Units appear beside the city when complete.</p>
    <div class="ctx-hint">Tip: <b>Workers</b> improve owned tiles. Select a worker, then use the build action for the tile beneath it.</div>`;
  } else {
    const garrison = unitAt(city.x, city.y);
    const attackUnits = state.units.filter(unit =>
      unit.owner === 'player' && canFight(unit) && unit.moves > 0 && isAdjacent(unit.x, unit.y, city.x, city.y)
    );
    html += `<div class="rival-summary">
      <div class="identity-line rival"><span class="dot"></span><span>${faction.name}</span><b>${cityDefence(city)} defence</b></div>
      A rival stronghold of <b>${city.pop}</b> people. Its storehouses and walls are hidden from your spies.
      ${garrison ? ` A <b>${UNIT_TYPES[garrison.type].name}</b> is garrisoned here.` : ' No garrison is visible.'}
    </div>
    <div class="unit-stats">
      <div class="unit-stat"><small>Defence</small><strong>${cityDefence(city)}</strong></div>
      <div class="unit-stat"><small>City HP</small><strong>${city.hp}<span>/${city.maxHp}</span></strong></div>
      <div class="unit-stat"><small>Garrison</small><strong>${garrison ? UNIT_TYPES[garrison.type].name : '—'}</strong></div>
    </div>
    <div class="ctx-subhead"><span>Your forces in reach</span><b>${attackUnits.length || 0}</b></div>
    <div class="action-list">
      ${attackUnits.length ? attackUnits.map(unit => `<button class="action-btn danger wide" data-action="attack-city" data-target="${city.id}" data-unit="${unit.id}">${icon('sword')} Attack with ${UNIT_TYPES[unit.type].name}</button>`).join('') : `<div class="ctx-note">No warrior is adjacent with moves remaining. Move a fighter beside the city to begin a siege.</div>`}
    </div>
    <div class="ctx-hint">A city falls when its <b>HP reaches zero</b>. Attackers take a little damage from the walls each turn.</div>`;
  }

  html += `</div></div>`;
  return html;
}

function buildCard(city, itemId) {
  const def = PRODUCTION_DEFS[itemId];
  const lock = productionLock(city, itemId);
  const disabled = Boolean(lock);
  const active = city.prodItem === itemId;
  const cost = productionCost(itemId);
  const turns = productionTurns(city, itemId);
  const small = isBuilding(itemId) ? def.effect : `${def.strength} str · ${turns} ${turns === 1 ? 'turn' : 'turns'}`;
  return `<button class="build-card${active ? ' active' : ''}" data-action="produce" data-item="${itemId}" ${disabled ? 'disabled' : ''} title="${def.note}">
    <span class="build-icon">${icon(def.icon)}</span>
    <span class="build-info"><strong>${def.name}</strong><small>${lock || small}</small></span>
    <span class="build-cost">${cost}</span>
    ${lock ? `<span class="lock">${lock === 'Built' ? 'built' : 'locked'}</span>` : ''}
  </button>`;
}

function unitContextHTML(unit) {
  const isPlayer = unit.owner === 'player';
  const def = UNIT_TYPES[unit.type];
  const tile = tileAt(unit.x, unit.y);
  const terrain = TERRAIN[tile.t];
  const faction = getFaction(unit.owner);
  const targets = isPlayer ? attackTargetsFor(unit) : [];
  const found = isPlayer ? canFoundCity(unit) : { ok: false, why: '' };
  const improvement = improvementForTile(tile);
  const canImprove = isPlayer && canImproveTile(tile, 'player');
  const y = tileYields(tile);
  const status = unit.moves > 0 ? 'Ready' : 'Spent';
  let actions = '';

  if (isPlayer) {
    if (targets.length) {
      actions += targets.map(target => {
        if (target.type === 'unit') {
          const enemy = getUnit(target.id);
          return `<button class="action-btn danger wide" data-action="attack-unit" data-target="${target.id}" data-unit="${unit.id}">${icon('sword')} Attack ${UNIT_TYPES[enemy.type].name} at ${formatCoord(target.x, target.y)}</button>`;
        }
        const city = getCity(target.id);
        return `<button class="action-btn danger wide" data-action="attack-city" data-target="${target.id}" data-unit="${unit.id}">${icon('sword')} Attack ${city.name}</button>`;
      }).join('');
    }
    if (unit.type === 'settler') {
      actions += `<button class="action-btn primary wide" data-action="found-city" data-unit="${unit.id}" ${found.ok ? '' : 'disabled'}>${icon('flag')} Found a new city</button>`;
      if (!found.ok) actions += `<div class="ctx-note wide">${found.why}</div>`;
    }
    if (unit.type === 'worker') {
      if (canImprove) {
        actions += `<button class="action-btn primary wide" data-action="improve" data-unit="${unit.id}">${icon(IMPROVEMENTS[improvement].icon)} Build ${IMPROVEMENTS[improvement].name} (${IMPROVEMENTS[improvement].note.replace('+', '+ ')})</button>`;
      } else if (tile.owner !== 'player') {
        actions += `<div class="ctx-note wide">This tile is unclaimed. Claim it first, then improve it.</div>`;
      } else if (tile.improvement) {
        actions += `<div class="ctx-note wide">This tile already has a ${IMPROVEMENTS[tile.improvement].name.toLowerCase()}.</div>`;
      } else {
        actions += `<div class="ctx-note wide">This terrain cannot be improved. Move to a farm, forest, or hill tile you own.</div>`;
      }
    }
    if (canFight(unit)) {
      if (!unit.fortified) actions += `<button class="action-btn" data-action="fortify" data-unit="${unit.id}">${icon('shield')} Fortify</button>`;
      actions += `<button class="action-btn" data-action="rest" data-unit="${unit.id}">${icon('spark')} Rest & heal</button>`;
    } else if (unit.type !== 'worker' && unit.type !== 'settler') {
      actions += `<button class="action-btn" data-action="rest" data-unit="${unit.id}">${icon('spark')} Rest & heal</button>`;
    }
    if (!actions) actions = '<div class="ctx-note wide">This unit has no actions left this turn.</div>';
  } else {
    actions = `<div class="ctx-note wide">This unit belongs to the <b>${faction.name}</b>. It will act on the rival turn.</div>`;
  }

  return `<div class="ctx-card">
    <div class="ctx-head${isPlayer ? '' : ' rival-head'}">
      <span class="ctx-sigil unit${isPlayer ? '' : ' rival'}">${icon(def.icon)}</span>
      <div class="ctx-head-copy">
        <div class="ctx-eyebrow">${isPlayer ? 'Your unit' : 'Rival unit'} · ${formatCoord(unit.x, unit.y)}</div>
        <h2>${def.name}</h2>
        <p>${terrain.name}${unit.fortified ? ' · fortified' : ''} · ${status}</p>
      </div>
      <span class="ctx-badge${isPlayer ? '' : ' rival'}">${isPlayer ? 'Yours' : 'Cinder'}</span>
    </div>
    <div class="ctx-body">
      <div class="unit-stats">
        <div class="unit-stat"><small>Strength</small><strong>${unitStrength(unit)}</strong></div>
        <div class="unit-stat"><small>Hit points</small><strong>${unit.hp}<span>/${unit.maxHp}</span></strong></div>
        <div class="unit-stat"><small>Moves</small><strong>${unit.moves}<span>/${unit.maxMoves}</span></strong></div>
      </div>
      <div class="pill-row">
        <span class="pill good">${terrain.name}</span>
        <span class="pill">${getFaction(unit.owner).techs.includes('bronze') ? '+2 bronze' : 'stone age'}</span>
        ${unit.fortified ? '<span class="pill good">+4 fortified</span>' : ''}
        ${unit.moves <= 0 ? '<span class="pill warn">No moves left</span>' : ''}
      </div>
      <div class="terrain-card">
        <div class="terrain-thumb t-${terrain.key}"><div class="tile-tint"></div>${tileArt(tile)}</div>
        <div class="terrain-copy"><strong>${terrain.name}</strong><small>${formatCoord(tile.x, tile.y)} · ${tile.owner ? getFaction(tile.owner).short : 'Unclaimed'}</small>
          <div class="terrain-yields">${yieldPills(tile)}</div>
        </div>
      </div>
      <div class="ctx-subhead"><span>Orders</span><b>${def.role === 'worker' ? 'Improve the land' : def.role === 'settler' ? 'Found a city' : 'Move or fight'}</b></div>
      <div class="action-list">${actions}</div>
      <div class="ctx-hint">${def.note}</div>
    </div>
  </div>`;
}

function tileContextHTML(tile) {
  const terrain = TERRAIN[tile.t];
  const y = tileYields(tile);
  const owner = tile.owner ? getFaction(tile.owner) : null;
  const feature = tile.feature ? FEATURES[tile.feature] : null;
  const improvement = tile.improvement ? IMPROVEMENTS[tile.improvement] : null;
  const canClaim = !tile.owner && terrain.land && adjacentToFaction(tile.x, tile.y, 'player');
  const cost = claimCost();
  const affordable = getFaction('player').gold >= cost;
  const city = cityAt(tile.x, tile.y);
  const unit = unitAt(tile.x, tile.y);
  let info = '';

  if (feature) info += `<div class="ctx-note"><strong>${feature.name}.</strong> ${feature.note} Reward: ${feature.reward.gold ? `+${feature.reward.gold} gold` : ''}${feature.reward.science ? `${feature.reward.gold ? ' · ' : ''}+${feature.reward.science} science` : ''}.</div>`;
  if (improvement) info += `<div class="ctx-note"><strong>${improvement.name}.</strong> ${improvement.note}</div>`;
  if (terrain.key === 'mountain') info += '<div class="ctx-note">Impassable. Mountains still add a little science to a city that owns them.</div>';
  if (terrain.key === 'ocean' || terrain.key === 'coast') info += '<div class="ctx-note">Water is impassable in this age. There are no ships yet.</div>';

  return `<div class="ctx-card">
    <div class="ctx-head">
      <span class="ctx-sigil">${icon('flag')}</span>
      <div class="ctx-head-copy">
        <div class="ctx-eyebrow">${owner ? `${owner.short} territory` : 'Unclaimed land'} · ${formatCoord(tile.x, tile.y)}</div>
        <h2>${terrain.name}</h2>
        <p>${feature ? feature.name : improvement ? improvement.name : city ? city.name : terrain.note}</p>
      </div>
    </div>
    <div class="ctx-body">
      <div class="terrain-card">
        <div class="terrain-thumb t-${terrain.key}"><div class="tile-tint"></div>${tileArt(tile)}</div>
        <div class="terrain-copy"><strong>${terrain.name}</strong><small>${formatCoord(tile.x, tile.y)} · ${owner ? owner.name : 'Neutral'}</small>
          <div class="terrain-yields">${yieldPills(tile)}</div>
        </div>
      </div>
      ${unit ? `<div class="ctx-subhead"><span>Unit present</span><b>${UNIT_TYPES[unit.type].name}</b></div>` : ''}
      ${city ? `<div class="ctx-subhead"><span>City</span><b>${city.name}</b></div>` : ''}
      <div class="action-list">
        ${canClaim ? `<button class="action-btn gold wide" data-action="claim" data-x="${tile.x}" data-y="${tile.y}" ${affordable ? '' : 'disabled'}>${icon('flag')} Claim this tile · ${cost} gold</button>` : ''}
        ${tile.owner === 'player' && improvement && !tile.improvement ? `<div class="ctx-note wide">A worker can build a <b>${IMPROVEMENTS[improvement].name}</b> here.</div>` : ''}
        ${!canClaim && !tile.owner && !terrain.land ? '<div class="ctx-note wide">Water cannot be claimed in this age.</div>' : ''}
        ${!canClaim && !tile.owner && terrain.land && !adjacentToFaction(tile.x, tile.y, 'player') ? '<div class="ctx-note wide">Claim land adjacent to your borders first.</div>' : ''}
      </div>
      ${info}
      <div class="ctx-hint">Terrain yields feed the nearest city that owns the tile. Improvements make a tile stronger.</div>
    </div>
  </div>`;
}

function yieldPills(tile) {
  const y = tileYields(tile);
  return `<span class="food">${y.food} food</span><span class="prod">${y.prod} prod</span><span class="gold">${y.gold} gold</span>${y.science ? `<span class="science">${y.science} science</span>` : ''}`;
}

function renderAll() {
  renderTopbar();
  renderLeftPanel();
  updateBoard();
  syncTokens();
  renderContext();
  renderHint();
}

function tileTooltipHTML(tile) {
  const terrain = TERRAIN[tile.t];
  const city = cityAt(tile.x, tile.y);
  const unit = unitAt(tile.x, tile.y);
  const owner = tile.owner ? getFaction(tile.owner) : null;
  const feature = tile.feature ? FEATURES[tile.feature] : null;
  const improvement = tile.improvement ? IMPROVEMENTS[tile.improvement] : null;
  const y = tileYields(tile);
  return `
    <div class="tt-title">${terrain.name}<span>${formatCoord(tile.x, tile.y)}</span></div>
    <div class="tt-yields"><span class="food">${y.food} food</span><span class="prod">${y.prod} prod</span><span class="gold">${y.gold} gold</span>${y.science ? `<span class="science">${y.science} science</span>` : ''}</div>
    ${improvement ? `<div class="tt-extra">${improvement.name} · ${improvement.note}</div>` : ''}
    ${feature ? `<div class="tt-extra">${feature.name} · enter to claim</div>` : ''}
    ${city ? `<div class="tt-owner">${city.name} · ${city.owner === 'player' ? 'your city' : 'Cinder Court'} · ${city.pop} pop</div>` : ''}
    ${unit ? `<div class="tt-owner">${UNIT_TYPES[unit.type].name} · ${unit.hp}/${unit.maxHp} HP · ${unit.owner === 'player' ? 'yours' : 'Cinder Court'}</div>` : ''}
    ${owner ? `<div class="tt-owner">${owner.name}</div>` : '<div class="tt-extra">Unclaimed land</div>'}
  `;
}

function positionTooltip(event) {
  if (dom.tooltip.hidden) return;
  const pad = 14;
  const width = dom.tooltip.offsetWidth;
  const height = dom.tooltip.offsetHeight;
  let left = event.clientX + 17;
  let top = event.clientY + 17;
  if (left + width > window.innerWidth - 8) left = event.clientX - width - 17;
  if (top + height > window.innerHeight - 8) top = event.clientY - height - 17;
  dom.tooltip.style.left = `${Math.max(8, left)}px`;
  dom.tooltip.style.top = `${Math.max(8, top)}px`;
}

function openModal(html) {
  dom.modalCard.innerHTML = html;
  dom.modal.hidden = false;
  ui.modalOpen = true;
  const close = dom.modalCard.querySelector('[data-close]');
  if (close) close.focus({ preventScroll: true });
}

function closeModal() {
  dom.modal.hidden = true;
  ui.modalOpen = false;
  dom.modalCard.innerHTML = '';
}

function researchModalHTML() {
  const faction = getFaction('player');
  const current = currentResearch(faction);
  const rows = TECH_ORDER.map(id => {
    const tech = TECHS[id];
    const done = faction.techs.includes(id);
    const active = current === id;
    const progress = researchProgress(faction, id);
    return `<button class="tech-row${active ? ' current' : ''}${done ? ' done' : ''}" data-tech="${id}" ${done ? 'disabled' : ''}>
      <span class="tech-icon">${icon(tech.icon)}</span>
      <span class="tech-copy"><strong>${tech.name}</strong><small>${tech.effect}</small><em>Unlocks ${tech.unlock}</em></span>
      <span class="tech-cost"><b>${done ? '✓' : tech.cost}</b><span>${done ? 'known' : active ? `${progress} science` : 'science'}</span></span>
    </button>`;
  }).join('');
  return `<div class="modal-head">
    <div><div class="modal-eyebrow">The scholars' hall</div><h2 id="modalTitle">Choose a discovery</h2><p>Science from every city feeds one shared research project. Switch freely; progress is kept.</p></div>
    <button class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="tech-list">${rows}</div>
  <div class="modal-foot"><button class="modal-btn" data-close>Close</button></div>`;
}

function helpModalHTML() {
  return `<div class="modal-head">
    <div><div class="modal-eyebrow">A tiny field guide</div><h2 id="modalTitle">Rule a small world</h2><p>Twenty turns. One rival. Every tile matters.</p></div>
    <button class="modal-close" data-close aria-label="Close">${icon('close')}</button>
  </div>
  <div class="help-grid">
    <div class="help-step"><b><i>1</i> Expand</b><p>Select a unit, then click a highlighted tile to move. Settlers found cities. Workers farm, mine, and trap furs on land you own.</p></div>
    <div class="help-step"><b><i>2</i> Build</b><p>Choose a project in a city. Food grows population, production finishes the project, and borders spread when a city grows.</p></div>
    <div class="help-step"><b><i>3</i> Discover</b><p>Science accumulates toward the research you choose. Each discovery strengthens every city or unlocks new options.</p></div>
    <div class="help-step"><b><i>4</i> Fight</b><p>Move a warrior beside an enemy and click the red tile. Cities fall when their HP reaches zero. Terrain and fortifying add defence.</p></div>
    <div class="help-step"><b><i>5</i> Claim</b><p>Gold can buy an unclaimed tile beside your borders. Ruins and villages reward the first unit to enter them.</p></div>
    <div class="help-step"><b><i>6</i> Win</b><p>When turn 20 ends, the highest Legacy score wins. Legacy comes from people, land, discoveries, buildings, and soldiers. You can also capture Cinderhold.</p></div>
  </div>
  <div class="help-tips"><b>Shortcuts:</b> press <b>E</b> to end the turn, <b>?</b> for this guide, and <b>Esc</b> to close a window. On touch, tap a tile once to select it and again to act.</div>
  <div class="modal-foot"><button class="modal-btn primary" data-close>To the map</button></div>`;
}

function renderEndScreen() {
  const p = calcLegacy('player');
  const a = calcLegacy('ai');
  const reason = state.endReason || 'time';
  let won = false;
  let tie = false;
  let title = 'The Chronicle Closes';
  let subtitle = 'Twenty turns pass. The world remembers what you built.';
  let eyebrow = `Turn ${state.turn} · legacy`;

  if (reason === 'conquest') {
    won = true;
    title = 'The Cinder Court Falls';
    subtitle = 'Cinderhold is yours. The tiny world answers to a single banner — for now.';
    eyebrow = 'Conquest · total victory';
  } else if (reason === 'defeat') {
    won = false;
    title = 'Sunfall Has Fallen';
    subtitle = 'Your last city opens its gates to the Cinder Court. The chronicle ends in ash.';
    eyebrow = 'Defeat · the realm is lost';
  } else if (p.total > a.total) {
    won = true;
    title = 'A New Age Dawns';
    subtitle = 'The Sunfall Reach stands tallest when the chronicle closes. Your legacy outlives the turn.';
  } else if (p.total < a.total) {
    won = false;
    title = 'The Cinder Banner Rises';
    subtitle = 'Cinderhold ends the age ahead. There will be another world, and another twenty turns.';
  } else {
    won = false;
    tie = true;
    title = 'A Shared Horizon';
    subtitle = 'Two tiny realms end the age in perfect balance. History will argue about who really won.';
  }

  dom.endCard.innerHTML = `
    <div class="end-crown">${icon(won ? 'crown' : 'flame')}</div>
    <div class="eyebrow">${eyebrow}</div>
    <h2>${title}</h2>
    <p class="end-sub">${subtitle}</p>
    <div class="end-score-duel">
      <div class="end-side${won ? ' winner' : ''}">
        <div class="name"><b>Sunfall Reach</b><span>You</span></div>
        <div class="score">${p.total} <small>LEGACY</small></div>
        ${tie ? '<span class="tag">Level</span>' : won ? '<span class="tag">Victorious</span>' : '<span class="tag">Challenger</span>'}
      </div>
      <div class="end-side${!won && !tie ? ' winner' : ''}">
        <div class="name"><b>Cinder Court</b><span>Rival</span></div>
        <div class="score">${a.total} <small>LEGACY</small></div>
        ${tie ? '<span class="tag">Level</span>' : !won ? '<span class="tag">Victorious</span>' : '<span class="tag">Challenger</span>'}
      </div>
    </div>
    <div class="end-breakdown">
      <div class="end-stat"><small>Population</small><strong>${p.pop}</strong></div>
      <div class="end-stat"><small>Territory</small><strong>${p.tiles}</strong></div>
      <div class="end-stat"><small>Discoveries</small><strong>${p.techs}</strong></div>
      <div class="end-stat"><small>Buildings</small><strong>${p.buildings}</strong></div>
      <div class="end-stat"><small>Soldiers</small><strong>${p.units}</strong></div>
      <div class="end-stat"><small>Treasure</small><strong>${p.gold}</strong></div>
    </div>
    <button class="end-btn" data-replay>Play another twenty turns</button>
  `;
  dom.endOverlay.hidden = false;
}
