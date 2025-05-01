import UploadPage from './pages/UploadPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CleanPage from './pages/CleanPage';

const PagePlaceholder = ({ name }: { name: string }) => (
  <div className="p-10 text-xl font-semibold">{name} Page</div>
);

const App = () => {
  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Routes>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/clean" element={<CleanPage />} />
            <Route path="/eda" element={<PagePlaceholder name="EDA" />} />
            <Route path="/transform" element={<PagePlaceholder name="Transform" />} />
            <Route path="/train" element={<PagePlaceholder name="Train" />} />
            <Route path="/export" element={<PagePlaceholder name="Export" />} />
            <Route path="*" element={<Navigate to="/upload" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
export default App
