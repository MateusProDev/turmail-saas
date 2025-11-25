import { Link } from 'react-router-dom'
import './Home.css'

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-400 text-white w-full">
        <div className="w-full p-8 flex items-center justify-between">
          <div className="text-lg font-semibold">Turmail</div>
          <nav className="space-x-4">
            <Link to="/" className="text-sm hover:underline">Home</Link>
            <Link to="/plans" className="text-sm hover:underline">Planos</Link>
            <Link to="/dashboard" className="text-sm hover:underline">Dashboard</Link>
            <Link to="/login" className="text-sm border px-3 py-1 rounded bg-white text-indigo-600">Entrar</Link>
          </nav>
        </div>
      </header>

      <main className="w-full p-8">
        <section className="text-center py-16 home-hero">
          <h1 className="text-4xl font-extrabold text-gray-900">Envie campanhas e monetize com facilidade</h1>
          <p className="mt-4 text-gray-600">Turmail é um MVP de SaaS para enviar campanhas, gerenciar contatos e cobrar por assinatura — fácil de usar e pronta para crescer.</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/plans" className="px-6 py-3 bg-indigo-600 text-white rounded-md">Ver Planos</Link>
            <Link to="/login" className="px-6 py-3 border rounded-md text-indigo-600">Criar Conta / Entrar</Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mt-12 home-features">
          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Envio de campanhas</h3>
            <p className="mt-2 text-sm text-gray-600">Crie e envie campanhas por email com templates simples e acompanhamento de entregabilidade.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Gestão de contatos</h3>
            <p className="mt-2 text-sm text-gray-600">Importe, segmente e gerencie seus contatos com facilidade.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Monetização via Assinatura</h3>
            <p className="mt-2 text-sm text-gray-600">Integração com Stripe: planos recorrentes e assinaturas gerenciadas automaticamente.</p>
          </div>
        </section>

        <section className="mt-12 p-6 bg-indigo-50 rounded-lg">
          <h3 className="font-semibold">Por que Turmail?</h3>
          <ul className="mt-3 list-disc list-inside text-gray-600">
            <li>Rápido para começar — integração mínima</li>
            <li>Escalável — funções serverless e Webhooks</li>
            <li>Segurança e controle — roles e regras no Firestore</li>
          </ul>
        </section>

        <section className="mt-12 text-center text-sm text-gray-500">
          <p>Quer demonstrar para um cliente? Clique em <Link to="/plans" className="text-indigo-600">Planos</Link> para simular assinaturas ou <Link to="/login" className="text-indigo-600">Login</Link> para entrar.</p>
        </section>
      </main>

      <footer className="border-t mt-12 py-6">
        <div className="w-full text-center text-gray-500">© 2025 Turmail — MVP tem uma pagina dentro da outra</div>
      </footer>
    </div>
  )
}
