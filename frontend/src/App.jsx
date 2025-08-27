// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import ChatContainer from "./components/ChatContainer.jsx"; // Importar
import { useChat } from "./context/ChatContext.jsx";

function Private({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  const { isMobileChatOpen } = useChat();

  return (
    <>
      <div className={isMobileChatOpen ? 'hidden' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Private><Home /></Private>} />
          <Route path="/profile/:id" element={<Private><Profile /></Private>} />
          <Route path="/settings" element={<Private><Settings /></Private>} />
        </Routes>
      </div>
      <ChatContainer />
    </>
  )
}