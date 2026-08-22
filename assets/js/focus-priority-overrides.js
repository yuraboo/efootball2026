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
