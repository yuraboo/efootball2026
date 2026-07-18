function computeStandings(state) {
  const rows = new Map();
  state.players.forEach((player) => {
    rows.set(player.id, createEmptyStats(player.id, player.name));
  });

  getPlayedMatches(state).forEach((match) => {
    const home = rows.get(match.homePlayerId);
    const away = rows.get(match.awayPlayerId);
    if (!home || !away) {
      return;
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (match.homeScore < match.awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      goalDiff: row.goalsFor - row.goalsAgainst
    }))
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }
      if (right.goalDiff !== left.goalDiff) {
        return right.goalDiff - left.goalDiff;
      }
      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor;
      }
      return left.name.localeCompare(right.name, "ru");
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));
}

function getPlayerStats(state, playerId) {
  return computeStandings(state).find((row) => row.playerId === playerId) || null;
}

function getPlayerMatches(state, playerId) {
  return state.matches
    .filter(
      (match) =>
        match.homePlayerId === playerId || match.awayPlayerId === playerId
    )
    .sort(compareMatchOrder);
}

function getPlayerForm(state, playerId, limit = 5) {
  const matches = getPlayedMatches(state)
    .filter(
      (match) =>
        match.homePlayerId === playerId || match.awayPlayerId === playerId
    )
    .slice(-limit);

  const form = matches.map((match) => {
    const isHome = match.homePlayerId === playerId;
    const goalsFor = isHome ? match.homeScore : match.awayScore;
    const goalsAgainst = isHome ? match.awayScore : match.homeScore;
    const result =
      goalsFor > goalsAgainst ? "В" : goalsFor < goalsAgainst ? "П" : "Н";

    return {
      matchId: match.id,
      round: match.round,
      goalsFor,
      goalsAgainst,
      result
    };
  });

  const weighted = form.reduce((sum, item, index) => {
    const weight = (index + 1) / form.length || 1;
    return sum + pointsFromScore(item.goalsFor, item.goalsAgainst) * weight;
  }, 0);

  return {
    items: form,
    score: form.length ? weighted / form.length : 0
  };
}

function getHeadToHead(state, leftPlayerId, rightPlayerId) {
  const matches = getPlayedMatches(state).filter(
    (match) =>
      (match.homePlayerId === leftPlayerId &&
        match.awayPlayerId === rightPlayerId) ||
      (match.homePlayerId === rightPlayerId &&
        match.awayPlayerId === leftPlayerId)
  );

  let leftWins = 0;
  let rightWins = 0;
  let draws = 0;
  let leftGoals = 0;
  let rightGoals = 0;

  matches.forEach((match) => {
    const leftHome = match.homePlayerId === leftPlayerId;
    const leftScore = leftHome ? match.homeScore : match.awayScore;
    const rightScore = leftHome ? match.awayScore : match.homeScore;
    leftGoals += leftScore;
    rightGoals += rightScore;

    if (leftScore > rightScore) {
      leftWins += 1;
    } else if (leftScore < rightScore) {
      rightWins += 1;
    } else {
      draws += 1;
    }
  });

  return {
    played: matches.length,
    leftWins,
    rightWins,
    draws,
    leftGoals,
    rightGoals
  };
}

function buildScheduleStrength(state, standings) {
  const baseStrengthMap = Object.fromEntries(
    standings.map((row) => [row.playerId, basePlayerStrength(state, row)])
  );
  const leagueAverage = average(Object.values(baseStrengthMap), 1);

  return Object.fromEntries(
    state.players.map((player) => {
      const matches = getPlayerMatches(state, player.id);
      const playedStrength = matches
        .filter((match) => match.status === "played")
        .map((match) => baseStrengthMap[getOpponentId(match, player.id)] || leagueAverage);
      const remainingStrength = matches
        .filter((match) => match.status !== "played")
        .map((match) => baseStrengthMap[getOpponentId(match, player.id)] || leagueAverage);

      const playedIndex = Math.round(
        (average(playedStrength, leagueAverage) / leagueAverage) * 100
      );
      const remainingIndex = Math.round(
        (average(remainingStrength, leagueAverage) / leagueAverage) * 100
      );
      const overallIndex = Math.round(
        (average([...playedStrength, ...remainingStrength], leagueAverage) /
          leagueAverage) *
          100
      );

      return [
        player.id,
        {
          playedIndex,
          remainingIndex,
          overallIndex,
          remainingLabel: strengthLabel(remainingIndex),
          summary:
            remainingIndex > 104
              ? "Впереди тяжелый календарь по силе соперников."
              : remainingIndex < 96
                ? "Финишный отрезок мягче среднего по лиге."
                : "Календарь игрока близок к среднему по сложности."
        }
      ];
    })
  );
}

function computePlayerAnalytics(state, standings, scheduleStrengthMap) {
  const playersById = idMap(state.players);
  const analyticsByPlayer = {};

  standings.forEach((row) => {
    const player = playersById[row.playerId];
    const playedMatches = getPlayedMatches(state)
      .filter(
        (match) =>
          match.homePlayerId === row.playerId || match.awayPlayerId === row.playerId
      )
      .map((match) => {
        const isHome = match.homePlayerId === row.playerId;
        return {
          ...match,
          goalsFor: isHome ? match.homeScore : match.awayScore,
          goalsAgainst: isHome ? match.awayScore : match.homeScore,
          opponentId: getOpponentId(match, row.playerId)
        };
      });
    const form = getPlayerForm(state, row.playerId);
    const closeMatches = playedMatches.filter(
      (match) => Math.abs(match.goalsFor - match.goalsAgainst) <= 1
    );
    const strongerMatches = playedMatches.filter((match) => {
      const opponent = playersById[match.opponentId];
      return opponent && opponent.rating < player.rating;
    });
    const clutchScore = closeMatches.length
      ? Math.round(
          (closeMatches.reduce(
            (sum, match) => sum + pointsFromScore(match.goalsFor, match.goalsAgainst),
            0
          ) /
            (closeMatches.length * 3)) *
            100
        )
      : 50;
    const upsetScore = strongerMatches.length
      ? Math.round(
          (strongerMatches.reduce(
            (sum, match) => sum + pointsFromScore(match.goalsFor, match.goalsAgainst),
            0
          ) /
            (strongerMatches.length * 3)) *
            100
        )
      : 0;
    const pointsPerGame = row.played ? row.points / row.played : 0;
    const goalDiffPerGame = row.played ? row.goalDiff / row.played : 0;
    const style = styleProfile(row, playedMatches);
    const trendLabel = buildTrendLabel(form.items);

    analyticsByPlayer[row.playerId] = {
      form,
      style,
      clutchScore,
      upsetScore,
      strongerMatches: strongerMatches.length,
      trendLabel,
      schedule: scheduleStrengthMap[row.playerId],
      powerScore:
        42 +
        pointsPerGame * 14 +
        goalDiffPerGame * 7 +
        form.score * 8 +
        scheduleStrengthMap[row.playerId].playedIndex * 0.05 +
        clutchScore * 0.15 +
        upsetScore * 0.06 +
        ratingBonus(player.rating) * 1.7
    };
  });

  const powerRanking = standings
    .map((row) => ({
      playerId: row.playerId,
      name: row.name,
      score: Math.round(analyticsByPlayer[row.playerId].powerScore),
      trendLabel: analyticsByPlayer[row.playerId].trendLabel,
      style: analyticsByPlayer[row.playerId].style.label,
      schedule: analyticsByPlayer[row.playerId].schedule,
      clutchScore: analyticsByPlayer[row.playerId].clutchScore,
      upsetScore: analyticsByPlayer[row.playerId].upsetScore
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ru"))
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));

  powerRanking.forEach((row) => {
    analyticsByPlayer[row.playerId].powerRank = row.rank;
  });

  return {
    analyticsByPlayer,
    powerRanking
  };
}

function buildMatchCore(state, match) {
  if (!match) {
    return null;
  }

  const homePlayer = state.players.find((player) => player.id === match.homePlayerId);
  const awayPlayer = state.players.find((player) => player.id === match.awayPlayerId);
  if (!homePlayer || !awayPlayer) {
    return null;
  }

  const homeStats = getPlayerStats(state, match.homePlayerId) ||
    createEmptyStats(match.homePlayerId, homePlayer.name);
  const awayStats = getPlayerStats(state, match.awayPlayerId) ||
    createEmptyStats(match.awayPlayerId, awayPlayer.name);
  const homeForm = getPlayerForm(state, match.homePlayerId);
  const awayForm = getPlayerForm(state, match.awayPlayerId);
  const headToHead = getHeadToHead(state, match.homePlayerId, match.awayPlayerId);

  const tournamentWeightPercent = 86;
  const ratingWeightPercent = 14;
  const pointsEdge = (homeStats.points - awayStats.points) * 1.45;
  const goalDiffEdge = (homeStats.goalDiff - awayStats.goalDiff) * 0.52;
  const formEdge = (homeForm.score - awayForm.score) * 7.2;
  const h2hEdge = (headToHead.leftWins - headToHead.rightWins) * 3.4;
  const tournamentChance = Math.round(
    clamp(50 + pointsEdge + goalDiffEdge + formEdge + h2hEdge, 24, 76)
  );
  const ratingChance = Math.round(
    clamp(50 + ratingEdge(homePlayer.rating, awayPlayer.rating) * 18, 32, 68)
  );
  const homeChance = Math.round(
    clamp(
      tournamentChance * (tournamentWeightPercent / 100) +
        ratingChance * (ratingWeightPercent / 100),
      22,
      78
    )
  );
  const awayChance = 100 - homeChance;
  const drawChance = Math.round(
    clamp(
      16 +
        (100 - Math.abs(homeChance - awayChance)) * 0.12 +
        Math.min(headToHead.draws, 2) * 2 -
        Math.abs(homeStats.goalDiff - awayStats.goalDiff) * 0.18,
      14,
      30
    )
  );
  const homeWinChance = Math.round(((100 - drawChance) * homeChance) / 100);
  const awayWinChance = 100 - drawChance - homeWinChance;
  const confidence = clamp(
    Math.round(
      42 +
        Math.abs(homeChance - awayChance) * 1.4 +
        Math.min(headToHead.played, 4) * 4 +
        Math.min(homeStats.played + awayStats.played, 10) * 1.5
    ),
    45,
    92
  );

  return {
    match,
    homePlayer,
    awayPlayer,
    homeStats,
    awayStats,
    homeForm,
    awayForm,
    headToHead,
    homeChance,
    awayChance,
    drawChance,
    homeWinChance,
    awayWinChance,
    confidence,
    favorite: homeChance >= awayChance ? homePlayer : awayPlayer,
    outsider: homeChance >= awayChance ? awayPlayer : homePlayer,
    ratingWeightPercent,
    tournamentWeightPercent
  };
}

function buildMatchPrediction(state, match, context = {}) {
  const core = buildMatchCore(state, match);
  if (!core) {
    return null;
  }

  const analyticsByPlayer = context.analyticsByPlayer || {};
  const importance = context.importanceById?.[match.id] || null;
  const matchup = buildMatchupProfile(core, analyticsByPlayer);

  let tone =
    "Пара выглядит близкой по текущему раскладу: здесь многое решат темп старта, реализация и качество обороны без мяча.";
  if (Math.abs(core.homeChance - core.awayChance) >= 10) {
    tone = `${core.favorite.name} подходит к игре с заметным перевесом по сумме турнирных факторов, однако ${core.outsider.name} остается в матче за счет возможности навязать неудобный сценарий.`;
  }
  if (Math.abs(core.homeChance - core.awayChance) >= 22) {
    tone = `${core.favorite.name} выглядит явным фаворитом на бумаге. Главный риск для фаворита здесь один: потерять контроль над ритмом и отдать инициативу уже в дебюте.`;
  }
  if (importance?.score >= 70) {
    tone = `${tone} При этом сама игра входит в число ключевых узлов сезона: сценарий таблицы после нее может качнуться особенно сильно.`;
  }

  const articleTitle =
    match.status === "played"
      ? `${core.homePlayer.name} и ${core.awayPlayer.name}: разбор силы пары`
      : `${core.homePlayer.name} против ${core.awayPlayer.name}: кто заберет матч раунда ${match.round}`;
  const articleDek =
    match.status === "played"
      ? `${core.favorite.name} до игры смотрелся лучше по модели, но главный вес все равно приходился на ход текущего сезона, а не на внешний рейтинг.`
      : `${core.favorite.name} выходит фаворитом модели с раскладом ${core.homeChance}% на ${core.awayChance}%, причем основной вес отдан показателям этой лиги, а рейтинг лишь слегка усиливает перевес.`;

  return {
    homeChance: core.homeChance,
    awayChance: core.awayChance,
    drawChance: core.drawChance,
    homeWinChance: core.homeWinChance,
    awayWinChance: core.awayWinChance,
    confidence: core.confidence,
    favoritePlayerId: core.favorite.id,
    summary: tone,
    matchup,
    importance,
    weights: {
      tournament: core.tournamentWeightPercent,
      rating: core.ratingWeightPercent
    },
    article: {
      label: match.status === "played" ? "Досье пары" : "Предматчевая статья",
      title: articleTitle,
      dek: articleDek,
      paragraphs: articleParagraphs({
        match,
        homePlayer: core.homePlayer,
        awayPlayer: core.awayPlayer,
        homeStats: core.homeStats,
        awayStats: core.awayStats,
        headToHead: core.headToHead,
        favorite: core.favorite,
        ratingWeightPercent: core.ratingWeightPercent,
        tournamentWeightPercent: core.tournamentWeightPercent,
        matchup,
        importance
      })
    },
    factors: [
      {
        label: "Шансы модели",
        value: `${core.homeChance}% vs ${core.awayChance}%`
      },
      {
        label: "Ничья по модели",
        value: `${core.drawChance}%`
      },
      {
        label: "Турнирный вес",
        value: `${core.tournamentWeightPercent}% текущий сезон / ${core.ratingWeightPercent}% рейтинг`
      },
      {
        label: "Рейтинг (меньше лучше)",
        value: `${formatInteger(core.homePlayer.rating)} vs ${formatInteger(
          core.awayPlayer.rating
        )}`
      },
      {
        label: "Сезонный баланс",
        value: `${winsDrawsLosses(core.homeStats)} vs ${winsDrawsLosses(
          core.awayStats
        )}`
      },
      {
        label: "Матчап пары",
        value: matchup.label
      },
      {
        label: "Вес матча",
        value: importance
          ? `${importance.label}, индекс ${importance.score}`
          : "Обычный турнирный вес"
      }
    ]
  };
}

function deterministicForecastRows(state, standings) {
  const total = standings.length;
  return standings.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    titleChance: row.rank === 1 ? 100 : 0,
    top2Chance: row.rank <= Math.min(2, total) ? 100 : 0,
    bottomChance: row.rank === total ? 100 : 0,
    averagePlace: row.rank,
    expectedPoints: row.points,
    placeDistribution: Array.from({ length: total }, (_, index) =>
      index + 1 === row.rank ? 100 : 0
    )
  }));
}

function forecastToMap(rows) {
  return Object.fromEntries(rows.map((row) => [row.playerId, row]));
}

function forecastSeed(state, simulationCount) {
  return buildSeed(
    JSON.stringify({
      simulationCount,
      updatedAt: state.tournament.updatedAt,
      players: state.players.map((player) => [player.id, player.rating]),
      matches: state.matches.map((match) => [
        match.id,
        match.status,
        match.homeScore,
        match.awayScore,
        match.note
      ])
    })
  );
}

function simulateForecastRows(state, simulationCount) {
  const players = state.players;
  const tallies = Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        playerId: player.id,
        name: player.name,
        titleWins: 0,
        top2: 0,
        bottom: 0,
        pointsSum: 0,
        rankCounts: Array.from({ length: players.length }, () => 0)
      }
    ])
  );
  const random = createRng(forecastSeed(state, simulationCount));

  for (let run = 0; run < simulationCount; run += 1) {
    const draft = copy(state);
    const remainingMatches = draft.matches
      .filter((match) => match.status !== "played")
      .sort(compareMatchOrder);

    remainingMatches.forEach((match) => {
      const core = buildMatchCore(draft, match);
      const outcome = sampleOutcome(core, random);
      const [homeScore, awayScore] = sampleScoreline(core, outcome, random);
      match.status = "played";
      match.homeScore = homeScore;
      match.awayScore = awayScore;
      match.playedAt = state.tournament.updatedAt;
    });

    const standings = computeStandings(draft);
    standings.forEach((row, index) => {
      const tally = tallies[row.playerId];
      tally.pointsSum += row.points;
      tally.rankCounts[index] += 1;
      if (index === 0) {
        tally.titleWins += 1;
      }
      if (index <= 1) {
        tally.top2 += 1;
      }
      if (index === standings.length - 1) {
        tally.bottom += 1;
      }
    });
  }

  return Object.values(tallies)
    .map((row) => ({
      playerId: row.playerId,
      name: row.name,
      titleChance: Math.round((row.titleWins / simulationCount) * 100),
      top2Chance: Math.round((row.top2 / simulationCount) * 100),
      bottomChance: Math.round((row.bottom / simulationCount) * 100),
      averagePlace:
        row.rankCounts.reduce(
          (sum, count, index) => sum + count * (index + 1),
          0
        ) / simulationCount,
      expectedPoints: Number((row.pointsSum / simulationCount).toFixed(1)),
      placeDistribution: row.rankCounts.map((count) =>
        Math.round((count / simulationCount) * 100)
      )
    }))
    .sort(
      (left, right) =>
        right.titleChance - left.titleChance ||
        left.averagePlace - right.averagePlace ||
        left.name.localeCompare(right.name, "ru")
    );
}

function normalizeRoundedChances(rows, key) {
  const diff = 100 - rows.reduce((sum, row) => sum + row[key], 0);
  if (rows[0]) {
    rows[0][key] = clamp(rows[0][key] + diff, 0, 100);
  }
}
