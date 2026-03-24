import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLang, setNewRoomLang] = useState('javascript');
  const [joinSlug, setJoinSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const languages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'markdown',
  ];

  useEffect(() => {
    api.getRooms()
      .then((data) => setRooms(data.rooms))
      .catch(() => setError('Failed to load rooms'))
      .finally(() => setLoading(false));
  }, []);

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const data = await api.createRoom({ name: newRoomName, language: newRoomLang });
      navigate(`/room/${data.room.slug}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!joinSlug.trim()) return;
    const slug = joinSlug.trim().split('/').pop();
    navigate(`/room/${slug}`);
  };

  const deleteRoom = async (slug) => {
    if (!confirm('Delete this room?')) return;
    try {
      await api.deleteRoom(slug);
      setRooms(rooms.filter((r) => r.slug !== slug));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">CollabCode</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.displayName}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            + New Room
          </button>

          <form onSubmit={joinRoom} className="flex gap-2">
            <input
              type="text"
              value={joinSlug}
              onChange={(e) => setJoinSlug(e.target.value)}
              placeholder="Enter room code or link..."
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-64"
            />
            <button
              type="submit"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Join
            </button>
          </form>
        </div>

        {/* Create Room Form */}
        {showCreate && (
          <form onSubmit={createRoom} className="bg-gray-800 rounded-lg p-4 mb-8 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Room Name</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Language</label>
              <select
                value={newRoomLang}
                onChange={(e) => setNewRoomLang(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Create
            </button>
          </form>
        )}

        {/* Rooms List */}
        <h2 className="text-lg font-semibold text-white mb-4">Your Rooms</h2>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="text-gray-500 bg-gray-800 rounded-lg p-8 text-center">
            No rooms yet. Create one to get started!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div
                key={room._id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white truncate">{room.name}</h3>
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded ml-2 shrink-0">
                    {room.language}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {room.slug} &middot; {room.collaborators?.length || 0} collaborator(s)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/room/${room.slug}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded transition-colors"
                  >
                    Open
                  </button>
                  {room.owner?._id === user?._id && (
                    <button
                      onClick={() => deleteRoom(room.slug)}
                      className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm px-3 py-1.5 rounded transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
