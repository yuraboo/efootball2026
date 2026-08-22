(function () {
  function enhanceHero() {
    const stats = document.querySelectorAll("#hero-stats .stat-card");
    if (!stats.length) {
      return;
    }

    const labels = ["Лидер", "Фаворит модели", "Power-рейтинг"];
    stats.forEach((card, index) => {
      const label = card.querySelector(".stat-label");
      if (label && labels[index]) {
        label.textContent = labels[index];
      }
    });

    if (stats[3]) {
      stats[3].remove();
    }
  }

  function markSecondaryMetricPills(panel) {
    panel.querySelectorAll(".match-preview-grid .metric-pill").forEach((pill) => {
      const label = pill.querySelector("span")?.textContent?.trim();
      const isSecondary = label === "Внешний рейтинг" || label === "Баланс сезона";
      pill.classList.toggle("metric-pill-secondary", isSecondary);
    });
  }

  function extractMetricValue(article, labelText) {
    const pill = Array.from(article.querySelectorAll(".match-preview-grid .metric-pill")).find((item) => {
      const label = item.querySelector("span")?.textContent?.trim();
      return label === labelText;
    });
    return pill?.querySelector("strong")?.textContent?.trim() || "";
  }

  function ensureSectionLabel(article, targetSelector, className, text) {
    const target = article.querySelector(targetSelector);
    if (!target) {
      return;
    }
    let label = article.querySelector(`.${className}`);
    if (!label) {
      label = document.createElement("div");
      label.className = className;
      target.before(label);
    }
    label.textContent = text;
  }

  function enhanceFeatureArticle(panel) {
    const article = panel.querySelector(".preview-article");
    if (!article) {
      return;
    }

    article.classList.add("feature-article-editorial");

    const kicker = article.querySelector(".article-kicker");
    if (kicker) {
      kicker.textContent = "Предматчевая статья";
    }

    const players = Array.from(panel.querySelectorAll(".next-match .player-name"))
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    const roundText =
      panel.querySelector(".panel-subtitle")?.textContent.match(/Раунд\s+\d+/i)?.[0] || "Ключевой матч";
    const impactText = panel.querySelector(".impact-badge")?.textContent.trim() || "Ключевая дуэль сезона";

    if (players.length >= 2) {
      let banner = article.querySelector(".feature-duel-banner");
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "feature-duel-banner";
        if (kicker) {
          kicker.insertAdjacentElement("afterend", banner);
        } else {
          article.prepend(banner);
        }
      }

      banner.innerHTML = `
        <div class="feature-duel-topline">
          <span class="feature-duel-tag">Афиша тура</span>
          <span class="feature-duel-round">${roundText}</span>
        </div>
        <div class="feature-duel-line">
          <span class="feature-duel-player feature-duel-player--home">${players[0]}</span>
          <span class="feature-duel-separator">vs</span>
          <span class="feature-duel-player feature-duel-player--away">${players[1]}</span>
        </div>
        <div class="feature-duel-subline">${impactText}</div>
      `;
    }

    const title = article.querySelector(".article-title");
    if (title) {
      if (!title.dataset.originalTitle) {
        title.dataset.originalTitle = title.textContent.trim();
      }
      const originalTitle = title.dataset.originalTitle;
      const shortTitle = originalTitle.includes(":")
        ? originalTitle.split(":").slice(1).join(":").trim()
        : originalTitle;
      title.textContent = shortTitle || originalTitle;
    }

    const highlightMetrics = [
      {
        label: "Прогноз пары",
        value: extractMetricValue(article, "Прогноз пары")
      },
      {
        label: "Ничья по модели",
        value: extractMetricValue(article, "Ничья по модели")
      },
      {
        label: "Вес матча",
        value: extractMetricValue(article, "Вес матча") || impactText
      }
    ].filter((item) => item.value);

    let metaStrip = article.querySelector(".feature-article-meta-strip");
    if (!metaStrip && highlightMetrics.length) {
      metaStrip = document.createElement("div");
      metaStrip.className = "feature-article-meta-strip";
      const dek = article.querySelector(".article-dek");
      if (dek) {
        dek.insertAdjacentElement("afterend", metaStrip);
      }
    }

    if (metaStrip) {
      metaStrip.innerHTML = highlightMetrics
        .map(
          (item) => `
            <div class="feature-article-meta-item">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
            </div>
          `
        )
        .join("");
    }

    ensureSectionLabel(article, ".match-preview-grid", "feature-article-grid-label", "Ключевые цифры");
    ensureSectionLabel(article, ".article-body", "feature-article-body-label", "Редакционный разбор");
  }

  function enhanceNextMatch() {
    const panel = document.getElementById("next-match-panel");
    if (!panel || panel.querySelector(".empty")) {
      return;
    }

    panel.classList.add("focus-priority-panel");

    const headingBox = panel.querySelector(".panel-header > div:first-child");
    if (headingBox) {
      let kicker = headingBox.querySelector(".panel-kicker");
      if (!kicker) {
        kicker = document.createElement("div");
        kicker.className = "panel-kicker";
        headingBox.prepend(kicker);
      }
      kicker.textContent = "В фокусе тура";

      const title = headingBox.querySelector(".panel-title");
      if (title) {
        title.textContent = "Главный матч тура";
      }

      const subtitle = headingBox.querySelector(".panel-subtitle");
      if (subtitle) {
        const roundMatch = subtitle.textContent.match(/Раунд\s+\d+/i);
        const roundPrefix = roundMatch ? `${roundMatch[0]}. ` : "";
        subtitle.textContent = `${roundPrefix}Ближайшая ключевая игра сезона: вероятности, короткий анонс и контекст перед стартом.`;
      }
    }

    panel.querySelectorAll(".chance").forEach((node) => {
      const value = node.textContent.match(/\d+%/);
      if (value) {
        node.textContent = `Шанс победы ${value[0]}`;
      }
    });

    markSecondaryMetricPills(panel);
    enhanceFeatureArticle(panel);

    const footerNote = panel.querySelector(".next-match-footer > .note");
    if (footerNote && !panel.querySelector(".next-match-note-card")) {
      const noteCard = document.createElement("div");
      noteCard.className = "next-match-note-card";
      noteCard.innerHTML = `
        <div class="stat-label">Краткий вывод</div>
        <div class="stat-note">${footerNote.textContent}</div>
      `;
      footerNote.replaceWith(noteCard);
    }
  }

  const originalRenderHero = window.renderHero;
  if (typeof originalRenderHero === "function") {
    window.renderHero = function (model) {
      originalRenderHero(model);
      enhanceHero();
    };
  }

  const originalRenderNextMatch = window.renderNextMatch;
  if (typeof originalRenderNextMatch === "function") {
    window.renderNextMatch = function (model) {
      originalRenderNextMatch(model);
      enhanceNextMatch();
    };
  }

  function rerenderWithOverrides() {
    if (typeof window.renderAll === "function") {
      try {
        window.renderAll();
      } catch (error) {
        console.error("focus-priority-overrides renderAll failed", error);
      }
    } else {
      enhanceHero();
      enhanceNextMatch();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rerenderWithOverrides, { once: true });
  } else {
    window.setTimeout(rerenderWithOverrides, 0);
  }
})();
