import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const socket = io(import.meta.env.VITE_API_URL, {
    query: { token: localStorage.getItem('token') },
    autoConnect: false,
});

export default function ChatPage() {
    const { userId } = useParams();
    const { user: me } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [recipient, setRecipient] = useState(null);
    const messagesEndRef = useRef(null);

    // Conectar ao socket e buscar histórico
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

        if (!socket.connected) {
            socket.connect();
        }

        socket.on('receiveMessage', (message) => {
            if ((message.sender === me._id && message.recipient === userId) ||
                (message.sender === userId && message.recipient === me._id)) {
                setMessages(prev => [...prev, message]);
            }
        });

        // Adiciona um listener para a mensagem enviada
        socket.on('messageSent', (officialMessage) => {
            // Atualiza o estado para a mensagem oficial com _id
            setMessages(prev => prev.map(msg => msg._id === officialMessage._id ? officialMessage : msg));
        });

        fetchRecipient();
        fetchMessages();

        return () => {
            socket.off('receiveMessage');
            socket.off('messageSent');
            if (socket.connected) {
                // socket.disconnect(); // Deixar desconectado pode causar problemas em SPA, descomente se o comportamento for desejado
            }
        };
    }, [userId, me, navigate]);

    // Scroll para a última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (input.trim()) {
            // Cria uma mensagem temporária para atualização otimista da UI
            const tempMessage = {
                _id: Date.now(), // ID temporário
                sender: me._id,
                recipient: userId,
                content: input,
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMessage]);
            socket.emit('sendMessage', { recipientId: userId, content: input });
            setInput('');
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
                </div>
                <div className="flex-1 bg-white p-4 overflow-y-auto space-y-4 rounded-b-lg shadow-md">
                    {messages.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-gray-500">
                            <p>Inicie a conversa!</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg._id}
                                className={`flex ${msg.sender === me._id ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`p-3 rounded-lg max-w-xs md:max-w-md break-words ${msg.sender === me._id
                                        ? 'bg-blue-500 text-white rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                        }`}
                                >
                                    {msg.content}
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
                    />
                    <button
                        type="submit"
                        className="ml-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                        Enviar
                    </button>
                </form>
            </div>
        </div>
    );
}