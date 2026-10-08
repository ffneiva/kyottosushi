import { CASA } from '@/lib/business'
import { resumoDaSemana } from '@/lib/hours'
import { IconeInstagram, IconeSetaDiagonal, IconeWhatsApp } from './Icones'
import { Ja } from './Ja'
import { Letreiro, Selo } from './Logo'

/** O rodapé: tudo que se precisa para pedir, sem abrir mais nada. */
export function Footer() {
  return (
    <footer data-tema="escuro" className="relative overflow-hidden bg-sumi pt-24 pb-10 text-nevoa">
      <div className="container-x">
        <div className="flex flex-col gap-10 border-b border-risco pb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-5">
            <Selo tamanho={160} className="h-20 w-20" />
            <div>
              <Letreiro className="w-40 text-washi" titulo={CASA.nome} />
              <p className="mt-2 font-mono text-xs tracking-[0.2em] text-kin uppercase">
                {CASA.lema.join(' · ')}
              </p>
            </div>
          </div>
          <Ja termo="obrigado" className="text-3xl text-kin/50 lg:text-4xl" />
        </div>

        <div className="grid gap-10 py-14 text-sm leading-relaxed sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="rotulo mb-3 text-kin">Horário</p>
            {resumoDaSemana(CASA.semana).map((l) => (
              <p key={l.dias}>
                {l.dias} · <span className="tabular">{l.horario}</span>
              </p>
            ))}
          </div>
          <div>
            <p className="rotulo mb-3 text-kin">Entrega</p>
            <p>{CASA.regiao}</p>
            <p>Pedido mínimo de R$ {CASA.pedidoMinimo},00</p>
          </div>
          <div>
            <p className="rotulo mb-3 text-kin">Pagamento</p>
            {CASA.pagamento.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div>
            <p className="rotulo mb-3 text-kin">Pedidos</p>
            <a
              href={CASA.delivery}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 hover:text-washi"
            >
              App de pedidos <IconeSetaDiagonal className="h-3 w-3" />
            </a>
            <a
              href={`https://wa.me/${CASA.whatsapp}`}
              target="_blank"
              rel="noopener"
              className="mt-1 flex items-center gap-1.5 hover:text-washi"
            >
              <IconeWhatsApp className="h-4 w-4" /> {CASA.telefone}
            </a>
            <a
              href={`https://www.instagram.com/${CASA.instagram}/`}
              target="_blank"
              rel="noopener"
              className="mt-1 flex items-center gap-1.5 hover:text-washi"
            >
              <IconeInstagram className="h-4 w-4" /> @{CASA.instagram}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-risco pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="/cardapio" className="hover:text-washi">
              Cardápio
            </a>
            <a href="/#como-pedir" className="hover:text-washi">
              Como pedir
            </a>
            <a href="/politica-de-privacidade" className="hover:text-washi">
              Privacidade
            </a>
          </nav>
          <p className="text-xs text-cinza">
            © {new Date().getFullYear()} {CASA.nome} · {CASA.cidade}/{CASA.uf}
          </p>
        </div>
      </div>
    </footer>
  )
}
