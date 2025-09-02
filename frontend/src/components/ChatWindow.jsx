import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

let socket = null;

const ChatWindow = ({ recipient }) => {
    const { user: me } = useAuth();
    const { closeChat } = useChat();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fechar conexão anterior se existir
        if (socket) {
            socket.disconnect();
            socket = null;
        }

        // Configurar socket.io com reconexão
        socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            forceNew: true
        });

        socket.on('connect', () => {
            console.log('Socket conectado');
            setSocketConnected(true);

            // Entrar na sala do usuário após conectar
            if (me?._id) {
                socket.emit('join', { userId: me._id });
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket desconectado:', reason);
            setSocketConnected(false);
            // Limpar status de typing ao desconectar
            setTypingUsers({});
        });

        socket.on('connect_error', (error) => {
            console.error('Erro de conexão socket:', error);
            setSocketConnected(false);
            setTypingUsers({});
        });

        // Evento principal para receber mensagens
        socket.on('receiveMessage', (message) => {
            console.log('Mensagem recebida:', message);
            if (message.sender === recipient._id || message.sender._id === recipient._id) {
                setMessages(prev => {
                    // Evitar duplicatas
                    const messageExists = prev.some(msg =>
                        msg._id === message._id || msg.tempId === message.tempId
                    );
                    if (!messageExists) {
                        return [...prev, message];
                    }
                    return prev;
                });
            }

            // Remover status de typing quando receber mensagem
            if (message.sender === recipient._id || message.sender._id === recipient._id) {
                setTypingUsers(prev => {
                    const newTypingUsers = { ...prev };
                    delete newTypingUsers[recipient._id];
                    return newTypingUsers;
                });
            }
        });

        // Confirmação de mensagem enviada
        socket.on('messageSent', (officialMessage) => {
            console.log('Mensagem confirmada:', officialMessage);
            setMessages(prev => prev.map(msg =>
                msg.tempId && msg.tempId === officialMessage.tempId
                    ? { ...officialMessage, isSending: false }
                    : msg
            ));
        });

        socket.on('messageError', (errorData) => {
            console.error('Erro ao enviar mensagem:', errorData);
            setMessages(prev => prev.filter(msg => msg.tempId !== errorData.tempId));
            alert('Erro ao enviar mensagem. Tente novamente.');
        });

        // Evento para receber status de typing
        socket.on('userTyping', (data) => {
            if (data.userId === recipient._id) {
                setTypingUsers(prev => ({
                    ...prev,
                    [data.userId]: {
                        isTyping: data.isTyping,
                    }
                }));

                // Se parou de digitar, remover após 2 segundos
                if (!data.isTyping) {
                    setTimeout(() => {
                        setTypingUsers(prev => {
                            const newTypingUsers = { ...prev };
                            delete newTypingUsers[data.userId];
                            return newTypingUsers;
                        });
                    }, 2000);
                }
            }
        });

        // Evento para receber status de parada de typing
        socket.on('userStopTyping', (data) => {
            if (data.userId === recipient._id) {
                setTypingUsers(prev => {
                    const newTypingUsers = { ...prev };
                    delete newTypingUsers[data.userId];
                    return newTypingUsers;
                });
            }
        });

        // Buscar mensagens existentes
        const fetchMessages = async () => {
            try {
                const response = await api.get(`/messages/${recipient._id}`);
                setMessages(response.data);
            } catch (error) {
                console.error("Erro ao buscar mensagens:", error);
            }
        };

        fetchMessages();

        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.off('receiveMessage');
                socket.off('messageSent');
                socket.off('messageError');
                socket.off('userTyping');
                socket.off('userStopTyping');
                socket.disconnect();
                socket = null;
            }

            // Limpar timeout ao desmontar
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [recipient._id, me?._id, API_URL]);

    useEffect(() => {
        // Scroll para baixo quando novas mensagens ou typing aparecerem
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);


    // Função para enviar status de typing
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);

        if (!socketConnected) return;

        // Se começou a digitar e ainda não enviou o evento
        if (value.length > 0 && !isTyping) {
            setIsTyping(true);
            socket.emit('typing', {
                recipientId: recipient._id,
                isTyping: true
            });
        }

        // Limpar timeout anterior
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Configurar timeout para parar de digitar
        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) {
                setIsTyping(false);
                socket.emit('typing', {
                    recipientId: recipient._id,
                    isTyping: false
                });
            }
        }, 1000); // 1 segundo após parar de digitar
    };

    const handleSendMessage = (e) => {
        e.preventDefault();

        // Parar status de typing antes de enviar
        if (isTyping) {
            setIsTyping(false);
            socket.emit('typing', {
                recipientId: recipient._id,
                isTyping: false
            });
        }

        // Limpar timeout de typing
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (input.trim() && socketConnected) {
            const tempId = Date.now().toString();
            const tempMessage = {
                _id: tempId,
                tempId,
                sender: me,
                recipient: recipient,
                content: input,
                createdAt: new Date(),
                isSending: true
            };

            setMessages(prev => [...prev, tempMessage]);

            socket.emit('sendMessage', {
                recipientId: recipient._id,
                content: input,
                tempId,
            });

            setInput('');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Parar status de typing ao enviar arquivo
        if (isTyping) {
            setIsTyping(false);
            socket.emit('typing', {
                recipientId: recipient._id,
                isTyping: false
            });
        }

        const fileType = file.type.split('/')[0];
        if (!['image', 'video', 'audio'].includes(fileType)) {
            alert('Tipo de arquivo não suportado. Use imagem, vídeo ou áudio.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. O tamanho máximo é 10MB.');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('media', file);

            const response = await api.post('/upload-media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { fileUrl, attachmentType, mimeType, fileName, fileSize } = response.data;

            const tempId = Date.now().toString();
            const tempMessage = {
                _id: tempId,
                tempId,
                sender: me,
                recipient: recipient,
                content: input.trim(),
                attachment: fileUrl,
                attachmentType,
                mimeType,
                fileName,
                fileSize,
                createdAt: new Date(),
                isSending: true
            };

            setMessages(prev => [...prev, tempMessage]);

            socket.emit('sendMessage', {
                recipientId: recipient._id,
                content: input.trim(),
                attachment: fileUrl,
                attachmentType,
                mimeType,
                fileName,
                fileSize,
                tempId
            });

            setInput('');
        } catch (error) {
            console.error("Erro ao enviar mídia:", error);
            alert('Erro ao enviar arquivo. Tente novamente.');
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const renderMediaContent = (msg) => {
        if (!msg.attachment) return null;

        switch (msg.attachmentType) {
            case 'image':
                return (
                    <div className="mt-1">
                        <img
                            src={`${API_URL}${msg.attachment}`}
                            alt="Imagem"
                            className="rounded-lg max-w-full h-auto max-h-64 object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                );
            case 'video':
                return (
                    <div className="mt-1">
                        <video
                            src={`${API_URL}${msg.attachment}`}
                            controls
                            className="rounded-lg max-w-full h-auto max-h-64"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        >
                            Seu navegador não suporta o elemento de vídeo.
                        </video>
                    </div>
                );
            case 'audio':
                return (
                    <div className="mt-1 bg-gray-100 p-2 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate max-w-xs">
                                {msg.fileName || 'Áudio'}
                            </span>
                            <span className="text-xs text-gray-500">
                                {formatFileSize(msg.fileSize)}
                            </span>
                        </div>
                        <audio
                            src={`${API_URL}${msg.attachment}`}
                            controls
                            className="w-full"
                        >
                            Seu navegador não suporta o elemento de áudio.
                        </audio>
                    </div>
                );
            default:
                return null;
        }
    };

    const retryConnection = () => {
        if (socket) {
            socket.connect();
        }
    };

    // Função para verificar se a mensagem é do remetente atual
    const isMyMessage = (message) => {
        return message.sender?._id === me._id || message.sender === me._id;
    };

    // Formatar data da mensagem
    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Verificar se o destinatário está digitando
    const isRecipientTyping = typingUsers[recipient._id]?.isTyping;

    return (
        <div className={`fixed bottom-0 right-4 md:right-24 bg-white shadow-2xl rounded-t-lg w-full md:w-96 h-[80vh] md:h-[40rem] flex flex-col transition-all duration-300 ${isMinimized ? 'translate-y-[calc(100%-48px)]' : ''} z-50`}>
            {/* Header */}
            <div className="flex items-center justify-between p-2 bg-gray-100 rounded-t-lg cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="flex items-center gap-2">
                    <img
                        src={recipient.avatarUrl.includes('/uploads/') ? nul : `${recipient.avatarUrl}`}
                        alt={recipient.name}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                        <span className="font-bold">{recipient.name}</span>
                        {isRecipientTyping && (
                            <span className="text-xs text-gray-500 italic">
                                digitando...
                            </span>
                        )}
                    </div>
                    <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); closeChat(recipient._id); }}
                    className="p-1 hover:bg-gray-200 rounded-full"
                >
                    &times;
                </button>
            </div>

            {/* Status de conexão */}
            {!socketConnected && (
                <div className="bg-yellow-100 text-yellow-800 p-2 text-sm flex justify-between items-center">
                    <span>Conexão perdida</span>
                    <button
                        onClick={retryConnection}
                        className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                    >
                        Reconectar
                    </button>
                </div>
            )}

            {/* Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-gray-500">
                        <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div
                            key={msg._id || msg.tempId}
                            className={`flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'} mb-3`}
                        >
                            <div
                                className={`p-3 rounded-lg max-w-[80%] break-words ${isMyMessage(msg)
                                    ? 'bg-blue-500 text-white rounded-br-none'
                                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                    } ${msg.isSending ? 'opacity-70' : ''}`}
                            >
                                {msg.content && <p className="mb-1">{msg.content}</p>}
                                {renderMediaContent(msg)}
                                {msg.isSending && (
                                    <div className="text-xs mt-1 italic">
                                        {msg.attachment ? 'Enviando mídia...' : 'Enviando...'}
                                    </div>
                                )}
                                <div className="text-xs mt-1 opacity-70">
                                    {formatTime(msg.createdAt)}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Indicador de typing do destinatário */}
                {isRecipientTyping && (
                    <div className="flex justify-start mb-3">
                        <div className="bg-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none max-w-[80%]">
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-white">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,video/*,audio/*"
                        disabled={isUploading || !socketConnected}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
                        disabled={isUploading || !socketConnected}
                        title="Anexar arquivo"
                    >
                        {isUploading ? '⏳' : '📎'}
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isUploading || !socketConnected}
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 disabled:bg-gray-400"
                        disabled={!input.trim() || isUploading || !socketConnected}
                        title="Enviar mensagem"
                    >
                        {isUploading ? '⏳' : '➤'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;