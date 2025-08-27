// frontend/src/context/ChatContext.jsx
import React, { createContext, useState, useContext } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [activeChats, setActiveChats] = useState([]);
    const [isMobileChatOpen, setMobileChatOpen] = useState(false);

    const openChat = (user) => {
        if (window.innerWidth < 768) {
            setMobileChatOpen(true);
        }
        if (!activeChats.find(c => c._id === user._id)) {
            setActiveChats(prev => [...prev, user]);
        }
    };

    const closeChat = (userId) => {
        if (window.innerWidth < 768) {
            setMobileChatOpen(false);
        }
        setActiveChats(prev => prev.filter(c => c._id !== userId));
    };

    const value = { activeChats, openChat, closeChat, isMobileChatOpen, setMobileChatOpen };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};