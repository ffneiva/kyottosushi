/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { KANJI_USADOS, NUMERAIS, TERMOS } from '@/lib/kanji'

/**
 * A fonte japonesa servida tem só os glifos de KANJI_USADOS. Um caractere
 * fora dela aparece em fonte do sistema — outro desenho, no meio de uma
 * composição cuidada, e em alguns aparelhos um quadradinho vazio.
 */
const JAPONES = /[぀-ヿ㐀-鿿]/g

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(path.join(dir, e.name)) : [path.join(dir, e.name)],
  )
}

describe('kanji', () => {
  it('todo termo e numeral está na fonte recortada', () => {
    const usados = new Set(KANJI_USADOS)
    const textos = [...Object.values(TERMOS).map((t) => t.ja), ...NUMERAIS]
    for (const texto of textos) {
      for (const ch of texto) expect(usados.has(ch), `falta "${ch}" (de ${texto})`).toBe(true)
    }
  })

  it('nenhum arquivo de src/ escreve japonês fora de kanji.ts', () => {
    // Japonês solto num componente escaparia da checagem acima — e do lang="ja".
    const raiz = path.resolve(import.meta.dirname, '../../src')
    for (const arquivo of arquivos(raiz)) {
      if (/kanji\.ts$/.test(arquivo) || !/\.(tsx?|css)$/.test(arquivo)) continue
      const achados = readFileSync(arquivo, 'utf8').match(JAPONES)
      expect(achados, path.relative(raiz, arquivo)).toBeNull()
    }
  })

  it('todo termo tem leitura e sentido', () => {
    for (const [chave, termo] of Object.entries(TERMOS)) {
      expect(termo.leitura.length, chave).toBeGreaterThan(1)
      expect(termo.sentido.length, chave).toBeGreaterThan(2)
    }
  })
})
