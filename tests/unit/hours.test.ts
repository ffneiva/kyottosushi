import { describe, expect, it } from 'vitest'
import { CASA } from '@/lib/business'
import {
  agoraEmSaoPaulo,
  deMinutos,
  emMinutos,
  especificacaoDeHorario,
  estadoDa,
  porExtenso,
  resumoDaSemana,
  type Semana,
  turnosPorExtenso,
} from '@/lib/hours'

/** Grade típica: almoço e jantar de segunda a sexta, corrido no fim de semana. */
const DOIS_TURNOS: Semana = [
  [['12:00', '23:00']],
  [
    ['12:00', '15:00'],
    ['18:00', '23:00'],
  ],
  [
    ['12:00', '15:00'],
    ['18:00', '23:00'],
  ],
  [
    ['12:00', '15:00'],
    ['18:00', '23:00'],
  ],
  [
    ['12:00', '15:00'],
    ['18:00', '23:00'],
  ],
  [
    ['12:00', '15:00'],
    ['18:00', '23:00'],
  ],
  [['12:00', '23:00']],
]

const FECHA_SEGUNDA: Semana = [
  [['12:00', '22:00']],
  [],
  [['18:00', '22:00']],
  [['18:00', '22:00']],
  [['18:00', '22:00']],
  [['18:00', '23:00']],
  [['12:00', '23:00']],
]

/** Um instante em São Paulo (UTC−3, sem horário de verão desde 2019). */
function emSP(data: string, hhmm: string): Date {
  return new Date(`${data}T${hhmm}:00-03:00`)
}

// 2026-09-21 é uma segunda-feira.
const SEGUNDA = '2026-09-21'
const datasDaSemana = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(`${SEGUNDA}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + i)
  return d.toISOString().slice(0, 10)
})

describe('relógio de São Paulo', () => {
  it('converte o instante para dia, minuto e data locais', () => {
    expect(agoraEmSaoPaulo(emSP(SEGUNDA, '09:30'))).toEqual({
      dia: 1,
      minutos: 570,
      data: SEGUNDA,
    })
  })

  it('usa o fuso de SP, não o do visitante: 01h UTC de terça ainda é segunda', () => {
    expect(agoraEmSaoPaulo(new Date('2026-09-22T01:00:00Z'))).toMatchObject({
      dia: 1,
      minutos: 22 * 60,
      data: SEGUNDA,
    })
  })

  it('meia-noite é minuto 0 (e não 1440)', () => {
    expect(agoraEmSaoPaulo(emSP(SEGUNDA, '00:00')).minutos).toBe(0)
  })
})

describe('formatação', () => {
  it.each([
    ['08:00', '8h'],
    ['12:00', '12h'],
    ['14:30', '14h30'],
    ['00:00', '0h'],
  ])('%s → %s', (entrada, saida) => {
    expect(porExtenso(entrada)).toBe(saida)
  })

  it('minutos e HH:MM são inversos', () => {
    for (let m = 0; m < 24 * 60; m++) expect(emMinutos(deMinutos(m))).toBe(m)
  })

  it('turnos por extenso', () => {
    expect(turnosPorExtenso(DOIS_TURNOS[1])).toBe('12h–15h e 18h–23h')
    expect(turnosPorExtenso([])).toBe('Fechado')
  })
})

describe('estado — todas as combinações de dia e minuto', () => {
  for (const [nome, semana] of [
    ['dois turnos', DOIS_TURNOS],
    ['fecha segunda', FECHA_SEGUNDA],
  ] as const) {
    it(`${nome}: aberto exatamente dentro de um turno, e rótulo sempre coerente`, () => {
      for (const data of datasDaSemana) {
        for (let m = 0; m < 24 * 60; m++) {
          const estado = estadoDa(semana, emSP(data, deMinutos(m)))
          const dia = new Date(`${data}T12:00:00Z`).getUTCDay()
          const dentro = semana[dia].some(([a, f]) => m >= emMinutos(a) && m < emMinutos(f))

          expect(estado.aberto).toBe(dentro)
          expect(estado.rotulo).not.toMatch(/undefined|NaN/)
          if (estado.aberto) {
            expect(estado.rotulo).toMatch(/^Aberto · até \d{1,2}h(\d{2})?$/)
            expect(estado.fechaEm).toBeGreaterThan(0)
          } else {
            expect(estado.rotulo).toMatch(/^Abre /)
            expect(estado.fechaEm).toBeUndefined()
          }
        }
      }
    })
  }

  it('no intervalo da tarde aponta o jantar do mesmo dia', () => {
    expect(estadoDa(DOIS_TURNOS, emSP(SEGUNDA, '16:10')).rotulo).toBe('Abre às 18h')
  })

  it('o fechamento é exclusivo: às 15h em ponto já fechou', () => {
    expect(estadoDa(DOIS_TURNOS, emSP(SEGUNDA, '14:59')).aberto).toBe(true)
    expect(estadoDa(DOIS_TURNOS, emSP(SEGUNDA, '15:00')).aberto).toBe(false)
  })

  it('depois do último turno aponta amanhã', () => {
    expect(estadoDa(DOIS_TURNOS, emSP(SEGUNDA, '23:30')).rotulo).toBe('Abre amanhã às 12h')
  })

  it('pula o dia fechado e diz o nome do dia', () => {
    // Domingo 22h → segunda fechada → terça 18h.
    expect(estadoDa(FECHA_SEGUNDA, emSP('2026-09-27', '22:30')).rotulo).toBe('Abre terça às 18h')
  })

  it('semana toda fechada não quebra', () => {
    expect(estadoDa([[], [], [], [], [], [], []]).rotulo).toBe('Horário a confirmar')
  })
})

describe('resumo da semana', () => {
  it('agrupa seg a sex e junta sáb e dom com "e"', () => {
    expect(resumoDaSemana(DOIS_TURNOS)).toEqual([
      { dias: 'Seg a sex', horario: '12h–15h e 18h–23h' },
      { dias: 'Sáb e dom', horario: '12h–23h' },
    ])
  })

  it('mostra o dia fechado', () => {
    expect(resumoDaSemana(FECHA_SEGUNDA)).toEqual([
      { dias: 'Seg', horario: 'Fechado' },
      { dias: 'Ter a qui', horario: '18h–22h' },
      { dias: 'Sex', horario: '18h–23h' },
      { dias: 'Sáb', horario: '12h–23h' },
      { dias: 'Dom', horario: '12h–22h' },
    ])
  })

  it('todos os dias iguais viram uma linha só', () => {
    const igual: Semana = Array.from({ length: 7 }, () => [['11:00', '22:00']] as const)
    expect(resumoDaSemana(igual)).toEqual([{ dias: 'Seg a dom', horario: '11h–22h' }])
  })
})

describe('schema.org', () => {
  it('uma entrada por turno, nenhuma para dia fechado', () => {
    const spec = especificacaoDeHorario(FECHA_SEGUNDA)
    expect(spec).toHaveLength(6)
    expect(spec.some((s) => s.dayOfWeek.endsWith('Monday'))).toBe(false)
  })

  it('dois turnos no mesmo dia geram duas entradas', () => {
    const segundas = especificacaoDeHorario(DOIS_TURNOS).filter((s) =>
      s.dayOfWeek.endsWith('Monday'),
    )
    expect(segundas.map((s) => [s.opens, s.closes])).toEqual([
      ['12:00', '15:00'],
      ['18:00', '23:00'],
    ])
  })
})

describe('a grade real da casa (18h–23h, todos os dias)', () => {
  it('fechada à tarde, aberta à noite, e o rótulo aponta a hora certa', () => {
    expect(estadoDa(CASA.semana, emSP(SEGUNDA, '15:00')).rotulo).toBe('Abre às 18h')
    expect(estadoDa(CASA.semana, emSP(SEGUNDA, '19:30'))).toMatchObject({
      aberto: true,
      rotulo: 'Aberto · até 23h',
    })
    expect(estadoDa(CASA.semana, emSP(SEGUNDA, '23:00')).rotulo).toBe('Abre amanhã às 18h')
  })

  it('o resumo é uma linha só', () => {
    expect(resumoDaSemana(CASA.semana)).toEqual([{ dias: 'Seg a dom', horario: '18h–23h' }])
  })
})
