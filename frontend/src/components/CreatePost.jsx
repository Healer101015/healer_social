import { useState, useRef } from "react";
import { api } from "../api";

export default function CreatePost({ onCreated }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !file) return; // não envia post vazio
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("text", text);
      if (file) fd.append("media", file);

      // Captura o post criado que a API retorna
      const { data: newPost } = await api.post("/posts", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setText("");
      setFile(null);
      // Envia o novo post para a página Home para atualizar o feed
      onCreated && onCreated(newPost);
    } catch (err) {
      console.error("Erro ao publicar:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white shadow-md rounded-lg p-4 mb-4">
      <textarea
        className="w-full resize-none outline-none bg-gray-100 rounded-md px-3 py-2 placeholder-gray-400"
        rows="3"
        placeholder="No que você está pensando?"
        value={text}
        onChange={e => setText(e.target.value)}
      />

      {file ? <img className="p-5" src={URL.createObjectURL(file)}></img> : null}

      <div className="flex items-center justify-between mt-3">
        {/* Botão estilizado para anexar arquivo */}
        <div>
          <button
            type="button"
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full transition-colors font-medium"
            onClick={() => fileInputRef.current.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828M15 3h6v6" />
            </svg>
            {file ? file.name : "Anexar imagem/vídeo"}
          </button>
        </div>

        {/* Input escondido */}
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          ref={fileInputRef}
          onChange={e => setFile(e.target.files[0] || null)}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors"
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>

        
      </div>
    </form>
  );
}