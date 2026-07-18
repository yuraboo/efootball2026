const DEFAULT_TOURNAMENT = {
  title: "Турнир eFootball 2026",
  subtitle: "Лига друзей",
  description:
    "Закрытый турнир с общей таблицей, календарем, формой игроков и превью по каждому матчу.",
  roundsCount: 2,
  statusLabel: "Регулярный сезон",
  updatedAt: null
};

const SIMULATION_DEFAULTS = {
  forecast: 700,
  forecastFast: 240,
  importance: 180,
  timeline: 120
};

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/ё/g, "e");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(items, fallback = 0) {
  return items.length
    ? items.reduce((sum, value) => sum + value, 0) / items.length
    : fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRating(value, fallback = 1000) {
  return Math.max(1, Math.round(toNumber(value, fallback)));
}

function ratingLog(value) {
  return Math.log10(normalizeRating(value));
}

function ratingEdge(strongerSideRating, weakerSideRating) {
  return ratingLog(weakerSideRating) - ratingLog(strongerSideRating);
}

function ratingBonus(value) {
  return Math.max(0, 6 - ratingLog(value));
}

function formatInteger(value) {
  return new Intl.NumberFormat("ru-RU").format(
    Math.round(toNumber(value, 0))
  );
}

function formatSigned(value) {
  const rounded = Math.round(toNumber(value, 0));
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function placeLabel(rank) {
  if (!rank) {
    return "вне таблицы";
  }
  return `на ${rank}-м месте`;
}

function winsDrawsLosses(stats) {
  return `${stats.wins}-${stats.draws}-${stats.losses}`;
}

function goalBalanceText(stats) {
  return `${stats.goalsFor}:${stats.goalsAgainst} и разница ${formatSigned(
    stats.goalDiff
  )}`;
}

function pointsFromScore(goalsFor, goalsAgainst) {
  if (goalsFor > goalsAgainst) {
    return 3;
  }
  if (goalsFor === goalsAgainst) {
    return 1;
  }
  return 0;
}

function getOpponentId(match, playerId) {
  return match.homePlayerId === playerId ? match.awayPlayerId : match.homePlayerId;
}

function buildSeed(input) {
  let hash = 2166136261;
  const text = String(input || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function safeDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDatetimeLocal(value) {
  const date = safeDate(value);
  if (!date) {
    return null;
  }
  return date.slice(0, 16);
}

function copy(data) {
  return JSON.parse(JSON.stringify(data));
}

function compareMatchOrder(left, right) {
  if (left.round !== right.round) {
    return left.round - right.round;
  }
  return String(left.id).localeCompare(String(right.id), "ru");
}

function createEmptyStats(playerId = "", name = "") {
  return {
    playerId,
    name,
    rank: null,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0
  };
}

function idMap(players) {
  return Object.fromEntries(players.map((player) => [player.id, player]));
}

function basePlayerStrength(state, row) {
  const player = state.players.find((item) => item.id === row.playerId);
  const form = getPlayerForm(state, row.playerId);
  return (
    48 +
    row.points * 8.2 +
    row.goalDiff * 1.6 +
    row.goalsFor * 0.55 +
    form.score * 6.4 +
    ratingBonus(player?.rating || 1000) * 4.1
  );
}

function scenarioScoreline(core, outcome) {
  const dominance = Math.abs(core.homeChance - core.awayChance);
  const expectedTempo =
    average(
      [
        core.homeStats.played
          ? core.homeStats.goalsFor / core.homeStats.played
          : 1.8,
        core.awayStats.played
          ? core.awayStats.goalsFor / core.awayStats.played
          : 1.6
      ],
      1.7
    ) * 2;
  const openGame = expectedTempo >= 4.4;

  if (outcome === "home") {
    if (dominance >= 18) {
      return openGame ? [3, 1] : [2, 0];
    }
    return openGame ? [2, 1] : [1, 0];
  }

  if (outcome === "away") {
    if (dominance >= 18) {
      return openGame ? [1, 3] : [0, 2];
    }
    return openGame ? [1, 2] : [0, 1];
  }

  return openGame ? [2, 2] : [1, 1];
}

function sampleOutcome(core, random) {
  const draw = core.drawChance / 100;
  const homeWin = core.homeWinChance / 100;
  const roll = random();
  if (roll <= homeWin) {
    return "home";
  }
  if (roll <= homeWin + draw) {
    return "draw";
  }
  return "away";
}

function sampleScoreline(core, outcome, random) {
  const [homeBase, awayBase] = scenarioScoreline(core, outcome);
  const bonusRoll = random();
  const homeScore = homeBase + (bonusRoll > 0.84 && outcome !== "away" ? 1 : 0);
  const awayScore = awayBase + (bonusRoll < 0.16 && outcome !== "home" ? 1 : 0);

  if (outcome === "draw" && homeScore !== awayScore) {
    return [Math.max(homeScore, awayScore), Math.max(homeScore, awayScore)];
  }
  if (outcome === "home" && homeScore <= awayScore) {
    return [awayScore + 1, awayScore];
  }
  if (outcome === "away" && awayScore <= homeScore) {
    return [homeScore, homeScore + 1];
  }
  return [homeScore, awayScore];
}

function strengthLabel(index) {
  if (index >= 112) {
    return "самый тяжелый путь";
  }
  if (index >= 104) {
    return "сложный финиш";
  }
  if (index <= 88) {
    return "мягкий финиш";
  }
  if (index <= 96) {
    return "чуть легче среднего";
  }
  return "ровный календарь";
}

function styleProfile(stats, matches) {
  if (!stats.played) {
    return {
      label: "Профиль формируется",
      detail: "Нужны сыгранные матчи, чтобы определить реальный стиль.",
      tempo: "без данных"
    };
  }

  const goalsForPerGame = stats.goalsFor / stats.played;
  const goalsAgainstPerGame = stats.goalsAgainst / stats.played;
  const drawRate = stats.draws / stats.played;
  const avgTotalGoals =
    average(matches.map((match) => match.goalsFor + match.goalsAgainst), 0);

  if (goalsForPerGame >= 2.6 && goalsAgainstPerGame >= 1.5) {
    return {
      label: "Открытый футбол",
      detail: "Матчи этого игрока почти всегда уходят в высокий темп и обмен ударами.",
      tempo: "высокий темп"
    };
  }

  if (goalsAgainstPerGame <= 0.9 && drawRate >= 0.25) {
    return {
      label: "Прагматичный контроль",
      detail: "Сначала структура и оборона, а уже потом риск в атаке.",
      tempo: "низкий риск"
    };
  }

  if (goalsForPerGame >= 2.2 && goalsAgainstPerGame <= 1.2) {
    return {
      label: "Системный фаворит",
      detail: "Давит через качество исполнения и редко теряет баланс.",
      tempo: "контроль ритма"
    };
  }

  if (drawRate >= 0.4) {
    return {
      label: "Турнирный прагматик",
      detail: "Часто дожимает именно турнирный результат, а не красоту матча.",
      tempo: "вязкий матч"
    };
  }

  if (avgTotalGoals >= 4.6) {
    return {
      label: "Без тормозов",
      detail: "Игры этого участника быстро взрываются по моментам и счету.",
      tempo: "вертикальный режим"
    };
  }

  return {
    label: "Гибкий баланс",
    detail: "Игрок способен менять сценарий под соперника и турнирную задачу.",
    tempo: "адаптивный темп"
  };
}

function buildTrendLabel(formItems) {
  if (!formItems.length) {
    return "без инерции";
  }
  const recent = formItems.slice(-3);
  const score = average(
    recent.map((item) => pointsFromScore(item.goalsFor, item.goalsAgainst)),
    0
  );
  if (score >= 2.3) {
    return "разгоняется";
  }
  if (score <= 0.8) {
    return "проседает";
  }
  return "держит темп";
}

function buildMatchupProfile(core, analyticsByPlayer = {}) {
  const homeStyle = analyticsByPlayer[core.homePlayer.id]?.style?.label || "";
  const awayStyle = analyticsByPlayer[core.awayPlayer.id]?.style?.label || "";

  let label = "Рабочая пара";
  let summary =
    "Здесь решит качество исполнения базовых моментов, а не один отдельный фактор.";

  if (!core.headToHead.played) {
    label = "Новый матчап";
    summary =
      "Пара еще не оставила очного следа в этом сезоне, поэтому главное значение имеет текущая форма и место в таблице.";
  } else if (Math.abs(core.headToHead.leftWins - core.headToHead.rightWins) >= 2) {
    label = "Неудобный соперник";
    summary =
      "Очная история уже показывает перекос: одному из игроков удобнее именно этот стиль и этот ритм пары.";
  } else if (Math.abs(core.homeChance - core.awayChance) <= 6) {
    label = "Тонкий баланс";
    summary =
      "Почти идеальная монета: малейшая просадка в реализации способна полностью перевернуть исход.";
  }

  if (homeStyle && awayStyle && homeStyle !== awayStyle) {
    summary = `${summary} С точки зрения стилей это столкновение "${homeStyle.toLowerCase()}" против "${awayStyle.toLowerCase()}".`;
  }

  return {
    label,
    summary
  };
}

function articleParagraphs({
  match,
  homePlayer,
  awayPlayer,
  homeStats,
  awayStats,
  headToHead,
  favorite,
  ratingWeightPercent,
  tournamentWeightPercent,
  matchup,
  importance
}) {
  const paragraphs = [
    `${homePlayer.name} подходит к матчу, находясь ${placeLabel(homeStats.rank)} с ${homeStats.points} очками, а ${awayPlayer.name} идет ${placeLabel(awayStats.rank)}. По текущему сезону модель в первую очередь смотрит на таблицу, форму и разницу мячей: у хозяев ${goalBalanceText(homeStats)}, у гостей ${goalBalanceText(awayStats)}.`
  ];

  if (headToHead.played) {
    paragraphs.push(
      `Очная история этой пары уже дает материал для вывода: за ${headToHead.played} матчей счет по победам ${headToHead.leftWins}-${headToHead.draws}-${headToHead.rightWins}, по голам ${headToHead.leftGoals}:${headToHead.rightGoals}. Именно поэтому матчап маркируется как "${matchup.label.toLowerCase()}": у этой дуэли уже появился свой узнаваемый сценарий.`
    );
  } else {
    paragraphs.push(
      `Очных матчей между ${homePlayer.name} и ${awayPlayer.name} в этой лиге пока не было, поэтому модель сильнее опирается на общее положение в текущем турнире, свежую форму и баланс голов. Для новой пары это надежнее, чем делать слишком смелые выводы по одному только рейтингу.`
    );
  }

  if (importance) {
    paragraphs.push(
      `С точки зрения симулятора сезона это матч уровня "${importance.label.toLowerCase()}": индекс важности ${importance.score}/100. Главный сезонный swing здесь у игрока ${importance.focusPlayerName}, а диапазон по титульным шансам способен качнуться примерно на ${importance.titleSwing} п.п. в зависимости от исхода.`
    );
  }

  paragraphs.push(
    `Глобальный рейтинг тоже учитывается, но сознательно остается фоновым сигналом: около ${ratingWeightPercent}% веса против ${tournamentWeightPercent}% у показателей именно этого сезона. Поэтому ${favorite.name} идет фаворитом не просто из-за цифры рейтинга, а потому что суммарно лучше смотрится в текущем раскладе; рейтинг лишь немного усиливает этот вывод.`
  );

  if (match.note) {
    paragraphs.push(`Дополнительная заметка по паре: ${match.note}`);
  }

  if (match.status === "played") {
    paragraphs[0] = `${homePlayer.name} и ${awayPlayer.name} уже закрыли этот матч, но досье пары остается полезным: на момент игры ключевыми были место в таблице, форма и баланс голов. У хозяев было ${goalBalanceText(homeStats)}, у гостей ${goalBalanceText(awayStats)}, и именно турнирный контекст оставался главным сигналом модели.`;
  }

  return paragraphs;
}

function normalizeTournamentState(state) {
  const source = state || {};
  const tournament = {
    ...DEFAULT_TOURNAMENT,
    ...(source.tournament || {})
  };

  const players = Array.isArray(source.players)
    ? source.players
        .map((player, index) => ({
          id: player.id || slugify(player.name) || `player-${index + 1}`,
          name: String(player.name || `Игрок ${index + 1}`).trim(),
          rating: normalizeRating(player.rating),
          photoUrl: String(player.photoUrl || "").trim(),
          notes: String(player.notes || "").trim()
        }))
        .filter((player) => player.name)
    : [];

  const playerIds = new Set(players.map((player) => player.id));

  const matches = Array.isArray(source.matches)
    ? source.matches
        .map((match, index) => ({
          id: match.id || `match-${index + 1}`,
          round: Math.max(1, toNumber(match.round, 1)),
          homePlayerId: match.homePlayerId,
          awayPlayerId: match.awayPlayerId,
          status: match.status === "played" ? "played" : "scheduled",
          homeScore:
            match.homeScore === null || match.homeScore === undefined
              ? null
              : Math.max(0, toNumber(match.homeScore, 0)),
          awayScore:
            match.awayScore === null || match.awayScore === undefined
              ? null
              : Math.max(0, toNumber(match.awayScore, 0)),
          playedAt: safeDate(match.playedAt),
          note: String(match.note || "").trim()
        }))
        .filter(
          (match) =>
            playerIds.has(match.homePlayerId) &&
            playerIds.has(match.awayPlayerId) &&
            match.homePlayerId !== match.awayPlayerId
        )
    : [];

  tournament.roundsCount = clamp(toNumber(tournament.roundsCount, 2), 1, 6);
  tournament.updatedAt =
    safeDate(tournament.updatedAt) || new Date().toISOString();

  return {
    tournament,
    players,
    matches
  };
}

function createLeagueSchedule(players, roundsCount) {
  const activePlayers = players.map((player) => player.id);
  if (activePlayers.length < 2) {
    return [];
  }

  const roster = activePlayers.slice();
  if (roster.length % 2 !== 0) {
    roster.push(null);
  }

  const baseRounds = [];
  const rotation = roster.slice();
  const lastIndex = rotation.length - 1;

  for (let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex += 1) {
    const pairings = [];
    for (let pairIndex = 0; pairIndex < rotation.length / 2; pairIndex += 1) {
      const home = rotation[pairIndex];
      const away = rotation[lastIndex - pairIndex];
      if (home && away) {
        pairings.push({ homePlayerId: home, awayPlayerId: away });
      }
    }
    baseRounds.push(pairings);

    const [fixed, ...rest] = rotation;
    rest.unshift(rest.pop());
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  const schedule = [];
  let counter = 1;

  for (let cycle = 0; cycle < roundsCount; cycle += 1) {
    baseRounds.forEach((roundPairings, roundIndex) => {
      roundPairings.forEach((pairing) => {
        const reversed = cycle % 2 === 1;
        schedule.push({
          id: `match-${counter}`,
          round: cycle * baseRounds.length + roundIndex + 1,
          homePlayerId: reversed ? pairing.awayPlayerId : pairing.homePlayerId,
          awayPlayerId: reversed ? pairing.homePlayerId : pairing.awayPlayerId,
          status: "scheduled",
          homeScore: null,
          awayScore: null,
          playedAt: null,
          note: ""
        });
        counter += 1;
      });
    });
  }

  return schedule;
}

function getPlayedMatches(state) {
  return state.matches
    .filter(
      (match) =>
        match.status === "played" &&
        Number.isInteger(match.homeScore) &&
        Number.isInteger(match.awayScore)
    )
    .sort(compareMatchOrder);
}
