/* --------------------------------------------------------------------------
   Pocket Empire — boot and input
   -------------------------------------------------------------------------- */

function hideTooltip() {
  dom.tooltip.hidden = true;
  ui.hoverKey = null;
}

function showTooltipFor(event) {
  if (event.pointerType === 'touch') return;
  const target = event.target.closest('.tile');
  if (!target) {
    hideTooltip();
    return;
  }
  const x = Number(target.dataset.x);
  const y = Number(target.dataset.y);
  const key = tileKey(x, y);
  if (ui.hoverKey !== key) {
    ui.hoverKey = key;
    const tile = tileAt(x, y);
    if (!tile) return;
    dom.tooltip.innerHTML = tileTooltipHTML(tile);
    dom.tooltip.hidden = false;
  }
  positionTooltip(event);
}

function handleContextClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'produce') {
    const city = state.selected?.type === 'city' ? getCity(state.selected.id) : null;
    if (city) setProduction(city.id, button.dataset.item);
  } else if (action === 'found-city') {
    foundCity(button.dataset.unit);
  } else if (action === 'improve') {
    improveTile(button.dataset.unit);
  } else if (action === 'claim') {
    claimTile(Number(button.dataset.x), Number(button.dataset.y));
  } else if (action === 'fortify') {
    fortifyUnit(button.dataset.unit);
  } else if (action === 'rest') {
    restUnit(button.dataset.unit);
  } else if (action === 'attack-unit') {
    attackUnit(button.dataset.unit, button.dataset.target);
  } else if (action === 'attack-city') {
    attackCity(button.dataset.unit, button.dataset.target);
  }
}

function handleModalClick(event) {
  if (event.target === dom.modal) {
    closeModal();
    return;
  }
  if (event.target.closest('[data-close]')) {
    closeModal();
    return;
  }
  const techButton = event.target.closest('[data-tech]');
  if (techButton && !techButton.disabled) {
    chooseResearch(techButton.dataset.tech);
  }
}

function attachEvents() {
  dom.board.addEventListener('click', handleBoardClick);
  dom.board.addEventListener('pointermove', showTooltipFor);
  dom.board.addEventListener('pointerleave', hideTooltip);
  dom.board.addEventListener('pointerdown', hideTooltip);

  dom.contextPanel.addEventListener('click', handleContextClick);
  dom.contextPanel.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const button = event.target.closest('[data-action]');
    if (!button) return;
    event.preventDefault();
    button.click();
  });

  dom.cityList.addEventListener('click', event => {
    const row = event.target.closest('[data-city]');
    if (!row) return;
    selectCity(row.dataset.city);
  });
  dom.cityList.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-city]');
    if (!row) return;
    event.preventDefault();
    selectCity(row.dataset.city);
  });

  dom.endTurnBtn.addEventListener('click', endTurn);
  dom.helpBtn.addEventListener('click', () => {
    openModal(helpModalHTML());
    sfx('select');
  });
  dom.soundBtn.addEventListener('click', () => {
    ui.sound = !ui.sound;
    if (ui.sound) sfx('select');
    renderTopbar();
  });
  dom.researchBtn.addEventListener('click', () => {
    openModal(researchModalHTML());
    sfx('select');
  });
  dom.researchNext.addEventListener('click', () => {
    const next = nextResearch(getFaction('player'));
    if (next) chooseResearch(next);
  });
  dom.modal.addEventListener('click', handleModalClick);
  dom.endCard.addEventListener('click', event => {
    if (event.target.closest('[data-replay]')) window.location.reload();
  });

  document.addEventListener('keydown', event => {
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
    if (event.key === 'Escape') {
      if (ui.modalOpen) closeModal();
      return;
    }
    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      if (!ui.modalOpen) openModal(helpModalHTML());
      return;
    }
    if ((event.key === 'e' || event.key === 'E') && !ui.modalOpen) {
      event.preventDefault();
      endTurn();
    }
  });

  window.addEventListener('resize', hideTooltip);
}

function boot() {
  cacheDom();
  createInitialState();
  buildBoard();
  attachEvents();
  renderAll();
  window.PocketEmpire = {
    getState: () => state,
    getSelected: () => state.selected,
    render: renderAll,
    endTurn,
    selectUnit,
    selectCity,
    selectTile,
    attackUnit,
    attackCity,
    claimTile,
    foundCity,
    improveTile,
    setProduction,
    ui
  };
}

boot();
