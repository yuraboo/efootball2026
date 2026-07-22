(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMatchCount(count) {
    var value = Number(count) || 0;
    var mod100 = value % 100;
    var mod10 = value % 10;

    if (mod100 >= 11 && mod100 <= 14) {
      return value + ' матчей';
    }
    if (mod10 === 1) {
      return value + ' матч';
    }
    if (mod10 >= 2 && mod10 <= 4) {
      return value + ' матча';
    }
    return value + ' матчей';
  }

  function resultTone(goalsFor, goalsAgainst) {
    if (goalsFor > goalsAgainst) {
      return 'win';
    }
    if (goalsFor < goalsAgainst) {
      return 'loss';
    }
    return 'draw';
  }

  function resultToneClass(result) {
    return result === 'win' ? 'chip-win' : result === 'loss' ? 'chip-loss' : 'chip-draw';
  }

  function toChanceNumber(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function predictionChanceClass(chance, oppositeChance) {
    var primaryChance = toChanceNumber(chance);
    var opposite = toChanceNumber(oppositeChance);

    if (primaryChance > opposite) {
      return 'chip-win';
    }
    if (primaryChance < opposite) {
      return 'chip-loss';
    }
    return 'chip-draw';
  }

  function avatar(url, alt, className) {
    if (url) {
      return '<img class="' + className + '" src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) + '" />';
    }
    return '<div class="' + className + ' fallback">' + escapeHtml(String(alt || '').slice(0, 1) || 'И') + '</div>';
  }

  function renderMatchCard(match) {
    var isPlayed = match.status === 'played';
    var matchTone = isPlayed ? resultTone(match.homeScore, match.awayScore) : null;
    var matchToneLabel = isPlayed
      ? matchTone === 'win'
        ? 'Победа хозяев'
        : matchTone === 'loss'
          ? 'Победа гостей'
          : 'Ничья'
      : '';
    var statusLabel = isPlayed ? 'Сыгран' : 'В расписании';
    var statusClass = isPlayed ? 'match-state-played' : 'match-state-scheduled';
    var scoreLeft = isPlayed ? match.homeScore : '—';
    var scoreRight = isPlayed ? match.awayScore : '—';
    var centerLabel = isPlayed ? 'Финальный счет' : 'Матч впереди';
    var matchupLabel = match.prediction && match.prediction.matchup && match.prediction.matchup.label
      ? match.prediction.matchup.label
      : 'Новый матчап';
    var cardEyebrow = isPlayed ? 'Архив сезона' : 'Предстоящая игра';
    var homeWinChance = match.prediction ? toChanceNumber(match.prediction.homeWinChance) : 0;
    var drawChance = match.prediction ? toChanceNumber(match.prediction.drawChance) : 0;
    var awayWinChance = match.prediction ? toChanceNumber(match.prediction.awayWinChance) : 0;
    var homePredictionClass = match.prediction
      ? predictionChanceClass(homeWinChance, awayWinChance)
      : 'chip-win';
    var awayPredictionClass = match.prediction
      ? predictionChanceClass(awayWinChance, homeWinChance)
      : 'chip-loss';
    var chips = match.prediction
      ? '<span class="chip ' + homePredictionClass + '">П1 ' + escapeHtml(homeWinChance) + '%</span>' +
        '<span class="chip chip-draw">Х ' + escapeHtml(drawChance) + '%</span>' +
        '<span class="chip ' + awayPredictionClass + '">П2 ' + escapeHtml(awayWinChance) + '%</span>'
      : '';
    var resultChip = matchToneLabel
      ? '<span class="chip ' + resultToneClass(matchTone) + '">' + escapeHtml(matchToneLabel) + '</span>'
      : '';
    var importance = match.importance
      ? '<span class="impact-badge">' + escapeHtml(match.importance.score) + ' · ' + escapeHtml(match.importance.label) + '</span>'
      : '';
    var note = match.note
      ? '<div class="match-card-note"><div class="match-card-note-label">Описание матча</div><p>' + escapeHtml(match.note) + '</p></div>'
      : '';

    return '' +
      '<article class="match-card ' + (isPlayed ? 'played' : 'scheduled') + '">' +
        '<div class="match-card-shell">' +
          '<div class="match-card-top">' +
            '<div class="match-card-top-left">' +
              '<span class="match-card-stage">' + cardEyebrow + '</span>' +
            '</div>' +
            '<div class="match-card-top-right">' +
              importance +
            '</div>' +
          '</div>' +
          '<div class="match-card-body">' +
            '<div class="match-card-team match-card-team-home">' +
              '<div class="match-card-player">' +
                avatar(match.homePlayer.photoUrl, match.homePlayer.name, 'row-avatar') +
                '<div class="match-card-copy">' +
                  '<strong>' + escapeHtml(match.homePlayer.name) + '</strong>' +
                  '<div class="card-meta">Хозяева</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="match-card-center">' +
              '<div class="match-card-center-top">' +
                '<span class="round-pill ' + (isPlayed ? 'round-pill-played' : 'round-pill-scheduled') + '">Раунд ' + escapeHtml(match.round) + '</span>' +
                '<span class="match-result-badge ' + statusClass + '">' + statusLabel + '</span>' +
              '</div>' +
              '<div class="match-card-center-label">' + centerLabel + '</div>' +
              '<div class="match-card-score-big">' +
                '<span>' + escapeHtml(scoreLeft) + '</span>' +
                '<small>:</small>' +
                '<span>' + escapeHtml(scoreRight) + '</span>' +
              '</div>' +
              '<div class="match-card-center-subtitle">' + (isPlayed ? 'Матч завершен' : 'Ожидаем старт игры') + '</div>' +
            '</div>' +
            '<div class="match-card-team match-card-team-away">' +
              '<div class="match-card-player">' +
                avatar(match.awayPlayer.photoUrl, match.awayPlayer.name, 'row-avatar') +
                '<div class="match-card-copy">' +
                  '<strong>' + escapeHtml(match.awayPlayer.name) + '</strong>' +
                  '<div class="card-meta">Гости</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="match-card-footer">' +
            '<div class="match-card-footer-label">Матчап и вероятности</div>' +
            '<div class="chip-row match-card-meta">' +
              '<span class="chip chip-matchup"><span class="chip-prefix">Матчап</span>' + escapeHtml(matchupLabel) + '</span>' +
              chips +
              resultChip +
            '</div>' +
            note +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderMatchesList(targetId, matches, options) {
    var holder = document.getElementById(targetId);
    if (!holder) {
      return;
    }

    if (!matches.length) {
      holder.innerHTML = '<div class="empty">' + escapeHtml(options.emptyText) + '</div>';
      return;
    }

    holder.innerHTML = '' +
      ((options.note || options.counter)
        ? '<div class="matches-headline">' +
            (options.note ? '<div class="matches-note">' + escapeHtml(options.note) + '</div>' : '') +
            (options.counter ? '<div class="matches-count">' + escapeHtml(options.counter) + '</div>' : '') +
          '</div>'
        : '') +
      matches.map(renderMatchCard).join('');
  }

  function renderMatchesRedesign(model) {
    if (!model || !model.derived || !Array.isArray(model.derived.matches)) {
      return;
    }

    var matches = model.derived.matches.slice();
    var upcoming = matches.filter(function (match) {
      return match.status !== 'played';
    });
    var played = matches.filter(function (match) {
      return match.status === 'played';
    }).reverse();

    renderMatchesList('matches-upcoming', upcoming, {
      note: 'Только предстоящие игры, которые еще могут заметно изменить порядок в таблице.',
      counter: formatMatchCount(upcoming.length),
      emptyText: 'Будущих матчей больше нет: календарь этого сезона уже закрыт.'
    });

    renderMatchesList('matches-played', played, {
      note: 'Архив уже сыгранных встреч с результатами, вероятностями и заметками по ходу сезона.',
      counter: formatMatchCount(played.length),
      emptyText: 'Сыгранных матчей пока нет. Как только появятся первые результаты, они окажутся здесь.'
    });

    renderMatchesList('matches-list', matches, {
      note: 'Полная лента сезона: от ближайших развилок до уже сыгранных матчей.',
      counter: formatMatchCount(matches.length),
      emptyText: 'Календарь пока не создан. Зайдите в админку и соберите расписание.'
    });
  }

  window.renderMatches = renderMatchesRedesign;
  try {
    renderMatches = renderMatchesRedesign;
  } catch (error) {
    // no-op
  }

  function refreshMatches() {
    if (!window.api || typeof window.api.publicState !== 'function') {
      return;
    }

    window.api.publicState().then(renderMatchesRedesign).catch(function () {
      // no-op
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshMatches, { once: true });
  } else {
    refreshMatches();
  }
})();