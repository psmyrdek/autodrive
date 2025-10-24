import { Link } from 'react-router-dom';

export default function Navigation() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex gap-6">
        <Link
          to="/game"
          className="hover:text-gray-300 transition-colors"
        >
          Game
        </Link>
        <Link
          to="/track-builder"
          className="hover:text-gray-300 transition-colors"
        >
          Track Builder
        </Link>
      </div>
    </nav>
  );
}
