import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-black">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-4">
          <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-12 h-12 rounded-lg object-contain" />
          <h1 className="text-white text-2xl font-extrabold">Ben<span className="text-green-400">Suplementos</span></h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-black mb-4">Quem Somos</h2>
        <p className="text-gray-700 leading-relaxed mb-6">A BenSuplementos nasceu em Fortaleza com um propósito simples: oferecer suplementos de qualidade com preço justo e atendimento humano. Trabalhamos com marcas renomadas e selecionamos cuidadosamente cada produto para entregar segurança e resultado aos nossos clientes.</p>

        <h3 className="text-xl font-bold mt-6 mb-2">Nossa Missão</h3>
        <p className="text-gray-700 mb-4">Ajudar pessoas a alcançarem seus objetivos de saúde e performance oferecendo produtos confiáveis, entregas rápidas e suporte especializado.</p>

        <h3 className="text-xl font-bold mt-6 mb-2">Nossos Valores</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Qualidade e procedência</li>
          <li>Transparência nos preços</li>
          <li>Atendimento humano e rápido</li>
          <li>Compromisso com a entrega</li>
        </ul>

        <h3 className="text-xl font-bold mt-6 mb-2">Contato</h3>
        <p className="text-gray-700">Atendimento via WhatsApp: <a className="text-green-600 font-bold" href="https://wa.me/5585991470709" target="_blank" rel="noopener noreferrer">(85) 99147-0709</a></p>
        <p className="text-gray-700 mt-2">Siga-nos no Instagram: <a className="text-green-600 font-bold" href="https://www.instagram.com/bensuplementos_" target="_blank" rel="noopener noreferrer">@bensuplementos_</a></p>

        <div className="mt-8 bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-bold">Visite nossa loja</h4>
          <p className="text-sm text-gray-600">Atendimento e retirada em Fortaleza (CEP consulte no carrinho para frete grátis).</p>
        </div>

        <div className="mt-8 flex gap-3">
          <Link to="/produtos" className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg">Ver Produtos</Link>
          <a href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-black text-white font-bold rounded-lg">Entrar no Grupo</a>
        </div>
      </main>
    </div>
  )
}
