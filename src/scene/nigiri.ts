import * as THREE from 'three'

/**
 * O nigiri de salmão — a peça 3D do site, inteira em código.
 *
 * O prato que o gato do selo da casa segura, e o símbolo de qualquer sushi. Nada
 * aqui é baixado: nenhum `.glb`, nenhum HDRI, nenhuma textura em arquivo. Cada
 * parte tem uma decisão por trás:
 *
 * 1. **Arroz de grão em grão.** Um bolinho liso lê como massinha. São algumas
 *    centenas de cápsulas num único `InstancedMesh` — uma chamada de desenho —,
 *    distribuídas dentro de um elipsoide achatado, cada uma com giro e tom
 *    próprios. É o que faz a peça ser reconhecida como sushi a um metro da
 *    tela.
 *
 * 2. **Veios de gordura desenhados em canvas.** As faixas claras do salmão são
 *    o detalhe pelo qual o olho identifica o peixe. Elas saem de um canvas 2D
 *    — curvas diagonais deformadas por ruído — que vira `map` e `roughnessMap`
 *    ao mesmo tempo: a gordura é mais clara E mais brilhante que a carne, como
 *    na peça real.
 *
 * 3. **A fatia pousa.** Na entrada o salmão desce reto e se curva sobre o
 *    arroz — a curvatura é um uniforme do vertex shader, animado de 0 a 1. É o
 *    gesto do itamae, em um segundo.
 *
 * 4. **Estúdio cozido em código.** Uma
 *    cena auxiliar de retângulos emissivos passa pelo `PMREMGenerator` e vira o
 *    environment map. Sem ele, o brilho úmido do peixe (o `clearcoat`) não
 *    teria o que refletir e o salmão pareceria de plástico fosco.
 *
 * 5. **Sombra de contato falsa.** Sombra em tempo real custaria um passe de
 *    render a mais por quadro; uma textura radial borrada sob cada objeto
 *    resolve a leitura de "apoiado na ardósia" por uma fração do custo.
 */

export type OpcoesCena = {
  /** Celular: menos grãos, sem antisserrilhado, resolução reduzida. */
  compacto: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Ruído determinístico — a mesma peça em toda visita
// ─────────────────────────────────────────────────────────────────────────────

/** Gerador pseudoaleatório com semente (mulberry32). */
function aleatorio(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Estúdio
// ─────────────────────────────────────────────────────────────────────────────

type Softbox = {
  pos: [number, number, number]
  escala: [number, number]
  intensidade: number
  cor: string
}

/**
 * Luz de restaurante, não de joalheria: uma key quente e larga por cima (a
 * luminária do balcão), um rim frio atrás para recortar a silhueta e
 * preenchimentos baixos. As intensidades são altas de propósito — o reflexo
 * no clearcoat do peixe só aparece se houver o que refletir.
 */
const SOFTBOXES: Softbox[] = [
  { pos: [0, 6, 2.5], escala: [9, 3.2], intensidade: 7, cor: '#fff1dc' },
  { pos: [-5, 2, -4], escala: [6, 6], intensidade: 4.5, cor: '#d9e6ff' },
  { pos: [5.5, 1.5, 3], escala: [4, 6], intensidade: 3.2, cor: '#ffd9b8' },
  { pos: [0, 1, 7], escala: [12, 4], intensidade: 1.6, cor: '#f6e6d2' },
  { pos: [0, -4, 0], escala: [12, 12], intensidade: 0.5, cor: '#5c4a3a' },
]

function montarAmbiente(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const estudio = new THREE.Scene()
  estudio.background = new THREE.Color('#17120f')
  const descartar: Array<{ dispose(): void }> = []

  for (const box of SOFTBOXES) {
    const geo = new THREE.PlaneGeometry(...box.escala)
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(box.cor).multiplyScalar(box.intensidade),
      side: THREE.DoubleSide,
    })
    const malha = new THREE.Mesh(geo, mat)
    malha.position.set(...box.pos)
    malha.lookAt(0, 0, 0)
    estudio.add(malha)
    descartar.push(geo, mat)
  }

  const alvo = pmrem.fromScene(estudio, 0.04)
  pmrem.dispose()
  for (const d of descartar) d.dispose()
  return alvo.texture
}

// ─────────────────────────────────────────────────────────────────────────────
// Texturas procedurais
// ─────────────────────────────────────────────────────────────────────────────

/**
 * As faixas do salmão.
 *
 * Desenhadas em 2D como curvas de Bézier diagonais, com espessura e espaçamento
 * irregulares — num salmão real os miossepto (as linhas brancas) não são
 * paralelos: abrem em leque a partir da espinha. O leque aqui é o `abertura`
 * que cresce ao longo do eixo.
 *
 * Devolve duas texturas do mesmo desenho: cor e rugosidade. Na rugosidade a
 * gordura é escura (lisa, brilhante) e a carne clara (fosca).
 */
function texturasDoSalmao(tamanho: number) {
  const sorte = aleatorio(7)
  const largura = tamanho
  const altura = tamanho / 2

  const cor = document.createElement('canvas')
  cor.width = largura
  cor.height = altura
  const c = cor.getContext('2d')!

  const rug = document.createElement('canvas')
  rug.width = largura
  rug.height = altura
  const r = rug.getContext('2d')!

  // Carne: degradê do laranja profundo (centro, mais espesso) ao coral nas
  // bordas, onde a fatia é mais fina e deixa passar luz.
  const carne = c.createLinearGradient(0, 0, 0, altura)
  carne.addColorStop(0, '#f47b4c')
  carne.addColorStop(0.5, '#e8582b')
  carne.addColorStop(1, '#f2764a')
  c.fillStyle = carne
  c.fillRect(0, 0, largura, altura)
  r.fillStyle = '#9a9a9a'
  r.fillRect(0, 0, largura, altura)

  // Granulação da carne: pontos minúsculos em tons próximos.
  for (let i = 0; i < 2600; i++) {
    const x = sorte() * largura
    const y = sorte() * altura
    c.fillStyle = sorte() > 0.5 ? 'rgba(255,150,110,0.10)' : 'rgba(170,50,20,0.10)'
    c.fillRect(x, y, 2 + sorte() * 3, 1 + sorte() * 2)
  }

  const faixas = 11
  for (let i = 0; i < faixas; i++) {
    const t = (i + 0.3 + sorte() * 0.4) / faixas
    const x0 = t * largura * 1.25 - largura * 0.12
    const abertura = 0.18 + t * 0.22
    const espessura = (0.012 + sorte() * 0.012) * largura

    const desenhar = (ctx: CanvasRenderingContext2D, estilo: string, blur: number) => {
      ctx.save()
      ctx.filter = `blur(${blur}px)`
      ctx.strokeStyle = estilo
      ctx.lineWidth = espessura
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x0, -10)
      ctx.bezierCurveTo(
        x0 - largura * abertura * 0.4,
        altura * 0.35,
        x0 - largura * abertura * 0.1 + (sorte() - 0.5) * 40,
        altura * 0.7,
        x0 - largura * abertura,
        altura + 10,
      )
      ctx.stroke()
      ctx.restore()
    }

    desenhar(c, 'rgba(255, 214, 190, 0.78)', 3)
    desenhar(c, 'rgba(255, 238, 222, 0.4)', 0.8)
    desenhar(r, 'rgba(40, 40, 40, 1)', 3)
  }

  const map = new THREE.CanvasTexture(cor)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  const roughnessMap = new THREE.CanvasTexture(rug)
  return { map, roughnessMap }
}

/** Ardósia: preto quente com veios quase invisíveis. */
function texturaDaArdosia(tamanho: number) {
  const sorte = aleatorio(21)
  const canvas = document.createElement('canvas')
  canvas.width = tamanho
  canvas.height = tamanho
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1b1917'
  ctx.fillRect(0, 0, tamanho, tamanho)
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(${sorte() > 0.5 ? '255,255,255' : '0,0,0'},${0.015 + sorte() * 0.03})`
    ctx.lineWidth = 1 + sorte() * 5
    ctx.beginPath()
    const y = sorte() * tamanho
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(
      tamanho * 0.3,
      y + (sorte() - 0.5) * 60,
      tamanho * 0.6,
      y + (sorte() - 0.5) * 60,
      tamanho,
      y + (sorte() - 0.5) * 40,
    )
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Mancha radial borrada — a sombra de contato. */
function texturaDeSombra() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.85)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

// ─────────────────────────────────────────────────────────────────────────────
// Peças
// ─────────────────────────────────────────────────────────────────────────────

/** Dimensões do bolinho de arroz (semi-eixos do elipsoide). */
const ARROZ = { x: 0.98, y: 0.36, z: 0.47 }

function montarArroz(quantidade: number) {
  const sorte = aleatorio(3)
  const grao = new THREE.CapsuleGeometry(0.04, 0.085, 3, 6)
  const material = new THREE.MeshPhysicalMaterial({
    color: '#f7f3ea',
    roughness: 0.42,
    sheen: 0.6,
    sheenColor: new THREE.Color('#ffffff'),
    // Um grão cozido é translúcido nas bordas. `transmission` de verdade
    // exigiria um passe extra; o emissivo baixo imita o espalhamento de luz
    // sem custo — o arroz nunca fica cinza na sombra.
    emissive: new THREE.Color('#3a342a'),
  })
  /**
   * Os grãos fogem do ponteiro.
   *
   * O deslocamento é feito no vertex shader, por instância: cada grão lê o
   * próprio centro na `instanceMatrix`, mede a distância até o ponto tocado e
   * se afasta (e quica) na proporção de `uForca`. Mil e cem grãos animados
   * sem uma linha de JavaScript por grão — a CPU só atualiza três uniformes.
   */
  const uniforms = {
    uPonto: { value: new THREE.Vector3(0, 99, 0) },
    uForca: { value: 0 },
    uTempo: { value: 0 },
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uPonto;
        uniform float uForca;
        uniform float uTempo;`,
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          vec3 centro = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 fuga = centro - uPonto;
          float perto = uForca * smoothstep(0.6, 0.0, length(fuga));
          float pulo = abs(sin(uTempo * 13.0 + centro.x * 37.0 + centro.z * 51.0));
          mvPosition.xyz += normalize(fuga + vec3(0.0, 0.0001, 0.0)) * perto * (0.14 + 0.07 * pulo);
          mvPosition.y += perto * 0.12 * pulo;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `,
      )
  }

  const malha = new THREE.InstancedMesh(grao, material, quantidade)
  const matriz = new THREE.Matrix4()
  const posicao = new THREE.Vector3()
  const giro = new THREE.Quaternion()
  const euler = new THREE.Euler()
  const escala = new THREE.Vector3()
  const cor = new THREE.Color()

  let colocados = 0
  let tentativas = 0
  while (colocados < quantidade && tentativas < quantidade * 20) {
    tentativas++
    // Ponto dentro do elipsoide, com a base achatada: o nigiri é apoiado, não
    // uma bola. Grãos preferem a casca (raio ≥ 0.72), que é o que se vê.
    const x = (sorte() * 2 - 1) * ARROZ.x
    const y = sorte() * ARROZ.y * 2 - ARROZ.y * 0.35
    const z = (sorte() * 2 - 1) * ARROZ.z
    const d = (x / ARROZ.x) ** 2 + (y / ARROZ.y) ** 2 + (z / ARROZ.z) ** 2
    if (d > 1 || d < 0.3 || y < -ARROZ.y * 0.35) continue

    posicao.set(x, y + ARROZ.y * 0.35, z)
    euler.set(sorte() * Math.PI, sorte() * Math.PI, sorte() * Math.PI)
    giro.setFromEuler(euler)
    const s = 0.85 + sorte() * 0.35
    escala.set(s, s, s)
    matriz.compose(posicao, giro, escala)
    malha.setMatrixAt(colocados, matriz)
    malha.setColorAt(colocados, cor.setHSL(0.11, 0.25, 0.9 + sorte() * 0.08))
    colocados++
  }
  malha.count = colocados
  return { malha, uniforms }
}

/**
 * A fatia: uma caixa fina, muito subdividida, que o vertex shader dobra.
 *
 * `uDobra` vai de 0 (fatia reta, no ar) a 1 (assentada sobre o arroz). A
 * curvatura é uma parábola no comprimento e uma leve calha na largura, e as
 * pontas afinam — a lâmina da faca corta em diagonal, e a fatia é mais fina
 * nas extremidades.
 */
function montarSalmao(texturas: { map: THREE.Texture; roughnessMap: THREE.Texture }) {
  const comprimento = 2.55
  const largura = 1.22
  const geo = new THREE.BoxGeometry(comprimento, 0.2, largura, 72, 2, 28)

  // Bordas arredondadas no plano: afina a espessura perto do contorno.
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (comprimento / 2)
    const z = pos.getZ(i) / (largura / 2)
    const borda = Math.max(Math.abs(x) ** 3, Math.abs(z) ** 4)
    const afinar = 1 - 0.55 * borda
    pos.setY(i, pos.getY(i) * afinar + (pos.getY(i) > 0 ? -0.01 * borda : 0))
    // Contorno ligeiramente oval, e não retangular.
    pos.setZ(i, pos.getZ(i) * (1 - 0.18 * Math.abs(x) ** 2.4))
  }
  geo.computeVertexNormals()

  const material = new THREE.MeshPhysicalMaterial({
    map: texturas.map,
    roughnessMap: texturas.roughnessMap,
    roughness: 0.55,
    // A película úmida do peixe fresco: reflexo fino por cima da cor.
    clearcoat: 0.9,
    clearcoatRoughness: 0.22,
    sheen: 0.35,
    sheenColor: new THREE.Color('#ffb08a'),
    emissive: new THREE.Color('#5a1405'),
  })

  const uniforms = { uDobra: { value: 0 }, uOnda: { value: 0 }, uTempo: { value: 0 } }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uDobra;
        uniform float uOnda;
        uniform float uTempo;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        vec3 transformed = vec3(position);
        float u = position.x / ${(comprimento / 2).toFixed(3)};
        float w = position.z / ${(largura / 2).toFixed(3)};
        // Parábola ao longo do comprimento + calha na largura.
        transformed.y -= uDobra * (0.36 * u * u + 0.1 * w * w);
        // As pontas descem um pouco além do arroz, como numa peça de verdade.
        transformed.y -= uDobra * 0.14 * pow(abs(u), 6.0);
        // Com o ponteiro em cima, a fatia ondula — mais nas pontas, que são
        // finas, do que no meio, que está apoiado no arroz.
        transformed.y += uOnda * 0.07 * sin(u * 6.5 - uTempo * 5.5) * (0.35 + 0.65 * abs(u));
        `,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        vec3 objectNormal = vec3(normal);
        float un = position.x / ${(comprimento / 2).toFixed(3)};
        float wn = position.z / ${(largura / 2).toFixed(3)};
        // Normal da superfície dobrada: derivada da parábola.
        objectNormal = normalize(objectNormal + vec3(
          uDobra * 0.72 * un / ${(comprimento / 2).toFixed(3)},
          0.0,
          uDobra * 0.2 * wn / ${(largura / 2).toFixed(3)}
        ) * step(0.5, abs(normal.y)));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
        `,
      )
  }

  const malha = new THREE.Mesh(geo, material)
  return { malha, uniforms }
}

function montarArdosia(compacto: boolean) {
  const forma = new THREE.Shape()
  const l = 2.5
  const a = 1.35
  const raio = 0.12
  forma.moveTo(-l + raio, -a)
  forma.lineTo(l - raio, -a)
  forma.quadraticCurveTo(l, -a, l, -a + raio)
  forma.lineTo(l, a - raio)
  forma.quadraticCurveTo(l, a, l - raio, a)
  forma.lineTo(-l + raio, a)
  forma.quadraticCurveTo(-l, a, -l, a - raio)
  forma.lineTo(-l, -a + raio)
  forma.quadraticCurveTo(-l, -a, -l + raio, -a)

  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 6,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -0.16, 0)

  const material = new THREE.MeshStandardMaterial({
    map: texturaDaArdosia(compacto ? 512 : 1024),
    roughness: 0.82,
    metalness: 0.05,
  })
  return new THREE.Mesh(geo, material)
}

/** O par de hashi, de hinoki, apoiado num hashioki de cerâmica. */
function montarHashi() {
  const grupo = new THREE.Group()
  const madeira = new THREE.MeshStandardMaterial({ color: '#d7b98c', roughness: 0.62 })
  // Ponta mais fina que o cabo — hashi japonês afina bem mais que o chinês.
  const geo = new THREE.CylinderGeometry(0.038, 0.012, 3.3, 12, 1)
  geo.rotateZ(Math.PI / 2)

  // O cabo (a ponta grossa) fica em x = −1,65: o cilindro afina para +y, e
  // o rotateZ leva +y para −x. O palito de cima gira em torno do cabo, e não
  // do meio — é assim que a mão abre o hashi, com as pontas se afastando.
  const palitos = new THREE.Group()
  const a = new THREE.Mesh(geo, madeira)
  const pivoB = new THREE.Group()
  const b = new THREE.Mesh(geo, madeira)
  pivoB.position.set(-1.65, 0, 0)
  b.position.set(1.7, 0.1, 0.13)
  b.rotation.y = 0.03
  pivoB.add(b)
  a.position.set(0, 0.1, 0)
  palitos.add(a, pivoB)
  grupo.add(palitos)

  const ceramica = new THREE.MeshPhysicalMaterial({
    color: '#2b3a4a',
    roughness: 0.25,
    clearcoat: 1,
  })
  const hashioki = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 10), ceramica)
  hashioki.rotation.x = Math.PI / 2
  hashioki.position.set(1.15, 0.02, 0.07)
  grupo.add(hashioki)

  // Palitos de 1 cm de espessura são quase impossíveis de acertar com o
  // mouse: um alvo invisível do tamanho do par (com folga) recebe o raio.
  const alvo = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.35, 0.55),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  alvo.position.set(0, 0.1, 0.07)
  grupo.add(alvo)

  return { grupo, palitos, pivoB, alvo }
}

// ─────────────────────────────────────────────────────────────────────────────
// A cena
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Câmera alta, a três quartos: a vista de quem está sentado ao balcão e olha
 * o prato chegar. Mais baixa, a fatia esconde o próprio desenho (os veios
 * ficam de perfil); mais alta, vira foto de cardápio chapada.
 */
const CAMERA = { y: 5.6, z: 6.9, alvo: 0.15 }

/** Duração da entrada: o salmão desce e se assenta. */
const ENTRADA_S = 1.6

function suavizar(t: number) {
  // easeOutBack com retorno curto: a fatia "assenta" com um leve rebote.
  const c1 = 1.2
  const c3 = c1 + 1
  const x = Math.min(1, Math.max(0, t))
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
}

/** As peças que respondem ao ponteiro. */
export type Peca = 'salmao' | 'arroz' | 'hashi'

/** O nome que o cursor mostra sobre cada peça. */
const ROTULO_DA_PECA: Record<Peca, string> = {
  salmao: 'Salmão',
  arroz: 'Arroz',
  hashi: 'Hashi',
}

/**
 * Avisa o cursor do site sobre a peça sob o ponteiro.
 *
 * O canvas fica atrás do texto e não recebe eventos (`pointer-events: none`,
 * para não roubar clique de link), então o <Cursor> não enxerga a peça pelo
 * DOM. A cena conta por um evento na window, e só quando a peça muda.
 */
function avisarCursor(peca: Peca | null) {
  window.dispatchEvent(
    new CustomEvent('kyotto:peca', { detail: peca ? ROTULO_DA_PECA[peca] : null }),
  )
}

const amortecer = (atual: number, alvo: number, k: number) => atual + (alvo - atual) * k

type UniformesSalmao = {
  uDobra: { value: number }
  uOnda: { value: number }
  uTempo: { value: number }
}
type UniformesArroz = {
  uPonto: { value: THREE.Vector3 }
  uForca: { value: number }
  uTempo: { value: number }
}

export class CenaNigiri {
  private renderer: THREE.WebGLRenderer
  private canvas: HTMLCanvasElement
  private cena = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60)
  private relogio = new THREE.Timer()
  private raiz = new THREE.Group()
  private peca = new THREE.Group()
  private salmao: THREE.Mesh
  private uSalmao: UniformesSalmao
  private uArroz: UniformesArroz
  private arrozAlvo: THREE.Mesh
  private hashi: { grupo: THREE.Group; palitos: THREE.Group; pivoB: THREE.Group; alvo: THREE.Mesh }
  private brilho: THREE.PointLight
  private aura: THREE.PointLight
  private raycaster = new THREE.Raycaster()
  private descartaveis: Array<{ dispose(): void }> = []
  private quadro = 0
  private rodando = false
  private inicio = -1
  /** Ponteiro na janela, em pixels — o canvas é medido a cada quadro. */
  private cliente = { x: -1, y: -1 }
  private ponteiro = { x: 0, y: 0 }
  private suave = { x: 0, y: 0 }
  private rolagem = 0
  private compacto: boolean
  private sobre: Peca | null = null
  /** Quanto cada peça está "acesa", de 0 a 1, amortecido. */
  private foco: Record<Peca, number> = { salmao: 0, arroz: 0, hashi: 0 }
  /** Impulsos de clique, que decaem sozinhos. */
  private impulso: Record<Peca, number> = { salmao: 0, arroz: 0, hashi: 0 }
  private pontoArroz = new THREE.Vector3(0, 99, 0)

  constructor(canvas: HTMLCanvasElement, { compacto }: OpcoesCena) {
    this.compacto = compacto
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !compacto,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, compacto ? 1.25 : 1.75))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const ambiente = montarAmbiente(this.renderer)
    this.cena.environment = ambiente
    this.descartaveis.push(ambiente)

    // Uma luz direcional só para dar direção ao realce — o grosso vem do
    // environment map.
    const key = new THREE.DirectionalLight('#fff0dc', 1.6)
    key.position.set(-2, 5, 3)
    this.cena.add(key)

    // O brilho que segue o ponteiro: acende sobre a peça tocada e desliza pela
    // superfície. É o que faz o clearcoat do salmão "molhar" sob o mouse.
    this.brilho = new THREE.PointLight('#ffd9b0', 0, 3.2, 2)
    this.cena.add(this.brilho)
    // A aura vermelha — o sol atrás do gato, no selo da casa. Fica atrás e
    // acima da peça, e acende com o foco: aparece como um contorno vermelho
    // no verniz do salmão e no arroz.
    this.aura = new THREE.PointLight('#ff2d1f', 0, 7, 1.6)
    this.aura.position.set(0.2, 1.6, -1.8)
    this.cena.add(this.aura)

    const arroz = montarArroz(compacto ? 520 : 1100)
    this.uArroz = arroz.uniforms
    const texturas = texturasDoSalmao(compacto ? 512 : 1024)
    const { malha, uniforms } = montarSalmao(texturas)
    this.salmao = malha
    this.uSalmao = uniforms
    malha.position.y = ARROZ.y * 2 + 0.2

    // O raycast contra 1.100 instâncias custaria caro a cada quadro; contra um
    // elipsoide invisível do tamanho do bolinho, custa um teste.
    this.arrozAlvo = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    this.arrozAlvo.scale.set(ARROZ.x, ARROZ.y, ARROZ.z)
    this.arrozAlvo.position.y = ARROZ.y * 0.5

    this.peca.add(arroz.malha, malha, this.arrozAlvo)
    // Em diagonal: de frente, o nigiri vira um retângulo; a três quartos, ele
    // mostra a curva da fatia e a lateral do arroz ao mesmo tempo.
    this.peca.rotation.y = -0.46

    const ardosia = montarArdosia(compacto)
    this.hashi = montarHashi()
    this.hashi.grupo.position.set(0.1, -0.02, 1.2)
    this.hashi.grupo.rotation.y = 0.06

    const sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.6),
      new THREE.MeshBasicMaterial({
        map: texturaDeSombra(),
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      }),
    )
    sombra.rotation.x = -Math.PI / 2
    sombra.position.y = 0.005

    this.raiz.add(ardosia, sombra, this.peca, this.hashi.grupo)
    this.raiz.rotation.x = 0.05
    this.cena.add(this.raiz)

    this.camera.position.set(0, CAMERA.y, CAMERA.z)
    this.camera.lookAt(0, CAMERA.alvo, 0)

    this.cena.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        this.descartaveis.push(obj.geometry)
        const materiais = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of materiais) {
          this.descartaveis.push(m)
          for (const valor of Object.values(m)) {
            if (valor instanceof THREE.Texture) this.descartaveis.push(valor)
          }
        }
      }
    })

    window.addEventListener('pointermove', this.aoMover, { passive: true })
    window.addEventListener('pointerdown', this.aoTocar, { passive: true })
  }

  private aoMover = (e: PointerEvent) => {
    this.ponteiro.x = (e.clientX / window.innerWidth) * 2 - 1
    this.ponteiro.y = (e.clientY / window.innerHeight) * 2 - 1
    this.cliente.x = e.clientX
    this.cliente.y = e.clientY
  }

  /**
   * Toque ou clique sobre uma peça dispara o gesto dela.
   *
   * Clique em link ou botão é do site, não da cena: se o alvo do evento for
   * interativo, a cena ignora — senão "Pedir agora" também faria o salmão
   * pular.
   */
  private aoTocar = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest('a, button, input, label, [role="button"]')) return
    this.cliente.x = e.clientX
    this.cliente.y = e.clientY
    const peca = this.pecaSobPonteiro()
    if (!peca) return
    this.impulso[peca] = 1
    // O salmão repete a entrada: sobe e pousa de novo sobre o arroz.
    if (peca === 'salmao') this.inicio = this.relogio.getElapsed() - ENTRADA_S * 0.18
  }

  /** A peça sob o ponteiro, ou null. Atualiza o ponto tocado no arroz e o brilho. */
  private pecaSobPonteiro(): Peca | null {
    const caixa = this.canvas.getBoundingClientRect()
    const { x, y } = this.cliente
    if (x < caixa.left || x > caixa.right || y < caixa.top || y > caixa.bottom) return null

    const ndc = new THREE.Vector2(
      ((x - caixa.left) / caixa.width) * 2 - 1,
      -((y - caixa.top) / caixa.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const alvos = [this.salmao, this.arrozAlvo, this.hashi.alvo]
    const [acerto] = this.raycaster.intersectObjects(alvos, true)
    if (!acerto) return null

    // O brilho vai para um pouco acima do ponto tocado, na direção da câmera.
    this.brilho.position.copy(acerto.point).addScaledVector(this.raycaster.ray.direction, -0.55)

    if (acerto.object === this.salmao) return 'salmao'
    if (acerto.object === this.arrozAlvo) {
      // O ponto no espaço do bolinho, que é o espaço das instâncias do arroz.
      this.pontoArroz.copy(acerto.point)
      this.peca.worldToLocal(this.pontoArroz)
      return 'arroz'
    }
    return 'hashi'
  }

  /** Progresso da rolagem sobre o herói, de 0 (topo) a 1 (herói saiu). */
  definirRolagem(valor: number) {
    this.rolagem = valor
  }

  redimensionar(largura: number, altura: number) {
    this.renderer.setSize(largura, altura, false)
    this.camera.aspect = largura / altura
    // Em tela estreita a peça precisa caber na largura, não na altura: afasta
    // a câmera em vez de deixar o arroz vazar pelas bordas.
    const afastar = this.camera.aspect < 1 ? 1 + (1 - this.camera.aspect) * 1.1 : 1
    this.camera.position.set(0, CAMERA.y * afastar, CAMERA.z * afastar)
    this.camera.lookAt(0, CAMERA.alvo, 0)
    this.camera.updateProjectionMatrix()
  }

  iniciar() {
    if (this.rodando) return
    this.rodando = true
    // Sem isto, o tempo parado durante a pausa entraria inteiro no primeiro
    // delta da volta e a peça daria um salto.
    this.relogio.reset()
    const passo = (agora: number) => {
      if (!this.rodando) return
      this.relogio.update(agora)
      this.desenhar()
      this.quadro = requestAnimationFrame(passo)
    }
    this.quadro = requestAnimationFrame(passo)
  }

  pausar() {
    this.rodando = false
    cancelAnimationFrame(this.quadro)
    if (this.sobre) {
      this.sobre = null
      avisarCursor(null)
    }
  }

  private desenhar() {
    const delta = Math.min(this.relogio.getDelta(), 0.05)
    const t = this.relogio.getElapsed()
    if (this.inicio < 0) this.inicio = t

    // Hover — só com ponteiro fino; no toque, quem manda é o `aoTocar`.
    const agora = this.compacto ? null : this.pecaSobPonteiro()
    if (agora !== this.sobre) {
      this.sobre = agora
      avisarCursor(agora)
    }
    const kFoco = 1 - 0.0008 ** delta
    const kImpulso = 1 - 0.02 ** delta
    for (const p of ['salmao', 'arroz', 'hashi'] as const) {
      this.foco[p] = amortecer(this.foco[p], agora === p ? 1 : 0, kFoco)
      this.impulso[p] = amortecer(this.impulso[p], 0, kImpulso)
    }

    // Entrada (e o replay do clique): a fatia desce e se curva sobre o arroz.
    const e = suavizar((t - this.inicio) / ENTRADA_S)
    const assentado = ARROZ.y * 1.35 + 0.02
    this.salmao.position.y = assentado + (1 - e) * 1.4 + this.foco.salmao * 0.26
    this.uSalmao.uDobra.value = Math.min(1, Math.max(0, e)) - this.foco.salmao * 0.22
    this.salmao.scale.setScalar(1 + this.foco.salmao * 0.05)
    this.uSalmao.uOnda.value = this.foco.salmao
    this.uSalmao.uTempo.value = t

    // Arroz: os grãos fogem do ponto tocado; o clique é um estouro maior.
    if (agora === 'arroz' || this.impulso.arroz > 0.01) {
      this.uArroz.uPonto.value.copy(this.pontoArroz)
    }
    this.uArroz.uForca.value = this.foco.arroz * 1.5 + this.impulso.arroz * 3
    this.uArroz.uTempo.value = t

    // Hashi: erguem-se e abrem, como a mão que vai pegar a peça; o clique
    // fecha num pinçar rápido.
    const h = this.foco.hashi
    const pinca = Math.sin(this.impulso.hashi * Math.PI)
    // O palito de cima abre para o lado de quem olha (rotação negativa), e
    // não para dentro do prato, onde atravessaria a fatia.
    this.hashi.palitos.position.y = h * 0.34 + pinca * 0.12
    this.hashi.palitos.rotation.z = -h * 0.12
    this.hashi.pivoB.rotation.y = -h * 0.2 + pinca * 0.18

    // O brilho acende com qualquer peça sob o ponteiro.
    const aceso = Math.max(this.foco.salmao, this.foco.arroz, this.foco.hashi)
    this.brilho.intensity = aceso * 9
    this.aura.intensity = aceso * 14 + this.impulso.salmao * 10

    // Deriva lenta + ponteiro (ou órbita, sem ponteiro) + rolagem.
    const k = 1 - 0.02 ** delta
    const alvoX = this.compacto ? Math.sin(t * 0.35) * 0.4 : this.ponteiro.x
    const alvoY = this.compacto ? Math.cos(t * 0.27) * 0.25 : this.ponteiro.y
    this.suave.x += (alvoX - this.suave.x) * k
    this.suave.y += (alvoY - this.suave.y) * k

    // Com uma peça sob o ponteiro, o prato para de fugir do mouse: girar a
    // peça enquanto a pessoa tenta olhá-la seria tirar o prato da mão dela.
    const calma = 1 - aceso * 0.7
    this.raiz.rotation.y =
      (this.suave.x * 0.28 + Math.sin(t * 0.18) * 0.06) * calma + this.rolagem * 0.6
    this.raiz.rotation.x = 0.05 + this.suave.y * 0.07 * calma + this.rolagem * 0.18
    this.raiz.position.y = -this.rolagem * 0.6

    this.renderer.render(this.cena, this.camera)
  }

  destruir() {
    this.pausar()
    this.relogio.dispose()
    window.removeEventListener('pointermove', this.aoMover)
    window.removeEventListener('pointerdown', this.aoTocar)
    for (const d of new Set(this.descartaveis)) d.dispose()
    this.renderer.dispose()
  }
}
