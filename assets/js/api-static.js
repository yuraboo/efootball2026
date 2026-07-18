const firebaseConfig = {
  apiKey: "AIzaSyAmMgRjn1E7pR2FE3QTxOiaglugLfZhUQ0",
  authDomain: "efootball2026-tournament.firebaseapp.com",
  projectId: "efootball2026-tournament",
  storageBucket: "efootball2026-tournament.firebasestorage.app",
  messagingSenderId: "823860626457",
  appId: "1:823860626457:web:2bf250323af29dbe229688"
};

const STORAGE_KEY = "ef2026_admin_session_v1";
const LOCAL_STATE_KEY = "ef2026_state_local_v1";
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
let storageMode = "cloud";
let storageMessage = "";

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function setStorageStatus(mode, message = "") {
  storageMode = mode;
  storageMessage = message;
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
  const localState = readLocalState();
  if (localState) {
    return localState;
  }
  return writeLocalState(clone(DEFAULT_STATE));
}

function readLocalState() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STATE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeTournamentState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalState(nextState) {
  const normalized = normalizeTournamentState(nextState);

  try {
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(clone(normalized)));
  } catch {
    return normalized;
  }

  return normalized;
}

async function ensureRemoteState() {
  try {
    const ref = stateRef();
    const snapshot = await ref.get();

    if (snapshot.exists) {
      const normalized = normalizeTournamentState(snapshot.data());
      writeLocalState(normalized);
      setStorageStatus("cloud");
      return normalized;
    }

    const fallbackState = await loadFallbackState();
    await ref.set(clone(fallbackState));
    writeLocalState(fallbackState);
    setStorageStatus("cloud");
    return fallbackState;
  } catch (error) {
    const fallbackState = await loadFallbackState();
    const hasLocalState = Boolean(readLocalState());
    setStorageStatus(
      "local",
      hasLocalState
        ? "Облако турнира сейчас недоступно. Панель работает в локальном режиме этого браузера."
        : "Облако турнира сейчас недоступно. Загружен резервный шаблон в локальном режиме браузера."
    );
    return writeLocalState(fallbackState);
  }
}

async function writeRemoteState(nextState) {
  const normalized = normalizeTournamentState(nextState);

  try {
    await stateRef().set(clone(normalized));
    writeLocalState(normalized);
    setStorageStatus("cloud");
    return normalized;
  } catch {
    setStorageStatus(
      "local",
      "Облако турнира сейчас недоступно. Изменения сохранены локально только в этом браузере."
    );
    return writeLocalState(normalized);
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
    await writeRemoteState(nextState);
    return toViewModel(nextState);
  },

  subscribe(onChange, onError = () => {}) {
    let active = true;
    let unsubscribe = () => {};

    if (storageMode === "local") {
      const handleStorage = async (event) => {
        if (!active || (event.key && event.key !== LOCAL_STATE_KEY)) {
          return;
        }

        try {
          onChange(toViewModel(await ensureRemoteState()));
        } catch (error) {
          onError(error.message);
        }
      };

      window.addEventListener("storage", handleStorage);
      Promise.resolve().then(async () => {
        try {
          onChange(toViewModel(await ensureRemoteState()));
        } catch (error) {
          onError(error.message);
        }
      });

      return () => {
        active = false;
        window.removeEventListener("storage", handleStorage);
      };
    }

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
        async () => {
          if (active) {
            try {
              onChange(toViewModel(await ensureRemoteState()));
            } catch (error) {
              onError(error.message);
            }
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
