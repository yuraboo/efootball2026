function computeSeasonForecast(state, options = {}) {
  const normalized = normalizeTournamentState(state);
  const standings = computeStandings(normalized);
  const remainingMatches = normalized.matches.filter(
    (match) => match.status !== "played"
  );
  const simulationCount =
    options.simulationCount ??
    (remainingMatches.length ? SIMULATION_DEFAULTS.forecast : 1);

  const rows =
    !remainingMatches.length || simulationCount <= 1
      ? deterministicForecastRows(normalized, standings)
      : simulateForecastRows(normalized, simulationCount);

  normalizeRoundedChances(rows, "titleChance");
  normalizeRoundedChances(rows, "bottomChance");

  return {
    simulations: simulationCount,
    rows,
    byId: forecastToMap(rows)
  };
}

function computeTitleOdds(state, options = {}) {
  const forecast = computeSeasonForecast(state, {
    simulationCount: options.simulationCount ?? SIMULATION_DEFAULTS.forecastFast
  });
  return forecast.rows.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    chance: row.titleChance
  }));
}

function materializeScenarioState(state, overrides = {}) {
  const draft = copy(normalizeTournamentState(state));
  draft.matches
    .filter((match) => match.status !== "played")
    .sort(compareMatchOrder)
    .forEach((match) => {
      const outcome = overrides[match.id];
      if (!outcome || outcome === "model") {
        return;
      }
      const core = buildMatchCore(draft, match);
      const [homeScore, awayScore] = scenarioScoreline(core, outcome);
      match.status = "played";
      match.homeScore = homeScore;
      match.awayScore = awayScore;
      match.playedAt = new Date().toISOString();
    });
  draft.tournament.updatedAt = state.tournament.updatedAt;
  return normalizeTournamentState(draft);
}

function evaluateMatchImportance(state, forecast, options = {}) {
  const remainingMatches = state.matches
    .filter((match) => match.status !== "played")
    .sort(compareMatchOrder);
  const currentForecast = forecast || computeSeasonForecast(state);
  const currentById = currentForecast.byId;
  const playersById = idMap(state.players);
  const byId = {};

  const board = remainingMatches.map((match) => {
    const scenarioMaps = ["home", "draw", "away"].map((outcome) => {
      const scenarioState = materializeScenarioState(state, {
        [match.id]: outcome
      });
      return computeSeasonForecast(scenarioState, {
        simulationCount: options.simulationCount ?? SIMULATION_DEFAULTS.importance
      }).byId;
    });

    let focusPlayer = playersById[match.homePlayerId];
    let titleSwing = 0;
    let top2Swing = 0;
    let bottomSwing = 0;
    let score = 0;

    state.players.forEach((player) => {
      const titleValues = scenarioMaps.map((item) => item[player.id].titleChance);
      const top2Values = scenarioMaps.map((item) => item[player.id].top2Chance);
      const bottomValues = scenarioMaps.map((item) => item[player.id].bottomChance);
      const current = currentById[player.id];
      const localScore =
        (Math.max(...titleValues) - Math.min(...titleValues)) * 1.05 +
        (Math.max(...top2Values) - Math.min(...top2Values)) * 0.45 +
        (Math.max(...bottomValues) - Math.min(...bottomValues)) * 0.35 +
        Math.abs(current.averagePlace - average(scenarioMaps.map((item) => item[player.id].averagePlace), current.averagePlace)) *
          4;

      if (localScore > score) {
        score = localScore;
        focusPlayer = player;
        titleSwing = Math.max(...titleValues) - Math.min(...titleValues);
        top2Swing = Math.max(...top2Values) - Math.min(...top2Values);
        bottomSwing = Math.max(...bottomValues) - Math.min(...bottomValues);
      }
    });

    const importanceScore = clamp(Math.round(score), 8, 99);
    const label =
      importanceScore >= 72
        ? "Сезонообразующий матч"
        : importanceScore >= 56
          ? "Критический матч"
          : importanceScore >= 38
            ? "Сильный турнирный вес"
            : "Локальный турнирный вес";

    const entry = {
      matchId: match.id,
      round: match.round,
      homePlayerId: match.homePlayerId,
      awayPlayerId: match.awayPlayerId,
      homePlayerName: playersById[match.homePlayerId].name,
      awayPlayerName: playersById[match.awayPlayerId].name,
      score: importanceScore,
      label,
      focusPlayerId: focusPlayer.id,
      focusPlayerName: focusPlayer.name,
      titleSwing: Math.round(titleSwing),
      top2Swing: Math.round(top2Swing),
      bottomSwing: Math.round(bottomSwing),
      note:
        titleSwing >= top2Swing && titleSwing >= bottomSwing
          ? `${focusPlayer.name} может качнуться примерно на ${Math.round(
              titleSwing
            )} п.п. по титульным шансам.`
          : top2Swing >= bottomSwing
            ? `${focusPlayer.name} сильно меняет свои шансы удержаться в верхней зоне.`
            : `${focusPlayer.name} особенно чувствителен к риску упасть вниз по таблице.`
    };

    byId[match.id] = entry;
    return entry;
  });

  return {
    byId,
    board: board.sort((left, right) => right.score - left.score || left.round - right.round)
  };
}

function buildSeasonTimeline(state, options = {}) {
  const playedMatches = getPlayedMatches(state);
  if (!playedMatches.length) {
    return [];
  }

  const base = {
    tournament: copy(state.tournament),
    players: copy(state.players),
    matches: state.matches.map((match) => ({
      ...match,
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      playedAt: null
    }))
  };
  const playersById = idMap(state.players);
  const timeline = [];

  playedMatches.forEach((actualMatch) => {
    const beforeForecast = computeSeasonForecast(base, {
      simulationCount: options.simulationCount ?? SIMULATION_DEFAULTS.timeline
    });
    const target = base.matches.find((match) => match.id === actualMatch.id);
    if (!target) {
      return;
    }
    target.status = "played";
    target.homeScore = actualMatch.homeScore;
    target.awayScore = actualMatch.awayScore;
    target.playedAt = actualMatch.playedAt;
    target.note = actualMatch.note;

    const afterForecast = computeSeasonForecast(base, {
      simulationCount: options.simulationCount ?? SIMULATION_DEFAULTS.timeline
    });
    const standings = computeStandings(base);
    const leader = standings[0];
    const homeWin = actualMatch.homeScore > actualMatch.awayScore;
    const awayWin = actualMatch.homeScore < actualMatch.awayScore;
    const actorId = homeWin
      ? actualMatch.homePlayerId
      : awayWin
        ? actualMatch.awayPlayerId
        : leader?.playerId;
    const actor = actorId ? playersById[actorId] : null;
    const beforeChance = actor ? beforeForecast.byId[actor.id].titleChance : 0;
    const afterChance = actor ? afterForecast.byId[actor.id].titleChance : 0;
    const swing = Math.round(afterChance - beforeChance);
    const winnerLabel = homeWin
      ? playersById[actualMatch.homePlayerId].name
      : awayWin
        ? playersById[actualMatch.awayPlayerId].name
        : "Ничья";

    timeline.push({
      matchId: actualMatch.id,
      round: actualMatch.round,
      title: `${playersById[actualMatch.homePlayerId].name} ${actualMatch.homeScore}:${actualMatch.awayScore} ${playersById[actualMatch.awayPlayerId].name}`,
      leaderName: leader?.name || "—",
      leaderChance: leader ? afterForecast.byId[leader.playerId].titleChance : 0,
      winnerLabel,
      swing,
      playedAt: actualMatch.playedAt,
      note: actualMatch.note,
      summary:
        winnerLabel === "Ничья"
          ? `Ничья оставила таблицу плотной, а лидер после тура: ${leader?.name || "—"}.`
          : `${winnerLabel} закрыл матч и ${
              swing >= 0
                ? `поднял свой титульный коридор примерно на ${swing} п.п.`
                : `не усилил титульную траекторию, несмотря на победу.`
            }`
    });
  });

  return timeline;
}

function buildPublicViewModel(state, options = {}) {
  const normalized = normalizeTournamentState(state);
  const standings = computeStandings(normalized);
  const forecast = computeSeasonForecast(normalized, {
    simulationCount: options.simulationCount ?? SIMULATION_DEFAULTS.forecast
  });
  const titleOdds = forecast.rows.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    chance: row.titleChance
  }));
  const playedMatches = getPlayedMatches(normalized);
  const playersById = idMap(normalized.players);
  const scheduleStrengthMap = buildScheduleStrength(normalized, standings);
  const { analyticsByPlayer, powerRanking } = computePlayerAnalytics(
    normalized,
    standings,
    scheduleStrengthMap
  );
  const importance = evaluateMatchImportance(normalized, forecast, {
    simulationCount: options.importanceSimulations ?? SIMULATION_DEFAULTS.importance
  });

  const playerCards = normalized.players.map((player) => {
    const stats = standings.find((row) => row.playerId === player.id) || null;
    const form = getPlayerForm(normalized, player.id);
    const nextOpponent = normalized.matches
      .filter(
        (match) =>
          match.status !== "played" &&
          (match.homePlayerId === player.id || match.awayPlayerId === player.id)
      )
      .sort(compareMatchOrder)[0];
    const lastResult = playedMatches
      .filter(
        (match) =>
          match.homePlayerId === player.id || match.awayPlayerId === player.id
      )
      .slice(-1)[0];
    const analytics = analyticsByPlayer[player.id];

    return {
      player,
      stats,
      form,
      analytics,
      nextOpponentId: nextOpponent
        ? nextOpponent.homePlayerId === player.id
          ? nextOpponent.awayPlayerId
          : nextOpponent.homePlayerId
        : null,
      lastResult: lastResult
        ? {
            ...lastResult,
            homePlayer: playersById[lastResult.homePlayerId],
            awayPlayer: playersById[lastResult.awayPlayerId]
          }
        : null
    };
  });

  const decoratedMatches = normalized.matches
    .slice()
    .sort(compareMatchOrder)
    .map((match) => ({
      ...match,
      homePlayer: playersById[match.homePlayerId],
      awayPlayer: playersById[match.awayPlayerId],
      importance: importance.byId[match.id] || null,
      prediction: buildMatchPrediction(normalized, match, {
        analyticsByPlayer,
        importanceById: importance.byId
      })
    }));

  const nextMatch =
    decoratedMatches.find((match) => match.status !== "played") || null;
  const lastMatch =
    decoratedMatches.filter((match) => match.status === "played").slice(-1)[0] ||
    null;
  const topScoringMatch =
    decoratedMatches
      .filter((match) => match.status === "played")
      .slice()
      .sort(
        (left, right) =>
          right.homeScore +
            right.awayScore -
            (left.homeScore + left.awayScore) ||
          compareMatchOrder(left, right)
      )[0] || null;

  return {
    state: normalized,
    derived: {
      standings,
      titleOdds,
      forecast,
      nextMatch,
      lastMatch,
      topScoringMatch,
      powerRanking,
      importanceBoard: importance.board,
      timeline: buildSeasonTimeline(normalized, {
        simulationCount: options.timelineSimulations ?? SIMULATION_DEFAULTS.timeline
      }),
      totals: {
        totalMatches: normalized.matches.length,
        playedMatches: playedMatches.length,
        totalGoals: playedMatches.reduce(
          (sum, match) => sum + match.homeScore + match.awayScore,
          0
        )
      },
      playerCards,
      matches: decoratedMatches
    }
  };
}

function applyAdminAction(state, action) {
  const current = normalizeTournamentState(state);
  const draft = copy(current);
  const payload = action?.payload || {};

  switch (action?.type) {
    case "save_tournament":
      draft.tournament.title = String(payload.title || draft.tournament.title).trim();
      draft.tournament.subtitle = String(
        payload.subtitle || draft.tournament.subtitle
      ).trim();
      draft.tournament.description = String(
        payload.description || draft.tournament.description
      ).trim();
      draft.tournament.statusLabel = String(
        payload.statusLabel || draft.tournament.statusLabel
      ).trim();
      draft.tournament.roundsCount = clamp(
        toNumber(payload.roundsCount, draft.tournament.roundsCount),
        1,
        15
      );
      break;

    case "save_players":
      draft.players = normalizeTournamentState({
        tournament: draft.tournament,
        players: Array.isArray(payload.players) ? payload.players : draft.players,
        matches: []
      }).players;
      draft.matches = draft.matches.filter((match) =>
        draft.players.some((player) => player.id === match.homePlayerId) &&
        draft.players.some((player) => player.id === match.awayPlayerId)
      );
      break;

    case "generate_schedule":
      draft.matches = createLeagueSchedule(
        draft.players,
        draft.tournament.roundsCount
      );
      break;

    case "save_match_result": {
      const target = draft.matches.find((match) => match.id === payload.matchId);
      if (!target) {
        throw new Error("Матч не найден.");
      }
      if (
        payload.homeScore === "" ||
        payload.homeScore === null ||
        payload.homeScore === undefined ||
        payload.awayScore === "" ||
        payload.awayScore === null ||
        payload.awayScore === undefined
      ) {
        throw new Error("Для сохранения результата нужно указать оба счета.");
      }
      target.homeScore = Math.max(0, toNumber(payload.homeScore, 0));
      target.awayScore = Math.max(0, toNumber(payload.awayScore, 0));
      target.status = "played";
      target.playedAt = safeDate(payload.playedAt) || new Date().toISOString();
      target.note = String(payload.note || "").trim();
      break;
    }

    case "clear_match_result": {
      const target = draft.matches.find((match) => match.id === payload.matchId);
      if (!target) {
        throw new Error("Матч не найден.");
      }
      target.homeScore = null;
      target.awayScore = null;
      target.status = "scheduled";
      target.playedAt = null;
      break;
    }

    case "reset_schedule":
      draft.matches = [];
      break;

    default:
      throw new Error("Неизвестное действие.");
  }

  draft.tournament.updatedAt = new Date().toISOString();
  return normalizeTournamentState(draft);
}
