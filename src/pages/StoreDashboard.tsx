import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaStar, FaArrowLeft, FaImage, FaSpinner, FaSearch, FaTimes, FaUsers, FaBoxOpen, FaCheckCircle } from 'react-icons/fa'
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  formatBRL,
  type Product,
  type ProductInput,
} from '../lib/productService'
import { uploadImage } from '../lib/cloudinary'
import {
  getAllAffiliates,
  getAllAffiliateOrders,
  updateAffiliateStatus,
  updateAffiliateCouponConfig,
  confirmOrder,
  type Affiliate,
  type AffiliateOrder,
} from '../lib/affiliateService'

/* ── Categorias disponíveis ── */
const CATEGORIES = ['Whey Protein', 'Creatina', 'Pré-Treino', 'Aminoácidos', 'Vitaminas', 'Acessórios']

/* ── Estado vazio do form ── */
const emptyForm: ProductInput = {
  name: '',
  price: 0,
  oldPrice: 0,
  wholesalePrice: 0,
  repassePrice: 0,
  image: '',
  tag: '',
  category: CATEGORIES[0],
  description: '',
  featured: false,
  active: true,
}

export default function StoreDashboard() {
  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState<'produtos' | 'afiliados'>('produtos')

  /* ── Products state ── */
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductInput>({ ...emptyForm })
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Todos')
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Affiliates state ── */
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loadingAff, setLoadingAff] = useState(false)
  const [orders, setOrders] = useState<AffiliateOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [editingAff, setEditingAff] = useState<Affiliate | null>(null)
  const [affForm, setAffForm] = useState<{ couponPercent: number; couponCategories: string[]; status: 'active' | 'suspended' }>({
    couponPercent: 5,
    couponCategories: [],
    status: 'active',
  })
  const [savingAff, setSavingAff] = useState(false)

  /* ── Load products ── */
  const load = async () => {
    setLoading(true)
    try {
      const data = await listProducts(false)
      setProducts(data)
    } catch (e) {
      showToast('Erro ao carregar produtos', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /* ── Load affiliates when tab changes ── */
  useEffect(() => {
    if (activeTab !== 'afiliados') return
    setLoadingAff(true)
    setLoadingOrders(true)
    Promise.all([getAllAffiliates(), getAllAffiliateOrders()])
      .then(([affs, ords]) => { setAffiliates(affs); setOrders(ords) })
      .catch(() => showToast('Erro ao carregar afiliados', 'err'))
      .finally(() => { setLoadingAff(false); setLoadingOrders(false) })
  }, [activeTab])

  /* ── Open affiliate edit modal ── */
  const openEditAff = (aff: Affiliate) => {
    setEditingAff(aff)
    setAffForm({
      couponPercent: aff.couponPercent ?? 5,
      couponCategories: aff.couponCategories ?? [],
      status: aff.status === 'suspended' ? 'suspended' : 'active',
    })
  }

  const handleSaveAff = async () => {
    if (!editingAff) return
    setSavingAff(true)
    try {
      await updateAffiliateCouponConfig(editingAff.uid, affForm.couponPercent, affForm.couponCategories)
      await updateAffiliateStatus(editingAff.uid, affForm.status)
      setAffiliates(prev => prev.map(a => a.uid === editingAff.uid
        ? { ...a, couponPercent: affForm.couponPercent, couponCategories: affForm.couponCategories, status: affForm.status }
        : a
      ))
      setEditingAff(null)
      showToast('Afiliado atualizado!', 'ok')
    } catch {
      showToast('Erro ao salvar afiliado', 'err')
    } finally {
      setSavingAff(false)
    }
  }

  const handleConfirmOrder = async (orderId: string) => {
    try {
      await confirmOrder(orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'confirmed' } : o))
      showToast('Venda confirmada!', 'ok')
    } catch {
      showToast('Erro ao confirmar venda', 'err')
    }
  }

  /* ── Toast helper ── */
  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  /* ── Filtered list ── */
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'Todos' || p.category === filterCat
    return matchSearch && matchCat
  })

  /* ── Form handlers ── */
  const openNew = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditId(p.id)
    setForm({
      name: p.name,
      price: p.price,
      oldPrice: p.oldPrice || 0,
      wholesalePrice: p.wholesalePrice || 0,
      repassePrice: p.repassePrice || 0,
      image: p.image,
      tag: p.tag || '',
      category: p.category,
      description: p.description || '',
      featured: p.featured || false,
      active: p.active !== false,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm({ ...emptyForm })
  }

  const handleChange = (field: keyof ProductInput, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  /* ── Image upload ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadImage(file)
      setForm(prev => ({ ...prev, image: res.secure_url }))
      showToast('Imagem enviada!', 'ok')
    } catch {
      showToast('Erro ao enviar imagem', 'err')
    } finally {
      setUploading(false)
    }
  }

  /* ── Save (create / update) ── */
  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Nome obrigatório', 'err')
    if (form.price <= 0) return showToast('Preço deve ser > 0', 'err')
    if (!form.image.trim()) return showToast('Imagem obrigatória', 'err')

    setSaving(true)
    try {
      if (editId) {
        await updateProduct(editId, form)
        showToast('Produto atualizado!', 'ok')
      } else {
        await createProduct(form)
        showToast('Produto criado!', 'ok')
      }
      closeForm()
      await load()
    } catch {
      showToast('Erro ao salvar', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id)
      showToast('Produto removido', 'ok')
      setConfirmDelete(null)
      await load()
    } catch {
      showToast('Erro ao remover', 'err')
    }
  }

  /* ── Toggle active/featured ── */
  const toggleField = async (p: Product, field: 'active' | 'featured') => {
    try {
      await updateProduct(p.id, { [field]: !p[field] })
      await load()
    } catch {
      showToast('Erro ao atualizar', 'err')
    }
  }

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5">
              <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-12 h-12 rounded-lg object-contain" />
              <span className="text-lg font-extrabold text-white leading-none hidden sm:block">Ben<span className="text-green-400">Suplementos</span></span>
            </Link>
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-bold">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/produtos" className="text-sm text-gray-300 hover:text-green-400 transition-colors flex items-center gap-1">
              <FaArrowLeft className="w-3 h-3" /> Voltar à Loja
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Tab switcher ── */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('produtos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'produtos' ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FaBoxOpen className="w-3.5 h-3.5" /> Produtos
          </button>
          <button
            onClick={() => setActiveTab('afiliados')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'afiliados' ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FaUsers className="w-3.5 h-3.5" /> Afiliados
          </button>
        </div>
        {/* ── Title + New button ── */}
        {activeTab === 'produtos' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Gerenciar Produtos</h1>
            <p className="text-sm text-gray-500 mt-1">{products.length} produto(s) cadastrado(s)</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-sm"
          >
            <FaPlus className="w-3.5 h-3.5" />
            Novo Produto
          </button>
        </div>
        )}

        {/* ── Search + Category filter ── */}
        {activeTab === 'produtos' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['Todos', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  filterCat === cat ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* ▐▐▐▐▐▐▐▐▐▐▐▐▐ TAB AFILIADOS ▐▐▐▐▐▐▐▐▐▐▐▐▐ */}
        {activeTab === 'afiliados' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">Afiliados cadastrados</h2>
              <p className="text-sm text-gray-500">{affiliates.length} afiliado(s)</p>
            </div>

            {loadingAff ? (
              <div className="flex justify-center py-16"><FaSpinner className="w-6 h-6 text-green-600 animate-spin" /></div>
            ) : affiliates.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FaUsers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum afiliado cadastrado ainda.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_auto_auto_auto_auto_auto] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  <span>Afiliado</span><span>Cupom</span><span className="text-center">%</span><span>Categorias</span><span className="text-center">Status</span><span className="text-center">Pedidos</span><span className="text-right">Ações</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {affiliates.map(aff => {
                    const affOrders = orders.filter(o => o.couponCode === aff.coupon)
                    const confirmed = affOrders.filter(o => o.status === 'confirmed').length
                    return (
                      <div key={aff.uid} className="px-5 py-4">
                        {/* Desktop */}
                        <div className="hidden md:grid grid-cols-[2fr_1.5fr_auto_auto_auto_auto_auto] gap-3 items-center">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{aff.name}</p>
                            <p className="text-xs text-gray-400">{aff.email}</p>
                            {aff.phone && <p className="text-xs text-gray-400">{aff.phone}</p>}
                          </div>
                          <div className="font-mono text-sm font-black text-green-700 bg-green-50 px-2 py-1 rounded w-fit">{aff.coupon}</div>
                          <div className="text-center">
                            <span className="text-sm font-black text-blue-700">{aff.couponPercent ?? 5}%</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {aff.couponCategories?.length ? aff.couponCategories.join(', ') : <span className="italic text-gray-400">Todas</span>}
                          </div>
                          <div className="text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              aff.status === 'active' ? 'bg-green-50 border-green-200 text-green-700'
                              : aff.status === 'suspended' ? 'bg-red-50 border-red-200 text-red-600'
                              : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                            }`}>{aff.status === 'active' ? 'Ativo' : aff.status === 'suspended' ? 'Suspenso' : 'Pendente'}</span>
                          </div>
                          <div className="text-center text-xs text-gray-600">
                            <span className="font-bold">{affOrders.length}</span> total<br />
                            <span className="text-green-600 font-bold">{confirmed}</span> confirm.
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditAff(aff)}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                              title="Editar cupom"
                            >
                              <FaEdit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Mobile */}
                        <div className="md:hidden flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded">{aff.coupon}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                aff.status === 'active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
                              }`}>{aff.status === 'active' ? 'Ativo' : 'Suspenso'}</span>
                            </div>
                            <p className="text-sm font-bold text-gray-900">{aff.name}</p>
                            <p className="text-xs text-gray-400">{aff.email}</p>
                            <p className="text-xs text-gray-500 mt-1">{aff.couponPercent ?? 5}% OFF · {aff.couponCategories?.length ? aff.couponCategories.join(', ') : 'Todas categorias'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{affOrders.length} pedidos · {confirmed} confirmados</p>
                          </div>
                          <button onClick={() => openEditAff(aff)} className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Pedidos de afiliados ── */}
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-3">Pedidos de Afiliados</h2>
              {loadingOrders ? (
                <div className="flex justify-center py-10"><FaSpinner className="w-5 h-5 text-green-600 animate-spin" /></div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido ainda.</p>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="hidden md:grid grid-cols-[auto_2fr_auto_auto_auto_auto] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    <span>Cupom</span><span>Itens</span><span>Total</span><span>Desconto</span><span>Status</span><span className="text-right">Ação</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {orders.map(order => (
                      <div key={order.id} className="px-5 py-3 flex flex-col sm:grid sm:grid-cols-[auto_2fr_auto_auto_auto_auto] gap-3 items-start sm:items-center">
                        <span className="font-mono text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded">{order.couponCode}</span>
                        <ul className="text-xs text-gray-500">{order.items?.map((it, i) => <li key={i}>{it.qty}x {it.name}</li>)}</ul>
                        <span className="text-sm font-bold text-gray-900">{order.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-xs text-green-600 font-bold">-{order.discount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          order.status === 'confirmed' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                        }`}>{order.status === 'confirmed' ? '✅ Confirmado' : '⏳ Pendente'}</span>
                        <div className="flex justify-end">
                          {order.status !== 'confirmed' && (
                            <button
                              onClick={() => handleConfirmOrder(order.id!)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              <FaCheckCircle className="w-3 h-3" /> Confirmar venda
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ▐▐▐▐▐▐▐▐▐▐▐▐▐ TAB PRODUTOS ▐▐▐▐▐▐▐▐▐▐▐▐▐ */}
        {activeTab === 'produtos' && (
          <>
        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="w-6 h-6 text-green-600 animate-spin" />
            <span className="ml-2 text-gray-500 text-sm">Carregando...</span>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <FaImage className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-1">Nenhum produto encontrado</h3>
            <p className="text-sm text-gray-400 mb-4">
              {search || filterCat !== 'Todos' ? 'Tente outro filtro.' : 'Comece adicionando seu primeiro produto!'}
            </p>
            {!search && filterCat === 'Todos' && (
              <button onClick={openNew} className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-500 transition-colors">
                <FaPlus className="w-3 h-3 inline mr-1" /> Cadastrar Produto
              </button>
            )}
          </div>
        )}

        {/* ── Product Table/Cards ── */}
        {!loading && filtered.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <div className="col-span-1">Img</div>
              <div className="col-span-3">Nome</div>
              <div className="col-span-2">Categoria</div>
              <div className="col-span-1">Preço</div>
              <div className="col-span-1">Tag</div>
              <div className="col-span-1">Ativo</div>
              <div className="col-span-1">Destaque</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>

            {filtered.map(p => (
              <div key={p.id} className="border-b border-gray-100 last:border-0">
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-1">
                    <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80/1a1a1a/22c55e?text=Img' }} />
                  </div>
                  <div className="col-span-3">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{p.name}</h3>
                    {p.description && <p className="text-xs text-gray-400 truncate mt-0.5">{p.description}</p>}
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{p.category}</span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm font-bold text-green-700">{formatBRL(p.price)}</span>
                    {p.oldPrice ? <span className="block text-[10px] text-gray-400 line-through">{formatBRL(p.oldPrice)}</span> : null}
                  </div>
                  <div className="col-span-1">
                    {p.tag ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">{p.tag}</span> : <span className="text-gray-300">—</span>}
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => toggleField(p, 'active')} className="text-xl">
                      {p.active !== false ? <FaToggleOn className="text-green-500" /> : <FaToggleOff className="text-gray-300" />}
                    </button>
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => toggleField(p, 'featured')} className="text-lg">
                      <FaStar className={p.featured ? 'text-yellow-400' : 'text-gray-300'} />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar">
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(p.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Excluir">
                      <FaTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3">
                    <img src={p.image} alt={p.name} className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80/1a1a1a/22c55e?text=Img' }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.category}</span>
                        {p.tag && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{p.tag}</span>}
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-sm font-black text-green-700">{formatBRL(p.price)}</span>
                        {p.oldPrice ? <span className="text-[10px] text-gray-400 line-through">{formatBRL(p.oldPrice)}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleField(p, 'active')} className="flex items-center gap-1 text-xs">
                        {p.active !== false ? <FaToggleOn className="text-green-500 text-lg" /> : <FaToggleOff className="text-gray-300 text-lg" />}
                        <span className="text-gray-500">Ativo</span>
                      </button>
                      <button onClick={() => toggleField(p, 'featured')} className="flex items-center gap-1 text-xs">
                        <FaStar className={`text-lg ${p.featured ? 'text-yellow-400' : 'text-gray-300'}`} />
                        <span className="text-gray-500">Destaque</span>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <FaEdit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(p.id)} className="p-2 rounded-lg bg-red-50 text-red-500">
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* ═══════ FORM MODAL ═══════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60" onClick={closeForm} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 mb-10">
            <button onClick={closeForm} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600">
              <FaTimes className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-black text-gray-900 mb-6">
              {editId ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Ex: Whey Isolado 900g"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Preço + Preço antigo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price || ''}
                    onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                    placeholder="189.90"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Preço Antigo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.oldPrice || ''}
                    onChange={e => handleChange('oldPrice', parseFloat(e.target.value) || 0)}
                    placeholder="249.90"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Preços internos (atacado / repasse) */}
              <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3 space-y-3">
                <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                  🔒 Preços internos — não aparecem na loja
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Custo / Atacado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(form as any).wholesalePrice || ''}
                      onChange={e => handleChange('wholesalePrice' as any, parseFloat(e.target.value) || 0)}
                      placeholder="80.00"
                      className="w-full px-4 py-2.5 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Seu custo real (base de cálculo do lucro)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Preço de Repasse (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(form as any).repassePrice || ''}
                      onChange={e => handleChange('repassePrice' as any, parseFloat(e.target.value) || 0)}
                      placeholder="120.00"
                      className="w-full px-4 py-2.5 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Valor que o afiliado compra / recebe</p>
                  </div>
                </div>
                {/* Cálculo de margens em tempo real */}
                {((form as any).repassePrice > 0 || (form as any).wholesalePrice > 0) && (
                  <div className="flex flex-wrap gap-4 pt-1 border-t border-orange-200 text-xs">
                    {(form as any).wholesalePrice > 0 && (form as any).repassePrice > 0 && (
                      <span className="text-blue-700">
                        💼 Seu lucro: <strong>{formatBRL((form as any).repassePrice - (form as any).wholesalePrice)}</strong>
                      </span>
                    )}
                    {(form as any).repassePrice > 0 && form.price > 0 && (
                      <span className="text-green-700">
                        🤝 Lucro do afiliado: <strong>{formatBRL(form.price - (form as any).repassePrice)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Categoria *</label>
                <select
                  value={form.category}
                  onChange={e => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tag */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tag / Selo</label>
                <input
                  type="text"
                  value={form.tag}
                  onChange={e => handleChange('tag', e.target.value)}
                  placeholder="Ex: Mais Vendido, -25%, Novo"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Imagem */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Imagem *</label>
                <div className="flex gap-3 items-start">
                  {form.image ? (
                    <img src={form.image} alt="Preview" className="w-20 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FaImage className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center gap-1"
                    >
                      {uploading ? <><FaSpinner className="w-3 h-3 animate-spin" /> Enviando...</> : <><FaImage className="w-3 h-3" /> Upload Imagem</>}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <input
                      type="text"
                      value={form.image}
                      onChange={e => handleChange('image', e.target.value)}
                      placeholder="Ou cole a URL da imagem"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Descreva o produto..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active ?? true}
                    onChange={e => handleChange('active', e.target.checked)}
                    className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">Ativo na loja</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured ?? false}
                    onChange={e => handleChange('featured', e.target.checked)}
                    className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">Destaque (Home)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button onClick={closeForm} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <><FaSpinner className="w-3 h-3 animate-spin" /> Salvando...</> : (editId ? 'Salvar Alterações' : 'Criar Produto')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ AFFILIATE EDIT MODAL ═══════ */}
      {editingAff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setEditingAff(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-gray-900">Editar Afiliado: {editingAff.name}</h3>
              <button onClick={() => setEditingAff(null)} className="text-gray-400 hover:text-gray-600"><FaTimes className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {/* Desconto */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Desconto do cupom (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={affForm.couponPercent}
                  onChange={e => setAffForm(prev => ({ ...prev, couponPercent: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              {/* Categorias */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Categorias (vazio = todas)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={affForm.couponCategories.includes(cat)}
                        onChange={e => setAffForm(prev => ({
                          ...prev,
                          couponCategories: e.target.checked
                            ? [...prev.couponCategories, cat]
                            : prev.couponCategories.filter(c => c !== cat)
                        }))}
                        className="accent-green-600"
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Status</label>
                <div className="flex gap-4">
                  {(['active', 'suspended'] as const).map(s => (
                    <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="affStatus"
                        value={s}
                        checked={affForm.status === s}
                        onChange={() => setAffForm(prev => ({ ...prev, status: s }))}
                        className="accent-green-600"
                      />
                      {s === 'active' ? 'Ativo' : 'Suspenso'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingAff(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSaveAff}
                disabled={savingAff}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {savingAff ? <><FaSpinner className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ CONFIRM DELETE MODAL ═══════ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <FaTrash className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Produto?</h3>
            <p className="text-sm text-gray-500 mb-6">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TOAST ═══════ */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-lg shadow-lg text-sm font-bold text-white transition-all ${
          toast.type === 'ok' ? 'bg-green-600' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
