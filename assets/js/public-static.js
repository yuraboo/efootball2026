let baseModel = null;

function formatRating(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function formatChance(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function avatar(url, alt, className = "avatar") {
  if (url) {
    return `<img class="${className}" src="${url}" alt="${alt}" />`;
  }
  return `<div class="${className} fallback">${alt.slice(0, 1)}</div>`;
}

function formDots(items) {
  if (!items.length) {
    return `<div class="note">Пока нет сыгранных матчей.</div>`;
  }

  return `
    <div class="form-dots">
      ${items
        .map((item) => {
          const className =
            item.result === "В"
              ? "form-win"
              : item.result === "Н"
                ? "form-draw"
                : "form-loss";
          return `<div class="form-dot ${className}" title="${item.goalsFor}:${item.goalsAgainst}">${item.result}</div>`;
        })
        .join("")}
    </div>
  `;
}

function playerNameMap(players) {
  return Object.fromEntries(players.map((player) => [player.id, player]));
}

function renderPredictionChips(prediction) {
  return prediction.factors
    .map(
      (factor) => `
        <div class="metric-pill">
          <span>${factor.label}</span>
          <strong>${factor.value}</strong>
        </div>
      `
    )
    .join("");
}

function renderPreviewArticle(prediction) {
  const article = prediction.article;
  return `
    <article class="preview-article">
      <div class="article-kicker">${article.label}</div>
      <h3 class="article-title">${article.title}</h3>
      <p class="article-dek">${article.dek}</p>
      <div class="match-preview-grid">
        ${renderPredictionChips(prediction)}
      </div>
      <div class="article-body">
        ${article.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      </div>
    </article>
  `;
}

const TROPHY_RACE_VISUALS = [
  {
    key: "red",
    asset: "./assets/media/trophy-race/runner-red.svg",
    primary: "#ff635d",
    secondary: "#c92a39",
    glow: "rgba(255, 99, 93, 0.34)"
  },
  {
    key: "blue",
    asset: "./assets/media/trophy-race/runner-blue.svg",
    primary: "#57a8ff",
    secondary: "#0f5fca",
    glow: "rgba(87, 168, 255, 0.34)"
  },
  {
    key: "green",
    asset: "./assets/media/trophy-race/runner-green.svg",
    primary: "#61dc7a",
    secondary: "#28974a",
    glow: "rgba(97, 220, 122, 0.34)"
  },
  {
    key: "purple",
    asset: "./assets/media/trophy-race/runner-purple.svg",
    primary: "#ae82ff",
    secondary: "#7142d6",
    glow: "rgba(174, 130, 255, 0.32)"
  },
  {
    key: "orange",
    asset: "./assets/media/trophy-race/runner-orange.svg",
    primary: "#ffad54",
    secondary: "#d96a1d",
    glow: "rgba(255, 173, 84, 0.32)"
  }
];

const TROPHY_RACE_DEFAULT_VISUAL = {
  key: "default",
  asset: "./assets/media/trophy-race/runner-default.svg",
  primary: "#6fd7ff",
  secondary: "#3d7df7",
  glow: "rgba(111, 215, 255, 0.3)"
};

const TROPHY_RACE_START = 3;
const TROPHY_RACE_FINISH = 84;
const TROPHY_RACE_LANE_OFFSETS = [-18, 0, 18, -30, 30];
const TROPHY_RACE_HORIZONTAL_OFFSETS = [-5, 0, 5, -8, 8];
let trophyRaceBootstrapped = false;
let trophyRaceBootTimer = null;

function shortPlayerName(name) {
  const clean = String(name || "").trim();
  if (!clean) {
    return "Игрок";
  }
  const firstWord = clean.split(/\s+/)[0];
  return firstWord.length <= 12 ? firstWord : `${firstWord.slice(0, 11)}…`;
}

function formatRacePoints(value) {
  const points = Number(value) || 0;
  const mod100 = points % 100;
  const mod10 = points % 10;
  if (mod100 >= 11 && mod100 <= 14) {
    return `${points} очков`;
  }
  if (mod10 === 1) {
    return `${points} очко`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${points} очка`;
  }
  return `${points} очков`;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function raceVisual(index) {
  return TROPHY_RACE_VISUALS[index % TROPHY_RACE_VISUALS.length] || TROPHY_RACE_DEFAULT_VISUAL;
}

function calculateRaceTargetPoints(model) {
  const playerCount = model.state.players.length;
  const roundsCount = Number(model.state.tournament.roundsCount) || 1;
  return Math.max((playerCount - 1) * roundsCount * 3, 3);
}

function buildRaceRows(model) {
  const standings = model.derived.standings.slice();
  const targetPoints = calculateRaceTargetPoints(model);
  const maxPoints = Math.max(...standings.map((row) => row.points), 0);

  return {
    targetPoints,
    rows: standings.map((row, index) => {
      const visual = raceVisual(index);
      const normalizedProgress = Math.max(
        0,
        Math.min(targetPoints ? row.points / targetPoints : 0, 1)
      );
      const basePosition =
        TROPHY_RACE_START +
        normalizedProgress * (TROPHY_RACE_FINISH - TROPHY_RACE_START);
      const horizontalOffset = TROPHY_RACE_HORIZONTAL_OFFSETS[index] ?? 0;
      const position = clamp(
        basePosition + horizontalOffset,
        TROPHY_RACE_START,
        TROPHY_RACE_FINISH
      );

      return {
        ...row,
        visual,
        position: Number(position.toFixed(2)),
        laneOffset: TROPHY_RACE_LANE_OFFSETS[index] ?? 0,
        shortName: shortPlayerName(row.name).toUpperCase(),
        fullName: String(row.name || "Игрок").toUpperCase(),
        pointsLabel: formatRacePoints(row.points).toUpperCase(),
        isLeader: row.points === maxPoints,
        progressPercent: Math.round(normalizedProgress * 100)
      };
    })
  };
}

function createRaceRunner(row) {
  const element = document.createElement("div");
  element.className = `runner runner--${row.visual.key}`;
  element.dataset.playerId = row.playerId;
  element.innerHTML = `
    <div class="leader-crown" aria-hidden="true">👑</div>
    <div class="runner-sprite">
      <img class="runner-character" src="${row.visual.asset}" alt="" aria-hidden="true" />
      <div class="runner-avatar-shell"></div>
    </div>
    <div class="runner-label">
      <span class="runner-name"></span>
      <span class="runner-points"></span>
    </div>
  `;
  return element;
}

function syncRaceRunner(element, row, options = {}) {
  const { startFromStart = false } = options;
  const previousPosition = Number(element.dataset.position);
  const nextPosition = row.position;
  const positionChanged =
    Number.isFinite(previousPosition) && Math.abs(previousPosition - nextPosition) > 0.35;

  element.className = `runner runner--${row.visual.key}${row.isLeader ? " is-leader" : ""}`;
  element.style.setProperty(
    "--runner-position",
    `${startFromStart ? TROPHY_RACE_START : nextPosition}%`
  );
  element.style.setProperty("--lane-offset", `${row.laneOffset}px`);
  element.style.setProperty("--runner-accent", row.visual.primary);
  element.style.setProperty("--runner-accent-2", row.visual.secondary);
  element.style.setProperty("--runner-glow", row.visual.glow);

  const character = element.querySelector(".runner-character");
  if (character.getAttribute("src") !== row.visual.asset) {
    character.setAttribute("src", row.visual.asset);
  }

  const avatarShell = element.querySelector(".runner-avatar-shell");
  avatarShell.innerHTML = avatar(row.photoUrl, row.name, "runner-head-avatar");

  const nameElement = element.querySelector(".runner-name");
  nameElement.textContent = row.fullName;
  nameElement.title = row.name;

  const pointsElement = element.querySelector(".runner-points");
  pointsElement.textContent = row.pointsLabel;

  if (
    !startFromStart &&
    positionChanged &&
    !prefersReducedMotion()
  ) {
    element.classList.add("is-running");
    window.clearTimeout(Number(element.dataset.runTimer || 0));
    const timerId = window.setTimeout(() => {
      element.classList.remove("is-running");
      delete element.dataset.runTimer;
    }, 960);
    element.dataset.runTimer = String(timerId);
  } else if (startFromStart) {
    element.classList.add("is-running");
  } else {
    element.classList.remove("is-running");
  }

  element.dataset.position = String(nextPosition);
}

function mountRaceRows(container, rows) {
  const existing = new Map(
    Array.from(container.querySelectorAll(".runner")).map((node) => [
      node.dataset.playerId,
      node
    ])
  );

  rows.forEach((row) => {
    if (!existing.has(row.playerId)) {
      container.append(createRaceRunner(row));
    }
  });

  Array.from(container.querySelectorAll(".runner")).forEach((node) => {
    if (!rows.some((row) => row.playerId === node.dataset.playerId)) {
      const timerId = Number(node.dataset.runTimer || 0);
      if (timerId) {
        window.clearTimeout(timerId);
      }
      node.remove();
    }
  });
}

function animateRaceRows(container, rows) {
  const runnerMap = new Map(
    Array.from(container.querySelectorAll(".runner")).map((node) => [
      node.dataset.playerId,
      node
    ])
  );

  rows.forEach((row) => {
    const node = runnerMap.get(row.playerId);
    if (node) {
      syncRaceRunner(node, row);
    }
  });
}

function renderRaceEmpty(holder) {
  holder.innerHTML = `
    <article class="race-card race-card--trophy">
      <div class="race-header">
        <div>
          <div class="stat-label">Гонка за кубком</div>
          <h3 class="race-title">Путь к титулу пока пуст</h3>
          <p class="race-copy">Добавьте участников и первые матчи, чтобы на дорожке появились реальные позиции игроков.</p>
        </div>
        <div class="trophy-pill">Ждём старт сезона</div>
      </div>
    </article>
  `;
  trophyRaceBootstrapped = false;
  window.clearTimeout(trophyRaceBootTimer);
}

function renderHeroRace(model) {
  const holder = document.getElementById("hero-race");
  if (!holder) {
    return;
  }
  const { rows, targetPoints } = buildRaceRows(model);

  if (!rows.length) {
    renderRaceEmpty(holder);
    return;
  }

  if (!holder.querySelector(".trophy-race")) {
    holder.innerHTML = `
    <article class="race-card race-card--trophy">
      <div class="race-header">
        <div>
          <div class="stat-label">Гонка за кубком</div>
          <h3 class="race-title">Одна дорожка до титула</h3>
          <p class="race-copy"></p>
        </div>
        <div class="trophy-pill">Финиш у кубка</div>
      </div>
      <section class="trophy-race" aria-label="Гонка участников турнира к кубку">
        <div class="race-backdrop"></div>
        <div class="race-track"></div>
        <div class="race-start-badge">0</div>
        <div class="race-goal-badge">Финиш</div>
        <div class="runners-container"></div>
        <div class="trophy-anchor">
          <img class="trophy-image" src="./assets/media/trophy-race/trophy.svg" alt="Кубок турнира" />
        </div>
      </section>
      <div class="race-meta-row">
        <span class="chip chip-accent race-target-points"></span>
        <span class="chip race-player-count"></span>
      </div>
    </article>
  `;
    trophyRaceBootstrapped = false;
  }

  holder.querySelector(".race-copy").textContent =
    "Все участники бегут по одной линии. Чем больше очков у игрока, тем ближе он к кубку.";
  holder.querySelector(".race-target-points").textContent =
    `Максимум сезона: ${targetPoints} очк.`;
  holder.querySelector(".race-player-count").textContent =
    `${rows.length} участника(ов) на дистанции`;

  const container = holder.querySelector(".runners-container");
  mountRaceRows(container, rows);

  if (!trophyRaceBootstrapped && !prefersReducedMotion()) {
    Array.from(container.querySelectorAll(".runner")).forEach((node) => {
      const row = rows.find((item) => item.playerId === node.dataset.playerId);
      if (row) {
        syncRaceRunner(node, row, { startFromStart: true });
      }
    });

    window.clearTimeout(trophyRaceBootTimer);
    trophyRaceBootTimer = window.setTimeout(() => {
      animateRaceRows(container, rows);
      trophyRaceBootstrapped = true;
    }, 260);
    return;
  }

  animateRaceRows(container, rows);
  trophyRaceBootstrapped = true;
}

function renderHero(model) {
  const { state, derived } = model;
  const leader = derived.standings[0];
  const forecastLeader = derived.forecast.rows[0];
  const powerLeader = derived.powerRanking[0];

  document.getElementById("hero-title").innerHTML = `${state.tournament.title}<span>${state.tournament.subtitle}</span>`;
  document.getElementById("hero-description").textContent = state.tournament.description;

  const heroStats = [
    {
      label: "Лидер сейчас",
      value: leader ? leader.name : "—",
      note: leader ? `${leader.points} очк. и РМ ${leader.goalDiff > 0 ? "+" : ""}${leader.goalDiff}` : "Таблица еще не сформирована"
    },
    {
      label: "Фаворит модели",
      value: forecastLeader ? forecastLeader.name : "—",
      note: forecastLeader
        ? `${forecastLeader.titleChance}% на титул · среднее место ${forecastLeader.averagePlace.toFixed(1)}`
        : "Появится после первого расчета"
    },
    {
      label: "Power rating",
      value: powerLeader ? powerLeader.name : "—",
      note: powerLeader
        ? `${powerLeader.score} очков силы · ${powerLeader.trendLabel}`
        : "Появится после первых игр"
    },
    {
      label: "Режим",
      value: "Лига",
      note: `${state.players.length} участника(ов), ${state.tournament.roundsCount} круг(а)`
    }
  ];

  document.getElementById("hero-stats").innerHTML = heroStats
    .map(
      (item) => `
        <div class="stat-card">
          <div class="stat-label">${item.label}</div>
          <div class="stat-value">${item.value}</div>
          <div class="stat-note">${item.note}</div>
        </div>
      `
    )
    .join("");

  renderHeroRace(model);
  document.getElementById("status-badge").textContent = state.tournament.statusLabel;
}

function renderTableContext(model) {
  const holder = document.getElementById("table-context");
  if (!holder) {
    return;
  }
  const leader = model.derived.standings[0];
  const totals = model.derived.totals;
  holder.innerHTML = `
    <span class="inline-status">${model.state.tournament.statusLabel}</span>
    <span class="chip">${totals.playedMatches}/${totals.totalMatches} матчей сыграно</span>
    <span class="chip">${leader ? `лидер: ${leader.name}` : "лидер появится после первых игр"}</span>
  `;
}

function renderNextMatch(model) {
  const panel = document.getElementById("next-match-panel");
  const nextMatch = model.derived.nextMatch;

  if (!nextMatch) {
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Следующий матч</h2>
          <div class="panel-subtitle">Все матчи календаря уже сыграны.</div>
        </div>
      </div>
      <div class="empty">
        Турнир по текущему календарю завершен. Проверьте итоговую таблицу, power ranking и сезонный прогноз.
      </div>
    `;
    return;
  }

  const prediction = nextMatch.prediction;
  const importance = nextMatch.importance;
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Следующий матч</h2>
        <div class="panel-subtitle">Раунд ${nextMatch.round}. Главный матч ближайшего игрового окна с журналистским превью и индексом важности.</div>
      </div>
      <div class="stack-inline">
        <div class="badge">Уверенность модели: ${prediction.confidence}%</div>
        ${
          importance
            ? `<div class="impact-badge impact-strong">${importance.label} · ${importance.score}</div>`
            : ""
        }
      </div>
    </div>
    <div class="next-match-stage">
      <div class="next-match next-match-compact">
        <div class="player-tile">
          ${avatar(nextMatch.homePlayer.photoUrl, nextMatch.homePlayer.name)}
          <div class="player-name">${nextMatch.homePlayer.name}</div>
          <div class="player-meta">Рейтинг ${formatRating(nextMatch.homePlayer.rating)}<br /><span class="rating-hint">Меньше число = сильнее игрок</span></div>
          <div class="chance">${prediction.homeChance}% на победу</div>
        </div>
        <div class="vs-holder">
          <div class="vs-circle">VS</div>
        </div>
        <div class="player-tile">
          ${avatar(nextMatch.awayPlayer.photoUrl, nextMatch.awayPlayer.name)}
          <div class="player-name">${nextMatch.awayPlayer.name}</div>
          <div class="player-meta">Рейтинг ${formatRating(nextMatch.awayPlayer.rating)}<br /><span class="rating-hint">Меньше число = сильнее игрок</span></div>
          <div class="chance">${prediction.awayChance}% на победу</div>
        </div>
      </div>
      <div class="feature-layout">
        ${renderPreviewArticle(prediction)}
      </div>
    </div>
    <div class="next-match-footer">
      <div>
        <div class="stat-label">Распределение исходов</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${prediction.homeChance}%"></div></div>
        <div class="chip-row" style="margin-top: 10px">
          <span class="chip">П1 ${prediction.homeWinChance}%</span>
          <span class="chip">Х ${prediction.drawChance}%</span>
          <span class="chip">П2 ${prediction.awayWinChance}%</span>
        </div>
      </div>
      <div class="mini-card">
        <div class="stat-label">Профиль пары</div>
        <strong>${prediction.matchup.label}</strong>
        <div class="stat-note">${prediction.matchup.summary}</div>
      </div>
      <p class="note">${prediction.summary}</p>
    </div>
  `;
}

function renderStandings(model) {
  const body = document.getElementById("standings-body");
  const cards = document.getElementById("standings-cards");
  body.innerHTML = model.derived.standings
    .map((row) => {
      const rowClass =
        row.rank === 1 ? "rank-top" : row.rank === 2 ? "rank-second" : row.rank === 3 ? "rank-third" : "";
      return `
        <tr class="${rowClass}">
          <td><span class="standings-rank">${row.rank}</span></td>
          <td>
            <div class="player-row">
              ${avatar(row.photoUrl, row.name, "row-avatar")}
              <div class="standings-player-copy">
                <span class="standings-player-name">${row.name}</span>
                <div class="standings-player-meta">Рейтинг ${formatRating(row.rating)} · меньше лучше</div>
              </div>
            </div>
          </td>
          <td>${row.played}</td>
          <td>${row.wins}</td>
          <td>${row.draws}</td>
          <td>${row.losses}</td>
          <td>${row.goalsFor}</td>
          <td>${row.goalsAgainst}</td>
          <td>${row.goalDiff > 0 ? "+" : ""}${row.goalDiff}</td>
          <td><strong class="standings-points">${row.points}</strong></td>
        </tr>
      `;
    })
    .join("");

  if (cards) {
    cards.innerHTML = model.derived.standings
      .map(
        (row) => `
          <article class="list-card ${row.rank === 1 ? "rank-top" : row.rank === 2 ? "rank-second" : row.rank === 3 ? "rank-third" : ""}">
            <div class="list-head">
              <div class="player-row">
                ${avatar(row.photoUrl, row.name, "row-avatar")}
                <div>
                  <strong>#${row.rank} ${row.name}</strong>
                  <div class="panel-subtitle">Рейтинг ${formatRating(row.rating)} · меньше лучше</div>
                </div>
              </div>
              <span class="chip chip-accent">${row.points} очк.</span>
            </div>
            <div class="card-stats" style="margin-top: 12px">
              <div class="card-stat">
                <div class="stat-label">Баланс</div>
                <strong>${row.wins}-${row.draws}-${row.losses}</strong>
              </div>
              <div class="card-stat">
                <div class="stat-label">Мячи</div>
                <strong>${row.goalsFor}:${row.goalsAgainst}</strong>
              </div>
              <div class="card-stat">
                <div class="stat-label">Разница</div>
                <strong>${row.goalDiff > 0 ? "+" : ""}${row.goalDiff}</strong>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }
}

function renderPlayers(model) {
  const names = playerNameMap(model.state.players);
  const grid = document.getElementById("players-grid");
  grid.innerHTML = model.derived.playerCards
    .map((item) => {
      const nextOpponent = item.nextOpponentId ? names[item.nextOpponentId]?.name || "—" : "Нет ближайшего соперника";
      const lastResult = item.lastResult
        ? `${item.lastResult.homePlayer.name} ${item.lastResult.homeScore}:${item.lastResult.awayScore} ${item.lastResult.awayPlayer.name}`
        : "Еще нет сыгранных матчей";
      return `
        <article class="player-card">
          <div class="player-card-top">
            ${avatar(item.player.photoUrl, item.player.name, "card-avatar")}
            <div>
              <div class="player-name">${item.player.name}</div>
              <div class="card-meta">${item.stats ? `${item.stats.rank} место в таблице` : "Пока без позиции"} · power #${item.analytics.powerRank}</div>
              <div class="card-rating">Рейтинг ${formatRating(item.player.rating)}</div>
            </div>
          </div>
          <div class="card-stats">
            <div class="card-stat">
              <div class="stat-label">Очки</div>
              <strong>${item.stats ? item.stats.points : 0}</strong>
            </div>
            <div class="card-stat">
              <div class="stat-label">В-Н-П</div>
              <strong>${item.stats ? `${item.stats.wins}-${item.stats.draws}-${item.stats.losses}` : "0-0-0"}</strong>
            </div>
            <div class="card-stat">
              <div class="stat-label">Мячи</div>
              <strong>${item.stats ? `${item.stats.goalsFor}:${item.stats.goalsAgainst}` : "0:0"}</strong>
            </div>
          </div>
          ${formDots(item.form.items)}
          <div class="chip-row" style="margin-top: 12px">
            <span class="chip chip-accent">${item.analytics.style.label}</span>
            <span class="chip">clutch ${item.analytics.clutchScore}</span>
            <span class="chip">upset ${item.analytics.upsetScore}</span>
          </div>
          <details>
            <summary>Раскрыть подробную аналитику</summary>
            <div class="stack" style="margin-top: 14px">
              <div class="mini-card">
                <div class="stat-label">Сила календаря</div>
                <strong>${item.analytics.schedule.remainingLabel}</strong>
                <div class="stat-note">Индекс остатка ${item.analytics.schedule.remainingIndex}. ${item.analytics.schedule.summary}</div>
              </div>
              <div class="mini-card">
                <div class="stat-label">Стиль игрока</div>
                <strong>${item.analytics.style.tempo}</strong>
                <div class="stat-note">${item.analytics.style.detail}</div>
              </div>
              <div class="mini-card">
                <div class="stat-label">Следующий соперник</div>
                <strong>${nextOpponent}</strong>
              </div>
              <div class="mini-card">
                <div class="stat-label">Последний результат</div>
                <strong>${lastResult}</strong>
              </div>
              ${
                item.player.notes
                  ? `<div class="mini-card">
                      <div class="stat-label">Заметка штаба</div>
                      <div class="stat-note">${item.player.notes}</div>
                    </div>`
                  : ""
              }
            </div>
          </details>
        </article>
      `;
    })
    .join("");
}

function renderMatches(model) {
  const list = document.getElementById("matches-list");
  list.innerHTML = model.derived.matches.length
    ? model.derived.matches
        .map((match) => {
          return `
            <article class="match-card ${match.status === "played" ? "played" : "scheduled"}">
              <div>
                <div class="match-card-top">
                  <span class="round-pill ${match.status === "played" ? "round-pill-played" : "round-pill-scheduled"}">Раунд ${match.round}</span>
                  <span class="match-state ${match.status === "played" ? "match-state-played" : "match-state-scheduled"}">${match.status === "played" ? "Матч сыгран" : "Матч в расписании"}</span>
                  ${
                    match.importance
                      ? `<span class="impact-badge">${match.importance.score} · ${match.importance.label}</span>`
                      : ""
                  }
                </div>
                <div class="score-lines">
                  <div class="score-line">
                    <div class="left">
                      ${avatar(match.homePlayer.photoUrl, match.homePlayer.name, "row-avatar")}
                      <strong>${match.homePlayer.name}</strong>
                    </div>
                    <div class="score">${match.status === "played" ? match.homeScore : "—"}</div>
                  </div>
                  <div class="score-line">
                    <div class="left">
                      ${avatar(match.awayPlayer.photoUrl, match.awayPlayer.name, "row-avatar")}
                      <strong>${match.awayPlayer.name}</strong>
                    </div>
                    <div class="score">${match.status === "played" ? match.awayScore : "—"}</div>
                  </div>
                </div>
                <div class="chip-row" style="margin-top: 12px">
                  ${
                    match.prediction
                      ? `<span class="chip">${match.prediction.matchup.label}</span>
                         <span class="chip">П1 ${match.prediction.homeWinChance}%</span>
                         <span class="chip">Х ${match.prediction.drawChance}%</span>
                         <span class="chip">П2 ${match.prediction.awayWinChance}%</span>`
                      : ""
                  }
                </div>
                ${
                  match.note
                    ? `<div class="note" style="margin-top: 10px">${match.note}</div>`
                    : ""
                }
              </div>
              <div class="badge ${match.status === "played" ? "badge-played" : "badge-scheduled"}">${match.status === "played" ? "Сыгран" : "В расписании"}</div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty">Календарь пока не создан. Зайдите в админку и соберите расписание.</div>`;
}

function renderForecast(model) {
  const list = document.getElementById("season-forecast");
  list.innerHTML = model.derived.forecast.rows
    .map(
      (row) => `
        <div class="list-card">
          <div class="list-head">
            <h4>${row.name}</h4>
            <span class="chip">среднее место ${row.averagePlace.toFixed(1)}</span>
          </div>
          <div class="bar-track" style="margin: 10px 0 12px">
            <div class="bar-fill alt" style="width: ${row.titleChance}%"></div>
          </div>
          <div class="forecast-grid">
            <div class="mini-card compact">
              <div class="stat-label">Титул</div>
              <strong>${formatChance(row.titleChance)}</strong>
            </div>
            <div class="mini-card compact">
              <div class="stat-label">Топ-2</div>
              <strong>${formatChance(row.top2Chance)}</strong>
            </div>
            <div class="mini-card compact">
              <div class="stat-label">Последнее место</div>
              <strong>${formatChance(row.bottomChance)}</strong>
            </div>
          </div>
          <p class="note">Модель прогнала сезон ${model.derived.forecast.simulations} раз и ожидает в среднем ${row.expectedPoints} очка.</p>
        </div>
      `
    )
    .join("");
}

function renderPowerRanking(model) {
  const list = document.getElementById("power-ranking");
  list.innerHTML = model.derived.powerRanking
    .map(
      (row) => `
        <div class="list-card">
          <div class="list-head">
            <h4>#${row.rank} ${row.name}</h4>
            <span class="chip chip-accent">${row.trendLabel}</span>
          </div>
          <div class="power-row">
            <strong>${row.score}</strong>
            <span>${row.style}</span>
          </div>
          <p class="note">Clutch ${row.clutchScore} · upset ${row.upsetScore} · остаток ${row.schedule.remainingIndex}</p>
        </div>
      `
    )
    .join("");
}

function renderImportanceBoard(model) {
  const list = document.getElementById("importance-board");
  const rows = model.derived.importanceBoard.slice(0, 5);
  list.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <div class="list-card">
              <div class="list-head">
                <h4>Раунд ${row.round}: ${row.homePlayerName} — ${row.awayPlayerName}</h4>
                <span class="impact-badge">${row.score}</span>
              </div>
              <strong>${row.label}</strong>
              <p class="note">${row.note}</p>
            </div>
          `
        )
        .join("")
    : `<div class="empty">Все игры уже сыграны, индексы важности больше не считаются.</div>`;
}

function renderInsights(model) {
  const grid = document.getElementById("insights-grid");
  const { standings, totals, topScoringMatch, powerRanking, playerCards, importanceBoard } =
    model.derived;
  const leader = standings[0];
  const powerLeader = powerRanking[0];
  const hardestRun = playerCards
    .slice()
    .sort(
      (left, right) =>
        right.analytics.schedule.remainingIndex - left.analytics.schedule.remainingIndex
    )[0];
  const clutchLeader = playerCards
    .slice()
    .sort((left, right) => right.analytics.clutchScore - left.analytics.clutchScore)[0];
  const upsetLeader = playerCards
    .slice()
    .sort((left, right) => right.analytics.upsetScore - left.analytics.upsetScore)[0];
  const keyMatch = importanceBoard[0];

  const cards = [
    {
      label: "Лидер сезона",
      value: leader ? leader.name : "—",
      note: leader ? `${leader.points} очк. и разница ${leader.goalDiff > 0 ? "+" : ""}${leader.goalDiff}` : "Ждем первые результаты"
    },
    {
      label: "Power-лидер",
      value: powerLeader ? powerLeader.name : "—",
      note: powerLeader ? `${powerLeader.score} очков силы` : "Пока без данных"
    },
    {
      label: "Самый тяжелый финиш",
      value: hardestRun ? hardestRun.player.name : "—",
      note: hardestRun ? `Индекс остатка ${hardestRun.analytics.schedule.remainingIndex}` : "Пока без данных"
    },
    {
      label: "Clutch-фактор",
      value: clutchLeader ? clutchLeader.player.name : "—",
      note: clutchLeader ? `${clutchLeader.analytics.clutchScore} в близких матчах` : "Пока без данных"
    },
    {
      label: "Апсет-лидер",
      value: upsetLeader ? upsetLeader.player.name : "—",
      note: upsetLeader ? `${upsetLeader.analytics.upsetScore} против сильных соперников` : "Пока без данных"
    },
    {
      label: "Главный swing матча",
      value: keyMatch ? `${keyMatch.score}/100` : "—",
      note: keyMatch ? `${keyMatch.homePlayerName} — ${keyMatch.awayPlayerName}` : "Появится для будущих туров"
    },
    {
      label: "Самый голевой матч",
      value: topScoringMatch
        ? `${topScoringMatch.homeScore}:${topScoringMatch.awayScore}`
        : "—",
      note: topScoringMatch
        ? `${topScoringMatch.homePlayer.name} — ${topScoringMatch.awayPlayer.name}`
        : "Появится после первых игр"
    },
    {
      label: "Сыграно",
      value: String(totals.playedMatches),
      note: totals.totalMatches
        ? `${totals.totalMatches - totals.playedMatches} матча(ей) осталось`
        : "Нечего играть"
    }
  ];

  grid.innerHTML = cards
    .map(
      (item) => `
        <div class="mini-card">
          <div class="stat-label">${item.label}</div>
          <strong>${item.value}</strong>
          <div class="stat-note">${item.note}</div>
        </div>
      `
    )
    .join("");
}

function renderLastMatch(model) {
  const holder = document.getElementById("last-match");
  const last = model.derived.lastMatch;
  const timelineLast = model.derived.timeline.slice(-1)[0];
  if (!last) {
    holder.innerHTML = `<div class="empty">Пока нет сыгранных матчей. Как только админ внесет первый результат, здесь появится контекст и сдвиг по шансам.</div>`;
    return;
  }

  holder.innerHTML = `
    <div class="list-card">
      <h4>${last.homePlayer.name} ${last.homeScore}:${last.awayScore} ${last.awayPlayer.name}</h4>
      <p class="note">${timelineLast ? timelineLast.summary : "Последний матч уже записан в историю сезона."}</p>
      ${
        last.note
          ? `<div class="chip-row"><span class="chip">${last.note}</span></div>`
          : ""
      }
    </div>
  `;
}

function renderTimeline(model) {
  const holder = document.getElementById("season-timeline");
  const rows = model.derived.timeline;
  holder.innerHTML = rows.length
    ? rows
        .map(
          (item) => `
            <div class="timeline-item">
              <div class="timeline-head">
                <strong>Раунд ${item.round}</strong>
                <span class="chip">${item.winnerLabel}</span>
              </div>
              <h4>${item.title}</h4>
              <p class="note">${item.summary}</p>
              <div class="chip-row">
                <span class="chip">Лидер после тура: ${item.leaderName}</span>
                <span class="chip">Шанс лидера: ${item.leaderChance}%</span>
                <span class="chip">${item.swing >= 0 ? "+" : ""}${item.swing} п.п. у главного актера</span>
              </div>
              ${
                item.note
                  ? `<div class="stat-note" style="margin-top: 8px">${item.note}</div>`
                  : ""
              }
            </div>
          `
        )
        .join("")
    : `<div class="empty">Хронология сезона появится после первых результатов.</div>`;
}

function renderAll() {
  renderHero(baseModel);
  renderNextMatch(baseModel);
  renderTableContext(baseModel);
  renderStandings(baseModel);
  renderPlayers(baseModel);
  renderMatches(baseModel);
  renderForecast(baseModel);
  renderPowerRanking(baseModel);
  renderImportanceBoard(baseModel);
  renderInsights(baseModel);
  renderLastMatch(baseModel);
  renderTimeline(baseModel);
}

function setupTabs() {
  document.querySelectorAll("[data-tabs]").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab-target]");
      if (!button) {
        return;
      }
      const target = button.dataset.tabTarget;
      const scope = group.parentElement;
      group.querySelectorAll("[data-tab-target]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      scope.querySelectorAll("[data-tab-pane]").forEach((pane) => {
        const isActive = pane.dataset.tabPane === target;
        pane.hidden = !isActive;
        pane.classList.toggle("is-active", isActive);
      });
    });
  });
}

async function init() {
  setupTabs();
  baseModel = await api.publicState();
  renderAll();
  api.subscribe(
    (model) => {
      baseModel = model;
      renderAll();
    },
    () => {}
  );
}

init().catch((error) => {
  document.body.innerHTML = `<main class="shell" style="padding: 40px 0"><div class="panel"><h1 class="panel-title">Не удалось загрузить турнир</h1><p class="note">${error.message}</p></div></main>`;
});
