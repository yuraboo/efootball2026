function standingsEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function standingsInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return "ИГ";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function standingsGoalDiff(value) {
  const number = Number(value) || 0;
  if (number > 0) {
    return `+${number}`;
  }
  if (number < 0) {
    return `−${Math.abs(number)}`;
  }
  return "0";
}

function standingsShortDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function standingsAvatar(url, alt, className) {
  if (url) {
    return `<img class="${className}" src="${standingsEscapeHtml(url)}" alt="${standingsEscapeHtml(alt)}" />`;
  }
  return `<div class="${className} fallback"><span>${standingsEscapeHtml(standingsInitials(alt))}</span></div>`;
}

function standingsEnsureHeader() {
  const headerRow = document.querySelector(".standings-table thead tr");
  if (!headerRow) {
    return;
  }
  headerRow.innerHTML = `
    <th scope="col">#</th>
    <th scope="col">Игрок</th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Сыграно матчей">И</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Победы">В</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Ничьи">Н</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Поражения">П</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Забито мячей">ЗМ</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Пропущено мячей">ПМ</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Разница мячей">РМ</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Последние пять матчей">Форма</span></th>
    <th scope="col"><span class="standings-head-hint" tabindex="0" data-tooltip="Очки">О</span></th>
  `;
}

function standingsForm(items, playerId, matchesById, playersById) {
  const normalizedItems = Array.isArray(items) ? items.slice(-5) : [];
  const placeholders = Math.max(0, 5 - normalizedItems.length);
  const content = normalizedItems
    .map((item) => {
      const match = matchesById[item.matchId];
      const opponentId =
        match?.homePlayerId === playerId ? match.awayPlayerId : match?.homePlayerId;
      const opponentName = opponentId ? playersById[opponentId]?.name || "Соперник" : "Соперник";
      const tooltip = [
        `Раунд ${item.round || "—"}`,
        opponentName,
        `${item.goalsFor}:${item.goalsAgainst}`
      ]
        .filter(Boolean)
        .join(" • ");
      const className =
        item.result === "В"
          ? "form-win"
          : item.result === "Н"
            ? "form-draw"
            : "form-loss";
      return `<span class="standings-form-dot ${className}" tabindex="0" data-tooltip="${standingsEscapeHtml(
        tooltip
      )}" aria-label="${standingsEscapeHtml(tooltip)}">${standingsEscapeHtml(item.result)}</span>`;
    })
    .join("");
  const empty = Array.from({ length: placeholders }, () => {
    return `<span class="standings-form-dot is-empty" aria-hidden="true">·</span>`;
  }).join("");
  return `<div class="standings-form" aria-label="Форма игрока за последние пять матчей">${content}${empty}</div>`;
}

avatar = function avatarPatched(url, alt, className = "avatar") {
  return standingsAvatar(url, alt, className);
};

renderTableContext = function renderTableContextPatched(model) {
  const holder = document.getElementById("table-context");
  if (!holder) {
    return;
  }
  const leader = model.derived.standings[0];
  const totals = model.derived.totals;
  const lastMatchDate = standingsShortDate(model.derived.lastMatch?.playedAt);
  const progress = totals.totalMatches
    ? Math.round((totals.playedMatches / totals.totalMatches) * 100)
    : 0;
  const averageGoals = totals.playedMatches
    ? (totals.totalGoals / totals.playedMatches).toFixed(2).replace(".", ",")
    : "0,00";
  holder.innerHTML = `
    <div class="standings-overview">
      <div class="standings-overview-main">
        <div class="standings-summary-line">
          <span>${totals.playedMatches} / ${totals.totalMatches} матчей</span>
          <span>${totals.totalGoals} голов</span>
          <span>${averageGoals} гола за матч</span>
          <span>${leader ? `лидер: ${standingsEscapeHtml(leader.name)}` : "лидер определится по первым турам"}</span>
        </div>
        <div class="standings-chip-row">
          <span class="inline-status">${standingsEscapeHtml(model.state.tournament.statusLabel)}</span>
          <span class="chip">Лидер: ${leader ? standingsEscapeHtml(leader.name) : "—"}</span>
          ${lastMatchDate ? `<span class="chip">Обновлено: ${lastMatchDate}</span>` : ""}
          <span class="chip">Рейтинг: меньше значение = сильнее</span>
        </div>
      </div>
      <div class="standings-progress">
        <div class="standings-progress-top">
          <strong>${totals.playedMatches} из ${totals.totalMatches}</strong>
          <span>${progress}%</span>
        </div>
        <div class="standings-progress-track" aria-hidden="true">
          <span class="standings-progress-bar" style="width: ${progress}%"></span>
        </div>
        <div class="standings-progress-note">Заполненность сезона по текущему календарю</div>
      </div>
    </div>
  `;
};

renderStandings = function renderStandingsPatched(model) {
  standingsEnsureHeader();
  const body = document.getElementById("standings-body");
  const cards = document.getElementById("standings-cards");
  if (!body) {
    return;
  }
  const playerCardsById = Object.fromEntries(
    model.derived.playerCards.map((item) => [item.player.id, item])
  );
  const playersById = playerNameMap(model.state.players);
  const matchesById = Object.fromEntries(
    model.derived.matches.map((match) => [match.id, match])
  );

  body.innerHTML = model.derived.standings
    .map((row, index) => {
      const player = playersById[row.playerId] || {};
      const displayPhotoUrl = row.photoUrl || player.photoUrl || "";
      const displayRating =
        Number.isFinite(Number(row.rating)) && Number(row.rating) > 0
          ? row.rating
          : player.rating ?? 0;
      const rowClass =
        row.rank === 1 ? "rank-top" : row.rank === 2 ? "rank-second" : row.rank === 3 ? "rank-third" : "";
      const playerCard = playerCardsById[row.playerId];
      const formItems = playerCard?.form?.items || [];
      const formMarkup = standingsForm(formItems, row.playerId, matchesById, playersById);
      const goalDiffClass =
        row.goalDiff > 0
          ? "is-positive"
          : row.goalDiff < 0
            ? "is-negative"
            : "is-neutral";
      return `
        <tr class="${rowClass}" style="--row-index:${index}">
          <td class="standings-place-cell">
            <span class="standings-rank-badge">
              ${row.rank === 1 ? `<span class="standings-rank-crown" aria-hidden="true">👑</span>` : ""}
              <span class="standings-rank">${row.rank}</span>
            </span>
          </td>
          <td>
            <div class="player-row">
              ${standingsAvatar(displayPhotoUrl, row.name, "row-avatar")}
              <div class="standings-player-copy">
                <span class="standings-player-name">${standingsEscapeHtml(row.name)}</span>
                <div class="standings-player-meta">
                  <span>Рейтинг ${formatRating(displayRating)}</span>
                  <span>${row.wins}В · ${row.draws}Н · ${row.losses}П</span>
                </div>
              </div>
            </div>
          </td>
          <td>${row.played}</td>
          <td>${row.wins}</td>
          <td>${row.draws}</td>
          <td>${row.losses}</td>
          <td>${row.goalsFor}</td>
          <td>${row.goalsAgainst}</td>
          <td><span class="standings-goal-diff ${goalDiffClass}">${standingsGoalDiff(row.goalDiff)}</span></td>
          <td class="standings-form-cell">${formMarkup}</td>
          <td class="standings-points-cell"><strong class="standings-points">${row.points}</strong><span class="standings-points-note">очк.</span></td>
        </tr>
      `;
    })
    .join("");

  if (!cards) {
    return;
  }

  cards.innerHTML = model.derived.standings
    .map((row) => {
      const player = playersById[row.playerId] || {};
      const displayPhotoUrl = row.photoUrl || player.photoUrl || "";
      const displayRating =
        Number.isFinite(Number(row.rating)) && Number(row.rating) > 0
          ? row.rating
          : player.rating ?? 0;
      const playerCard = playerCardsById[row.playerId];
      const formItems = playerCard?.form?.items || [];
      const formMarkup = standingsForm(formItems, row.playerId, matchesById, playersById);
      const goalDiffClass =
        row.goalDiff > 0
          ? "is-positive"
          : row.goalDiff < 0
            ? "is-negative"
            : "is-neutral";
      return `
        <article class="standings-mobile-card ${row.rank === 1 ? "rank-top" : row.rank === 2 ? "rank-second" : row.rank === 3 ? "rank-third" : ""}">
          <div class="standings-mobile-top">
            <div class="standings-mobile-player">
              <div class="standings-mobile-rank">${row.rank}</div>
              ${standingsAvatar(displayPhotoUrl, row.name, "row-avatar")}
              <div>
                <strong>${standingsEscapeHtml(row.name)}</strong>
                <div class="standings-mobile-subline">${row.wins}В · ${row.draws}Н · ${row.losses}П</div>
              </div>
            </div>
            <div class="standings-mobile-points">
              <strong>${row.points}</strong>
              <span>очков</span>
            </div>
          </div>
          <div class="standings-mobile-meta">
            <span>Матчи ${row.played}</span>
            <span>Мячи ${row.goalsFor}:${row.goalsAgainst}</span>
            <span class="standings-goal-diff ${goalDiffClass}">РМ ${standingsGoalDiff(row.goalDiff)}</span>
          </div>
          <div class="standings-mobile-rating">Рейтинг ${formatRating(displayRating)}</div>
          <div class="standings-mobile-form">${formMarkup}</div>
        </article>
      `;
    })
    .join("");
};

(function bootstrapStandingsOverrides() {
  standingsEnsureHeader();
  let attempts = 0;
  const rerender = () => {
    attempts += 1;
    standingsEnsureHeader();
    if (typeof baseModel !== "undefined" && baseModel && typeof renderAll === "function") {
      renderAll();
      return;
    }
    if (attempts < 40) {
      window.setTimeout(rerender, 150);
    }
  };
  rerender();
})();
