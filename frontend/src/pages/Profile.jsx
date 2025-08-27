import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";
import { format, parseISO, isValid as isValidDate } from "date-fns";
import { ptBR } from "date-fns/locale";

/** =========================
 * Helpers
 * ========================= */
const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:4000";
const getImageUrl = (path) => (path ? `${getApiBase()}${path}` : null);

const safeDate = (value) => {
  const d = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValidDate(d) ? d : null;
};

const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

/** =========================
 * Ícones SVG
 * ========================= */
const CakeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="inline-block mr-2 text-gray-500">
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4Z" />
    <path d="M16 11V7a4 4 0 0 0-8 0v4" />
  </svg>
);

const KarmaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="inline-block mr-2 text-gray-500">
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="w-4 h-4 mr-2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

/** =========================
 * Avatar genérico
 * ========================= */
const GenericAvatar = ({ user, className }) => {
  const name = user?.name || "";
  const id = user?._id || name || "0";

  const getInitials = (n) => {
    if (!n) return "?";
    const parts = n.trim().split(" ").filter(Boolean);
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return n.substring(0, 2).toUpperCase();
  };

  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return h;
  };

  const colors = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#34d399", "#2dd4bf", "#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6"];
  const bgColor = colors[Math.abs(hash(String(id))) % colors.length];

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={`Avatar de ${name || "usuário"}`}
    >
      <span>{getInitials(name)}</span>
    </div>
  );
};

/** =========================
 * Hook de perfil
 * ========================= */
const useUserProfile = (userId) => {
  const [state, setState] = useState({
    user: null,
    posts: [],
    loading: true,
    error: null,
    friendStatus: "idle", // idle | friends | request_sent | request_received
  });
  const [me, setMe] = useState(null);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [{ data: userData }, { data: meData }] = await Promise.all([
        api.get(`/users/${userId}`), // deve retornar { user, posts }
        api.get("/users/me"),
      ]);

      const profileUser = userData?.user || null;
      const profilePosts = userData?.posts || [];

      let friendStatus = "idle";
      if (meData?.friends?.includes(userId)) {
        friendStatus = "friends";
      } else if (profileUser?.friendRequests?.includes?.(meData?._id)) {
        // Eu enviei um pedido para a pessoa (aparece na lista de pedidos da pessoa)
        friendStatus = "request_sent";
      } else if (meData?.friendRequests?.includes?.(userId)) {
        // A pessoa enviou um pedido para mim (aparece na minha lista)
        friendStatus = "request_received";
      }

      setState({
        user: profileUser,
        posts: profilePosts,
        loading: false,
        error: null,
        friendStatus,
      });
      setMe(meData || null);
    } catch (err) {
      setState({
        user: null,
        posts: [],
        loading: false,
        error: "Falha ao carregar o perfil. Tente novamente.",
        friendStatus: "idle",
      });
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const isMyProfile = !!(me && state.user && me._id === state.user._id);

  const setFriendStatus = useCallback((status) => {
    setState((s) => ({ ...s, friendStatus: status }));
  }, []);

  return {
    ...state,
    me,
    isMyProfile,
    refetch: load,
    setFriendStatus,
  };
};

/** =========================
 * UI: Header
 * ========================= */
const ProfileHeader = ({ user }) => {
  const avatarSrc = getImageUrl(user?.avatarUrl);

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-4">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover"
            alt={`Avatar de ${user?.name || "usuário"}`}
          />
        ) : (
          <GenericAvatar user={user} className="w-20 h-20 text-3xl" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{user?.name || "Utilizador"}</h1>
          <p className="text-gray-600">
            {user?.bio || "Este utilizador ainda não adicionou uma bio."}
          </p>
        </div>
      </div>
    </div>
  );
};

/** =========================
 * UI: Botões de ação
 * ========================= */
const ActionButton = ({
  isMyProfile,
  friendStatus,
  onAddFriend,
  onAcceptFriend,
  onDeclineRequest,
  onEditProfile,
  loadingKey, // "add" | "accept" | "decline" | null
}) => {
  if (isMyProfile) {
    return (
      <button
        onClick={onEditProfile}
        className="w-full bg-gray-200 text-gray-800 rounded px-3 py-2 mt-4 hover:bg-gray-300 transition-colors"
      >
        Editar Perfil
      </button>
    );
  }

  switch (friendStatus) {
    case "friends":
      return (
        <button
          className="w-full bg-green-500 text-white rounded px-3 py-2 mt-4 cursor-default"
          aria-disabled
        >
          ✓ Amigos
        </button>
      );
    case "request_sent":
      return (
        <button
          className="w-full bg-gray-400 text-white rounded px-3 py-2 mt-4 cursor-default"
          aria-disabled
        >
          Pedido Enviado
        </button>
      );
    case "request_received":
      return (
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={onAcceptFriend}
            disabled={loadingKey === "accept"}
            className="w-full bg-yellow-500 text-white rounded px-3 py-2 hover:bg-yellow-600 transition-colors disabled:opacity-70"
          >
            {loadingKey === "accept" ? "Aceitando..." : "Aceitar Pedido"}
          </button>
          <button
            onClick={onDeclineRequest}
            disabled={loadingKey === "decline"}
            className="w-full bg-gray-200 text-gray-800 rounded px-3 py-2 hover:bg-gray-300 transition-colors disabled:opacity-70"
          >
            {loadingKey === "decline" ? "Removendo..." : "Recusar/Remover Pedido"}
          </button>
        </div>
      );
    case "idle":
    default:
      return (
        <button
          onClick={onAddFriend}
          disabled={loadingKey === "add"}
          className="w-full bg-blue-500 text-white rounded px-3 py-2 mt-4 hover:bg-blue-600 transition-colors disabled:opacity-70"
        >
          {loadingKey === "add" ? "Enviando..." : "Adicionar Amigo"}
        </button>
      );
  }
};

/** =========================
 * UI: Sidebar
 * ========================= */
const ProfileSidebar = ({
  user,
  isMyProfile,
  friendStatus,
  setFriendStatus,
  karma,
}) => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState("");
  const [loadingKey, setLoadingKey] = useState(null); // "add" | "accept" | "decline" | null

  const showNotification = useCallback((message) => {
    setNotification(message);
    const t = setTimeout(() => setNotification(""), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleShare = useCallback(async () => {
    const ok = await copyToClipboard(window.location.href);
    showNotification(ok ? "Link do perfil copiado!" : "Não foi possível copiar o link.");
  }, [showNotification]);

  const handleAddFriend = useCallback(async () => {
    setLoadingKey("add");
    try {
      await api.post(`/users/${user._id}/request`);
      setFriendStatus("request_sent");
      showNotification("Pedido de amizade enviado!");
    } catch (error) {
      showNotification("Não foi possível enviar o pedido.");
    } finally {
      setLoadingKey(null);
    }
  }, [user?._id, setFriendStatus, showNotification]);

  // As rotas abaixo assumem uma API REST comum.
  // Ajuste se a sua API usar endpoints diferentes.
  const handleAcceptFriend = useCallback(async () => {
    setLoadingKey("accept");
    try {
      await api.post(`/users/${user._id}/accept`);
      setFriendStatus("friends");
      showNotification("Pedido aceito! Agora vocês são amigos.");
    } catch (error) {
      showNotification("Não foi possível aceitar o pedido.");
    } finally {
      setLoadingKey(null);
    }
  }, [user?._id, setFriendStatus, showNotification]);

  const handleDeclineRequest = useCallback(async () => {
    setLoadingKey("decline");
    try {
      await api.post(`/users/${user._id}/decline`);
      setFriendStatus("idle");
      showNotification("Pedido removido.");
    } catch (error) {
      showNotification("Não foi possível remover o pedido.");
    } finally {
      setLoadingKey(null);
    }
  }, [user?._id, setFriendStatus, showNotification]);

  const createdAt = safeDate(user?.createdAt);

  return (
    <div className="card p-4 relative">
      {notification && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -mt-10 bg-gray-800 text-white text-sm px-3 py-1 rounded-full shadow"
          role="status"
        >
          {notification}
        </div>
      )}

      <h2 className="text-lg font-bold mb-4">{user?.name || "Utilizador"}</h2>

      <div className="space-y-4 text-sm">
        <div>
          <h3 className="font-semibold flex items-center">
            <KarmaIcon /> Karma
          </h3>
          <p className="ml-8">{karma}</p>
        </div>

        <div>
          <h3 className="font-semibold flex items-center">
            <CakeIcon /> Dia do Bolo
          </h3>
          <p className="ml-8">
            {createdAt
              ? format(createdAt, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
              : "-"}
          </p>
        </div>
      </div>

      <ActionButton
        isMyProfile={isMyProfile}
        friendStatus={friendStatus}
        onAddFriend={handleAddFriend}
        onAcceptFriend={handleAcceptFriend}
        onDeclineRequest={handleDeclineRequest}
        onEditProfile={() => navigate("/settings")}
        loadingKey={loadingKey}
      />

      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center bg-transparent text-gray-600 rounded px-3 py-2 mt-2 hover:bg-gray-100 transition-colors"
        aria-label="Copiar link do perfil"
        title="Copiar link do perfil"
      >
        <ShareIcon /> Partilhar
      </button>
    </div>
  );
};

/** =========================
 * UI: Filtros de posts
 * ========================= */
const PostFilters = ({ sortType, setSortType }) => {
  const filterButtons = [
    { key: "new", label: "Novos" },
    { key: "hot", label: "Quentes" },
    { key: "top", label: "Top" },
  ];

  return (
    <div className="flex border-b mb-4 bg-white rounded-t-lg">
      {filterButtons.map((btn) => (
        <button
          key={btn.key}
          onClick={() => setSortType(btn.key)}
          className={`px-4 py-2 font-semibold transition-colors ${sortType === btn.key
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-500 hover:text-blue-500"
            }`}
          aria-pressed={sortType === btn.key}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
};

/** =========================
 * UI: Skeleton
 * ========================= */
const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-8">
        <div className="card p-4 mb-4 h-28 bg-gray-200"></div>
        <div className="card mb-4 h-12 bg-gray-200"></div>
        <div className="space-y-4">
          <div className="card h-40 bg-gray-200"></div>
          <div className="card h-40 bg-gray-200"></div>
        </div>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="card p-4 h-48 bg-gray-200"></div>
      </div>
    </div>
  </div>
);

/** =========================
 * Página principal
 * ========================= */
export default function Profile() {
  const { id } = useParams();
  const {
    user,
    posts,
    loading,
    error,
    isMyProfile,
    refetch,
    friendStatus,
    setFriendStatus,
  } = useUserProfile(id);

  const [sortType, setSortType] = useState("new");

  const sortedPosts = useMemo(() => {
    const list = Array.isArray(posts) ? [...posts] : [];
    switch (sortType) {
      case "hot": {
        const score = (p) => (p.likes?.length || 0) - (p.dislikes?.length || 0);
        return list.sort((a, b) => score(b) - score(a));
      }
      case "top":
        return list.sort(
          (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)
        );
      case "new":
      default:
        return list.sort(
          (a, b) =>
            (safeDate(b?.createdAt)?.getTime() || 0) -
            (safeDate(a?.createdAt)?.getTime() || 0)
        );
    }
  }, [posts, sortType]);

  const karma = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    return list.reduce(
      (acc, p) => acc + (p.likes?.length || 0) - (p.dislikes?.length || 0),
      0
    );
  }, [posts]);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container-healer mt-6">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="container-healer mt-6 text-center card p-8">
          <p className="text-red-500 font-semibold">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <div className="container-healer mt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <main className="col-span-1 md:col-span-8">
            <div className="flex flex-col gap-4">
              <ProfileHeader user={user} />
              <div>
                <PostFilters sortType={sortType} setSortType={setSortType} />
                <div className="space-y-4">
                  {sortedPosts.length > 0 ? (
                    sortedPosts.map((p) => (
                      <PostCard
                        key={p._id}
                        post={{ ...p, user }}
                        onChanged={refetch}
                      />
                    ))
                  ) : (
                    <div className="card p-8 text-center text-gray-500">
                      <p>Parece que {user?.name || "este usuário"} ainda não publicou nada.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          <aside className="col-span-1 md:col-span-4">
            <ProfileSidebar
              user={user}
              isMyProfile={isMyProfile}
              friendStatus={friendStatus}
              setFriendStatus={setFriendStatus}
              karma={karma}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
