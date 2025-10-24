import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Game from './components/Game';
import TrackBuilder from './components/TrackBuilder';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/game" replace />} />
          <Route path="/game" element={<Game />} />
          <Route path="/track-builder" element={<TrackBuilder />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
