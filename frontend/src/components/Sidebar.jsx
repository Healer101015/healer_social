import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

// Componente para o avatar genérico
const GenericAvatar = ({ user, className }) => {
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
  const bgColor = colors[Math.abs(hash(String(user._id))) % colors.length];

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={`Avatar de ${user.name}`}
    >
      <span>{getInitials(user.name)}</span>
    </div>
  );
};


// Hook customizado para buscar as sugestões
const useFriendSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: meData }, { data: usersData }] = await Promise.all([
        api.get("/users/me"),
        api.get("/users/search?q="),
      ]);
      setMe(meData);

      // Filtra o próprio usuário e amigos existentes
      const filteredUsers = usersData.filter(user =>
        user._id !== meData._id && !meData.friends.includes(user._id)
      ).slice(0, 8);

      setSuggestions(filteredUsers.map(u => ({ ...u, status: 'idle' })));
    } catch (err) {
      console.error("Erro ao buscar sugestões:", err);
      setError("Não foi possível carregar as sugestões.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const updateUserStatus = (userId, status) => {
    setSuggestions(prev =>
      prev.map(u => (u._id === userId ? { ...u, status } : u))
    );
  };

  return { suggestions, loading, error, updateUserStatus, refetch: fetchSuggestions };
};


// Componente para cada item da lista
const SuggestionItem = ({ user, onAddFriend }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddFriend = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/users/${user._id}/request`);
      onAddFriend(user._id, 'sent');
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      setIsSubmitting(false); // Permite tentar novamente em caso de erro
    }
  };

  let avatarUrl = user.avatarUrl ? `${user.avatarUrl}` : null;

  if (avatarUrl && avatarUrl.includes("/uploads/")) avatarUrl = null;

  return (
    <li className="flex justify-between items-center transition-opacity duration-300">
      <Link to={`/profile/${user._id}`} className="flex items-center gap-3 group">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`Avatar de ${user.name}`} className="w-9 h-9 rounded-full object-cover group-hover:opacity-80" />
        ) : (
          <GenericAvatar user={user} className="w-9 h-9 text-sm group-hover:opacity-80" />
        )}
        <span className="font-medium text-gray-800 group-hover:text-sky-600">{user.name}</span>
      </Link>
      <button
        onClick={handleAddFriend}
        disabled={isSubmitting || user.status === 'sent'}
        className={`text-sm px-3 py-1 rounded-full font-semibold transition-colors ${user.status === 'sent'
          ? 'bg-green-100 text-green-700 cursor-default'
          : 'bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-50'
          }`}
        aria-label={user.status === 'sent' ? `Pedido enviado para ${user.name}` : `Adicionar ${user.name}`}
      >
        {user.status === 'sent' ? "Enviado" : (isSubmitting ? "Enviando..." : "Adicionar")}
      </button>
    </li>
  );
};


// Componente principal da Sidebar
export default function Sidebar() {
  const { suggestions, loading, error, updateUserStatus, refetch } = useFriendSuggestions();

  const renderContent = () => {
    if (loading) {
      return <p className="text-sm text-gray-500">Carregando sugestões...</p>;
    }
    if (error) {
      return (
        <div className="text-center text-sm">
          <p className="text-red-500 mb-2">{error}</p>
          <button onClick={refetch} className="text-sky-600 font-semibold hover:underline">Tentar Novamente</button>
        </div>
      );
    }
    if (suggestions.length === 0) {
      return <p className="text-sm text-gray-500">Nenhuma sugestão de amizade no momento.</p>;
    }
    return (
      <ul className="space-y-4">
        {suggestions.map(u => (
          <SuggestionItem key={u._id} user={u} onAddFriend={updateUserStatus} />
        ))}
      </ul>
    );
  };

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Sugestões de Amizade</h3>
      {renderContent()}
    </div>
  );
}