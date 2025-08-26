import { useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

export default function Sidebar(){
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/users/search?q=").then(r => setUsers(r.data.slice(0,8))); }, []);
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Sugestões de amizade</h3>
      <ul className="space-y-3">
        {users.map(u => (
          <li key={u._id} className="flex justify-between items-center">
            <Link to={`/profile/${u._id}`} className="flex items-center gap-2">
              <img src={u.avatarUrl || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full"/>
              <span>{u.name}</span>
            </Link>
            <button onClick={()=>api.post(`/users/${u._id}/request`)} className="text-sm bg-gray-100 px-2 py-1 rounded">Adicionar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
