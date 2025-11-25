import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function Demo() {
  return (
    <div className="page-placeholder">
      <h1>Demonstração</h1>
      <p>Solicite uma demo do Turmail. Página em placeholder.</p>
      <Link to="/" className="link-back">Voltar para Início</Link>
    </div>
  )
}
