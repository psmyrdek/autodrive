import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import Navigation from "./components/Navigation";
import Game from "./components/Game";
import TrackBuilder from "./components/TrackBuilder";

function App() {
  return (
    <BrowserRouter>
      <div className='bg-gray-900 h-screen flex flex-col overflow-hidden'>
        <Navigation />
        <div className='flex-1 overflow-auto'>
          <Routes>
            <Route path='/' element={<Navigate to='/game' replace />} />
            <Route path='/game' element={<Game />} />
            <Route path='/track-builder' element={<TrackBuilder />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
