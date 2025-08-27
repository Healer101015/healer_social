import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.error || "Erro ao registrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-md rounded-2xl p-8">
          {/* Logo / título */}
          <div className="flex flex-col items-center mb-6">
            <div className="text-3xl font-extrabold text-sky-500 mb-2 tracking-wide">
              Healer
            </div>
            <h1 className="text-xl font-semibold text-gray-800">Criar conta</h1>
            <p className="text-sm text-gray-500">Junte-se e conecte-se com sua comunidade</p>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={submit} className="space-y-4">
            <input
              className="w-full border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3 py-2 outline-none transition"
              placeholder="Nome"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              className="w-full border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3 py-2 outline-none transition"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              className="w-full border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3 py-2 outline-none transition"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg px-3 py-2 transition disabled:opacity-50"
            >
              {loading ? "Registrando..." : "Registrar"}
            </button>
          </form>

          {/* Link para login */}
          <div className="text-sm text-center mt-6">
            Já tem conta?{" "}
            <Link className="text-sky-500 hover:underline" to="/login">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
