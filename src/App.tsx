import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
// Lazy-loaded pages to reduce initial bundle
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Plans = lazy(() => import('./pages/Plans'))
const Success = lazy(() => import('./pages/Success'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Contacts = lazy(() => import('./pages/Contacts'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const TenantMembers = lazy(() => import('./pages/TenantMembers'))
const Features = lazy(() => import('./pages/Features'))
const Templates = lazy(() => import('./pages/Templates'))
const About = lazy(() => import('./pages/About'))
const Ofertas = lazy(() => import('./pages/Ofertas'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Demo = lazy(() => import('./pages/Demo'))
const DnsCheck = lazy(() => import('./pages/DnsCheck'))
const DomainSenderPage = lazy(() => import('./pages/DomainSenderPage'))
const Products = lazy(() => import('./pages/Products'))
const StoreDashboard = lazy(() => import('./pages/StoreDashboard'))
import './App.css'

import AccountCreationProgress from './components/AccountCreationProgress';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import CartDrawer from './components/CartDrawer';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CartProvider>
        <AccountCreationProgress />
        <CartDrawer />
        <main className="w-full">
          <div className="app-container">
            <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/admin/loja" element={<StoreDashboard />} />
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
            <Route path="/ofertas" element={<Ofertas />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/success" element={<Success />} />
            <Route path="/onboarding" element={<Onboarding />} />
            </Routes>
            </Suspense>
          </div>
        </main>
        </CartProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
