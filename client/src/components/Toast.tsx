import { useToast } from '../context/ToastContext';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl
            border text-sm font-medium max-w-sm
            animate-slide-in
            ${toast.type === 'success'
              ? 'bg-green-900/90 border-green-700 text-green-100'
              : 'bg-red-900/90 border-red-700 text-red-100'
            }
          `}
          style={{ animation: 'slideIn 0.2s ease-out' }}
        >
          <span className="flex-shrink-0 text-base">
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
