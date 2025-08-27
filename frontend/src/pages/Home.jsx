// frontend/src/pages/Home.jsx
import { useEffect, useCallback } from "react";
import { useFeed } from "../hooks/useFeed";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import CreatePost from "../components/CreatePost.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

// Componente de Esqueleto para feedback de carregamento
const PostSkeleton = () => (
  <div className="bg-white shadow-md rounded-lg p-4 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-full bg-gray-200"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
);

// Componente para a barra lateral direita
const RightSidebar = () => (
  <aside className="hidden lg:block lg:col-span-3 space-y-4">
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-3">Tópicos do Momento</h3>
      <ul className="space-y-2 text-sm">
        <li className="text-sky-600 hover:underline cursor-pointer">#ReactJS</li>
        <li className="text-sky-600 hover:underline cursor-pointer">#DesenvolvimentoWeb</li>
      </ul>
    </div>
  </aside>
);

// Componente para o Feed principal
const Feed = ({ posts, loading, error, hasMore, fetchPosts, handlePostChanged, handlePostDeleted }) => {
  if (loading && posts.length === 0) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}</div>;
  }
  if (error) {
    return <div className="card p-8 text-center"><p className="text-red-500 mb-4">{error}</p><button onClick={() => fetchPosts(true)} className="bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg">Tentar Novamente</button></div>;
  }
  if (posts.length === 0) {
    return <div className="card p-8 text-center text-gray-500"><h3 className="text-xl font-bold mb-2">Seu feed está vazio!</h3><p>Comece a seguir pessoas ou publique algo para ver as novidades.</p></div>;
  }

  return (
    <>
      {posts.map(p => <PostCard key={p._id} post={p} onChanged={handlePostChanged} onDelete={() => handlePostDeleted(p._id)} />)}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <button onClick={() => fetchPosts(false)} disabled={loading} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-6 border rounded-lg shadow-sm">
            {loading ? 'Carregando...' : 'Carregar Mais'}
          </button>
        </div>
      )}
    </>
  );
};

// Layout principal da página
const MainLayout = ({ children }) => (
  <div className="bg-gray-50 min-h-screen">
    <Navbar />
    <div className="container-healer mx-auto px-4">{children}</div>
  </div>
);

// Página Home
export default function Home() {
  const { user } = useAuth();
  const { posts, loading, error, hasMore, fetchPosts, addPost, updatePost, removePost } = useFeed();

  useEffect(() => {
    document.title = "Healer - Feed";
    fetchPosts(true);
  }, [fetchPosts]);

  const handlePostCreated = useCallback((newPost) => {
    addPost(newPost);
  }, [addPost]);

  const handlePostDeleted = useCallback(async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      removePost(postId);
    } catch (err) {
      console.error("Falha ao apagar post:", err);
    }
  }, [removePost]);

  const handlePostChanged = useCallback((updatedPost) => {
    updatePost(updatedPost);
  }, [updatePost]);

  return (
    <MainLayout>
      <div className="grid grid-cols-12 gap-6 mt-6">
        <aside className="hidden md:block md:col-span-3"><Sidebar /></aside>
        <main className="col-span-12 md:col-span-9 lg:col-span-6 space-y-4">
          <h1 className="text-2xl font-bold text-gray-800 px-1">Olá, {user?.name?.split(' ')[0] || ''}!</h1>
          <CreatePost onCreated={handlePostCreated} />
          <Feed
            posts={posts}
            loading={loading}
            error={error}
            hasMore={hasMore}
            fetchPosts={fetchPosts}
            handlePostChanged={handlePostChanged}
            handlePostDeleted={handlePostDeleted}
          />
        </main>
        <RightSidebar />
      </div>
    </MainLayout>
  );
}