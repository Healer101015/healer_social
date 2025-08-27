// frontend/src/pages/Profile.jsx

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";
import { format, parseISO, isValid as isValidDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../context/AuthContext.jsx";
import { useChat } from "../context/ChatContext.jsx";

/** =========================
 * Hooks e Helpers
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
  } catch (_) {
    return false;
  }
};

const useUserProfile = (userId) => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friendStatus, setFriendStatus] = useState("idle");
  const [karma, setKarma] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMyProfile, setIsMyProfile] = useState(false);
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!userId) {
        setLoading(false);
        setError("Usuário não encontrado.");
        return;
      }
      const [profileResponse, meResponse] = await Promise.all([
        api.get(`/users/${userId}`),
        me ? api.get("/users/me") : Promise.resolve(null),
      ]);
      const profileUser = profileResponse.data.user;
      const meData = meResponse?.data;
      setUser(profileUser);
      setPosts(profileResponse.data.posts);

      if (profileUser._id === me?._id) {
        setIsMyProfile(true);
      } else {
        setIsMyProfile(false);
        if (meData?.friends?.includes(userId)) {
          setFriendStatus("friends");
        } else if (profileUser?.friendRequests?.includes?.(meData?._id)) {
          setFriendStatus("request_sent");
        } else if (meData?.friendRequests?.includes?.(userId)) {
          setFriendStatus("request_received");
        } else {
          setFriendStatus("idle");
        }
      }

      const totalKarma = profileUser.friends.length + profileUser.friendRequests.length;
      setKarma(totalKarma);
    } catch (e) {
      if (e.response?.status === 404) {
        setError("Usuário não encontrado.");
      } else {
        setError("Não foi possível carregar o perfil.");
      }
    } finally {
      setLoading(false);
    }
  }, [userId, me, navigate]);

  // Hook para buscar os dados do usuário e posts
  useEffect(() => {
    refetch();
  }, [userId, refetch]);

  // Hook separado para atualizar o título da página quando o usuário carregar
  useEffect(() => {
    if (user) {
      document.title = user.name + " - Healer";
    }
  }, [user]);

  return {
    user,
    posts,
    friendStatus,
    setFriendStatus,
    karma,
    loading,
    error,
    isMyProfile,
    refetch,
  };
};

/** =========================
 * Componentes Menores
 * ========================= */

const ProfileHeader = ({ user }) => (
  <div className="card p-6 flex flex-col md:flex-row items-center gap-6">
    <div className="flex-shrink-0">
      <img
        src={getImageUrl(user.avatarUrl)}
        alt={`${user.name}'s avatar`}
        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
      />
    </div>
    <div className="flex-1 text-center md:text-left">
      <h2 className="text-3xl font-bold text-gray-800">{user.name}</h2>
      <p className="text-gray-500 mt-1">{user.bio || "Sem biografia."}</p>
    </div>
  </div>
);

const PostFilters = ({ sortType, setSortType }) => (
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-xl font-semibold text-gray-800">Publicações</h3>
    <select
      value={sortType}
      onChange={(e) => setSortType(e.target.value)}
      className="border border-gray-300 rounded-lg py-1 px-2 text-sm"
    >
      <option value="newest">Mais Recentes</option>
      <option value="oldest">Mais Antigos</option>
      <option value="most_liked">Mais Curtidos</option>
    </select>
  </div>
);

const ProfileSidebar = ({
  user,
  isMyProfile,
  friendStatus,
  setFriendStatus,
  karma,
}) => {
  const { openChat } = useChat();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddFriend = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/users/${user._id}/friend-request`);
      setFriendStatus("request_sent");
    } catch (err) {
      console.error("Erro ao enviar pedido:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [user._id, setFriendStatus]);

  const handleAcceptFriend = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/users/${user._id}/accept`);
      setFriendStatus("friends");
    } catch (err) {
      console.error("Erro ao aceitar pedido:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [user._id, setFriendStatus]);

  return (
    <div className="card p-6 flex flex-col items-center text-center">
      <h3 className="text-2xl font-bold text-gray-800">
        {user.name.split(" ")[0]}'s{" "}
        <span className="text-sky-500">Karma</span>
      </h3>
      <div className="text-5xl font-extrabold text-sky-500 my-4">{karma}</div>
      <p className="text-gray-500">
        Karma é a soma de amigos e solicitações de amizade.
      </p>

      <div className="w-full flex justify-center gap-2 mt-4">
        {!isMyProfile && (
          <button
            onClick={() => openChat(user)}
            className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg px-4 py-2 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 00-1.28.682L5 15v-3.586a1 1 0 00-.293-.707A2 2 0 012 9V5z" />
            </svg>
            Conversar
          </button>
        )}

        {!isMyProfile && friendStatus === "idle" && (
          <button
            onClick={handleAddFriend}
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-2 transition disabled:opacity-50"
          >
            {isSubmitting ? "Enviando..." : "Adicionar Amigo"}
          </button>
        )}

        {!isMyProfile && friendStatus === "request_sent" && (
          <button
            disabled
            className="flex-1 bg-gray-200 text-gray-500 font-medium rounded-lg px-4 py-2"
          >
            Solicitação Enviada
          </button>
        )}

        {!isMyProfile && friendStatus === "request_received" && (
          <button
            onClick={handleAcceptFriend}
            disabled={isSubmitting}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition disabled:opacity-50"
          >
            {isSubmitting ? "Aceitando..." : "Aceitar Pedido"}
          </button>
        )}

        {!isMyProfile && friendStatus === "friends" && (
          <button
            disabled
            className="flex-1 bg-gray-200 text-gray-500 font-medium rounded-lg px-4 py-2"
          >
            Amigos
          </button>
        )}
      </div>

      <div className="w-full mt-4 flex flex-col gap-2 border-t pt-4">
        {isMyProfile && (
          <Link
            to="/settings"
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg py-2 transition text-center"
          >
            Editar Perfil
          </Link>
        )}
        <button
          onClick={() => copyToClipboard(window.location.href)}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg py-2 transition"
        >
          Copiar Link
        </button>
      </div>
    </div>
  );
};

/** =========================
 * Componente Principal
 * ========================= */

export default function Profile() {
  const { id } = useParams();
  const [sortType, setSortType] = useState("newest");
  const {
    user,
    posts,
    friendStatus,
    setFriendStatus,
    karma,
    loading,
    error,
    isMyProfile,
    refetch,
  } = useUserProfile(id);

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    switch (sortType) {
      case "oldest":
        return [...posts].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      case "most_liked":
        return [...posts].sort((a, b) => b.likes.length - a.likes.length);
      case "newest":
      default:
        return [...posts].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    }
  }, [posts, sortType]);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Navbar />
        <div className="container-healer mt-6 text-center text-gray-500">
          Carregando perfil...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Navbar />
        <div className="container-healer mt-6 text-center text-red-500">
          {error}
        </div>
      </div>
    );
  }

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
                      <p>
                        Parece que {user?.name || "este usuário"} ainda não
                        publicou nada.
                      </p>
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