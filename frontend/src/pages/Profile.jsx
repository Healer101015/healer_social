// frontend/src/pages/Profile.jsx

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";

// Components
import Navbar from "../components/Navbar.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";

// Context
import { useAuth } from "../context/AuthContext.jsx";
import { useChat } from "../context/ChatContext.jsx";

// --- Ícones para a UI ---
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const FriendsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.03 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 00-1.28.682L5 15v-3.586a1 1 0 00-.293-.707A2 2 0 012 9V5z" /></svg>;
const AddFriendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>;

// --- Helpers ---
const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:4000";
const getImageUrl = (path, name = "user") => {
  if (path) return `${path}`;
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=256`;
};

// --- Custom Hook para gerir a lógica e o estado do Perfil ---
const useUserProfile = (userId) => {
  const [state, setState] = useState({
    user: null,
    posts: [],
    friendStatus: 'idle',
    loading: true,
    error: null,
  });

  const fetchProfile = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get(`/users/${userId}`);
      const { user: profileUser, posts, friendStatus } = res.data;
      setState({ user: profileUser, posts, friendStatus, loading: false, error: null });
    } catch (e) {
      const errorMsg = e.response?.status === 404 ? "Utilizador não encontrado." : "Falha ao carregar o perfil.";
      setState(s => ({ ...s, loading: false, error: errorMsg }));
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (state.user) {
      document.title = `${state.user.name} - Healer`;
    }
  }, [state.user]);

  return { ...state, setState, refetch: fetchProfile };
};

// --- Componentes de UI Modulares ---

const ProfileSkeleton = () => (
  <div className="animate-pulse">
    <div className="card rounded-lg overflow-hidden">
      <div className="h-48 md:h-64 bg-gray-200"></div>
      <div className="relative p-6">
        <div className="absolute -top-20 left-6">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gray-300 border-4 border-white"></div>
        </div>
        <div className="pt-16 sm:pt-20 sm:ml-44">
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 mt-2 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 mt-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
    <div className="card mt-6 h-64 bg-gray-200"></div>
  </div>
);

const ProfileHeader = ({ user }) => (
  <div className="card rounded-lg overflow-hidden shadow-md">
    <div className="h-48 md:h-64 bg-gray-200">
      <img
        src={!user.coverPhotoUrl.includes('/uploads/') && user.coverPhotoUrl != "" ? user.coverPhotoUrl : getImageUrl(null, user.name)}
        alt={`Foto de capa de ${user.name}`}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="relative p-6">
      <div className="absolute -top-16 sm:-top-20 left-6">
        <img
          src={!user.avatarUrl.includes('/uploads/') && user.avatarUrl != "" ? user.avatarUrl : getImageUrl(null, user.name)}
          alt={`Avatar de ${user.name}`}
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white shadow-lg"
        />
      </div>
      {/* Espaçamento para o conteúdo não ficar por baixo do avatar */}
      <div className="pt-16 sm:pt-20 sm:ml-44">
        <h2 className="text-3xl font-bold text-gray-800">{user.name}</h2>
        <p className="text-gray-500 mt-1">{user.bio || "Este utilizador ainda não adicionou uma biografia."}</p>
        <div className="text-sm text-gray-600 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5"><FriendsIcon /> <strong>{user.friends?.length || 0}</strong> amigos</span>
          <span className="flex items-center gap-1.5"><EyeIcon /> <strong>{user.profileViews || 0}</strong> visualizações</span>
          <span className="flex items-center gap-1.5"><CalendarIcon /> Entrou em {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  </div>
);

const FriendshipActions = ({ user, status, setStatus }) => {
  const { openChat } = useChat();
  const [loading, setLoading] = useState(false);

  const handleAction = async (endpoint, newStatus) => {
    setLoading(true);
    try {
      await api.post(`/users/${user._id}/${endpoint}`);
      setStatus(newStatus);
    } catch (error) {
      console.error(`Falha ao ${endpoint}`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col sm:flex-row gap-2">
      <button
        onClick={() => openChat(user)}
        className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg px-4 py-2 transition disabled:opacity-50"
      >
        <MessageIcon /> Conversar
      </button>

      {status === 'idle' && <button onClick={() => handleAction('request', 'request_sent')} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-2 transition"><AddFriendIcon /> {loading ? "A enviar..." : "Adicionar"}</button>}
      {status === 'request_sent' && <button disabled className="flex-1 bg-gray-200 text-gray-500 font-medium rounded-lg px-4 py-2 cursor-not-allowed">Pedido Enviado</button>}
      {status === 'request_received' && <button onClick={() => handleAction('accept', 'friends')} disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition">{loading ? "A aceitar..." : "Aceitar Pedido"}</button>}
      {status === 'friends' && <button disabled className="flex-1 bg-gray-200 text-gray-500 font-medium rounded-lg px-4 py-2 cursor-not-allowed">Amigos</button>}
    </div>
  );
};

const FriendsList = ({ friends }) => (
  <div className="card p-4">
    <h3 className="font-semibold text-gray-900 mb-4">Amigos ({friends?.length || 0})</h3>
    {friends && friends.length > 0 ? (
      <div className="grid grid-cols-3 gap-2">
        {friends.map(friend => (
          <Link to={`/profile/${friend._id}`} key={friend._id} className="flex flex-col items-center text-center">
            <img src={getImageUrl(friend.avatarUrl, friend.name)} alt={friend.name} className="w-20 h-20 rounded-lg object-cover mb-1" />
            <span className="text-xs font-medium text-gray-700">{friend.name}</span>
          </Link>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500">Nenhum amigo para mostrar.</p>
    )}
  </div>
);


// --- Componente Principal ---
export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { user, posts, friendStatus, loading, error, setState, refetch } = useUserProfile(id);
  const isMyProfile = me?._id === id;

  const handlePostUpdate = (updatedPost) => {
    setState(s => ({
      ...s,
      posts: s.posts.map(p => p._id === updatedPost._id ? updatedPost : p)
    }));
  };

  const handlePostDelete = (deletedPostId) => {
    setState(s => ({ ...s, posts: s.posts.filter(p => p._id !== deletedPostId) }));
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Navbar />
        <div className="container-healer mt-6"><ProfileSkeleton /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Navbar />
        <div className="container-healer mt-6 text-center card p-8">
          <h2 className="text-xl font-bold text-red-600">Ocorreu um Erro</h2>
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={refetch} className="bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Navbar />
      <div className="container-healer mt-6">
        <div className="grid grid-cols-12 gap-6">
          <main className="col-span-12 lg:col-span-8 space-y-6">
            <ProfileHeader user={user} />

            {!isMyProfile ? (
              <div className="card p-4">
                <FriendshipActions user={user} status={friendStatus} setStatus={(newStatus) => setState(s => ({ ...s, friendStatus: newStatus }))} />
              </div>
            ) : (
              <div className="card p-4">
                <Link to="/settings" className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-2 transition">
                  Editar Perfil
                </Link>
              </div>
            )}

            <div className="card p-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Publicações</h3>
              {posts && posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((p) => (
                    <PostCard key={p._id} post={p} onChanged={handlePostUpdate} onDelete={() => handlePostDelete(p._id)} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <h3 className="text-xl font-semibold">Sem publicações ainda</h3>
                  <p>Este utilizador ainda não partilhou nada.</p>
                </div>
              )}
            </div>
          </main>

          <aside className="hidden lg:block col-span-4">
            <div className="sticky top-24 space-y-6">
              <FriendsList friends={user.friends} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}