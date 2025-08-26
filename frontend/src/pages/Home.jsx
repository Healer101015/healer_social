import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import CreatePost from "../components/CreatePost.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";

export default function Home(){
  const [posts, setPosts] = useState([]);

  async function load(){ const { data } = await api.get("/posts"); setPosts(data); }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <Navbar />
      <div className="container-healer grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-3">
          <Sidebar />
        </div>
        <div className="col-span-6 space-y-4">
          <CreatePost onCreated={load} />
          {posts.map(p => <PostCard key={p._id} post={p} onChanged={load} />)}
        </div>
        <div className="col-span-3">
          <div className="card p-4">Diretório / Links / Trends</div>
        </div>
      </div>
    </div>
  )
}
