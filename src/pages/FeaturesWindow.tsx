type an={
    id:number
    onClose:()=>void
}
export const FeaturesWindow = ({ id, onClose }:an) => {

  const featuresDesc = [
    {
      full: `
A automação de e-mails permite criar fluxos inteligentes que enviam mensagens para seus clientes
no momento ideal — seja após uma reserva, uma consulta ou um abandono de carrinho.  
Você pode configurar sequências, mensagens condicionais e regras avançadas de engajamento.
`
    },
    {
      full: `
A segmentação inteligente analisa o comportamento dos seus clientes — cliques, histórico de compras,
interesses — e cria grupos automaticamente.  
Isso ajuda a enviar campanhas muito mais relevantes e aumentar conversões.
`
    },
    {
      full: `
Você tem acesso a uma biblioteca de templates modernos, responsivos e fáceis de editar.  
Ideal para criar campanhas bonitas em minutos sem precisar de designer.
`
    },
    {
      full: `
Planeje envios para qualquer data e horário.  
Perfeito para promoções sazonais, campanhas semanais e newsletters recorrentes.  
O sistema envia tudo automaticamente.
`
    },
    {
      full: `
Veja taxas de abertura, cliques, desempenho por dispositivo, mapa de calor de links,
entregabilidade e muito mais.  
Tudo em tempo real, com gráficos fáceis de entender.
`
    },
    {
      full: `
Gerencie toda sua base de contatos em um único lugar.  
Importe listas, elimine duplicados, veja histórico de interação e acompanhe engajamento
de cada pessoa individualmente.
`
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl w-[500px] shadow-xl">
        
        <p className="whitespace-pre-line text-gray-700">
          {featuresDesc[id].full}
        </p>

        <button
          className="mt-6 bg-sky-600 text-white px-6 py-2 rounded-lg"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
