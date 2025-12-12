import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import Success from './pages/Success'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Campaigns from './pages/Campaigns'
import Contacts from './pages/Contacts'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import TenantMembers from './pages/TenantMembers'
import Features from './pages/Features'
import Templates from './pages/Templates'
import About from './pages/About'
// import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Demo from './pages/Demo'
import DnsCheck from './pages/DnsCheck'
import DomainSenderPage from './pages/DomainSenderPage'
import './App.css'

import AccountCreationProgress from './components/AccountCreationProgress';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AccountCreationProgress />
        <main className="w-full">
          <div className="app-container">
            <Routes> 
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/dns-check" element={<DnsCheck />} />
            <Route path="/domain-sender" element={<DomainSenderPage />} />
            <Route path="/tenants/:tenantId/members" element={<TenantMembers />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/features" element={<Features />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/about" element={<About />} />
            {/* <Route path="/contact" element={<Contact />} /> */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/success" element={<Success />} />
            <Route path="/onboarding" element={<Onboarding />} />
            </Routes>
          </div>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}
