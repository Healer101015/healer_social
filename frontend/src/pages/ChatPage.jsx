// frontend/src/pages/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const socket = io(import.meta.env.VITE_API_URL, {
    query: { token: localStorage.getItem('token') }
});

export default function ChatPage() {
    const { userId } = useParams();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    useEffect(() => {
        // 1. Obter histórico de mensagens via REST
        async function fetchMessages() {
            try {
                const { data } = await api.get(`/messages/${userId}`);
                setMessages(data);
            } catch (err) {
                console.error("Erro ao buscar mensagens:", err);
            }
        }
        fetchMessages();

        // 2. Ouvir por novas mensagens via WebSocket
        socket.on('receiveMessage', (message) => {
            setMessages(prev => [...prev, message]);
        });

        // Limpar o listener quando o componente desmontar
        return () => {
            socket.off('receiveMessage');
        };
    }, [userId]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (input.trim()) {
            // Enviar mensagem via WebSocket
            socket.emit('sendMessage', { recipientId: userId, content: input });
            setInput('');
        }
    };

    return (
        <div className="chat-container">
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div key={index} className={msg.sender === user._id ? "my-message" : "their-message"}>
                        {msg.content}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="message-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua mensagem..."
                />
                <button type="submit">Enviar</button>
            </form>
        </div>
    );
}