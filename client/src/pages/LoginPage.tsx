import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

const GRID_SIZE = 9;

export function LoginPage() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.verify()
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => localStorage.removeItem('token'));
    }
  }, [navigate]);

  const addCell = (n: number) => {
    setSequence(prev => [...prev, n]);
    setFlash(n);
    setTimeout(() => setFlash(null), 200);
  };

  const handleSubmit = async () => {
    if (sequence.length === 0) return;
    setLoading(true);
    try {
      const { token } = await api.login(sequence.join(','));
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      showToast((e as Error).message || 'Invalid sequence', 'error');
      setSequence([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= GRID_SIZE) {
        addCell(num);
        return;
      }
      if (e.key === 'Enter') {
        handleSubmit();
        return;
      }
      if (e.key === 'Backspace') {
        setSequence(prev => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sequence]);

  const cells = Array.from({ length: GRID_SIZE }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-gray-200 text-3xl font-bold tracking-tight">drop</h1>

        {/* Sequence indicator */}
        <div className="flex gap-2 h-6 items-center">
          {sequence.map((_n, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-blue-500"
            />
          ))}
          {sequence.length === 0 && (
            <span className="text-gray-700 text-sm">Click cells or use keys 1–9</span>
          )}
        </div>

        {/* 3×3 Grid */}
        <div className="grid grid-cols-3 gap-3">
          {cells.map(n => (
            <button
              key={n}
              onClick={() => addCell(n)}
              className={`
                w-20 h-20 rounded-2xl border text-sm font-medium transition-all select-none
                ${sequence.includes(n)
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-gray-800 bg-gray-900 text-gray-600 hover:border-gray-600 hover:text-gray-300 hover:bg-gray-800'
                }
                ${flash === n ? 'scale-95 bg-blue-500/30' : ''}
              `}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => setSequence(prev => prev.slice(0, -1))}
            disabled={sequence.length === 0}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800"
          >
            ← Undo
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || sequence.length === 0}
            className="px-6 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking…' : 'Enter →'}
          </button>
          <button
            onClick={() => setSequence([])}
            disabled={sequence.length === 0}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800"
          >
            Clear
          </button>
        </div>

        <p className="text-gray-700 text-xs">Keyboard: 1–9 select · Enter submit · Backspace undo</p>
      </div>
    </div>
  );
}
