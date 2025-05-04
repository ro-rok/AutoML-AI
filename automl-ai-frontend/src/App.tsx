import UploadPage from './pages/UploadPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CleanPage from './pages/CleanPage';
import EDAPage from './pages/EDAPage';
import TransformPage from './pages/TransformPage';
import TrainPage from './pages/TrainPage';
import ExportPage from './pages/ExportPage';
import ChatAssistant from './components/ChatAssistant';


const App = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <Routes>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/clean" element={<CleanPage />} />
            <Route path="/eda" element={<EDAPage />} />
            <Route path="/transform" element={<TransformPage />} />
            <Route path="/train" element={<TrainPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="*" element={<Navigate to="/upload" replace />} />
          </Routes>
        </div>
        <div className="fixed bottom-0 right-0 p-4">
          <ChatAssistant />
        </div>
      </div>
    </BrowserRouter>
  );
}
export default App
