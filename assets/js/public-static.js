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

function shortPlayerName(name) {
  const clean = String(name || "").trim();
  if (!clean) {
    return "Игрок";
  }
  const firstWord = clean.split(/\s+/)[0];
  return firstWord.length <= 12 ? firstWord : `${firstWord.slice(0, 11)}…`;
}

function buildRaceRows(model) {
  const { state } = model;
  const standings = model.derived.standings.slice();
  const count = standings.length;
  const leaderPoints = standings[0]?.points ?? 0;
  const maxSeasonPoints = Math.max((state.players.length - 1) * state.tournament.roundsCount * 3, 3);
  const forecastMap = new Map(
    model.derived.forecast.rows.map((row) => [row.playerId, row])
  );
  const runnerPalette = ["#71d8ff", "#ffcf6f", "#54e0a1", "#ff8c78", "#b399ff"];

  return standings.map((row, index) => {
    const rankFactor = count > 1 ? 1 - index / (count - 1) : 1;
    const seasonFactor = Math.max(0, Math.min(1, row.points / maxSeasonPoints));
    const composite = seasonFactor * 0.88 + rankFactor * 0.12;
    const progress = Math.max(8, Math.min(78, Math.round(8 + composite * 68)));
    const forecastRow = forecastMap.get(row.playerId);

    return {
      ...row,
      progress,
      gap: leaderPoints - row.points,
      titleChance: forecastRow?.titleChance ?? 0,
      averagePlace: forecastRow?.averagePlace ?? row.rank,
      shortName: shortPlayerName(row.name),
      color: runnerPalette[index % runnerPalette.length],
      animationDelay: `${(index * 0.16).toFixed(2)}s`,
      seasonPointsCap: maxSeasonPoints,
      captionLevel: index % 3,
      figureLift: [-3, 5, -7][index % 3]
    };
  });
}

function renderHeroRace(model) {
  const holder = document.getElementById("hero-race");
  const rows = buildRaceRows(model);

  if (!rows.length) {
    holder.innerHTML = `
      <article class="race-card">
        <div class="race-header">
          <div>
            <div class="stat-label">Гонка за кубком</div>
            <h3 class="race-title">Путь к титулу пока пуст</h3>
            <p class="race-copy">Добавьте участников и первые матчи, чтобы увидеть, кто ближе всего к финишу.</p>
          </div>
          <div class="trophy-pill">🏆 Кубок</div>
        </div>
      </article>
    `;
    return;
  }

  holder.innerHTML = `
    <article class="race-card">
      <div class="race-header">
        <div>
          <div class="stat-label">Гонка за кубком</div>
          <h3 class="race-title">Одна дистанция до титула</h3>
          <p class="race-copy">
            Позиции считаются по очкам с учетом текущего места. Чем правее игрок, тем он ближе к кубку.
          </p>
        </div>
        <div class="trophy-pill">🏆 Кубок</div>
      </div>
      <div class="race-scene">
        <div class="race-start-label">Старт</div>
        <div class="race-finish-zone">
          <div class="race-finish-trophy">🏆</div>
          <div class="race-finish-label">Финиш</div>
        </div>
        <div class="race-track-base"></div>
        ${rows
          .map(
            (row) => `
              <div class="race-runner" style="left: ${row.progress}%; --runner-color: ${row.color}; --runner-delay: ${row.animationDelay}; --caption-level: ${row.captionLevel}; --figure-lift: ${row.figureLift}px">
                <div class="race-runner-figure">
                  <div class="race-runner-head">
                    ${avatar(row.photoUrl, row.name, "race-avatar")}
                  </div>
                  <div class="race-runner-torso"></div>
                  <div class="race-runner-legs"></div>
                </div>
                <div class="race-runner-caption">
                  <div class="race-runner-name">${row.shortName}</div>
                  <div class="race-runner-meta">#${row.rank} · ${row.points} очк.</div>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="race-summary-list">
        ${rows
          .map(
            (row) => `
              <div class="race-summary-item">
                <span class="race-summary-dot" style="background: ${row.color}"></span>
                <strong>${row.name}</strong>
                <span>
                  ${
                    row.gap === 0
                      ? `${row.points} из ${row.seasonPointsCap} очк. и лучший коридор к титулу`
                      : `${row.points} из ${row.seasonPointsCap} очк., отставание ${row.gap} и среднее место ${row.averagePlace.toFixed(1)}`
                  }
                </span>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
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
          <td>${row.rank}</td>
          <td>
            <div class="player-row">
              ${avatar(row.photoUrl, row.name, "row-avatar")}
              <div>
                <strong>${row.name}</strong>
                <div class="panel-subtitle">Рейтинг ${formatRating(row.rating)} · меньше лучше</div>
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
          <td><strong>${row.points}</strong></td>
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