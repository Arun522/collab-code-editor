import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">CollabCode</h1>
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Sign Up</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
