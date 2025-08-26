import { useState } from "react";
import { api } from "../api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PostCard({ post, onChanged }){
  const [comment, setComment] = useState("");

  async function like(){
    await api.post(`/posts/${post._id}/like`);
    onChanged && onChanged();
  }

  async function addComment(e){
    e.preventDefault();
    if(!comment.trim()) return;
    await api.post(`/posts/${post._id}/comment`, { text: comment });
    setComment("");
    onChanged && onChanged();
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <img src={post.user?.avatarUrl || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full"/>
        <div>
          <div className="font-semibold">{post.user?.name || "Usuário"}</div>
          <div className="text-xs text-gray-500">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</div>
        </div>
      </div>
      {post.text && <p className="mb-2">{post.text}</p>}
      {post.mediaUrl && (post.mediaType === "image" ? (
        <img src={import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL + post.mediaUrl) : ("http://localhost:4000" + post.mediaUrl)} className="rounded mb-2 max-h-[520px] object-contain w-full" />
      ) : (
        <video controls className="rounded mb-2 w-full">
          <source src={import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL + post.mediaUrl) : ("http://localhost:4000" + post.mediaUrl)} />
        </video>
      ))}
      <div className="flex gap-4 text-sm text-gray-600 mb-2">
        <button onClick={like}>Curtir ({post.likes?.length || 0})</button>
        <span>Comentários ({post.comments?.length || 0})</span>
      </div>
      <form onSubmit={addComment} className="flex gap-2">
        <input className="flex-1 bg-gray-100 rounded px-3 py-1" placeholder="Escreva um comentário..."
          value={comment} onChange={e=>setComment(e.target.value)} />
        <button className="bg-gray-900 text-white px-3 rounded">Enviar</button>
      </form>
      <div className="mt-3 space-y-2">
        {post.comments?.slice(-3).map((c,i) => (
          <div key={i} className="text-sm">
            <span className="font-medium">{c.user?.name || "Usuário"}:</span> {c.text}
          </div>
        ))}
      </div>
    </div>
  )
}
