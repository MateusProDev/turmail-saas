import { Link } from 'react-router-dom'

export default function Reports(){
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <Link to="/dashboard" className="text-sm text-gray-600">Voltar</Link>
      </header>

      <div className="bg-white rounded shadow p-4">
        <div className="text-sm text-gray-500">Relatórios de campanhas e métricas aparecerão aqui.</div>
      </div>
    </div>
  )
}
