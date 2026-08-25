const firebaseConfig = {
  apiKey: "AIzaSyAmMgRjn1E7pR2FE3QTxOiaglugLfZhUQ0",
  authDomain: "efootball2026-tournament.firebaseapp.com",
  projectId: "efootball2026-tournament",
  storageBucket: "efootball2026-tournament.firebasestorage.app",
  messagingSenderId: "823860626457",
  appId: "1:823860626457:web:2bf250323af29dbe229688"
};

const STORAGE_KEY = "ef2026_admin_session_v1";
const LOCAL_STATE_KEY = "ef2026_state_local_v3";
const LEGACY_LOCAL_STATE_KEYS = ["ef2026_state_local_v2"];
const PASSWORD = "1111";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const STATE_COLLECTION = "tournament";
const STATE_DOCUMENT = "state";
const CLOUD_POLL_INTERVAL_MS = 15000;
const LOCAL_POLL_INTERVAL_MS = 5000;
const FIRESTORE_REST_DOCUMENT_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${STATE_COLLECTION}/${STATE_DOCUMENT}?key=${firebaseConfig.apiKey}`;
const PUBLISHED_STATE_URL = new URL(
  window.location.pathname.includes("/public/")
    ? "../data/tournament.json?v=20260823"
    : "./data/tournament.json?v=20260823",
  window.location.href
).toString();
const DEFAULT_STATE = {
  tournament: {
    title: "Турнир eFootball 2027",
    subtitle: "Лига друзей",
    description:
      "Компактная публичная панель с главным матчем, таблицей, календарем и ключевой аналитикой сезона.",
    roundsCount: 2,
    statusLabel: "Регулярный сезон",
    updatedAt: "2026-08-22T00:00:00.000Z"
  },
  players: [
    {
      id: "vernigora-a",
      name: "Вернигора А.",
      rating: 80,
      photoUrl:
        "https://res.cloudinary.com/dc1ybvaxd/image/upload/v1780957565/IMG_9519_d803p2.jpg",
      notes: ""
    },
    {
      id: "lyakhovich-e",
      name: "Ляхович Е.",
      rating: 80,
      photoUrl:
        "https://res.cloudinary.com/dc1ybvaxd/image/upload/v1780957960/IMG_9520_bkppyj.jpg",
      notes: ""
    },
    {
      id: "usik-y",
      name: "Усик Ю.",
      rating: 80,
      photoUrl:
        "https://res.cloudinary.com/dc1ybvaxd/image/upload/v1780958123/IMG_8454_bdi0ur.jpg",
      notes: ""
    }
  ],
  matches: [
    {
      id: "match-1",
      round: 1,
      homePlayerId: "lyakhovich-e",
      awayPlayerId: "usik-y",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      playedAt: null
    },
    {
      id: "match-2",
      round: 2,
      homePlayerId: "vernigora-a",
      awayPlayerId: "usik-y",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      playedAt: null
    },
    {
      id: "match-3",
      round: 3,
      homePlayerId: "vernigora-a",
      awayPlayerId: "lyakhovich-e",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      playedAt: null
    },
    {
      id: "match-4",
      round: 4,
      homePlayerId: "usik-y",
      awayPlayerId: "lyakhovich-e",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      playedAt: null
    },
    {
      id: "match-5",
      round: 5,
      homePlayerId: "usik-y",
      awayPlayerId: "vernigora-a",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      playedAt: null
    },
    {
      id: "match-6",
      round: 6,
      homePlayerId: "lyakhovich-e",
      awayPlayerId: "vernigora-a",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      playedAt: null
    }
  ]
};

let storageMode = "cloud";
let storageMessage = "";

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function setStorageStatus(mode, message = "") {
  storageMode = mode;
  storageMessage = message;
}

function readSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.authenticated || parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveSession() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      authenticated: true,
      expiresAt: Date.now() + SESSION_TTL_MS
    })
  );
}

function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function requireAdminSession() {
  if (!readSession()) {
    throw new Error("Сессия администратора истекла. Войдите заново.");
  }
}

function stateTimestamp(state) {
  const updatedAt = safeDate(state?.tournament?.updatedAt);
  return updatedAt ? new Date(updatedAt).getTime() : 0;
}

function readStateByKey(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return normalizeStateShape(JSON.parse(raw));
  } catch {
    return null;
  }
}

function resolveFallbackCandidate(candidates) {
  const items = candidates.filter((item) => item?.state);
  if (!items.length) {
    return null;
  }

  return items.sort((left, right) => {
    const timeDiff = stateTimestamp(right.state) - stateTimestamp(left.state);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return (right.priority || 0) - (left.priority || 0);
  })[0];
}

function parseLegacyStatusLabel(mode) {
  if (mode === "playoff") {
    return "Плей-офф";
  }
  if (mode === "league") {
    return "Лига";
  }
  return DEFAULT_TOURNAMENT.statusLabel;
}

function parseLegacyScorePair(match) {
  const directHome =
    match?.homeScore ??
    match?.scoreHome ??
    match?.goalsHome ??
    match?.player1Score ??
    match?.score1 ??
    match?.goals1;
  const directAway =
    match?.awayScore ??
    match?.scoreAway ??
    match?.goalsAway ??
    match?.player2Score ??
    match?.score2 ??
    match?.goals2;

  if (directHome !== undefined || directAway !== undefined) {
    return [
      directHome === undefined || directHome === null || directHome === ""
        ? null
        : Math.max(0, toNumber(directHome, 0)),
      directAway === undefined || directAway === null || directAway === ""
        ? null
        : Math.max(0, toNumber(directAway, 0))
    ];
  }

  const scoreText = String(match?.score || match?.result || "").trim();
  const scoreMatch = scoreText.match(/(\d+)\s*[:\-]\s*(\d+)/);
  if (scoreMatch) {
    return [Number(scoreMatch[1]), Number(scoreMatch[2])];
  }

  return [null, null];
}

function parseLegacyName(match, keys) {
  for (const key of keys) {
    const value = match?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeLegacyMatches(matches, playersByName) {
  if (!Array.isArray(matches)) {
    return [];
  }

  return matches
    .map((match, index) => {
      if (!match || typeof match !== "object") {
        return null;
      }

      const homeName = parseLegacyName(match, [
        "homePlayer",
        "homePlayerName",
        "home",
        "player1",
        "playerOne",
        "leftPlayer",
        "left",
        "host",
        "team1",
        "firstPlayer"
      ]);
      const awayName = parseLegacyName(match, [
        "awayPlayer",
        "awayPlayerName",
        "away",
        "player2",
        "playerTwo",
        "rightPlayer",
        "right",
        "guest",
        "team2",
        "secondPlayer"
      ]);

      const homePlayerId = playersByName[homeName];
      const awayPlayerId = playersByName[awayName];
      if (!homePlayerId || !awayPlayerId || homePlayerId === awayPlayerId) {
        return null;
      }

      const [homeScore, awayScore] = parseLegacyScorePair(match);
      const hasScore = Number.isInteger(homeScore) && Number.isInteger(awayScore);

      return {
        id: match.id || `match-${index + 1}`,
        round: Math.max(
          1,
          toNumber(
            match.round ?? match.tour ?? match.week ?? match.stage ?? index + 1,
            index + 1
          )
        ),
        homePlayerId,
        awayPlayerId,
        status:
          match.status === "played" || match.played === true || hasScore
            ? "played"
            : "scheduled",
        homeScore,
        awayScore,
        playedAt: safeDate(
          match.playedAt ?? match.date ?? match.datetime ?? match.played_on ?? null
        ),
        note: String(match.note || match.comment || match.summary || "").trim()
      };
    })
    .filter(Boolean);
}

function isLegacyStateShape(source) {
  return (
    source &&
    !source.tournament &&
    Array.isArray(source.players) &&
    source.players.some((player) => typeof player === "string")
  );
}

function normalizeStateShape(source) {
  if (!isLegacyStateShape(source)) {
    return normalizeTournamentState(source);
  }

  const names = source.players
    .map((player, index) =>
      typeof player === "string" && player.trim()
        ? player.trim()
        : `Игрок ${index + 1}`
    )
    .filter(Boolean);
  const profiles = source.profiles && typeof source.profiles === "object" ? source.profiles : {};

  const players = names.map((name, index) => {
    const profile =
      profiles[name] && typeof profiles[name] === "object" ? profiles[name] : {};
    return {
      id: slugify(name) || `player-${index + 1}`,
      name,
      rating: normalizeRating(profile.rating, 1000),
      photoUrl: String(profile.photoUrl || profile.photo || "").trim(),
      notes: String(profile.notes || profile.note || "").trim()
    };
  });

  const playersByName = Object.fromEntries(players.map((player) => [player.name, player.id]));
  const nextState = {
    tournament: {
      title: String(source.title || DEFAULT_TOURNAMENT.title).trim(),
      subtitle: String(source.subtitle || DEFAULT_TOURNAMENT.subtitle).trim(),
      description: String(
        source.description || DEFAULT_TOURNAMENT.description
      ).trim(),
      roundsCount: clamp(
        toNumber(source.leagueRounds ?? source.roundsCount, DEFAULT_TOURNAMENT.roundsCount),
        1,
        15
      ),
      statusLabel: String(
        source.statusLabel || parseLegacyStatusLabel(source.mode)
      ).trim(),
      updatedAt: safeDate(source.updatedAt) || new Date().toISOString()
    },
    players,
    matches: normalizeLegacyMatches(source.matches, playersByName)
  };

  return normalizeTournamentState(nextState);
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item))
      }
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)])
        )
      }
    };
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) {
    return String(value.stringValue);
  }
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) {
    return Number(value.integerValue);
  }
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) {
    return Number(value.doubleValue);
  }
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) {
    return Boolean(value.booleanValue);
  }
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) {
    return String(value.timestampValue);
  }
  if (value.arrayValue) {
    return Array.isArray(value.arrayValue.values)
      ? value.arrayValue.values.map((item) => fromFirestoreValue(item))
      : [];
  }
  if (value.mapValue) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([key, item]) => [key, fromFirestoreValue(item)])
    );
  }
  return null;
}

function toFirestoreFields(data) {
  const fields = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    fields[key] = toFirestoreValue(value);
  });
  return fields;
}

function fromFirestoreFields(fields) {
  const next = {};
  Object.entries(fields || {}).forEach(([key, value]) => {
    next[key] = fromFirestoreValue(value);
  });
  return next;
}

async function readRemoteDocument() {
  const response = await fetch(FIRESTORE_REST_DOCUMENT_URL, {
    method: "GET",
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Cloud read failed: ${response.status}`);
  }

  const payload = await response.json();
  return fromFirestoreFields(payload.fields || {});
}

async function writeRemoteDocument(state) {
  const response = await fetch(FIRESTORE_REST_DOCUMENT_URL, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: toFirestoreFields(clone(state))
    })
  });

  if (!response.ok) {
    throw new Error(`Cloud write failed: ${response.status}`);
  }

  const payload = await response.json();
  return fromFirestoreFields(payload.fields || {});
}

async function loadPublishedState() {
  try {
    const response = await fetch(PUBLISHED_STATE_URL, {
      cache: "no-store"
    });
    if (response.ok) {
      return normalizeStateShape(await response.json());
    }
  } catch {}

  return null;
}

async function loadFallbackState() {
  const localState = readLocalState();
  const publishedState = await loadPublishedState();
  const defaultState = normalizeStateShape(clone(DEFAULT_STATE));
  const fallback =
    resolveFallbackCandidate([
      { state: localState, source: "local", priority: 3 },
      { state: publishedState, source: "published", priority: 2 },
      { state: defaultState, source: "default", priority: 1 }
    ]) || { state: defaultState, source: "default" };

  return {
    state: writeLocalState(fallback.state),
    source: fallback.source
  };
}

function readLocalState() {
  const states = [LOCAL_STATE_KEY, ...LEGACY_LOCAL_STATE_KEYS]
    .map((key) => readStateByKey(key))
    .filter(Boolean);

  if (!states.length) {
    return null;
  }

  return states.sort((left, right) => stateTimestamp(right) - stateTimestamp(left))[0];
}

function writeLocalState(nextState) {
  const normalized = normalizeStateShape(nextState);

  try {
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(clone(normalized)));
    LEGACY_LOCAL_STATE_KEYS.forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    });
  } catch {
    return normalized;
  }

  return normalized;
}

async function ensureRemoteState() {
  const localState = readLocalState();

  try {
    const remoteRaw = await readRemoteDocument();

    if (remoteRaw) {
      const remoteState = normalizeStateShape(remoteRaw);

      if (localState && stateTimestamp(localState) > stateTimestamp(remoteState)) {
        const syncedLocal = normalizeStateShape(await writeRemoteDocument(localState));
        writeLocalState(syncedLocal);
        setStorageStatus("cloud");
        return syncedLocal;
      }

      writeLocalState(remoteState);
      setStorageStatus("cloud");
      return remoteState;
    }

    const fallback = await loadFallbackState();
    const writtenFallback = normalizeStateShape(await writeRemoteDocument(fallback.state));
    writeLocalState(writtenFallback);
    setStorageStatus("cloud");
    return writtenFallback;
  } catch {
    const fallback = await loadFallbackState();
    setStorageStatus(
      "local",
      fallback.source === "local"
        ? "Облако турнира сейчас недоступно. Панель работает по последнему сохраненному состоянию этого браузера."
        : fallback.source === "published"
          ? "Облако турнира сейчас недоступно. Загружен резервный опубликованный снимок турнира."
          : "Облако турнира сейчас недоступно. Загружено стартовое состояние турнира."
    );
    return fallback.state;
  }
}

async function writeRemoteState(nextState, options = {}) {
  const normalized = normalizeStateShape(nextState);

  try {
    const writtenState = normalizeStateShape(await writeRemoteDocument(normalized));
    writeLocalState(writtenState);
    setStorageStatus("cloud");
    return writtenState;
  } catch {
    writeLocalState(normalized);
    const localOnlyMessage =
      "Облако турнира сейчас недоступно. Изменения остались только в этом браузере и не синхронизировались на другие устройства.";
    setStorageStatus("local", localOnlyMessage);

    if (options.requireCloud) {
      throw new Error(localOnlyMessage);
    }

    return normalized;
  }
}

function toViewModel(state) {
  const model = buildPublicViewModel(state);
  return {
    ...model,
    meta: {
      ...(model.meta || {}),
      storageMode,
      storageMessage
    }
  };
}

const api = {
  async publicState() {
    return toViewModel(await ensureRemoteState());
  },

  async adminState() {
    requireAdminSession();
    return toViewModel(await ensureRemoteState());
  },

  async session() {
    return { authenticated: Boolean(readSession()) };
  },

  async login(password) {
    if (String(password) !== PASSWORD) {
      throw new Error("Неверный пароль.");
    }

    saveSession();
    await ensureRemoteState();
    return { ok: true, authenticated: true };
  },

  async logout() {
    clearSession();
    return { ok: true };
  },

  async action(type, payload = {}) {
    requireAdminSession();
    const currentState = await ensureRemoteState();
    const nextState = applyAdminAction(currentState, { type, payload });
    const savedState = await writeRemoteState(nextState, { requireCloud: true });
    return toViewModel(savedState);
  },

  subscribe(onChange, onError = () => {}) {
    let active = true;
    let lastFingerprint = "";
    let intervalId = null;

    const emitLatestState = async () => {
      const model = toViewModel(await ensureRemoteState());
      const fingerprint = JSON.stringify(model.state);
      const shouldEmit =
        fingerprint !== lastFingerprint || model.meta?.storageMode === "local";

      if (!active || !shouldEmit) {
        return;
      }

      lastFingerprint = fingerprint;
      onChange(model);
    };

    const handleStorage = async (event) => {
      if (
        !active ||
        (event.key &&
          event.key !== LOCAL_STATE_KEY &&
          !LEGACY_LOCAL_STATE_KEYS.includes(event.key))
      ) {
        return;
      }

      try {
        await emitLatestState();
      } catch (error) {
        onError(error.message);
      }
    };

    window.addEventListener("storage", handleStorage);

    Promise.resolve().then(async () => {
      try {
        await emitLatestState();
      } catch (error) {
        onError(error.message);
      }
    });

    intervalId = window.setInterval(async () => {
      try {
        await emitLatestState();
      } catch (error) {
        onError(error.message);
      }
    }, storageMode === "cloud" ? CLOUD_POLL_INTERVAL_MS : LOCAL_POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("storage", handleStorage);
    };
  }
};