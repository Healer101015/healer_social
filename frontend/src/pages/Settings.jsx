// frontend/src/pages/Settings.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Settings() {
    const { user, refetchUser } = useAuth();
    const navigate = useNavigate();

    const [bio, setBio] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [coverPreview, setCoverPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);

    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
            if (user.avatarUrl) setAvatarPreview(`${getApiBase()}${user.avatarUrl}`);
            if (user.coverPhotoUrl) setCoverPreview(`${getApiBase()}${user.coverPhotoUrl}`);
        }
    }, [user]);

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'avatar') {
                setAvatarFile(file);
                setAvatarPreview(reader.result);
            } else if (type === 'cover') {
                setCoverFile(file);
                setCoverPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        const formData = new FormData();
        formData.append("bio", bio);
        if (avatarFile) formData.append("avatar", avatarFile);
        if (coverFile) formData.append("coverPhoto", coverFile);

        try {
            await api.post("/users/me", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setSuccess("Perfil atualizado com sucesso!");
            await refetchUser();
            setTimeout(() => navigate(`/profile/${user._id}`), 1500);
        } catch (err) {
            setError("Falha ao atualizar o perfil. Tente novamente.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>A carregar...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="bg-white shadow-md rounded-2xl p-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Editar Perfil</h1>

                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                    {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Campo para Foto de Capa */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Capa</label>
                            <div
                                onClick={() => coverInputRef.current.click()}
                                className="mt-1 flex justify-center items-center h-40 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer bg-gray-50 hover:bg-gray-100"
                                style={{ backgroundImage: `url(${coverPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                            >
                                {!coverPreview && (
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                        <p className="text-sm text-gray-600">Clique para carregar uma imagem</p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={coverInputRef}
                                onChange={(e) => handleFileChange(e, 'cover')}
                            />
                        </div>

                        {/* Campo para Avatar */}
                        <div className="flex flex-col items-center">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                            <div className="relative">
                                <img
                                    src={avatarPreview || `https://ui-avatars.com/api/?name=${user.name}&background=818cf8&color=fff&size=128`}
                                    alt="Pré-visualização do avatar"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current.click()}
                                    className="absolute bottom-0 right-0 bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 transition-colors"
                                    aria-label="Alterar foto de perfil"
                                >
                                    <CameraIcon />
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={avatarInputRef}
                                    onChange={(e) => handleFileChange(e, 'avatar')}
                                />
                            </div>
                        </div>

                        {/* Campo de Biografia */}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
                            <textarea
                                id="bio"
                                className="w-full border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3 py-2 outline-none transition"
                                rows="4"
                                placeholder="Fale um pouco sobre você..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg py-2.5 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg py-2.5 transition disabled:opacity-50"
                            >
                                {loading ? "A guardar..." : "Guardar Alterações"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
