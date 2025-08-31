// frontend/src/components/PostCard.jsx
import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

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

// --- Ícones ---
const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.875-1.979l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>;

// NOVO: Componente para escolher a reação
const ReactionPicker = ({ onSelect, onHover }) => {
  const reactions = [
    { type: 'like', emoji: '👍' },
    { type: 'love', emoji: '❤️' },
    { type: 'haha', emoji: '😂' },
    { type: 'sad', emoji: '😢' },
  ];
  return (
    <div
      className="absolute bottom-full mb-2 flex gap-1 bg-white p-1 rounded-full shadow-lg border"
      onMouseLeave={() => onHover(false)}
      onMouseEnter={() => onHover(true)}
    >
      {reactions.map(r => (
        <button
          key={r.type}
          onClick={() => onSelect(r.type)}
          className="text-2xl p-1 rounded-full hover:bg-gray-200 transform hover:scale-125 transition"
        >
          {r.emoji}
        </button>
      ))}
    </div>
  );
};

const PostCard = ({ post: initialPost, onDelete, onChanged }) => {
  const { user: me } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showActions, setShowActions] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const actionsRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const isOwner = me && post.user && me._id === post.user._id;
  const myReaction = post.reactions?.find(r => r.user._id === me._id);

  const handleReaction = async (reactionType) => {
    setShowReactionPicker(false);
    try {
      const { data: finalPost } = await api.post(`/posts/${post._id}/react`, { reactionType });
      onChanged(finalPost);
    } catch (error) {
      console.error("Falha ao reagir ao post.", error);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data: updatedPost } = await api.post(`/posts/${post._id}/comment`, { text: comment });
    setComment("");
    setShowCommentInput(false);
    onChanged(updatedPost);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() === post.text) return setIsEditing(false);
    try {
      const { data: updatedPost } = await api.put(`/posts/${post._id}`, { text: editText });
      onChanged(updatedPost);
      setIsEditing(false);
    } catch (error) {
      console.error("Falha ao editar o post", error);
    }
  };

  const handleShare = async () => {
    try {
      await api.post(`/posts/${post._id}/share`);
      alert("Publicação partilhada com sucesso!");
      // Idealmente, o feed deve ser atualizado para mostrar a partilha
    } catch (error) {
      console.error("Falha ao partilhar a publicação", error);
    }
  };

  const getReactionButtonContent = () => {
    if (!myReaction) return <span>👍 Curtir</span>;
    switch (myReaction.type) {
      case 'love': return <span className="text-red-500">❤️ Amei</span>;
      case 'haha': return <span className="text-yellow-500">😂 Haha</span>;
      case 'sad': return <span className="text-blue-500">😢 Triste</span>;
      default: return <span className="text-sky-600">👍 Curti</span>;
    }
  };

  // Renderiza o conteúdo principal de um post
  const renderPostContent = (p) => {

    if (!p?.user) {
      return (
        <div className="p-4 text-gray-500 italic">
          Usuário indisponível
        </div>
      );
    }

    return (
        <>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <Link to={`/profile/${p.user._id}`} className="flex items-center gap-3">
              {p.user.avatarUrl && !p.user.avatarUrl.includes("/uploads/") ? (
                <img src={p.user.avatarUrl} className="w-9 h-9 rounded-full object-cover group-hover:opacity-80" />
              ) : (
                <GenericAvatar user={p.user} className="w-9 h-9 text-sm group-hover:opacity-80" />
              )
            }
              <div>
                <div className="font-semibold text-gray-800 hover:underline">{p.user.name}</div>
                <div className="text-xs text-gray-500">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: ptBR })} {p.isEdited && "(editado)"}</div>
              </div>
            </Link>
            {isOwner && (
              <div className="relative" ref={actionsRef}>
                <button onClick={() => setShowActions(prev => !prev)} className="p-2 rounded-full hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                </button>
                {showActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 border">
                    <button onClick={() => { setIsEditing(true); setShowActions(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Editar</button>
                    <button onClick={() => { onDelete(); setShowActions(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Apagar</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full border rounded-md p-2" rows="3"></textarea>
              <button onClick={handleSaveEdit} className="bg-sky-500 text-white px-3 py-1 rounded-md text-sm">Guardar</button>
              <button onClick={() => setIsEditing(false)} className="ml-2 text-sm">Cancelar</button>
            </div>
          ) : (
            p.text && <p className="mb-4 text-gray-800 whitespace-pre-wrap">{p.text}</p>
          )}
        </div>

        {p.mediaUrl && (
          <div className="bg-gray-100">
            {p.mediaType === "image" ? (
              <img src={`${p.mediaUrl}`} className="max-h-[600px] object-contain w-full" />
            ) : (
              <video controls className="w-full"><source src={`${p.mediaUrl}`} /></video>
            )}
          </div>
        )}
      </>
    )
  }
  
  // Se for uma partilha, renderiza de forma diferente
  if (post.repostOf) {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4">
          <div className="p-1 pb-2 text-sm text-gray-500">
            <Link to={`/profile/${post.user._id}`} className="font-semibold hover:underline">{post.user.name}</Link> partilhou isto
          </div>
          <div className="mx-4 mb-4 border rounded-lg overflow-hidden">
            {renderPostContent(post.repostOf)}
          </div>
          {/* Ações (reagir, comentar) aplicam-se à PARTILHA, não ao post original */}

          <div className="flex gap-1 text-gray-600 border-t pt-1">
            <div className="relative flex-1" onMouseEnter={() => setShowReactionPicker(true)}>
              {showReactionPicker && <ReactionPicker onSelect={handleReaction} onHover={setShowReactionPicker} />}
              <button onClick={() => handleReaction(myReaction ? myReaction.type : 'like')} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium">
                {getReactionButtonContent()}
              </button>
            </div>
            <button onClick={() => setShowCommentInput(prev => !prev)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium"><CommentIcon /> Comentar</button>
            <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium"><ShareIcon /> Partilhar</button>
          </div>

          {showCommentInput && (
            <form onSubmit={addComment} className="flex items-center gap-2 mt-2">
              <input className="flex-1 bg-gray-100 rounded-full px-4 py-2" placeholder="Escreva um comentário..." value={comment} onChange={e => setComment(e.target.value)} autoFocus />
              <button type="submit" className="bg-sky-600 text-white px-4 py-2 rounded-full font-medium">Enviar</button>
            </form>
          )}

          <div className="space-y-2 mt-2">
            {post.comments?.slice(-3).map((c, i) => (
              <div key={i} className="text-sm bg-gray-50 p-2 rounded-lg">
                <Link to={`/profile/${c.user._id}`} className="font-medium hover:underline">{c.user.name}</Link>: {c.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Renderização normal
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {renderPostContent(post)}
      <div className="p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{post.reactions?.length || 0} Reações</span>
          <span>{post.comments?.length || 0} Comentários</span>
        </div>

        <div className="flex gap-1 text-gray-600 border-t pt-1">
          <div className="relative flex-1" onMouseEnter={() => setShowReactionPicker(true)}>
            {showReactionPicker && <ReactionPicker onSelect={handleReaction} onHover={setShowReactionPicker} />}
            <button onClick={() => handleReaction(myReaction ? myReaction.type : 'like')} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium">
              {getReactionButtonContent()}
            </button>
          </div>
          <button onClick={() => setShowCommentInput(prev => !prev)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium"><CommentIcon /> Comentar</button>
          <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium"><ShareIcon /> Partilhar</button>
        </div>

        {showCommentInput && (
          <form onSubmit={addComment} className="flex items-center gap-2 mt-2">
            <input className="flex-1 bg-gray-100 rounded-full px-4 py-2" placeholder="Escreva um comentário..." value={comment} onChange={e => setComment(e.target.value)} autoFocus />
            <button type="submit" className="bg-sky-600 text-white px-4 py-2 rounded-full font-medium">Enviar</button>
          </form>
        )}

        <div className="space-y-2 mt-2">
          {post.comments?.slice(-3).map((c, i) => (
            <div key={i} className="text-sm bg-gray-50 p-2 rounded-lg">
              <Link to={`/profile/${c.user._id}`} className="font-medium hover:underline">{c.user.name}</Link>: {c.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PostCard);