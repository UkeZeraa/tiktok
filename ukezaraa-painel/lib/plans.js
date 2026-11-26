// Planos prontos para a tela "Agendar em lote".
// Cada item: ep (número usado para achar o vídeo pelo nome do arquivo), quando (horário de Brasília),
// título, descrição e tags. As tags viram hashtags na descrição e tags do YouTube.

const TAGS = ["isekai", "anime", "aranha", "rpg", "animação", "fomeherdada"];
const serie = (n, nome) => `${nome} · Parte ${n} | Renasci como Aranha`;

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function quandoTexto(local) {
  const d = new Date(local);
  const p = (n) => String(n).padStart(2, "0");
  return `${DIAS[d.getDay()]} (${p(d.getDate())}/${p(d.getMonth() + 1)}) às ${p(d.getHours())}h${d.getMinutes() ? p(d.getMinutes()) : ""}`;
}

// Comentário do canal para fixar em cada episódio.
function comentarioDe(item, proximo) {
  if (!proximo) {
    return "🕷️ PARTE 14 COM 150 CURTIDAS! O que você faz?\nA) Comer o gavião e ganhar o poder do céu\nB) Fazer um Contrato de Alma e ganhar asas\nE que NOME você dá pro gavião? O mais curtido entra na história 🦅";
  }
  return `📌 Maratona Fome Herdada! A Parte ${proximo.ep} sai ${quandoTexto(proximo.quando)} aqui no canal 🕷️\nO que você teria feito no lugar da aranha nesta parte? Comenta aí 👇`;
}

export const PLANS = {
  "fome-herdada-shorts": {
    nome: "Fome Herdada · Partes 2 a 13 no YouTube Shorts",
    redes: { youtube: { privacy: "public", short: true } },
    itens: [
      {
        ep: 2, quando: "2026-11-26T11:00", titulo: serie(2, "A Armadilha"),
        descricao: "Nível 1 contra uma formiga Nível 6. Sem força, só com teia e cabeça. 🕷️\nVocê renasceu aranha num labirinto onde tudo quer te comer, e a sua única arma é a Fome Herdada: devorar é herdar um poder.\n👉 Você atacaria de frente ou esperaria na teia? Comenta aí.\nContinua na Parte 3.",
      },
      {
        ep: 3, quando: "2026-11-26T16:00", titulo: serie(3, "A Porta Viva"),
        descricao: "Trinta formigas numa fenda. Uma aranha. E o primeiro Eco: cada poder herdado apaga uma lembrança sua. 👁️\n👉 Você trocaria uma memória por um poder? Comenta aí.\nContinua na Parte 4.",
      },
      {
        ep: 4, quando: "2026-11-27T11:00", titulo: serie(4, "O Lago das Falsas Estrelas"),
        descricao: "Um lago cheio de luzes no escuro. Lindo. Só que cada luz é uma isca. ✨ E lá embaixo dorme uma salamandra Nível 20.\n👉 Você acenderia a luz ou ficaria no escuro? Comenta aí.\nContinua na Parte 5.",
      },
      {
        ep: 5, quando: "2026-11-27T16:00", titulo: serie(5, "O Fantasma do Lago"),
        descricao: "Atravessar um lago inteiro nas costas de um monstro cego. Nível 20. Sem fazer barulho. 🦎\n👉 Você teria coragem? Comenta aí.\nContinua na Parte 6.",
      },
      {
        ep: 6, quando: "2026-11-28T11:00", titulo: serie(6, "As Fontes Quentes"),
        descricao: "Água fervendo, uma centopeia de brasa e um filhote de morcego riscando SOCORRO na pedra. 🔥🦇\n👉 Você arriscaria a vida por um desconhecido? Comenta aí.\nContinua na Parte 7.",
      },
      {
        ep: 7, quando: "2026-11-28T16:00", titulo: serie(7, "Contrato de Alma"),
        descricao: "Logo você, que matava aranha com chinelo. 🩴 Agora faz um Contrato de Alma com um morcego e divide poderes sem devorar ninguém.\n👉 Qual nome você daria pro morcego? Comenta aí.\nContinua na Parte 8.",
      },
      {
        ep: 8, quando: "2026-11-29T10:00", titulo: serie(8, "Tecelã-Faísca"),
        descricao: "Evolução: seda que dá choque. ⚡ Mas o Registro manda uma ordem: devore o seu aliado.\n👉 Você obedeceria o sistema? Comenta aí.\nContinua na Parte 9.",
      },
      {
        ep: 9, quando: "2026-11-29T14:00", titulo: serie(9, "O Que o Registro Esconde"),
        descricao: "O sistema guarda as suas memórias numa vitrine. E a verdade dói: você não é o jogador. Você é o lanche. 🍓\n👉 Já tinha desconfiado do Registro? Comenta aí.\nContinua na Parte 10.",
      },
      {
        ep: 10, quando: "2026-11-29T18:00", titulo: serie(10, "A Mãe Sobe"),
        descricao: "Ela é do tamanho de um prédio. E te enxerga pelos seus olhos vermelhos. 🕷️👁️\n👉 Você correria ou enfrentaria? Comenta aí.\nContinua na Parte 11.",
      },
      {
        ep: 11, quando: "2026-11-30T11:00", titulo: serie(11, "Atrás de Você"),
        descricao: "Você não venceu a Mãe. Mas sobreviveu a ela. E o Rodolfo conta o segredo: ele estava na fila do morango. Logo atrás de você. 🍓\n👉 Você dividiria o último morango? Comenta aí.\nContinua na Parte 12.",
      },
      {
        ep: 12, quando: "2026-11-30T15:00", titulo: serie(12, "A Revoada"),
        descricao: "Mil morcegos famintos vieram pra cima de você... e viraram o seu elevador. 🌙 Pela primeira vez, você vê o céu.\n👉 Que nome você daria pro gavião? Comenta aí 🦅\nContinua na Parte 13.",
      },
      {
        ep: 13, quando: "2026-12-01T13:00", titulo: serie(13, "Sistema de Verdade"),
        descricao: "Lá fora, o Eco não manda mais. Nível 13, Fio de Luz e Veneno de Brasa. Logo você, que matava aranha com chinelo. Agora é você que dá medo. 🕷️✨\n👉 Comer o gavião ou fazer um contrato com ele? Comenta aí.\nSegue o canal pra ver a Parte 14.",
      },
    ].map((i, idx, all) => ({ ...i, tags: TAGS, comentario: comentarioDe(i, all[idx + 1]) })),
  },
};
