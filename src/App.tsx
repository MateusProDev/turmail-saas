import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import Success from './pages/Success'
import Home from './pages/Home'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <main className="w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/success" element={<Success />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
