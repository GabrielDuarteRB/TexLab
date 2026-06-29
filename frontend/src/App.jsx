import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import ProjectScreen from './components/projects/ProjectScreen.jsx';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectScreen />} />
        <Route path="/project/:id" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
