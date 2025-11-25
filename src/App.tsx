import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import Success from './pages/Success'
import Home from './pages/Home'
import Features from './pages/Features'
import Templates from './pages/Templates'
import About from './pages/About'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Demo from './pages/Demo'
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
          <Route path="/features" element={<Features />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/success" element={<Success />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
