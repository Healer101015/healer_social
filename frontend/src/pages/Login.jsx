import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Login(){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    setError("");
    try{
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      navigate("/");
    }catch(e){ setError(e.response?.data?.error || "Erro"); }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100">
      <form onSubmit={submit} className="card p-8 w-[380px]">
        <h1 className="text-2xl font-bold mb-2">Healer</h1>
        <p className="text-sm text-gray-600 mb-6">Entre para ver seu feed</p>
        {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3">{error}</div>}
        <input className="w-full bg-gray-100 rounded px-3 py-2 mb-3" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full bg-gray-100 rounded px-3 py-2 mb-4" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-gray-900 text-white rounded px-3 py-2">Entrar</button>
        <div className="text-sm text-center mt-4">Não tem conta? <Link className="text-blue-600" to="/register">Registre-se</Link></div>
      </form>
    </div>
  )
}
