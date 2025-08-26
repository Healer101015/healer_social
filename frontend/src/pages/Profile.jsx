import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";

export default function Profile(){
  const { id } = useParams();
  const [data, setData] = useState(null);

  async function load(){ const { data } = await api.get(`/users/${id}`); setData(data); }
  useEffect(() => { load(); }, [id]);

  if(!data) return null;

  return (
    <div>
      <Navbar />
      <div className="container-healer mt-6">
        <div className="card p-6 mb-6 flex items-center gap-4">
          <img src={data.user.avatarUrl || 'https://via.placeholder.com/80'} className="w-20 h-20 rounded-full"/>
          <div>
            <div className="text-2xl font-bold">{data.user.name}</div>
            <div className="text-gray-600">{data.user.bio}</div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-4">
            {data.posts.map(p => <PostCard key={p._id} post={{...p, user: data.user}} onChanged={load} />)}
          </div>
          <div className="col-span-4">
            <div className="card p-4">Amigos / Informações</div>
          </div>
        </div>
      </div>
    </div>
  )
}
