const firebaseConfig = {
  apiKey: "AIzaSyAmMgRjn1E7pR2FE3QTxOiaglugLfZhUQ0",
  authDomain: "efootball2026-tournament.firebaseapp.com",
  projectId: "efootball2026-tournament",
  storageBucket: "efootball2026-tournament.firebasestorage.app",
  messagingSenderId: "823860626457",
  appId: "1:823860626457:web:2bf250323af29dbe229688"
};

const STORAGE_KEY = "ef2026_admin_session_v1";
const PASSWORD = "1111";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const STATE_COLLECTION = "league_room_v2";
const STATE_DOCUMENT = "state";
const DEFAULT_STATE = {
  tournament: {
    title: "Турнир eFootball 2026",
    subtitle: "Лига друзей",
    description:
      "Закрытый турнир с общей таблицей, календарем, формой игроков и прогнозами на ближайшие матчи.",
    roundsCount: 2,
    statusLabel: "Регулярный сезон",
    updatedAt: "2026-07-17T13:09:44.939Z"
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

let firestoreDb = null;

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function ensureFirebase() {
  if (typeof window === "undefined" || !window.firebase) {
    throw new Error("Не удалось подключить облачное хранилище турнира.");
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
  }

  if (!firestoreDb) {
    firestoreDb = window.firebase.firestore();
  }

  return firestoreDb;
}

function stateRef() {
  return ensureFirebase().collection(STATE_COLLECTION).doc(STATE_DOCUMENT);
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

async function loadFallbackState() {
  return normalizeTournamentState(clone(DEFAULT_STATE));
}

async function ensureRemoteState() {
  try {
    const ref = stateRef();
    const snapshot = await ref.get();

    if (snapshot.exists) {
      return normalizeTournamentState(snapshot.data());
    }

    const fallbackState = await loadFallbackState();
    await ref.set(clone(fallbackState));
    return fallbackState;
  } catch (error) {
    throw new Error("Нет связи с общим хранилищем турнира. Попробуйте обновить страницу.");
  }
}

async function writeRemoteState(nextState) {
  const normalized = normalizeTournamentState(nextState);

  try {
    await stateRef().set(clone(normalized));
    return normalized;
  } catch {
    throw new Error("Не удалось сохранить изменения в облаке турнира.");
  }
}

function toViewModel(state) {
  return buildPublicViewModel(state);
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
    await writeRemoteState(nextState);
    return toViewModel(nextState);
  },

  subscribe(onChange, onError = () => {}) {
    let active = true;
    let unsubscribe = () => {};

    try {
      unsubscribe = stateRef().onSnapshot(
        async (snapshot) => {
          try {
            const state = snapshot.exists
              ? normalizeTournamentState(snapshot.data())
              : await ensureRemoteState();

            if (active) {
              onChange(toViewModel(state));
            }
          } catch (error) {
            if (active) {
              onError(error.message);
            }
          }
        },
        () => {
          if (active) {
            onError("Не удалось синхронизировать страницу с облаком турнира.");
          }
        }
      );
    } catch (error) {
      onError(error.message);
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }
};