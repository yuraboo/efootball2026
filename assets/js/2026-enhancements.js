(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const number = (value) => Number(value) || 0;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function image(player, className = "") {
    if (player?.photoUrl) {
      return `<img class="${className}" src="${esc(player.photoUrl)}" alt="${esc(player.name)}" />`;
    }
    return `<div class="fallback ${className}" aria-label="${esc(player?.name || "Игрок")}">${esc((player?.name || "И").slice(0, 1))}</div>`;
  }

  function getPlayer(model, id) {
    return model?.state?.players?.find((player) => player.id === id) || null;
  }

  function renderHeroMatch(model) {
    const holder = $("#hero-next-match-card");
    if (!holder) return;
    const match = model?.derived?.nextMatch;

    if (!match) {
      holder.innerHTML = `
        <div class="hero-match-top">
          <div class="live-label">Сезон завершён</div>
          <div class="hero-round">Итоги</div>
        </div>
        <div style="position:relative;z-index:1;margin-top:25px">
          <div class="stat-label">Все матчи сыграны</div>
          <h3 class="race-title" style="font-size:25px">Время подводить итоги</h3>
          <p class="race-copy">Финальная таблица, рекорды и аналитика сезона уже доступны ниже.</p>
        </div>
        <div class="hero-match-actions"><span>Турнир завершён</span><a href="#standings-section">Итоговая таблица ↓</a></div>`;
      return;
    }

    const home = match.homePlayer || getPlayer(model, match.homePlayerId);
    const away = match.awayPlayer || getPlayer(model, match.awayPlayerId);
    const prediction = match.prediction || {};
    const homeChance = Math.round(number(prediction.homeChance || prediction.homeWinChance || 50));
    const awayChance = Math.round(number(prediction.awayChance || prediction.awayWinChance || 50));

    holder.innerHTML = `
      <div class="hero-match-top">
        <div class="live-label">Следующий матч</div>
        <div class="hero-round">Раунд ${number(match.round) || "—"}</div>
      </div>
      <div class="hero-duel">
        <div class="hero-duelist">
          ${image(home)}
          <strong>${esc(home?.name || "Игрок")}</strong>
          <span>${homeChance}% на победу</span>
        </div>
        <div class="hero-vs">VS</div>
        <div class="hero-duelist">
          ${image(away)}
          <strong>${esc(away?.name || "Игрок")}</strong>
          <span>${awayChance}% на победу</span>
        </div>
      </div>
      <div class="hero-match-actions">
        <span>${esc(match.importance?.label || "Матч впереди")}${match.importance?.score ? ` · ${match.importance.score}/100` : ""}</span>
        <a href="#next-match-panel">Полное превью ↓</a>
      </div>`;
  }

  function baseRows(model) {
    return (model?.derived?.standings || []).map((row) => ({
      playerId: row.playerId,
      name: row.name,
      points: number(row.points),
      played: number(row.played),
      wins: number(row.wins),
      draws: number(row.draws),
      losses: number(row.losses),
      goalsFor: number(row.goalsFor),
      goalsAgainst: number(row.goalsAgainst),
      goalDiff: number(row.goalDiff)
    }));
  }

  function sortRows(rows) {
    return rows.sort((a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name, "ru")
    ).map((row, index) => ({ ...row, rank: index + 1 }));
  }

  function applyScenario(model, outcome) {
    const match = model?.derived?.nextMatch;
    const rows = baseRows(model);
    if (!match || !rows.length) return { rows: sortRows(rows), score: "—" };
    const homeId = match.homePlayer?.id || match.homePlayerId;
    const awayId = match.awayPlayer?.id || match.awayPlayerId;
    const home = rows.find((row) => row.playerId === homeId);
    const away = rows.find((row) => row.playerId === awayId);
    if (!home || !away) return { rows: sortRows(rows), score: "—" };

    let hg = 1;
    let ag = 1;
    if (outcome === "home") [hg, ag] = [2, 1];
    if (outcome === "away") [hg, ag] = [1, 2];

    home.played += 1; away.played += 1;
    home.goalsFor += hg; home.goalsAgainst += ag;
    away.goalsFor += ag; away.goalsAgainst += hg;
    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;

    if (hg > ag) { home.points += 3; home.wins += 1; away.losses += 1; }
    else if (hg < ag) { away.points += 3; away.wins += 1; home.losses += 1; }
    else { home.points += 1; away.points += 1; home.draws += 1; away.draws += 1; }

    return { rows: sortRows(rows), score: `${hg}:${ag}`, homeId, awayId };
  }

  function renderScenarioDetail(model, outcome = "home") {
    const stage = $("#scenario-stage");
    const match = model?.derived?.nextMatch;
    if (!stage) return;

    $$(".scenario-tab").forEach((button) => button.classList.toggle("is-active", button.dataset.outcome === outcome));

    if (!match) {
      stage.innerHTML = '<div class="empty">Сезон завершён — сценарии больше не требуются.</div>';
      return;
    }

    const home = match.homePlayer || getPlayer(model, match.homePlayerId);
    const away = match.awayPlayer || getPlayer(model, match.awayPlayerId);
    const result = applyScenario(model, outcome);
    const homeRow = result.rows.find((row) => row.playerId === result.homeId);
    const awayRow = result.rows.find((row) => row.playerId === result.awayId);
    const labels = {
      home: `Победа: ${home?.name || "хозяева"}`,
      draw: "Ничья",
      away: `Победа: ${away?.name || "гости"}`
    };

    stage.innerHTML = `
      <div class="scenario-result-head">
        <div>
          <div class="stat-label">Возможный сценарий</div>
          <strong>${esc(labels[outcome])}</strong>
        </div>
        <div class="scenario-score">${result.score}</div>
      </div>
      <div class="scenario-impact">
        ${[homeRow, awayRow].map((row) => `
          <div class="scenario-player">
            <span>${esc(row?.name || "Игрок")}</span>
            <strong>${row?.rank || "—"} место · ${row?.points ?? "—"} очк.</strong>
            <em>РМ ${number(row?.goalDiff) > 0 ? "+" : ""}${number(row?.goalDiff)}</em>
          </div>`).join("")}
      </div>
      <p class="scenario-note">Предварительный пересчёт таблицы для условного счёта ${result.score}. Это сценарий, а не прогноз точного результата.</p>`;
  }

  function setupScenario(model) {
    const holder = $("#scenario-panel");
    if (!holder) return;
    const match = model?.derived?.nextMatch;
    const home = match?.homePlayer || getPlayer(model, match?.homePlayerId);
    const away = match?.awayPlayer || getPlayer(model, match?.awayPlayerId);
    const tabs = $(".scenario-tabs", holder);
    if (tabs && match) {
      tabs.innerHTML = `
        <button class="scenario-tab is-active" type="button" data-outcome="home">Победа ${esc((home?.name || "П1").split(" ")[0])}</button>
        <button class="scenario-tab" type="button" data-outcome="draw">Ничья</button>
        <button class="scenario-tab" type="button" data-outcome="away">Победа ${esc((away?.name || "П2").split(" ")[0])}</button>`;
      $$(".scenario-tab", holder).forEach((button) => {
        button.addEventListener("click", () => renderScenarioDetail(model, button.dataset.outcome));
      });
    }
    renderScenarioDetail(model, "home");
  }

  function calculateStandings(players, matches) {
    const map = new Map((players || []).map((player) => [player.id, {
      playerId: player.id, name: player.name, points: 0, played: 0, wins: 0, draws: 0,
      losses: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0
    }]));
    (matches || []).filter((match) =>
      match.status === "played" && Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore)
    ).forEach((match) => {
      const home = map.get(match.homePlayerId);
      const away = map.get(match.awayPlayerId);
      if (!home || !away) return;
      const hg = number(match.homeScore);
      const ag = number(match.awayScore);
      home.played += 1; away.played += 1;
      home.goalsFor += hg; home.goalsAgainst += ag;
      away.goalsFor += ag; away.goalsAgainst += hg;
      if (hg > ag) { home.wins += 1; away.losses += 1; home.points += 3; }
      else if (hg < ag) { away.wins += 1; home.losses += 1; away.points += 3; }
      else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }
    });
    return sortRows(Array.from(map.values()).map((row) => ({ ...row, goalDiff: row.goalsFor - row.goalsAgainst })));
  }

  function renderMovement(model) {
    const holder = $("#movement-list");
    if (!holder) return;
    const played = (model?.state?.matches || []).filter((match) =>
      match.status === "played" && Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore)
    ).sort((a, b) => number(a.round) - number(b.round));
    const current = calculateStandings(model.state.players, played);
    const previous = calculateStandings(model.state.players, played.slice(0, -1));
    const previousMap = new Map(previous.map((row) => [row.playerId, row.rank]));

    holder.innerHTML = current.map((row) => {
      const oldRank = previousMap.get(row.playerId) || row.rank;
      const delta = oldRank - row.rank;
      const type = delta > 0 ? "up" : delta < 0 ? "down" : "same";
      const label = delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${Math.abs(delta)}` : "—";
      return `
        <div class="movement-row">
          <div class="movement-rank">${row.rank}</div>
          <div class="movement-name"><strong>${esc(row.name)}</strong><span>${row.points} очк. · РМ ${row.goalDiff > 0 ? "+" : ""}${row.goalDiff}</span></div>
          <div class="movement-delta ${type}">${played.length ? label : "старт"}</div>
        </div>`;
    }).join("");
  }

  function matchName(match, players) {
    const home = players.find((player) => player.id === match.homePlayerId)?.name || "Игрок";
    const away = players.find((player) => player.id === match.awayPlayerId)?.name || "Игрок";
    return `${home} — ${away}`;
  }

  function maxStreak(players, matches) {
    let best = { name: "Откроется позже", value: 0 };
    players.forEach((player) => {
      let current = 0;
      matches.forEach((match) => {
        if (match.homePlayerId !== player.id && match.awayPlayerId !== player.id) return;
        const isHome = match.homePlayerId === player.id;
        const gf = isHome ? match.homeScore : match.awayScore;
        const ga = isHome ? match.awayScore : match.homeScore;
        current = gf > ga ? current + 1 : 0;
        if (current > best.value) best = { name: player.name, value: current };
      });
    });
    return best;
  }

  function renderRecords(model) {
    const holder = $("#records-grid");
    if (!holder) return;
    const players = model?.state?.players || [];
    const played = (model?.state?.matches || []).filter((match) =>
      match.status === "played" && Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore)
    ).sort((a, b) => number(a.round) - number(b.round));
    const rows = baseRows(model);
    const placeholder = (icon, label) => ({ icon, label, value: "Откроется после матчей", note: "Статистика появится автоматически" });

    if (!played.length) {
      holder.innerHTML = [
        placeholder("⚡","Самая крупная победа"), placeholder("🔥","Самый голевой матч"),
        placeholder("🏁","Лучшая серия"), placeholder("⚽","Лучшая атака"),
        placeholder("🛡️","Лучшая защита"), placeholder("✨","Главная сенсация")
      ].map(recordMarkup).join("");
      return;
    }

    const biggest = played.slice().sort((a,b) => Math.abs(b.homeScore-b.awayScore)-Math.abs(a.homeScore-a.awayScore))[0];
    const goals = played.slice().sort((a,b) => (b.homeScore+b.awayScore)-(a.homeScore+a.awayScore))[0];
    const streak = maxStreak(players, played);
    const attack = rows.slice().sort((a,b) => b.goalsFor-a.goalsFor)[0];
    const defense = rows.filter((row) => row.played).sort((a,b) => a.goalsAgainst-b.goalsAgainst || b.points-a.points)[0];
    const upsets = played.map((match) => {
      const home = getPlayer(model, match.homePlayerId);
      const away = getPlayer(model, match.awayPlayerId);
      const winner = match.homeScore > match.awayScore ? home : match.awayScore > match.homeScore ? away : null;
      const loser = winner === home ? away : home;
      return { match, winner, loser, surprise: winner && loser ? number(winner.rating)-number(loser.rating) : -Infinity };
    }).filter((item) => item.winner && item.surprise > 0).sort((a,b) => b.surprise-a.surprise)[0];

    const records = [
      { icon:"⚡",label:"Самая крупная победа",value:`${biggest.homeScore}:${biggest.awayScore}`,note:matchName(biggest,players) },
      { icon:"🔥",label:"Самый голевой матч",value:`${goals.homeScore+goals.awayScore} голов`,note:matchName(goals,players) },
      streak.value ? { icon:"🏁",label:"Лучшая серия",value:`${streak.value} побед подряд`,note:streak.name } : placeholder("🏁","Лучшая серия"),
      { icon:"⚽",label:"Лучшая атака",value:`${attack?.goalsFor || 0} голов`,note:attack?.name || "—" },
      { icon:"🛡️",label:"Лучшая защита",value:`${defense?.goalsAgainst || 0} пропущено`,note:defense?.name || "—" },
      upsets ? { icon:"✨",label:"Главная сенсация",value:upsets.winner.name,note:`${matchName(upsets.match,players)} · ${upsets.match.homeScore}:${upsets.match.awayScore}` } : placeholder("✨","Главная сенсация")
    ];
    holder.innerHTML = records.map(recordMarkup).join("");
  }

  function recordMarkup(record) {
    return `<article class="record-card"><div class="record-icon">${record.icon}</div><div class="record-label">${esc(record.label)}</div><div class="record-value">${esc(record.value)}</div><div class="record-note">${esc(record.note)}</div></article>`;
  }

  let revealObserver;
  function setupReveals() {
    const items = $$(".panel, .hero-match-card");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: .08, rootMargin: "0px 0px -5% 0px" });
    }
    items.forEach((item) => {
      if (!item.classList.contains("reveal-item")) {
        item.classList.add("reveal-item");
        revealObserver.observe(item);
      }
    });
  }

  let navigationReady = false;
  function setupNavigation() {
    if (navigationReady) return;
    navigationReady = true;
    const links = $$(".nav-link");
    const sections = links.map((link) => $(link.getAttribute("href"))).filter(Boolean);
    const navObserver = new IntersectionObserver((entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (!active) return;
      links.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${active.target.id}`));
    }, { rootMargin:"-25% 0px -60% 0px", threshold:[0,.1,.35] });
    sections.forEach((section) => navObserver.observe(section));
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0;
      document.documentElement.style.setProperty("--scroll-progress", `${progress}%`);
    };
    window.addEventListener("scroll", updateProgress, { passive:true });
    updateProgress();
  }

  function hideLoader() {
    const loader = $("#site-loader");
    if (!loader || loader.classList.contains("is-hidden")) return;
    window.setTimeout(() => loader.classList.add("is-hidden"), 250);
    window.setTimeout(() => loader.remove(), 1000);
  }

  function renderEnhancements(model) {
    if (!model?.state || !model?.derived) return;
    renderHeroMatch(model);
    setupScenario(model);
    renderMovement(model);
    renderRecords(model);
    setupNavigation();
    setupReveals();
    hideLoader();
  }

  function boot() {
    try {
      if (typeof renderAll === "function" && !window.__enhancedRenderWrapped) {
        window.__enhancedRenderWrapped = true;
        const originalRenderAll = renderAll;
        renderAll = function enhancedRenderAll(...args) {
          const result = originalRenderAll.apply(this, args);
          window.requestAnimationFrame(() => {
            try { renderEnhancements(baseModel); } catch (error) { console.warn("Enhancement render:", error); }
          });
          return result;
        };
      }
    } catch (error) {
      console.warn("Enhancement bootstrap:", error);
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      try {
        if (typeof baseModel !== "undefined" && baseModel?.state) {
          window.clearInterval(timer);
          renderEnhancements(baseModel);
        } else if (attempts > 50) {
          window.clearInterval(timer);
          hideLoader();
        }
      } catch (_) {
        if (attempts > 50) { window.clearInterval(timer); hideLoader(); }
      }
    }, 100);
    window.setTimeout(hideLoader, 6000);
  }

  boot();
})();