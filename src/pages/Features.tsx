import { Link } from 'react-router-dom'
import './PagePlaceholder.css'
import { FeaturesWindows } from './FeaturesWindow'
import { useState } from 'react'

export default function Features() {
  const [openWindow, setopenWindow] = useState<number|null>(null)

  const features = [
    { title: "Automação de E-mails", desc: "Envie emails personalizados automaticamente." },
    { title: "Segmentação Inteligente", desc: "Divida contatos por comportamento e interesse." },
    { title: "Templates Prontos", desc: "Vários modelos de email profissionais." },
    { title: "Agendamento de Campanhas", desc: "Planeje campanhas com antecedência." },
    { title: "Análise e Métricas", desc: "Monitore desempenho das campanhas." },
    { title: "Gestão de Contatos", desc: "Organize seus contatos facilmente." },
  ]

  return (
    <div className="page-placeholder py-10">
      
      <h1 className="text-4xl mb-10 text-sky-900 font-serif font-semibold text-center">
        Funcionalidades
      </h1>

      <div className="flex flex-wrap justify-center gap-10">
        {features.map((e, i) => (
          <div
            key={i}
            onClick={() => setopenWindow(i)}   // ← ВАЖНО
            className="
              w-[38%] min-w-[300px]
              bg-white shadow-md hover:shadow-xl transition rounded-2xl p-6
              border border-sky-200 hover:border-sky-400 cursor-pointer
            "
          >
            <h1 className="text-xl font-semibold text-sky-700 mb-2">
              {e.title}
            </h1>
            <h2 className="text-gray-600 text-base">{e.desc}</h2>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link to="/" className="text-sky-700 font-medium hover:underline">
          Voltar para Início
        </Link>
      </div>

      {openWindow !== null && (
        <FeaturesWindows id={openWindow} onClose={() => setopenWindow(null)} />
      )}

    </div>
  )
}
