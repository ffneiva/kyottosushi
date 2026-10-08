/**
 * Horário de funcionamento e "aberto agora".
 *
 * A grade aceita mais de um turno por dia (almoço e jantar, se a casa um dia
 * abrir no almoço): às 16h de uma casa que abre às 18h, o rótulo diz "Abre às
 * 18h", e não "Abre amanhã". O resumo "Seg a dom · 18h–23h" agrupa dias iguais
 * sem que alguém escreva esse texto à mão (e esqueça de atualizá-lo).
 *
 * Tudo calculado no fuso de Brasília, e não no de quem olha: um link aberto
 * em Manaus ou Lisboa tem de dizer se a casa está aberta LÁ, em Senador
 * Canedo.
 */

/** "18:00" → "23:00". Fechamento depois da meia-noite não é suportado. */
type Turno = readonly [abre: string, fecha: string]

/** Índice 0 = domingo, como `Date.getDay()`. Dia sem turnos = fechado. */
export type Semana = readonly (readonly Turno[])[]

const FUSO = 'America/Sao_Paulo'

const FORMATO = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const FORMATO_DATA = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const ABREVIACOES: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sáb: 6,
  sab: 6,
}

export const DIAS_LONGOS = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

type Agora = {
  /** 0 = domingo. */
  dia: number
  /** Minutos desde a meia-noite, no relógio de São Paulo. */
  minutos: number
  /** AAAA-MM-DD no relógio de São Paulo. */
  data: string
}

export function agoraEmSaoPaulo(referencia: Date = new Date()): Agora {
  const partes = FORMATO.formatToParts(referencia)
  const pega = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  const dia = ABREVIACOES[pega('weekday').replace('.', '').toLowerCase()] ?? referencia.getDay()
  // Alguns motores devolvem "24" para meia-noite com hour12: false.
  const hora = Number(pega('hour')) % 24
  return { dia, minutos: hora * 60 + Number(pega('minute')), data: FORMATO_DATA.format(referencia) }
}

export function emMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 720 → "12:00". */
export function deMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * "08:00" → "8h", "14:30" → "14h30".
 *
 * Sem zero à esquerda, que ninguém escreve em português — o `replace(':00',
 * 'h')` ingênuo devolveria "08h".
 */
export function porExtenso(hhmm: string): string {
  const [h, m] = hhmm.split(':')
  const hora = String(Number(h))
  return m === '00' ? `${hora}h` : `${hora}h${m}`
}

export type Estado = {
  aberto: boolean
  /** Texto curto para o selo: "Aberto · até 23h", "Abre às 18h", "Abre amanhã às 12h". */
  rotulo: string
  /** Minutos até fechar — para avisar "fecha em 20 min". Só quando aberto. */
  fechaEm?: number
}

/**
 * O estado de uma casa num instante.
 *
 * O fechamento é exclusivo: às 15h00 em ponto a casa que "fecha às 15h" já
 * está fechada. É o que a placa na porta diz, e é o que evita o rótulo absurdo
 * "Aberto · até 15h" exibido às 15h.
 */
export function estadoDa(semana: Semana, referencia: Date = new Date()): Estado {
  const { dia, minutos } = agoraEmSaoPaulo(referencia)
  const hoje = semana[dia] ?? []

  for (const [abre, fecha] of hoje) {
    const a = emMinutos(abre)
    const f = emMinutos(fecha)
    if (minutos >= a && minutos < f) {
      return { aberto: true, rotulo: `Aberto · até ${porExtenso(fecha)}`, fechaEm: f - minutos }
    }
  }

  // Um turno mais tarde hoje (o jantar, quando se olha no meio da tarde).
  const maisTarde = hoje.find(([abre]) => emMinutos(abre) > minutos)
  if (maisTarde) return { aberto: false, rotulo: `Abre às ${porExtenso(maisTarde[0])}` }

  for (let i = 1; i <= 7; i++) {
    const proximo = semana[(dia + i) % 7]
    if (proximo && proximo.length > 0) {
      const quando = i === 1 ? 'amanhã' : DIAS_LONGOS[(dia + i) % 7]
      return { aberto: false, rotulo: `Abre ${quando} às ${porExtenso(proximo[0][0])}` }
    }
  }

  return { aberto: false, rotulo: 'Horário a confirmar' }
}

/** "12h–15h e 18h–23h". */
export function turnosPorExtenso(turnos: readonly Turno[]): string {
  if (turnos.length === 0) return 'Fechado'
  return turnos.map(([a, f]) => `${porExtenso(a)}–${porExtenso(f)}`).join(' e ')
}

type LinhaDeHorario = { dias: string; horario: string }

/**
 * A grade semanal em linhas, agrupando dias consecutivos iguais.
 *
 * Começa na segunda, que é como se lê uma grade de horário no Brasil — e é
 * também o que faz "sáb e dom" saírem juntos em vez de o domingo abrir a lista
 * sozinho e o sábado fechá-la.
 */
export function resumoDaSemana(semana: Semana): LinhaDeHorario[] {
  const ordem = [1, 2, 3, 4, 5, 6, 0]
  const linhas: Array<{ inicio: number; fim: number; horario: string }> = []

  for (const dia of ordem) {
    const horario = turnosPorExtenso(semana[dia] ?? [])
    const ultima = linhas.at(-1)
    if (ultima && ultima.horario === horario) ultima.fim = dia
    else linhas.push({ inicio: dia, fim: dia, horario })
  }

  return linhas.map(({ inicio, fim, horario }) => {
    if (inicio === fim) return { dias: DIAS_CURTOS[inicio], horario }
    // Dois dias vizinhos: "Sáb e dom". Três ou mais: "Seg a sex".
    const vizinhos = ordem.indexOf(fim) - ordem.indexOf(inicio) === 1
    return {
      dias: `${DIAS_CURTOS[inicio]} ${vizinhos ? 'e' : 'a'} ${DIAS_CURTOS[fim].toLowerCase()}`,
      horario,
    }
  })
}

const NOMES_SCHEMA = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/**
 * `openingHoursSpecification` do schema.org — uma entrada por turno.
 *
 * Dois turnos no mesmo dia viram duas entradas com o mesmo `dayOfWeek`; é
 * assim que o Google entende o intervalo do meio da tarde. Dia fechado não
 * entra: ausência é "fechado" para o schema, e `opens: null` é erro.
 */
export function especificacaoDeHorario(semana: Semana) {
  return semana.flatMap((turnos, dia) =>
    turnos.map(([opens, closes]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${NOMES_SCHEMA[dia]}`,
      opens,
      closes,
    })),
  )
}
