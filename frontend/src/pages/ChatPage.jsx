import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

// Variável global para o socket
let socket = null;

export default function ChatPage() {
    const { userId } = useParams();
    const { user: me } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [connectionError, setConnectionError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [attachmentType, setAttachmentType] = useState(null);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const initializeSocket = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("[ChatPage] Token não encontrado");
            navigate('/login');
            return;
        }

        // Desconectar socket existente se houver
        if (socket) {
            socket.disconnect();
            socket = null;
        }

        // Use a URL correta da API
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        console.log("[ChatPage] Conectando ao Socket.io em:", API_URL);

        socket = io(API_URL, {
            query: { token },
            autoConnect: true,
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 5000
        });

        socket.on('connect', () => {
            console.log("[ChatPage] Socket conectado com sucesso");
            setSocketConnected(true);
            setConnectionError('');
        });

        socket.on('disconnect', (reason) => {
            console.log("[ChatPage] Socket desconectado:", reason);
            setSocketConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error("[ChatPage] Erro de conexão:", error.message);
            setSocketConnected(false);
            setConnectionError(`Erro de conexão: ${error.message}. Verifique se o servidor está rodando.`);
        });

        socket.on('receiveMessage', (message) => {
            console.log("[ChatPage] Nova mensagem recebida:", message);
            setMessages(prev => [...prev, message]);
        });

        socket.on('messageSent', (officialMessage) => {
            console.log("[ChatPage] Mensagem confirmada:", officialMessage);
            setMessages(prev => prev.map(msg =>
                msg.tempId && msg.tempId === officialMessage.tempId
                    ? officialMessage
                    : msg
            ));
        });

        socket.on('messageError', (errorData) => {
            console.error("[ChatPage] Erro ao enviar mensagem:", errorData);
            setMessages(prev => prev.filter(msg => msg.tempId !== errorData.tempId));
            alert('Erro ao enviar mensagem. Tente novamente.');
        });
    };

    useEffect(() => {
        const fetchRecipient = async () => {
            try {
                const res = await api.get(`/users/${userId}`);
                setRecipient(res.data.user);
            } catch (err) {
                console.error("Erro ao carregar o perfil do destinatário:", err);
                navigate('/profile/me');
            }
        };

        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/messages/${userId}`);
                setMessages(data);
            } catch (err) {
                console.error("Erro ao buscar mensagens:", err);
            }
        };

        console.log("[ChatPage] Inicializando socket...");
        initializeSocket();
        fetchRecipient();
        fetchMessages();

        return () => {
            if (socket) {
                console.log("[ChatPage] Limpando socket...");
                socket.off('connect');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.off('receiveMessage');
                socket.off('messageSent');
                socket.off('messageError');
                socket.disconnect();
                socket = null;
            }
        };
    }, [userId, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();

        if ((input.trim() || attachment) && socketConnected) {
            const tempId = Date.now().toString();
            const tempMessage = {
                _id: tempId,
                tempId: tempId,
                sender: me._id,
                recipient: userId,
                content: input,
                attachment: attachment,
                attachmentType: attachmentType,
                createdAt: new Date(),
                isSending: true
            };

            setMessages(prev => [...prev, tempMessage]);

            console.log("[ChatPage] Emitindo 'sendMessage'");
            socket.emit('sendMessage', {
                recipientId: userId,
                content: input,
                tempId: tempMessage.tempId,
                attachment: attachment,
                attachmentType: attachmentType
            });

            setInput('');
            setAttachment(null);
            setAttachmentType(null);
        } else if (!socketConnected) {
            setConnectionError('Conexão perdida. Tentando reconectar...');
            initializeSocket();
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);

        // Verificar o tipo de arquivo
        const fileType = file.type.split('/')[0];
        const validTypes = ['image', 'video', 'audio'];

        if (!validTypes.includes(fileType)) {
            alert('Tipo de arquivo não suportado. Use imagem, vídeo ou áudio.');
            setIsUploading(false);
            return;
        }

        // Converter para base64
        const reader = new FileReader();
        reader.onload = (event) => {
            setAttachment(event.target.result);
            setAttachmentType(fileType);
            setIsUploading(false);
        };
        reader.onerror = () => {
            alert('Erro ao carregar o arquivo.');
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const retryConnection = () => {
        setConnectionError('Reconectando...');
        initializeSocket();
    };

    const renderAttachmentPreview = () => {
        if (!attachment) return null;

        switch (attachmentType) {
            case 'image':
                return (
                    <div className="relative mt-2">
                        <img
                            src={attachment}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg"
                        />
                        <button
                            onClick={removeAttachment}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'video':
                return (
                    <div className="relative mt-2">
                        <video
                            src={attachment}
                            controls
                            className="w-48 h-32 object-cover rounded-lg"
                        />
                        <button
                            onClick={removeAttachment}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'audio':
                return (
                    <div className="relative mt-2 bg-gray-100 p-2 rounded-lg">
                        <audio
                            src={attachment}
                            controls
                            className="w-full"
                        />
                        <button
                            onClick={removeAttachment}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderMessageContent = (msg) => {
        if (msg.attachment) {
            switch (msg.attachmentType) {
                case 'image':
                    return <img src={msg.attachment} alt="Imagem" className="max-w-xs rounded-lg" />;
                case 'video':
                    return (
                        <video controls className="max-w-xs rounded-lg">
                            <source src={msg.attachment} type="video/mp4" />
                            Seu navegador não suporta o elemento de vídeo.
                        </video>
                    );
                case 'audio':
                    return (
                        <audio controls className="w-full">
                            <source src={msg.attachment} type="audio/mpeg" />
                            Seu navegador não suporta o elemento de áudio.
                        </audio>
                    );
                default:
                    return null;
            }
        }
        return <p>{msg.content}</p>;
    };

    if (!recipient) {
        return (
            <div className="bg-gray-50 min-h-screen">
                <Navbar />
                <div className="container-healer mt-6 text-center text-gray-500">
                    Carregando chat...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col">
            <Navbar />
            <div className="container-healer flex-1 flex flex-col py-6">
                <div className="bg-white rounded-t-lg shadow-md p-4 flex items-center border-b">
                    <img
                        src={recipient.avatarUrl ? `${import.meta.env.VITE_API_URL}${recipient.avatarUrl}` : 'https://via.placeholder.com/150'}
                        alt={recipient.name}
                        className="w-10 h-10 rounded-full object-cover mr-4"
                    />
                    <h2 className="text-xl font-bold">{recipient.name}</h2>
                    <span className={`ml-2 w-3 h-3 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>

                {connectionError && (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mt-4 flex justify-between items-center">
                        <span>{connectionError}</span>
                        <button
                            onClick={retryConnection}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}

                <div className="flex-1 bg-white p-4 overflow-y-auto space-y-4 rounded-b-lg shadow-md max-h-96">
                    {messages.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-gray-500">
                            <p>Inicie a conversa!</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg._id || msg.tempId}
                                className={`flex ${msg.sender === me._id ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`p-3 rounded-lg max-w-xs md:max-w-md break-words ${msg.sender === me._id
                                        ? 'bg-blue-500 text-white rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                        } ${msg.isSending ? 'opacity-70' : ''}`}
                                >
                                    {renderMessageContent(msg)}
                                    {msg.isSending && (
                                        <span className="ml-2 text-xs">Enviando...</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-white p-4 mt-4 rounded-lg shadow-md">
                    {attachment && renderAttachmentPreview()}

                    <form onSubmit={handleSendMessage} className="flex mt-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!socketConnected || isUploading}
                        />

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,video/*,audio/*"
                            className="hidden"
                            id="file-input"
                            disabled={!socketConnected || isUploading}
                        />

                        <label
                            htmlFor="file-input"
                            className="ml-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-400 cursor-pointer flex items-center"
                        >
                            {isUploading ? '⏳' : '📎'}
                        </label>

                        <button
                            type="submit"
                            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-400"
                            disabled={(!input.trim() && !attachment) || !socketConnected || isUploading}
                        >
                            {socketConnected ? 'Enviar' : 'Conectando...'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}