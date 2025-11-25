import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="p-4 bg-white shadow">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="font-semibold">Turmail</div>
            <div className="space-x-4">
              <Link to="/" className="text-sm text-gray-600">Home</Link>
              <Link to="/plans" className="text-sm text-gray-600">Planos</Link>
              <Link to="/dashboard" className="text-sm text-gray-600">Dashboard</Link>
              <Link to="/login" className="text-sm text-gray-600">Login</Link>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto mt-8">
          <Routes>
            <Route path="/" element={<div className="p-8">Bem-vindo ao Turmail MVP</div>} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plans" element={<Plans />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
