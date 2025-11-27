import { Link } from 'react-router-dom'

export default function Reports(){
  return (
    <div className="py-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
        </div>
        <div>
          <Link to="/dashboard" className="text-sm text-gray-600">Voltar</Link>
        </div>
      </header>

      <div className="page-section">
        <div className="text-sm text-gray-500">Relatórios de campanhas e métricas aparecerão aqui.</div>
      </div>
    </div>
  )
}
