// frontend/src/pages/Settings.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext"; // Importa o hook de autenticação

// Ícone para facilitar a UI
const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


export default function Settings() {
    const { user, refetchUser } = useAuth();
    const navigate = useNavigate();

    const [bio, setBio] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const fileInputRef = useRef(null);

    // Popula o formulário com os dados atuais do usuário
    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
            setAvatarPreview(user.avatarUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${user.avatarUrl}` : "");
        }
    }, [user]);

    // Cria uma pré-visualização da imagem selecionada
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Envia os dados para o backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        const formData = new FormData();
        formData.append("bio", bio);
        if (avatarFile) {
            formData.append("avatar", avatarFile);
        }

        try {
            await api.post("/users/me", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setSuccess("Perfil atualizado com sucesso!");
            await refetchUser(); // Atualiza os dados do usuário no contexto global
            setTimeout(() => navigate(`/profile/${user._id}`), 1500);
        } catch (err) {
            setError("Falha ao atualizar o perfil. Tente novamente.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <p>Carregando...</p>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="bg-white shadow-md rounded-2xl p-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Editar Perfil</h1>

                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                    {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <img
                                    src={avatarPreview || 'https://via.placeholder.com/128'}
                                    alt="Pré-visualização do avatar"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current.click()}
                                    className="absolute bottom-0 right-0 bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 transition-colors"
                                    aria-label="Alterar foto de perfil"
                                >
                                    <CameraIcon />
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                Biografia
                            </label>
                            <textarea
                                id="bio"
                                className="w-full border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3 py-2 outline-none transition"
                                rows="4"
                                placeholder="Fale um pouco sobre você..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)} // Volta para a página anterior
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg py-2 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg py-2 transition disabled:opacity-50"
                            >
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}