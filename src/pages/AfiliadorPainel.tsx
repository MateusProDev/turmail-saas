import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaTag, FaSignOutAlt, FaShoppingCart, FaCheckCircle, FaClock,
  FaSpinner, FaChartBar, FaWhatsapp, FaInstagram, FaBoxOpen,
} from 'react-icons/fa'
import { auth } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  getAffiliate,
  getOrdersByCoupon,
  logoutAffiliate,
  type Affiliate,
  type AffiliateOrder,
} from '../lib/affiliateService'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function fmtDate(ts: any): string {
  if (!ts) return '—'
  try {
    const d: Date = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

export default function AfiliadorPainel() {
  const navigate = useNavigate()
  const [authLoading, setAuthLoading] = useState(true)
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [orders, setOrders] = useState<AffiliateOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [error, setError] = useState('')

  /* ── Verificar auth ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthLoading(false)
        return
      }
      try {
        const aff = await getAffiliate(user.uid)
        if (!aff) {
          // Conta Firebase existe, mas não é afiliado
          setAuthLoading(false)
          return
        }
        setAffiliate(aff)
      } catch {
        setError('Erro ao carregar dados.')
      } finally {
        setAuthLoading(false)
      }
    })
    return () => unsub()
  }, [])

  /* ── Buscar pedidos quando o afiliado é conhecido ── */
  useEffect(() => {
    if (!affiliate?.coupon) return
    setLoadingOrders(true)
    getOrdersByCoupon(affiliate.coupon)
      .then(setOrders)
      .catch(() => setError('Erro ao carregar pedidos.'))
      .finally(() => setLoadingOrders(false))
  }, [affiliate])

  async function handleLogout() {
    await logoutAffiliate()
    navigate('/afiliado/cadastro')
  }

  /* ── Stats ── */
  const totalOrders = orders.length
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const totalDiscountGiven = orders.reduce((s, o) => s + (o.discount || 0), 0)
  const confirmedRevenue = orders
    .filter(o => o.status === 'confirmed')
    .reduce((s, o) => s + (o.total || 0), 0)

  /* ── Loading state ── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <FaSpinner className="w-7 h-7 text-green-400 animate-spin" />
      </div>
    )
  }

  /* ── Não autenticado ── */
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-5 px-4">
        <FaTag className="w-10 h-10 text-green-400" />
        <h2 className="text-xl font-extrabold text-white text-center">Acesso ao Painel de Afiliados</h2>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          Faça login ou cadastre-se como afiliado para acessar seu painel.
        </p>
        <Link
          to="/afiliado/cadastro"
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors text-sm"
        >
          Login / Cadastro
        </Link>
        <Link to="/" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
          ← Voltar para a loja
        </Link>
      </div>
    )
  }

  const statusLabel = {
    active: { text: 'Ativo', cls: 'bg-green-900/40 border-green-700 text-green-400' },
    pending: { text: 'Aguardando aprovação', cls: 'bg-yellow-900/40 border-yellow-700 text-yellow-400' },
    suspended: { text: 'Suspenso', cls: 'bg-red-900/40 border-red-700 text-red-400' },
  }[affiliate.status]

  return (
    <div className="min-h-screen bg-black">
      {/* ── Header ── */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-sm font-extrabold text-white">Ben<span className="text-green-400">Suplementos</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{affiliate.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              <FaSignOutAlt className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Boas-vindas ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Olá, {affiliate.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Painel do Afiliado · BenSuplementos</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${statusLabel.cls}`}>
              {statusLabel.text}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-gray-900 border border-gray-700 text-green-400 text-sm font-bold px-3 py-1.5 rounded-full font-mono tracking-widest">
              <FaTag className="w-3 h-3" /> {affiliate.coupon}
            </span>
          </div>
        </div>

        {affiliate.status === 'suspended' && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
            🚫 Sua conta está <strong>suspensa</strong>. Entre em contato com a equipe BenSuplementos pelo WhatsApp.
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ── Cards de estatísticas ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<FaShoppingCart className="w-5 h-5" />}
            label="Total de Pedidos"
            value={String(totalOrders)}
            color="text-blue-400"
            bg="bg-blue-900/20 border-blue-800/50"
          />
          <StatCard
            icon={<FaCheckCircle className="w-5 h-5" />}
            label="Vendas Confirmadas"
            value={String(confirmedOrders)}
            color="text-green-400"
            bg="bg-green-900/20 border-green-800/50"
          />
          <StatCard
            icon={<FaClock className="w-5 h-5" />}
            label="Aguardando Confirmação"
            value={String(pendingOrders)}
            color="text-yellow-400"
            bg="bg-yellow-900/20 border-yellow-800/50"
          />
          <StatCard
            icon={<FaChartBar className="w-5 h-5" />}
            label="Volume Confirmado"
            value={fmt(confirmedRevenue)}
            color="text-purple-400"
            bg="bg-purple-900/20 border-purple-800/50"
          />
        </div>

        {/* ── Desconto gerado ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-900/40 border border-green-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaTag className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total de descontos oferecidos com seu cupom</p>
            <p className="text-xl font-black text-green-400">{fmt(totalDiscountGiven)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">Cupom</p>
            <p className="text-lg font-black text-white font-mono tracking-widest">{affiliate.coupon}</p>
          </div>
        </div>

        {/* ── Perfil do afiliado ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <FaTag className="w-3.5 h-3.5 text-green-400" /> Seus dados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <InfoRow label="Nome" value={affiliate.name} />
            <InfoRow label="E-mail" value={affiliate.email} />
            <InfoRow label="WhatsApp" value={affiliate.phone} />
            {affiliate.instagram && <InfoRow label="Instagram" value={affiliate.instagram} />}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-3">
            {affiliate.phone && (
              <a
                href={`https://wa.me/55${affiliate.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:underline"
              >
                <FaWhatsapp className="w-3.5 h-3.5" /> Contato via WhatsApp
              </a>
            )}
            {affiliate.instagram && (
              <a
                href={`https://instagram.com/${affiliate.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:underline"
              >
                <FaInstagram className="w-3.5 h-3.5" /> {affiliate.instagram}
              </a>
            )}
          </div>
        </div>

        {/* ── Tabela de pedidos ── */}
        <div>
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <FaBoxOpen className="w-4 h-4 text-green-400" />
            Pedidos com o cupom <span className="font-mono text-green-400">{affiliate.coupon}</span>
          </h2>

          {loadingOrders ? (
            <div className="flex justify-center py-10">
              <FaSpinner className="w-6 h-6 text-green-400 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-10 text-center text-gray-500 text-sm">
              <FaShoppingCart className="w-8 h-8 mx-auto mb-3 opacity-40" />
              Nenhum pedido registrado ainda.<br />
              Compartilhe seu cupom <span className="font-bold text-gray-400">{affiliate.coupon}</span> para começar!
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 border-b border-gray-800 text-[11px] text-gray-500 font-bold uppercase tracking-wide">
                <span>Itens</span>
                <span className="text-right">Subtotal</span>
                <span className="text-right">Desconto</span>
                <span className="text-right">Total</span>
                <span className="text-right">Status</span>
              </div>

              <div className="divide-y divide-gray-800">
                {orders.map(order => (
                  <div key={order.id} className="px-4 py-3">
                    {/* Mobile: stack */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            order.status === 'confirmed'
                              ? 'bg-green-900/40 border-green-700 text-green-400'
                              : 'bg-yellow-900/40 border-yellow-700 text-yellow-400'
                          }`}>
                            {order.status === 'confirmed' ? '✅ Confirmado' : '⏳ Pendente'}
                          </span>
                          <span className="text-[10px] text-gray-600">{fmtDate(order.createdAt)}</span>
                        </div>
                        <ul className="text-xs text-gray-400 space-y-0.5">
                          {order.items?.map((it, i) => (
                            <li key={i}>{it.qty}x {it.name}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-right flex-shrink-0 text-xs space-y-0.5">
                        <p className="text-gray-500">Sub: {fmt(order.subtotal)}</p>
                        {order.discount > 0 && (
                          <p className="text-green-500">-{fmt(order.discount)}</p>
                        )}
                        <p className="text-white font-bold">{fmt(order.total)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Dicas ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4">
          <h3 className="text-xs font-bold text-gray-300 mb-2">💡 Como funciona</h3>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li>• Quando um cliente usa o cupom <span className="text-white font-bold">{affiliate.coupon}</span> no carrinho, o pedido aparece aqui automaticamente.</li>
            <li>• O pedido fica como <span className="text-yellow-400 font-bold">Pendente</span> até a equipe BenSuplementos confirmar a venda.</li>
            <li>• Após confirmação, você receberá o contato para receber sua comissão.</li>
            <li>• Dúvidas? Fale com a equipe pelo <a href="https://wa.me/5585991470709" target="_blank" rel="noreferrer" className="text-green-400 hover:underline">WhatsApp</a>.</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({
  icon, label, value, color, bg
}: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${bg}`}>
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className="text-[11px] text-gray-400 leading-snug">{label}</p>
      <p className={`text-lg font-extrabold mt-0.5 ${color} leading-none`}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-white font-medium truncate">{value}</p>
    </div>
  )
}
