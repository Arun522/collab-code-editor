import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function SnapshotPanel({ slug, onRestore }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api.getSnapshots(slug)
      .then((data) => setSnapshots(data.snapshots))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const saveSnapshot = async () => {
    try {
      const data = await api.saveSnapshot(slug);
      setSnapshots((prev) => [data.snapshot, ...prev]);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400">Snapshots</h3>
        <button
          onClick={saveSnapshot}
          className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
        >
          Save
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <p className="text-xs text-gray-500 text-center mt-4">Loading...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-4">No snapshots yet</p>
        ) : (
          snapshots.map((snap) => (
            <button
              key={snap._id}
              onClick={() => onRestore(snap.code)}
              className="w-full text-left bg-gray-700 hover:bg-gray-600 rounded p-2 transition-colors"
            >
              <div className="text-xs text-white truncate">{snap.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {snap.savedBy?.displayName} &middot;{' '}
                {new Date(snap.createdAt).toLocaleString()}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
