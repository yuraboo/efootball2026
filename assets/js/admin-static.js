let currentModel = null;
let unsubscribeSync = null;
const dirtySections = new Set();

function noticeElement() {
  return document.getElementById("admin-notice");
}

function loginStatusElement() {
  return document.getElementById("login-status");
}

function setNotice(message, tone = "success") {
  const element = noticeElement();
  if (!element) {
    return;
  }
  element.hidden = !message;
  element.className = `admin-notice ${tone}`;
  element.textContent = message || "";
}

function setLoginStatus(message, tone = "error") {
  const element = loginStatusElement();
  if (!element) {
    return;
  }
  element.hidden = !message;
  element.className = tone ? `helper ${tone}` : "helper";
  element.textContent = message || "";
}

function setBusy(button, busy, busyText) {
  if (!button) {
    return;
  }
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }
  button.disabled = busy;
  button.textContent = busy ? busyText : button.dataset.defaultLabel;
}

function sectionLabel(section) {
  return (
    {
      tournament: "турнир",
      players: "игроки",
      schedule: "календарь",
      results: "результаты"
    }[section] || section
  );
}

function updateDirtyBar() {
  const bar = document.getElementById("admin-dirty-bar");
  const text = document.getElementById("admin-dirty-text");
  if (!bar || !text) {
    return;
  }
  if (!dirtySections.size) {
    bar.hidden = true;
    text.textContent = "";
    return;
  }
  bar.hidden = false;
  text.textContent = `Изменены разделы: ${Array.from(dirtySections)
    .map(sectionLabel)
    .join(", ")}.`;
}

function markDirty(section) {
  if (!section) {
    return;
  }
  dirtySections.add(section);
  updateDirtyBar();
}

function clearDirty(section) {
  if (!section) {
    dirtySections.clear();
  } else {
    dirtySections.delete(section);
  }
  updateDirtyBar();
}

function storageNotice(model, fallbackMessage) {
  if (model?.meta?.storageMode === "local") {
    return {
      tone: "info",
      message:
        model.meta.storageMessage ||
        "Облако турнира недоступно. Панель работает в локальном режиме этого браузера."
    };
  }

  return {
    tone: "success",
    message: fallbackMessage
  };
}

function avatar(url, alt) {
  if (url) {
    return `<img class="row-avatar" src="${url}" alt="${alt}" />`;
  }
  return `<div class="row-avatar avatar fallback">${alt.slice(0, 1)}</div>`;
}

function showLogin(show) {
  const loginView = document.getElementById("login-view");
  const adminView = document.getElementById("admin-view");
  if (loginView) {
    loginView.hidden = !show;
    loginView.style.display = show ? "" : "none";
  }
  if (adminView) {
    adminView.hidden = show;
    adminView.style.display = show ? "none" : "block";
  }
}

function value(id) {
  return document.getElementById(id).value;
}

function setValue(id, nextValue) {
  document.getElementById(id).value = nextValue || "";
}

function bindTournament(model) {
  const tournament = model.state.tournament;
  setValue("title", tournament.title);
  setValue("subtitle", tournament.subtitle);
  setValue("description", tournament.description);
  setValue("statusLabel", tournament.statusLabel);
  setValue("roundsCount", tournament.roundsCount);
}

function renderSummary(model) {
  const holder = document.getElementById("admin-summary");
  if (!holder) {
    return;
  }
  const total = model.state.matches.length;
  const played = model.state.matches.filter((match) => match.status === "played").length;
  const remaining = Math.max(0, total - played);
  holder.innerHTML = `
    <div class="summary-card">
      <span>Игроки</span>
      <strong>${model.state.players.length}</strong>
    </div>
    <div class="summary-card">
      <span>Матчи</span>
      <strong>${total}</strong>
    </div>
    <div class="summary-card">
      <span>Сыграно</span>
      <strong>${played}</strong>
    </div>
    <div class="summary-card">
      <span>Осталось</span>
      <strong>${remaining}</strong>
    </div>
  `;
}

function renderPlayers(model) {
  const holder = document.getElementById("players-editor");
  holder.innerHTML = model.state.players
    .map(
      (player, index) => `
        <div class="editor-card" data-player-index="${index}">
          <div class="editor-top">
            <div>
              <strong>${player.name}</strong>
              <div class="editor-meta">Редактируемый игрок публичной лиги</div>
            </div>
            ${avatar(player.photoUrl, player.name)}
          </div>
          <div class="editor-inputs">
            <div class="field">
              <label>Имя</label>
              <input type="text" data-field="name" data-dirty="players" value="${player.name}" />
            </div>
            <div class="field">
              <label>Рейтинг игрока</label>
              <input type="number" data-field="rating" data-dirty="players" min="1" step="1" value="${player.rating}" />
            </div>
            <div class="field">
              <label>Фото URL</label>
              <input type="url" data-field="photoUrl" data-dirty="players" value="${player.photoUrl}" />
            </div>
          </div>
          <div class="field" style="margin-top: 10px">
            <label>Заметка для аналитики</label>
            <textarea data-field="notes" data-dirty="players" placeholder="Например: силен против фаворитов, серия побед, вязкий стиль, любит высокие счета.">${player.notes || ""}</textarea>
          </div>
          <div class="field-note">Чем меньше число, тем сильнее игрок. Можно ставить 1, 25, 1200, 100000 и выше.</div>
          <div class="btn-row" style="margin-top: 12px">
            <button class="btn btn-danger" type="button" data-remove-player="${index}">Удалить</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderResults(model) {
  const holder = document.getElementById("results-editor");
  if (!model.derived.matches.length) {
    holder.innerHTML =
      '<div class="empty">Календаря пока нет. Сначала сохраните игроков и сгенерируйте расписание.</div>';
    return;
  }

  holder.innerHTML = model.derived.matches
    .map(
      (match) => `
        <div class="editor-card match-editor" data-match-id="${match.id}">
          <div class="match-editor-head">
            <div>
              <strong>Раунд ${match.round}</strong>
              <div class="editor-meta">${match.homePlayer.name} — ${match.awayPlayer.name}</div>
            </div>
            <div class="badge ${match.status === "played" ? "badge-played" : "badge-scheduled"}">
              ${match.status === "played" ? "Сыгран" : "В расписании"}
            </div>
          </div>
          <div class="match-editor-score">
            <div class="field">
              <label>Пара</label>
              <div class="empty">${match.homePlayer.name} vs ${match.awayPlayer.name}</div>
            </div>
            <div class="field">
              <label>Голы хозяев</label>
              <input type="number" min="0" data-score="home" data-dirty="results" value="${match.homeScore ?? ""}" />
            </div>
            <div class="field">
              <label>Голы гостей</label>
              <input type="number" min="0" data-score="away" data-dirty="results" value="${match.awayScore ?? ""}" />
            </div>
          </div>
          <div class="editor-inputs">
            <div class="field">
              <label>Дата и время матча</label>
              <input type="datetime-local" data-played-at data-dirty="results" value="${toDatetimeLocal(match.playedAt)}" />
            </div>
            <div class="field" style="grid-column: span 2">
              <label>Заметка к матчу</label>
              <textarea data-note data-dirty="results" placeholder="Камбэк, разгром, нервная концовка, неудобный матчап и т.д.">${match.note || ""}</textarea>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" type="button" data-save-result="${match.id}">Сохранить счет</button>
            <button class="btn btn-secondary" type="button" data-clear-result="${match.id}">Очистить счет</button>
          </div>
        </div>
      `
    )
    .join("");
}

function collectPlayers() {
  return Array.from(document.querySelectorAll("[data-player-index]")).map((card, index) => ({
    id: currentModel.state.players[index]?.id || `player-${index + 1}`,
    name: card.querySelector('[data-field="name"]').value.trim(),
    rating: Number(card.querySelector('[data-field="rating"]').value || 1000),
    photoUrl: card.querySelector('[data-field="photoUrl"]').value.trim(),
    notes: card.querySelector('[data-field="notes"]').value.trim()
  }));
}

function syncModel(model) {
  currentModel = model;
  bindTournament(model);
  renderSummary(model);
  renderPlayers(model);
  renderResults(model);
}

function startRealtimeSync() {
  if (unsubscribeSync) {
    unsubscribeSync();
  }

  unsubscribeSync = api.subscribe(
    (model) => {
      syncModel(model);
    },
    (message) => {
      if (message) {
        setNotice(message, "error");
      }
    }
  );
}

async function refreshAdminState() {
  syncModel(await api.adminState());
  clearDirty();
}

async function handleAction(type, payload, successMessage) {
  syncModel(await api.action(type, payload));
  if (type === "save_tournament") {
    clearDirty("tournament");
  }
  if (type === "save_players") {
    clearDirty("players");
  }
  if (type === "save_match_result" || type === "clear_match_result") {
    clearDirty("results");
  }
  if (type === "generate_schedule" || type === "reset_schedule") {
    clearDirty("schedule");
    clearDirty("results");
  }
  if (successMessage) {
    const notice = storageNotice(currentModel, successMessage);
    setNotice(notice.message, notice.tone);
  }
}

async function enterAdmin() {
  showLogin(false);
  await refreshAdminState();
  startRealtimeSync();
  const notice = storageNotice(
    currentModel,
    "Админка подключена. Изменения ниже сохраняются по отдельным блокам."
  );
  setNotice(notice.message, currentModel?.meta?.storageMode === "local" ? "info" : "success");
}

async function init() {
  const session = await api.session();
  if (!session.authenticated) {
    showLogin(true);
    setLoginStatus("Введите пароль администратора.", "");
    return;
  }

  await enterAdmin();
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const password = document.getElementById("password").value;
  setBusy(button, true, "Проверяем...");
  try {
    await api.login(password);
    document.getElementById("password").value = "";
    setLoginStatus("");
    await enterAdmin();
  } catch (error) {
    showLogin(true);
    setLoginStatus(error.message, "error");
  } finally {
    setBusy(button, false);
  }
});

document.getElementById("logout-admin").addEventListener("click", async () => {
  await api.logout();
  if (unsubscribeSync) {
    unsubscribeSync();
    unsubscribeSync = null;
  }
  clearDirty();
  setNotice("");
  showLogin(true);
  setLoginStatus("Вы вышли из админки.", "success");
});

document.getElementById("refresh-admin").addEventListener("click", async () => {
  const button = document.getElementById("refresh-admin");
  setBusy(button, true, "Обновляем...");
  try {
    await refreshAdminState();
    const notice = storageNotice(currentModel, "Данные админки обновлены.");
    setNotice(notice.message, notice.tone);
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(button, false);
  }
});

document.getElementById("tournament-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.getElementById("save-tournament");
  setBusy(button, true, "Сохраняем...");
  try {
    await handleAction(
      "save_tournament",
      {
        title: value("title"),
        subtitle: value("subtitle"),
        description: value("description"),
        statusLabel: value("statusLabel"),
        roundsCount: Number(value("roundsCount"))
      },
      "Настройки турнира сохранены."
    );
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(button, false);
  }
});

document.getElementById("add-player").addEventListener("click", () => {
  const nextPlayers = [
    ...currentModel.state.players,
    {
      id: `player-${Date.now()}`,
      name: "Новый игрок",
      rating: 1000,
      photoUrl: "",
      notes: ""
    }
  ];
  currentModel.state.players = nextPlayers;
  renderSummary(currentModel);
  renderPlayers(currentModel);
  markDirty("players");
  setNotice("Новый игрок добавлен в черновик. Чтобы записать состав, нажмите «Сохранить состав».", "info");
});

document.getElementById("save-players").addEventListener("click", async () => {
  const players = collectPlayers().filter((player) => player.name);
  const button = document.getElementById("save-players");
  setBusy(button, true, "Сохраняем...");
  try {
    await handleAction(
      "save_players",
      { players },
      "Состав игроков сохранен. Если состав менялся, пересоберите календарь."
    );
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(button, false);
  }
});

document.getElementById("generate-schedule").addEventListener("click", async () => {
  const button = document.getElementById("generate-schedule");
  setBusy(button, true, "Генерируем...");
  try {
    await handleAction(
      "generate_schedule",
      {},
      "Календарь заново собран по текущему составу и числу кругов."
    );
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(button, false);
  }
});

document.getElementById("reset-schedule").addEventListener("click", async () => {
  const button = document.getElementById("reset-schedule");
  setBusy(button, true, "Очищаем...");
  try {
    await handleAction(
      "reset_schedule",
      {},
      "Календарь очищен. Теперь можно заново сгенерировать сезон."
    );
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(button, false);
  }
});

document.getElementById("players-editor").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-player]");
  if (!button) {
    return;
  }
  const index = Number(button.dataset.removePlayer);
  currentModel.state.players = currentModel.state.players.filter((_, itemIndex) => itemIndex !== index);
  renderSummary(currentModel);
  renderPlayers(currentModel);
  markDirty("players");
  setNotice("Игрок удален из черновика. Чтобы записать изменения, нажмите «Сохранить состав».", "info");
});

document.getElementById("admin-view").addEventListener("input", (event) => {
  const target = event.target.closest("[data-dirty]");
  if (!target) {
    return;
  }
  markDirty(target.dataset.dirty);
});

document.getElementById("discard-dirty").addEventListener("click", async () => {
  const button = document.getElementById("discard-dirty");
  setBusy(button, true, "Сбрасываем...");
  try {
    await refreshAdminState();
    setNotice("Несохранённые изменения сброшены. Панель синхронизирована с текущими данными.", "info");
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(button, false);
  }
});

document.getElementById("results-editor").addEventListener("click", async (event) => {
  const saveButton = event.target.closest("[data-save-result]");
  if (saveButton) {
    const matchId = saveButton.dataset.saveResult;
    const card = saveButton.closest("[data-match-id]");
    setBusy(saveButton, true, "Сохраняем...");
    try {
      await handleAction(
        "save_match_result",
        {
          matchId,
          homeScore: card.querySelector('[data-score="home"]').value,
          awayScore: card.querySelector('[data-score="away"]').value,
          playedAt: card.querySelector("[data-played-at]").value,
          note: card.querySelector("[data-note]").value.trim()
        },
        "Результат матча сохранен. Таблица и аналитика обновлены."
      );
    } catch (error) {
      setNotice(error.message, "error");
    } finally {
      setBusy(saveButton, false);
    }
    return;
  }

  const clearButton = event.target.closest("[data-clear-result]");
  if (clearButton) {
    setBusy(clearButton, true, "Очищаем...");
    try {
      await handleAction(
        "clear_match_result",
        {
          matchId: clearButton.dataset.clearResult
        },
        "Счет очищен. Матч снова помечен как ожидающий игру."
      );
    } catch (error) {
      setNotice(error.message, "error");
    } finally {
      setBusy(clearButton, false);
    }
  }
});

init().catch((error) => {
  document.body.innerHTML = `<section class="login-shell"><div class="login-card"><h1 class="panel-title">Не удалось открыть админку</h1><p class="note">${error.message}</p></div></section>`;
});
