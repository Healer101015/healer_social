import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api";

export default function Navbar() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.get("/users/me").then(r => setMe(r.data)).catch(()=>{});
  }, []);

  function logout(){
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-10">
      <div className="container-healer flex items-center justify-between py-2">
        <Link to="/" className="font-bold text-xl">Healer</Link>
        <div className="flex gap-4 items-center">
          <input placeholder="Pesquisar..." className="bg-gray-100 rounded px-3 py-1 w-64"/>
          {me && <Link to={`/profile/${me._id}`} className="flex items-center gap-2">
            <img src={me.avatarUrl || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full" />
            <span className="text-sm">{me.name}</span>
          </Link>}
          <button onClick={logout} className="bg-gray-900 text-white px-3 py-1 rounded">Sair</button>
        </div>
      </div>
    </div>
  )
}
