interface ToastProps {
  message: string;
  isVisible: boolean;
  type?: 'success' | 'error' | 'info';
}

export default function Toast({ message, isVisible, type = 'success' }: ToastProps) {
  if (!isVisible) return null;

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg`}>
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}
