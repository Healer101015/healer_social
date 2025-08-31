import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import io from 'socket.io-client';
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Ícones ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// --- Componente de Avatar Genérico ---
const GenericAvatar = ({ user, className }) => {
  const getInitials = (name) => !name ? "?" : name.trim().split(" ").filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return <div className={`flex items-center justify-center rounded-full bg-sky-500 text-white font-bold ${className}`}><span>{getInitials(user?.name)}</span></div>;
};

// ... (Hook useDebounce e Componente SearchBar permanecem os mesmos) ...
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length > 1) {
      api.get(`/users/search?q=${debouncedQuery}`)
        .then(r => setResults(r.data))
        .catch(console.error);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <input
          placeholder="Pesquisar usuários..."
          className="bg-gray-100 rounded-full px-4 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          aria-label="Campo de pesquisa de usuários"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon />
        </div>
      </div>
      {isOpen && (query.length > 0) && (
        <div className="absolute top-full mt-2 w-full md:w-80 bg-white rounded-lg shadow-xl z-20 border">
          {results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {results.map(user => {
                const avatarUrl = user.avatarUrl ? `${API_URL}${user.avatarUrl}` : null;
                return (
                  <li key={user._id}>
                    <Link to={`/profile/${user._id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors">
                      {avatarUrl ? (
                        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" alt={`Avatar de ${user.name}`} />
                      ) : (
                        <GenericAvatar user={user} className="w-10 h-10" />
                      )}
                      <span className="font-medium">{user.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-4 text-sm text-gray-500">{debouncedQuery.length > 1 ? "Nenhum resultado encontrado." : "Digite para pesquisar..."}</p>
          )}
        </div>
      )}
    </div>
  );
};


// --- NOVO: Componente de Notificações ---
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error("Erro ao buscar notificações", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Atualiza a cada minuto

    const token = localStorage.getItem('token');
    if (token) {
      const socket = io(API_URL, { auth: { token } });
      socket.on('new_notification', (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      });

      return () => {
        clearInterval(interval);
        socket.disconnect();
      };
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      await api.post('/notifications/read');
      fetchNotifications(); // Re-busca para atualizar o status 'read'
    }
  };

  const getNotificationMessage = (notif) => {
    switch (notif.type) {
      case 'FRIEND_REQUEST': return 'enviou um pedido de amizade.';
      case 'FRIEND_ACCEPT': return 'aceitou seu pedido de amizade.';
      case 'LIKE': return 'curtiu sua publicação.';
      case 'COMMENT': return 'comentou na sua publicação.';
      case 'NEW_MESSAGE': return 'enviou uma nova mensagem.';
      default: return 'interagiu com você.';
    }
  }

  return (
    <div className="relative" ref={bellRef}>
      <button onClick={handleOpen} className="relative p-2 rounded-full hover:bg-gray-100">
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadCount}</span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-20 border">
          <div className="p-3 font-semibold border-b">Notificações</div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? notifications.map(notif => {
              const senderAvatar = notif.sender.avatarUrl ? `${API_URL}${notif.sender.avatarUrl}` : null;
              return (
                <li key={notif._id}>
                  <Link to={`/profile/${notif.sender._id}`} onClick={() => setIsOpen(false)}
                    className={`flex items-start gap-3 p-3 hover:bg-gray-100 ${!notif.read ? 'bg-sky-50' : ''}`}>
                    {senderAvatar ? <img src={senderAvatar} className="w-10 h-10 rounded-full object-cover" /> : <GenericAvatar user={notif.sender} className="w-10 h-10" />}
                    <div className="flex-1 text-sm">
                      <p><span className="font-bold">{notif.sender.name}</span> {getNotificationMessage(notif)}</p>
                      <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(notif.createdAt), { locale: ptBR, addSuffix: true })}</p>
                    </div>
                  </Link>
                </li>
              )
            }) : <p className="p-4 text-sm text-gray-500">Nenhuma notificação ainda.</p>}
          </ul>
        </div>
      )}
    </div>
  );
};


// ... (Componente ProfileDropdown permanece o mesmo) ...
const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  let avatarUrl = user.avatarUrl ? `${user.avatarUrl}` : null;

  if (avatarUrl && avatarUrl.includes("/uploads/")) avatarUrl = null

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 focus:outline-none" aria-haspopup="true" aria-expanded={isOpen}>
        {avatarUrl ? <img src={avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="Seu avatar" /> : <GenericAvatar user={user} className="w-9 h-9" />}
        <span className="text-sm font-semibold hidden md:block">{user.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20 border py-1">
          <Link to={`/profile/${user._id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <ProfileIcon /> Meu Perfil
          </Link>
          <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">
            <LogoutIcon /> Sair
          </button>
        </div>
      )}
    </div>
  );
};


// --- Navbar Principal ---
export default function Navbar() {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const SkeletonLoader = () => (
    <div className="flex gap-4 items-center animate-pulse">
      <div className="bg-gray-200 h-9 w-48 rounded-full"></div>
      <div className="bg-gray-200 h-9 w-9 rounded-full"></div>
    </div>
  );

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-10" role="navigation" aria-label="Navegação principal">
      <div className="container-healer flex items-center justify-between py-3 px-4">
        <Link to="/" className="font-bold text-2xl text-sky-600 tracking-tight" aria-label="Healer - Página inicial">Healer</Link>

        {/* --- Menu Desktop --- */}
        <div className="hidden md:flex gap-4 items-center">
          {loading ? <SkeletonLoader /> : user ? (
            <>
              <SearchBar />
              <NotificationBell /> {/* Adicionar o sino de notificação */}
              <ProfileDropdown />
            </>
          ) : (
            <Link to="/login" className="bg-sky-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-sky-700 transition-colors">Entrar</Link>
          )}
        </div>

        {/* ... (Menu Mobile permanece o mesmo) ... */}
        <div className="md:hidden">
          <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} aria-controls="mobile-menu" aria-expanded={isMobileMenuOpen}>
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden px-4 pb-4 border-t">
          {loading ? <div className="animate-pulse bg-gray-200 h-12 w-full mt-4 rounded-lg"></div> : user ? (
            <div className="mt-4 space-y-4">
              <SearchBar />
              <div className="flex justify-between items-center border-t pt-4">
                <ProfileDropdown />
                <NotificationBell />
              </div>
            </div>
          ) : (
            <Link to="/login" className="block w-full text-center mt-4 bg-sky-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-sky-700 transition-colors">Entrar</Link>
          )}
        </div>
      )}
    </header>
  );
}