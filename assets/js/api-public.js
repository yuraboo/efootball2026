const PUBLISHED_STATE_URL = new URL(
  window.location.pathname.includes("/public/")
    ? "../data/tournament.json?v=20260718"
    : "./data/tournament.json?v=20260718",
  window.location.href
).toString();

function publicMeta(model) {
  return {
    ...(model.meta || {}),
    storageMode: "published",
    storageMessage:
      "Открытая версия сайта обновляется после публикации новой версии на GitHub Pages."
  };
}

async function loadPublishedTournamentState() {
  const response = await fetch(PUBLISHED_STATE_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить опубликованные данные турнира.");
  }

  return normalizeTournamentState(await response.json());
}

function toPublishedViewModel(state) {
  const model = buildPublicViewModel(state);
  return {
    ...model,
    meta: publicMeta(model)
  };
}

const api = (window.api = {
  async publicState() {
    return toPublishedViewModel(await loadPublishedTournamentState());
  },

  subscribe() {
    return () => {};
  }
});
