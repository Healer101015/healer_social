// frontend/src/components/ChatContainer.jsx
import React from 'react';
import { useChat } from '../context/ChatContext';
import ChatWindow from './ChatWindow';

const ChatContainer = () => {
    const { activeChats } = useChat();

    return (
        <div className="fixed bottom-0 right-0 flex items-end gap-4 p-4">
            {activeChats.map(user => (
                <ChatWindow key={user._id} recipient={user} />
            ))}
        </div>
    );
};

export default ChatContainer;