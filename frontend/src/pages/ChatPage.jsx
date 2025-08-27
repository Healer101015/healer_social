import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

// Remova a declaração global do socket e crie dentro do componente
let socket = null;

export default function ChatPage() {
    const { userId } = useParams();
    const { user: me } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
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
            }

            socket = io(import.meta.env.VITE_API_URL, {
                query: { token },
                autoConnect: true,
            });

            socket.on('connect', () => {
                console.log("[ChatPage] Socket conectado");
                setSocketConnected(true);
            });

            socket.on('disconnect', () => {
                console.log("[ChatPage] Socket desconectado");
                setSocketConnected(false);
            });

            socket.on('connect_error', (error) => {
                console.error("[ChatPage] Erro de conexão:", error);
                setSocketConnected(false);
            });

            // Mensagem recebida
            socket.on('receiveMessage', (message) => {
                console.log("[ChatPage] Nova mensagem recebida:", message);
                setMessages(prev => [...prev, message]);
            });

            // Confirmação de mensagem enviada
            socket.on('messageSent', (officialMessage) => {
                console.log("[ChatPage] Mensagem confirmada:", officialMessage);
                // Atualiza a mensagem temporária com a versão oficial do servidor
                setMessages(prev => prev.map(msg =>
                    msg.tempId && msg.tempId === officialMessage.tempId
                        ? officialMessage
                        : msg
                ));
            });
        };

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

        initializeSocket();
        fetchRecipient();
        fetchMessages();

        return () => {
            if (socket) {
                console.log("[ChatPage] Removendo listeners e desconectando socket");
                socket.off('receiveMessage');
                socket.off('messageSent');
                socket.off('connect');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.disconnect();
            }
        };
    }, [userId, me, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && socketConnected) {
            const tempMessage = {
                _id: Date.now().toString(), // ID temporário
                tempId: Date.now().toString(),
                sender: me._id,
                recipient: userId,
                content: input,
                createdAt: new Date(),
                isSending: true
            };

            // Adiciona mensagem temporária imediatamente
            setMessages(prev => [...prev, tempMessage]);

            console.log("[ChatPage] Emitindo 'sendMessage'");
            socket.emit('sendMessage', {
                recipientId: userId,
                content: input,
                tempId: tempMessage.tempId // Envia ID temporário para correlação
            });

            setInput('');
        } else if (!socketConnected) {
            alert("Conexão perdida. Reconectando...");
            socket.connect();
        }
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
                                    {msg.content}
                                    {msg.isSending && (
                                        <span className="ml-2 text-xs">Enviando...</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="bg-white p-4 mt-4 flex rounded-lg shadow-md">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!socketConnected}
                    />
                    <button
                        type="submit"
                        className="ml-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-400"
                        disabled={!input.trim() || !socketConnected}
                    >
                        {socketConnected ? 'Enviar' : 'Conectando...'}
                    </button>
                </form>

                {!socketConnected && (
                    <div className="text-red-500 text-sm mt-2">
                        Conexão perdida. Tentando reconectar...
                    </div>
                )}
            </div>
        </div>
    );
}