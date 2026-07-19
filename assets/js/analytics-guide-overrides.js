(function analyticsGuideOverrides() {
  const LABEL_MAP = {
    "Монте-Карло": "Прогноз сезона",
    Power: "Индекс силы",
    "Power rating": "Индекс силы",
    "Топ-2": "Верхняя зона",
    "Последнее место": "Риск снизу",
    "Вес матча": "Вес матча",
    "Шансы модели": "Прогноз пары",
    "Турнирный вес": "Что важнее в расчете",
    "Рейтинг (меньше лучше)": "Внешний рейтинг",
    "Сезонный баланс": "Баланс сезона",
    "Матчап пары": "Профиль пары",
    "Главный season swing": "Главный сдвиг шансов",
    "Главный swing матча": "Главный сдвиг шансов",
    "Power-лидер": "Лидер по индексу силы",
    "Clutch-фактор": "Лучше всех в плотных матчах",
    "Апсет-лидер": "Лучше всех против фаворитов"
  };

  const FACTOR_HELP = {
    "Прогноз пары": "Главный расклад модели по исходу именно этой встречи.",
    "Что важнее в расчете": "Модель сильнее опирается на текущую лигу, а рейтинг дает только мягкую поправку.",
    "Внешний рейтинг": "Чем меньше число, тем сильнее игрок. Но это лишь часть расчета, а не главный фактор.",
    "Баланс сезона": "Короткий срез того, как оба игрока идут именно в этой лиге.",
    "Профиль пары": "Краткое описание характера конкретной дуэли.",
    "Влияние на сезон": "Насколько сильно этот матч может качнуть общий расклад турнира."
  };

  const GLOSSARY = [
    {
      term: "Прогноз сезона",
      short: "Модель много раз проигрывает остаток лиги и смотрит, чем все заканчивается.",
      detail:
        "Это не обещание одного точного исхода, а много сценариев. Чем чаще игрок выигрывает сезон в этих сценариях, тем выше его шанс."
    },
    {
      term: "Шанс на титул",
      short: "Как часто игрок финиширует первым в прогнозных сценариях.",
      detail:
        "Если у игрока 62%, это значит, что примерно в 62 случаях из 100 он заканчивает сезон на 1-м месте."
    },
    {
      term: "Ожидаемое место",
      short: "Средняя итоговая позиция по всем сценариям модели.",
      detail:
        "Чем ближе это число к 1, тем увереннее модель держит игрока наверху таблицы."
    },
    {
      term: "Верхняя зона",
      short: "Вероятность закончить сезон в верхней части таблицы.",
      detail:
        "Сейчас система понимает под верхней зоной финиш в топ-2."
    },
    {
      term: "Риск снизу",
      short: "Насколько реально провалиться вниз по итогам сезона.",
      detail:
        "Чем выше этот процент, тем опаснее ближайшие туры для игрока."
    },
    {
      term: "Индекс силы",
      short: "Оценка текущей силы игрока именно сейчас.",
      detail:
        "Берутся очки, разница мячей, форма, игра в плотных матчах, сложность календаря и лишь немного внешний рейтинг."
    },
    {
      term: "Вес матча",
      short: "Насколько одна игра может изменить турнирный расклад.",
      detail:
        "Чем выше вес, тем сильнее один матч качает шансы на титул и итоговые места."
    },
    {
      term: "Надежность прогноза",
      short: "Насколько уверенно модель видит перевес в конкретной паре.",
      detail:
        "Это не гарантия результата, а степень согласованности сигналов в пользу одного сценария."
    }
  ];

  function normalizeLabel(label) {
    return LABEL_MAP[label] || label;
  }

  function upsertMetricHelp(pill, text) {
    if (!text) {
      return;
    }
    let help = pill.querySelector(".metric-help");
    if (!help) {
      help = document.createElement("em");
      help.className = "metric-help";
      pill.append(help);
    }
    help.textContent = text;
  }

  function renderGuide(model) {
    const holder = document.getElementById("analytics-guide-panel");
    if (!holder || !model) {
      return;
    }

    const weights = model.derived?.nextMatch?.prediction?.weights || {
      tournament: 86,
      rating: 14
    };

    holder.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-kicker">Пояснение аналитики</div>
          <h2 class="panel-title">Как читать цифры</h2>
          <div class="panel-subtitle">Короткий словарь терминов и логика модели без перегруза.</div>
        </div>
      </div>
      <div class="guide-lead">
        <strong>Главный принцип.</strong>
        Модель сильнее смотрит на то, что происходит в этой лиге прямо сейчас:
        примерно ${weights.tournament}% веса у текущего сезона и ${weights.rating}% у внешнего рейтинга.
        Поэтому проценты завязаны прежде всего на таблицу, форму и ход сезона.
      </div>
      <div class="guide-grid">
        <div class="mini-card compact">
          <div class="stat-label">Шансы не равны гарантии</div>
          <strong>Это сценарии, а не обещание</strong>
          <div class="stat-note">Если шанс на титул 60%, это значит, что игрок чаще выигрывает в моделировании, но не уже чемпион.</div>
        </div>
        <div class="mini-card compact">
          <div class="stat-label">Индекс силы</div>
          <strong>Чем выше, тем лучше текущий профиль</strong>
          <div class="stat-note">Метрика объединяет очки, форму, плотные матчи, календарь и лишь немного рейтинг.</div>
        </div>
        <div class="mini-card compact">
          <div class="stat-label">Сложность финиша</div>
          <strong>Около 100 = средний календарь</strong>
          <div class="stat-note">Сильно выше 100 означает тяжелый остаток, сильно ниже 100 — более мягкий финиш.</div>
        </div>
        <div class="mini-card compact">
          <div class="stat-label">Вес матча</div>
          <strong>Показывает силу влияния на сезон</strong>
          <div class="stat-note">Чем выше оценка, тем сильнее одна игра способна качнуть турнирный расклад.</div>
        </div>
      </div>
      <div class="glossary-list">
        ${GLOSSARY.map(
          (item, index) => `
            <details class="glossary-item"${index < 3 ? " open" : ""}>
              <summary>
                <div>
                  <div class="glossary-term">${item.term}</div>
                  <div class="glossary-short">${item.short}</div>
                </div>
                <span class="glossary-toggle">подробно</span>
              </summary>
              <div class="glossary-body">${item.detail}</div>
            </details>
          `
        ).join("")}
      </div>
    `;
  }

  function patchHero() {
    document.querySelectorAll("#hero-stats .stat-card .stat-label").forEach((node) => {
      node.textContent = normalizeLabel(node.textContent.trim());
    });
  }

  function patchAnalyticsTabs() {
    document.querySelectorAll('.analytics-hub [data-tab-target]').forEach((node) => {
      node.textContent = normalizeLabel(node.textContent.trim());
    });
  }

  function patchNextMatch(model) {
    const badge = document.querySelector("#next-match-panel .chip, #next-match-panel .impact-badge");
    if (badge && badge.textContent.includes("Уверенность модели")) {
      badge.textContent = badge.textContent.replace("Уверенность модели", "Надежность прогноза");
    }

    document.querySelectorAll("#next-match-panel .metric-pill").forEach((pill) => {
      const labelNode = pill.querySelector("span");
      if (!labelNode) {
        return;
      }
      const normalized = normalizeLabel(labelNode.textContent.trim());
      labelNode.textContent = normalized;
      upsertMetricHelp(pill, FACTOR_HELP[normalized] || "");
    });

    if (!model) {
      return;
    }

    const article = document.querySelector("#next-match-panel .preview-article");
    const prediction = model.derived?.nextMatch?.prediction;
    if (!article || !prediction) {
      return;
    }

    let note = article.querySelector(".guide-lead");
    if (!note) {
      note = document.createElement("div");
      note.className = "guide-lead";
      article.insertBefore(note, article.querySelector(".match-preview-grid"));
    }

    note.innerHTML = `
      <strong>Как модель считает фаворита.</strong>
      Основной вес сейчас у текущего турнира: ${prediction.weights?.tournament ?? 86}%.
      Внешний рейтинг влияет мягче: ${prediction.weights?.rating ?? 14}%.
      Поэтому фаворит определяется прежде всего по таблице, форме и результатам именно этой лиги.
    `;
  }

  function patchForecast() {
    document.querySelectorAll("#season-forecast .stat-label, #season-forecast .chip").forEach((node) => {
      const text = node.textContent.trim();
      if (text.includes("среднее место")) {
        node.textContent = text.replace("среднее место", "ожидаемое место");
        return;
      }
      node.textContent = normalizeLabel(text);
    });
  }

  function patchPowerAndInsights() {
    document.querySelectorAll("#power-ranking .list-card h4, #insights-grid .stat-label").forEach((node) => {
      node.textContent = normalizeLabel(node.textContent.trim());
    });
  }

  function enhance(model) {
    patchAnalyticsTabs();
    patchHero();
    patchNextMatch(model);
    patchForecast();
    patchPowerAndInsights();
    renderGuide(model);
  }

  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;

  if (originalRenderAll) {
    renderAll = function patchedRenderAll() {
      originalRenderAll.apply(this, arguments);
      try {
        enhance(typeof baseModel !== "undefined" ? baseModel : null);
      } catch (error) {
        console.error("analytics-guide-overrides failed", error);
      }
    };
  }

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      try {
        enhance(typeof baseModel !== "undefined" ? baseModel : null);
      } catch (error) {
        console.error("analytics-guide-overrides load failed", error);
      }
    }, 120);
  });
})();
