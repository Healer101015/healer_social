import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";

// Ícones para ações do post
const LikeIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ease-in-out ${filled ? 'transform scale-110' : ''}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
  </svg>
);

const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
  </svg>
);

const PostCard = ({ post, onDelete, onChanged }) => {
  const { user: me } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const actionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isOwner = me && post.user && me._id === post.user._id;
  const avatarSrc = post.user?.avatarUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${post.user.avatarUrl}` : null;
  const hasLiked = me && post.likes?.includes(me._id);

  const like = async () => {
    if (!onChanged) return;

    const optimisticPost = {
      ...post,
      likes: hasLiked
        ? post.likes.filter(id => id !== me._id)
        : [...(post.likes || []), me._id],
    };
    onChanged(optimisticPost);

    try {
      const { data: finalPost } = await api.post(`/posts/${post._id}/like`);
      onChanged(finalPost);
    } catch (error) {
      console.error("Falha ao curtir o post, revertendo.", error);
      onChanged(post);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data: updatedPost } = await api.post(`/posts/${post._id}/comment`, { text: comment });
    setComment("");
    setShowCommentInput(false);
    onChanged && onChanged(updatedPost);
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            {avatarSrc ? (
              <img src={avatarSrc} className="w-11 h-11 rounded-full object-cover" alt={`Avatar de ${post.user?.name}`} />
            ) : (
              <div className="w-11 h-11 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-lg">
                {post.user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-800">{post.user?.name || "Utilizador"}</div>
              <div className="text-xs text-gray-500">{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR }) : 'agora'}</div>
            </div>
          </div>
          {isOwner && (
            <div className="relative" ref={actionsRef}>
              <button onClick={() => setShowActions(prev => !prev)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
              </button>
              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 border border-gray-100">
                  <button onClick={() => { onDelete(); setShowActions(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors">
                    Apagar Publicação
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {post.text && <p className="mb-4 text-gray-800 whitespace-pre-wrap">{post.text}</p>}
      </div>

      {post.mediaUrl && (
        <div className="bg-gray-100">
          {post.mediaType === "image" ? (
            <img src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${post.mediaUrl}`} className="max-h-[600px] object-contain w-full" />
          ) : (
            <video controls className="w-full">
              <source src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${post.mediaUrl}`} />
            </video>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{post.likes?.length || 0} Curtidas</span>
          <span>{post.comments?.length || 0} Comentários</span>
        </div>

        <div className="flex gap-2 text-gray-600 border-t pt-2 mb-2">
          <button onClick={like} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium ${hasLiked ? 'text-sky-600' : 'text-gray-600'}`}>
            <LikeIcon filled={hasLiked} /> Curtir
          </button>
          <button
            onClick={() => setShowCommentInput(prev => !prev)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            <CommentIcon /> Comentar
          </button>
        </div>

        {showCommentInput && (
          <form onSubmit={addComment} className="flex items-center gap-2 mb-2">
            <input
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all shadow-sm placeholder-gray-400"
              placeholder="Escreva um comentário..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-sm"
            >
              Enviar
            </button>
          </form>
        )}

        <div className="space-y-2">
          {post.comments?.slice(-3).map((c, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium">{c.user?.name || "Usuário"}:</span> {c.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PostCard);