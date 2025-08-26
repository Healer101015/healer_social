import { useState } from "react";
import { api } from "../api";

export default function CreatePost({ onCreated }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("text", text);
      if (file) {
        fd.append("media", file);
      }
      await api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setText(""); setFile(null);
      onCreated && onCreated();
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="card p-4 mb-4">
      <textarea className="w-full resize-none outline-none" rows="3"
        placeholder="No que você está pensando?" value={text} onChange={e => setText(e.target.value)} />
      <div className="flex items-center justify-between mt-2">
        <input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files[0] || null)} />
        <button disabled={loading} className="bg-blue-600 text-white px-3 py-1 rounded">{loading ? "Publicando..." : "Publicar"}</button>
      </div>
    </form>
  )
}