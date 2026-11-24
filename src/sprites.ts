// Original hand-written SVG sprites (no external assets). Drawn at 2x and displayed at half size for crisp edges.
const O = '#2b1d14'; // outline
const sw = 'stroke="#2b1d14" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const grad = (id: string, a: string, b: string, vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

const shadow = (cx: number, cy: number, rx: number, ry = 14) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".28"/>`;

function flag(x: number, y: number, goblin: boolean) {
  const c = goblin ? '#b3262a' : '#2f9c55', emblem = goblin
    ? `<circle cx="${x + 17}" cy="${y + 11}" r="5" fill="#f1ead2"/><rect x="${x + 14}" y="${y + 14}" width="6" height="4" fill="#f1ead2"/>`
    : `<path d="M${x + 9} ${y + 12} l12 -4 l0 8 z" fill="#f5e663"/>`;
  return `<line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 44}" stroke="${O}" stroke-width="5"/><line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 44}" stroke="#8a6238" stroke-width="2.5"/>
    <path d="M${x + 2} ${y} q14 -5 28 2 q-6 10 0 20 q-14 -6 -28 -2 z" fill="${c}" ${sw}/>${emblem}`;
}

function hq(g: boolean) {
  const roofA = g ? '#7a5a8a' : '#e3b85a', roofB = g ? '#3f2c4e' : '#a8762c', wallA = g ? '#6e5038' : '#9c6a3c', wallB = g ? '#4a3424' : '#6d4526';
  const ornament = g
    ? `<circle cx="96" cy="118" r="13" fill="#efe6cc" ${sw}/><circle cx="91" cy="116" r="3" fill="${O}"/><circle cx="101" cy="116" r="3" fill="${O}"/><path d="M90 126h12" stroke="${O}" stroke-width="3"/>`
    : `<path d="M70 118 q26 -16 52 0 l18 4 q-6 8 -18 6 q-26 10 -52 -4 z" fill="#4c9a3f" ${sw}/><circle cx="84" cy="114" r="5" fill="#f5e663" stroke="${O}" stroke-width="2"/><circle cx="85" cy="114" r="2" fill="${O}"/><path d="M104 124 l3 5 l3 -5 l3 5 l3 -5 l3 5" fill="none" stroke="#fff" stroke-width="2"/>`;
  return svg(192, 224, `<defs>${grad('r', roofA, roofB)}${grad('w', wallA, wallB, false)}${grad('d', '#8b6a44', '#5a4026')}</defs>
    ${shadow(96, 202, 86, 18)}
    <rect x="14" y="166" width="164" height="34" rx="8" fill="url(#d)" ${sw}/>
    ${[40, 66, 92, 118, 144].map(x => `<line x1="${x}" y1="168" x2="${x}" y2="198" stroke="${O}" stroke-width="2" opacity=".5"/>`).join('')}
    <rect x="22" y="196" width="10" height="20" fill="#5a4026" ${sw}/><rect x="160" y="196" width="10" height="20" fill="#5a4026" ${sw}/>
    <rect x="38" y="104" width="116" height="68" fill="url(#w)" ${sw}/>
    ${[58, 78, 114, 134].map(x => `<line x1="${x}" y1="106" x2="${x}" y2="170" stroke="${O}" stroke-width="2" opacity=".45"/>`).join('')}
    <path d="M78 172 v-30 a18 18 0 0 1 36 0 v30 z" fill="#2a1a10" ${sw}/>
    <path d="M10 112 L96 22 L182 112 Q96 126 10 112 z" fill="url(#r)" ${sw}/>
    ${[30, 50, 70, 122, 142, 162].map((x, i) => `<path d="M${x} ${i < 3 ? 108 - i * 4 : 98 + (i - 3) * 4} L96 ${30 + (i % 3) * 6}" stroke="${roofB}" stroke-width="3" opacity=".7"/>`).join('')}
    <path d="M10 112 q22 10 43 0 q22 10 43 0 q22 10 43 0 q22 10 43 0" fill="none" stroke="${O}" stroke-width="4"/>
    ${ornament}${flag(96, -2, g)}`);
}

function goldMine() {
  return svg(128, 160, `<defs>${grad('k', '#a3a3a3', '#5c5c5c')}${grad('m', '#ffe680', '#d39b14')}</defs>
    ${shadow(64, 140, 58)}
    <path d="M8 140 Q10 70 46 52 Q70 30 96 54 Q124 76 120 140 z" fill="url(#k)" ${sw}/>
    <path d="M30 80 l10 -8 M92 70 l10 8 M104 100 l8 2" stroke="#3d3d3d" stroke-width="3"/>
    <path d="M40 140 v-40 a24 24 0 0 1 48 0 v40 z" fill="#1e140d" ${sw}/>
    <path d="M36 140 v-44 M92 140 v-44 M32 96 h64" stroke="#8b5e34" stroke-width="8"/><path d="M36 140 v-44 M92 140 v-44 M32 96 h64" fill="none" stroke="${O}" stroke-width="2" opacity=".6"/>
    <path d="M58 124 h44 l-6 18 h-32 z" fill="#6d4a2a" ${sw}/><circle cx="66" cy="144" r="5" fill="#333" ${sw}/><circle cx="94" cy="144" r="5" fill="#333" ${sw}/>
    <circle cx="70" cy="120" r="7" fill="url(#m)" stroke="${O}" stroke-width="2.5"/><circle cx="84" cy="116" r="8" fill="url(#m)" stroke="${O}" stroke-width="2.5"/><circle cx="95" cy="121" r="6" fill="url(#m)" stroke="${O}" stroke-width="2.5"/>
    <path d="M24 104 l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 z M100 62 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 z" fill="#fff6b0"/>`);
}

function chickenFarm() {
  return svg(128, 160, `<defs>${grad('w', '#b08050', '#7a5030', false)}</defs>
    ${shadow(64, 140, 58)}
    <ellipse cx="64" cy="124" rx="56" ry="20" fill="#8a6a3c" ${sw}/>
    <rect x="28" y="62" width="72" height="56" rx="4" fill="url(#w)" ${sw}/>
    <path d="M18 66 L64 26 L110 66 z" fill="#9c3a2a" ${sw}/>
    <rect x="54" y="86" width="20" height="32" rx="3" fill="#2b1d14"/>
    <ellipse cx="34" cy="120" rx="12" ry="9" fill="#f4f0e6" ${sw}/><path d="M30 112 q2 -5 4 0 q2 -4 4 1" fill="#d42a2a"/>
    <ellipse cx="100" cy="118" rx="12" ry="9" fill="#f4f0e6" ${sw}/><path d="M96 110 q2 -5 4 0 q2 -4 4 1" fill="#d42a2a"/>`);
}

function barracks(g: boolean) {
  const main = g ? '#8a5a3a' : '#6f9e48', stripe = g ? '#b3262a' : '#e8d9a0';
  return svg(128, 160, `${shadow(64, 142, 60)}
    <path d="M10 140 L64 36 L118 140 z" fill="${main}" ${sw}/>
    <path d="M36 112 L92 112 M24 130 L104 130" stroke="${stripe}" stroke-width="7"/>
    <path d="M50 140 Q64 98 78 140 z" fill="#22160e" ${sw}/>
    <circle cx="58" cy="122" r="3" fill="#f5e663"/><circle cx="70" cy="122" r="3" fill="#f5e663"/>
    <path d="M14 96 L44 22 M114 96 L84 22" stroke="#5a4026" stroke-width="5" stroke-linecap="round"/>
    <path d="M40 16 l4 -12 l4 12 z M84 16 l4 -12 l4 12 z" fill="#ccc" stroke="${O}" stroke-width="2"/>
    ${flag(64, 4, g)}`);
}

function cannon(g: boolean) {
  const stone = g ? ['#8a7f73', '#4f463d'] : ['#b0a894', '#6e6656'];
  return svg(128, 160, `<defs>${grad('s', stone[0], stone[1])}${grad('i', '#5b5b66', '#16161c', false)}</defs>
    ${shadow(64, 142, 56)}
    <path d="M14 104 v26 a50 16 0 0 0 100 0 v-26" fill="url(#s)" ${sw}/>
    <ellipse cx="64" cy="104" rx="50" ry="16" fill="${stone[0]}" ${sw}/>
    <path d="M30 112 v12 M52 118 v14 M76 118 v14 M98 112 v12" stroke="${O}" stroke-width="2" opacity=".5"/>
    <path d="M36 108 L50 78 L80 78 L94 108 z" fill="#7a5430" ${sw}/>
    <g transform="rotate(-35 64 86)"><rect x="40" y="72" width="70" height="28" rx="12" fill="url(#i)" ${sw}/><rect x="104" y="68" width="12" height="36" rx="5" fill="#3a3a44" ${sw}/><path d="M50 78 h40" stroke="#9a9aaa" stroke-width="3" opacity=".6"/></g>
    <circle cx="44" cy="98" r="10" fill="#4a4a52" ${sw}/><circle cx="84" cy="98" r="10" fill="#4a4a52" ${sw}/>
    <circle cx="104" cy="132" r="8" fill="#7a4a24" ${sw}/><circle cx="116" cy="136" r="7" fill="#7a4a24" ${sw}/><circle cx="110" cy="124" r="7" fill="#8b5a2b" ${sw}/>`);
}

function mortarIcon(g: boolean) {
  const stone = g ? ['#8a7f73', '#4f463d'] : ['#b0a894', '#6e6656'];
  return svg(128, 160, `<defs>${grad('s', stone[0], stone[1])}${grad('i', '#5b5b66', '#16161c', false)}</defs>
    ${shadow(64, 142, 52)}
    <path d="M18 110 v22 a46 14 0 0 0 92 0 v-22" fill="url(#s)" ${sw}/>
    <ellipse cx="64" cy="110" rx="46" ry="14" fill="${stone[0]}" ${sw}/>
    <path d="M40 104 L88 104 L82 122 L46 122 z" fill="#7a5430" ${sw}/>
    <g transform="rotate(-25 64 104)"><rect x="56" y="34" width="18" height="72" rx="8" fill="url(#i)" ${sw}/><ellipse cx="65" cy="34" rx="9" ry="4" fill="#23232e" ${sw}/></g>
    <circle cx="36" cy="134" r="6" fill="#4a4a52" ${sw}/><circle cx="96" cy="134" r="6" fill="#4a4a52" ${sw}/>`);
}

function sarbacaneTowerIcon(g: boolean) {
  const roof = g ? ['#6e4f78', '#3a2844'] : ['#6fb34a', '#3a7a2a'];
  return svg(128, 192, `<defs>${grad('r', roof[0], roof[1])}${grad('l', '#c8944a', '#8a5a2a', false)}</defs>
    ${shadow(64, 176, 50)}
    <path d="M30 176 L46 70 M98 176 L82 70 M52 176 L56 70 M76 176 L72 70" stroke="url(#l)" stroke-width="9"/>
    <path d="M36 140 L92 140 M40 110 L88 110" stroke="#6b5426" stroke-width="5"/>
    <rect x="26" y="62" width="76" height="16" rx="3" fill="#a8743a" ${sw}/>
    <path d="M16 46 L64 8 L112 46 Q64 54 16 46 z" fill="url(#r)" ${sw}/>
    <ellipse cx="64" cy="56" rx="22" ry="14" fill="${g ? '#5a3f7a' : '#7cc24a'}" ${sw}/>
    <path d="M44 58 h20 M56 52 h14" stroke="#f0e0a0" stroke-width="3" stroke-linecap="round"/>
    <circle cx="58" cy="50" r="3.5" fill="#fff"/><circle cx="58" cy="50" r="1.8" fill="${O}"/>
    <path d="M70 56 L122 36" stroke="#c8944a" stroke-width="6" stroke-linecap="round"/><path d="M70 56 L122 36" stroke="#5ea83a" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 10"/>`);
}


function crocoBrute() {
  return svg(80, 80, `<defs>${grad('c', '#6cc25a', '#2f7a2c')}</defs>
    ${shadow(40, 72, 24, 6)}
    <path d="M24 52 Q2 58 4 72 Q14 62 28 62 z" fill="url(#c)" ${sw}/>
    <rect x="26" y="58" width="10" height="14" rx="3" fill="#3f8f3a" ${sw}/><rect x="42" y="58" width="10" height="14" rx="3" fill="#3f8f3a" ${sw}/>
    <ellipse cx="38" cy="46" rx="18" ry="20" fill="url(#c)" ${sw}/>
    <ellipse cx="42" cy="50" rx="10" ry="12" fill="#e8e0a8"/><path d="M34 46 h16 M34 54 h16" stroke="#c8bf80" stroke-width="2"/>
    <rect x="22" y="52" width="34" height="6" fill="#7a4a24" ${sw}/>
    <path d="M30 26 Q40 14 54 20 L76 24 Q78 32 70 34 L46 36 Q32 38 30 26 z" fill="url(#c)" ${sw}/>
    <path d="M52 34 l3 -4 l3 4 l3 -4 l3 4 l3 -4" fill="#fff" stroke="${O}" stroke-width="1.5"/>
    <circle cx="44" cy="20" r="6" fill="#f5e663" ${sw}/><circle cx="46" cy="20" r="2.5" fill="${O}"/>
    <path d="M30 20 l-4 -6 M36 14 l-2 -7" stroke="#2f7a2c" stroke-width="3"/>
    <path d="M22 44 L12 18" stroke="#6d4526" stroke-width="7" stroke-linecap="round"/><ellipse cx="12" cy="16" rx="7" ry="9" fill="#8b5a2b" ${sw}/>
    <circle cx="22" cy="44" r="5" fill="#4c9a3f" ${sw}/>`);
}

function crocoSarbacane() {
  return svg(72, 72, `<defs>${grad('c', '#8fd16a', '#4a9a32')}</defs>
    ${shadow(36, 66, 22, 5)}
    <path d="M18 46 L4 40 L8 50 Z" fill="#4a9a32" ${sw}/>
    <ellipse cx="32" cy="46" rx="18" ry="14" fill="url(#c)" ${sw}/>
    <ellipse cx="36" cy="52" rx="10" ry="6" fill="#f0e0a0"/>
    <rect x="16" y="56" width="8" height="8" rx="3" fill="#f0e0a0" ${sw}/><rect x="36" y="56" width="8" height="8" rx="3" fill="#f0e0a0" ${sw}/>
    <rect x="18" y="20" width="16" height="22" rx="4" transform="rotate(-12 26 31)" fill="#c8944a" ${sw}/>
    <path d="M22 18 l-2 -8 M26 17 l0 -9 M30 18 l2 -8" stroke="#d8c090" stroke-width="2"/><path d="M20 10 l-2 -4 l4 0 z M26 8 l-1 -4 l3 0 z M32 10 l2 -4 l-4 0 z" fill="#d84a3a"/>
    <circle cx="48" cy="34" r="13" fill="url(#c)" ${sw}/>
    <rect x="52" y="34" width="14" height="10" rx="5" fill="#8fd16a" ${sw}/>
    <circle cx="46" cy="30" r="4.5" fill="#fff"/><circle cx="47" cy="30" r="2.2" fill="${O}"/>
    <path d="M42 26 l8 2" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M58 40 l3 -1 M62 42 l2 0" stroke="#fff" stroke-width="1.5"/>
    <path d="M50 27 L70 20" stroke="#d9a85a" stroke-width="4" stroke-linecap="round"/><path d="M50 27 L70 20" stroke="#5ea83a" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="4 12"/>
    <circle cx="48" cy="40" r="4" fill="#5ea83a" ${sw}/>`);
}

function babyCroco() {
  return svg(64, 48, `<defs>${grad('c', '#8ed672', '#3f8f3a')}</defs>
    ${shadow(32, 42, 22, 4)}
    <path d="M18 30 Q4 30 2 22 Q10 28 20 24 z" fill="url(#c)" ${sw}/>
    <rect x="20" y="32" width="7" height="9" rx="2" fill="#3f8f3a" ${sw}/><rect x="34" y="32" width="7" height="9" rx="2" fill="#3f8f3a" ${sw}/>
    <ellipse cx="30" cy="28" rx="14" ry="9" fill="url(#c)" ${sw}/>
    <path d="M36 18 Q46 10 56 18 L62 22 Q62 28 54 28 L42 30 Q34 28 36 18 z" fill="url(#c)" ${sw}/>
    <circle cx="46" cy="14" r="5.5" fill="#fff" ${sw}/><circle cx="48" cy="14" r="2.5" fill="${O}"/>
    <path d="M50 27 l2 -3 l2 3 l2 -3" fill="none" stroke="#fff" stroke-width="1.5"/>`);
}

const campIcon = () => svg(128, 160, `${shadow(64, 140, 56)}<ellipse cx="64" cy="128" rx="56" ry="18" fill="#8a6a42" ${sw}/>
  <path d="M14 120 L40 66 L66 120 z" fill="#6f9e48" ${sw}/><path d="M34 120 L40 96 L46 120 z" fill="#1d150e"/>
  <rect x="62" y="122" width="40" height="10" rx="5" fill="#8b6a44" ${sw}/><path d="M74 124 Q82 92 92 124 z" fill="#ff8a20" stroke="#2b1d14" stroke-width="3"/><path d="M79 124 Q83 106 87 124 z" fill="#ffe060"/>
  <path d="M100 118 Q90 110 96 100 L108 96 Q114 100 112 108 z" fill="#4c9a3f" ${sw}/><circle cx="102" cy="102" r="3" fill="#f5e663"/>`);
const crocoLauncherIcon = () => svg(80, 80, `${shadow(40, 72, 30, 6)}
  <rect x="26" y="50" width="46" height="10" rx="3" fill="#8b6a44" ${sw}/><circle cx="34" cy="64" r="6" fill="#5a4026" ${sw}/><circle cx="64" cy="64" r="6" fill="#5a4026" ${sw}/>
  <path d="M48 50 L30 18" stroke="#5a4026" stroke-width="6" stroke-linecap="round"/><path d="M48 50 L30 18" stroke="${O}" stroke-width="1.5" opacity=".5"/>
  <path d="M14 18 q8 -8 20 -2 l8 2 q-2 6 -10 6 q-12 2 -18 -6 z" fill="#d0402a" ${sw}/><path d="M18 12 l-4 -8" stroke="#222" stroke-width="2"/><circle cx="13" cy="4" r="3" fill="#ffa020"/>
  <rect x="4" y="36" width="16" height="24" rx="4" fill="#5a9a3f" ${sw}/><path d="M8 34 q8 -10 18 -4 l4 4 q-8 4 -22 0 z" fill="#5a9a3f" ${sw}/><circle cx="14" cy="30" r="2.5" fill="#f5e663"/>`);
const fireCrocoIcon = () => svg(80, 80, `${shadow(40, 74, 24, 5)}
  <path d="M24 30 l4 -8 l4 8 M36 28 l4 -9 l4 9 M48 30 l4 -8 l4 8" fill="#ff6a1a" ${sw}/>
  <rect x="14" y="36" width="34" height="26" rx="8" fill="#4f7a3a" ${sw}/>
  <path d="M22 40 v20 M32 38 v22 M42 40 v20" stroke="#1f3a18" stroke-width="3"/>
  <ellipse cx="60" cy="42" rx="14" ry="10" fill="#4f7a3a" ${sw}/>
  <path d="M50 46 h18 l-3 4 h-15 z" fill="#f5e6c0" ${sw}/>
  <circle cx="60" cy="38" r="2" fill="#ffd060"/>
  <path d="M16 62 l-4 6 M24 62 v6 M44 62 v6 M52 62 l4 6" stroke="#3a0c08" stroke-width="3" stroke-linecap="round"/>`);
const colossusIcon = () => svg(80, 80, `${shadow(40, 72, 30, 6)}
  <ellipse cx="40" cy="50" rx="30" ry="18" fill="#5a4a40" ${sw}/>
  <path d="M16 44 l4 -12 l4 12 M28 38 l4 -14 l4 14 M40 36 l4 -15 l4 15 M52 38 l4 -14 l4 14 M64 44 l4 -12 l4 12" fill="#c9b48a" ${sw}/>
  <ellipse cx="40" cy="58" rx="24" ry="8" fill="#d8c28a" ${sw}/>
  <ellipse cx="70" cy="52" rx="10" ry="8" fill="#4f7a3a" ${sw}/>
  <circle cx="72" cy="48" r="2" fill="#ffd060"/>
  <rect x="16" y="66" width="8" height="8" rx="2" fill="#22201c"/><rect x="56" y="66" width="8" height="8" rx="2" fill="#22201c"/>`);
const healerIcon = () => svg(80, 80, `${shadow(40, 72, 22, 5)}
  <path d="M30 42 q-14 -22 -22 -14 q-4 14 22 14 z" fill="#f4a6d8" opacity=".85" ${sw}/><path d="M48 42 q14 -22 22 -14 q4 14 -22 14 z" fill="#c9a0f0" opacity=".85" ${sw}/>
  <rect x="20" y="44" width="40" height="22" rx="8" fill="#d0702a" ${sw}/><rect x="52" y="30" width="20" height="20" rx="6" fill="#d0702a" ${sw}/>
  <path d="M56 32 l-4 -10 M66 32 l4 -10" stroke="#f0e0b0" stroke-width="3" stroke-linecap="round"/>
  <circle cx="64" cy="40" r="2" fill="#1a1a1a"/><rect x="66" y="42" width="8" height="6" rx="3" fill="#f0a8a0"/>
  <path d="M40 22 q-5 -6 -9 0 q-2 4 9 10 q11 -6 9 -10 q-4 -6 -9 0 z" fill="#ff5c8a" ${sw}/>`);
const flyingCrocoIcon = () => svg(80, 80, `${shadow(40, 74, 18, 4)}
  <path d="M30 34 L6 14 L10 30 L2 32 L22 42 z" fill="#8fbf6a" ${sw}/><path d="M44 34 L66 10 L64 28 L76 28 L54 42 z" fill="#8fbf6a" ${sw}/>
  <path d="M14 44 Q30 32 52 36 L72 38 Q74 46 64 48 L40 50 Q22 52 14 44 z" fill="#4c9a6a" ${sw}/><circle cx="56" cy="36" r="4" fill="#f5e663" ${sw}/>
  <circle cx="36" cy="58" r="7" fill="#222228" ${sw}/><path d="M36 51 l2 -4" stroke="#8b5a2b" stroke-width="2"/><path d="M60 46 l2 3 l2 -3 l2 3" fill="none" stroke="#fff" stroke-width="1.5"/>`);
function airDefenseIcon(g: boolean) {
  return svg(128, 160, `${shadow(64, 142, 54)}<path d="M18 112 v20 a46 14 0 0 0 92 0 v-20" fill="${g ? '#7a6a5a' : '#9a958a'}" ${sw}/><ellipse cx="64" cy="112" rx="46" ry="14" fill="${g ? '#8a7a6a' : '#b0aa9a'}" ${sw}/>
    <rect x="54" y="80" width="20" height="34" fill="#5a4026" ${sw}/><path d="M64 96 L96 30" stroke="#7a5430" stroke-width="12" stroke-linecap="round"/><path d="M64 96 L96 30" stroke="${O}" stroke-width="2" opacity=".5"/>
    <path d="M58 40 Q90 20 116 50" fill="none" stroke="#7a5430" stroke-width="7"/><path d="M58 40 L116 50" stroke="#f1ead2" stroke-width="2"/>
    <path d="M70 86 L104 14" stroke="#8b5a2b" stroke-width="5"/><path d="M104 14 l-10 6 l8 6 z" fill="#ddd" ${sw}/>${flag(24, 70, g)}`);
}
const coconut = () => svg(24, 24, `<circle cx="12" cy="12" r="8" fill="#7a4a24" ${sw}/><circle cx="9" cy="9" r="2" fill="#3a2010"/><circle cx="14" cy="8" r="1.5" fill="#3a2010"/>`);
const dart = () => svg(24, 8, `<path d="M2 4 H18" stroke="#f1ead2" stroke-width="2.5"/><path d="M18 1 L23 4 L18 7 z" fill="#ddd" stroke="${O}" stroke-width="1"/><path d="M2 1 l4 3 l-4 3" fill="#e05050"/>`);
const thorn = () => svg(20, 20, `<path d="M3 17 L17 3" stroke="#6d4526" stroke-width="3"/><path d="M17 3 l-7 1 l6 6 z" fill="#ccc" stroke="${O}" stroke-width="1"/>`);

function pond(w: number, h: number) {
  return svg(w, h, `<defs><radialGradient id="w" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#4f9c94"/><stop offset=".7" stop-color="#2c6a62"/><stop offset="1" stop-color="#1f4d46"/></radialGradient></defs>
    <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 4}" ry="${h / 2 - 4}" fill="#3e5a26" opacity=".8"/>
    <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 9}" ry="${h / 2 - 9}" fill="url(#w)" stroke="#263a18" stroke-width="3"/>
    <path d="M${w * 0.3} ${h * 0.35} q${w * 0.1} -6 ${w * 0.2} 0" stroke="#bfe8e0" stroke-width="2.5" fill="none" opacity=".6"/>
    <path d="M${w * 0.62} ${h * 0.6} l14 -4 a10 7 0 1 1 -14 4 z" fill="#5fae3f" stroke="#2d5a1e" stroke-width="2"/>
    <path d="M${w * 0.25} ${h * 0.65} l10 -2 a8 6 0 1 1 -10 2 z" fill="#6fbe4a" stroke="#2d5a1e" stroke-width="2"/>
    <circle cx="${w * 0.66}" cy="${h * 0.55}" r="4" fill="#f2a6c8" stroke="#a8507a" stroke-width="1.5"/>`);
}

const cattails = () => svg(48, 64, `${[[10, 60, 14, 12], [22, 62, 24, 4], [34, 60, 32, 14]].map(([x1, y1, x2, y2]) =>
  `<path d="M${x1} ${y1} Q${x1} ${(y1 + y2) / 2} ${x2} ${y2}" stroke="#6f8f2a" stroke-width="3" fill="none"/><rect x="${x2 - 3}" y="${y2 + 4}" width="6" height="14" rx="3" fill="#6b4122" stroke="${O}" stroke-width="1.5"/>`).join('')}
  <path d="M6 62 Q2 44 8 30 M40 62 Q46 46 42 34 M28 62 Q30 40 38 24" stroke="#86a83a" stroke-width="2.5" fill="none"/>`);
const rock = () => svg(40, 30, `${shadow(20, 26, 16, 4)}<path d="M4 24 Q6 8 18 6 Q32 4 36 22 Q20 28 4 24 z" fill="#8c8c84" ${sw}/><path d="M12 12 q6 -3 10 0" stroke="#bbb" stroke-width="2" fill="none"/>`);
const log = () => svg(64, 28, `${shadow(32, 24, 28, 4)}<rect x="6" y="8" width="50" height="14" rx="7" fill="#7a5430" ${sw}/><ellipse cx="56" cy="15" rx="5" ry="7" fill="#c49a5a" ${sw}/><circle cx="56" cy="15" r="2" fill="#7a5430"/><path d="M14 12 h20 M22 18 h22" stroke="#4a3018" stroke-width="2"/><circle cx="30" cy="8" r="3" fill="#6fae3f"/>`);
const mushroom = () => svg(28, 28, `<rect x="11" y="14" width="6" height="10" rx="2" fill="#efe6cc" stroke="${O}" stroke-width="2"/><path d="M3 15 Q14 0 25 15 z" fill="#c9443a" stroke="${O}" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="#fff"/><circle cx="17" cy="9" r="1.6" fill="#fff"/>`);
const rubble = () => svg(96, 64, `<ellipse cx="48" cy="40" rx="42" ry="18" fill="#2e2a22" opacity=".7"/>${[[24, 36, 9], [44, 30, 11], [64, 40, 8], [36, 46, 7], [58, 26, 6]].map(([x, y, r]) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#6e6658" stroke="${O}" stroke-width="2"/>`).join('')}<path d="M18 30 L40 44 M60 32 L78 46" stroke="#6d4526" stroke-width="5"/>`);
const workshopIcon = () => svg(128, 160, `${shadow(64, 140, 50)}<rect x="24" y="80" width="80" height="54" rx="4" fill="#8b6a44" ${sw}/><path d="M16 84 L64 40 L112 84 z" fill="#5a4026" ${sw}/><rect x="54" y="106" width="20" height="28" rx="3" fill="#2b1d14"/><rect x="84" y="50" width="8" height="44" fill="#5a4026"/><rect x="76" y="46" width="24" height="10" rx="2" fill="#9a9a9a" ${sw}/>`);
function aerialBarracksIcon() {
  return svg(128, 160, `${shadow(64, 146, 56)}<path d="M30 136 L30 96 M98 136 L98 96 M30 112 L98 112" stroke="#6b5426" stroke-width="5"/><rect x="26" y="94" width="76" height="8" fill="#8b6a3a" ${sw}/><rect x="38" y="58" width="52" height="38" rx="3" fill="#4a7a6a" ${sw}/><path d="M26 60 L64 30 L102 60 z" fill="#2f5a8a" ${sw}/><path d="M10 44 Q26 36 40 46 L36 52 Q20 48 10 44 z M118 44 Q102 36 88 46 L92 52 Q108 48 118 44 z" fill="#e8d9a0" ${sw}/><rect x="56" y="74" width="16" height="22" fill="#22160e"/>`);
}
function whirlCrocoIcon() {
  return svg(72, 72, `${shadow(36, 66, 22, 5)}
    <path d="M10 30 Q4 46 18 58 Q14 44 22 34 z M62 30 Q68 46 54 58 Q58 44 50 34 z" fill="#e8a830" ${sw}/>
    <ellipse cx="36" cy="44" rx="16" ry="18" fill="#7a8a3a" ${sw}/>
    <path d="M22 40 L50 52" stroke="#b3262a" stroke-width="5" stroke-linecap="round"/>
    <circle cx="36" cy="22" r="10" fill="#7a8a3a" ${sw}/>
    <path d="M24 16 l-4 -10 M30 13 l-1 -11 M36 12 l0 -11 M42 13 l1 -11 M48 16 l4 -10" stroke="#f0e6c8" stroke-width="5" stroke-linecap="round"/>
    <path d="M30 24 h14 M32 28 l10 0" stroke="#fff" stroke-width="2"/>`);
}
function dragonIcon() {
  return svg(72, 72, `${shadow(36, 66, 22, 5)}
    <path d="M4 30 Q14 8 30 22 L22 30 z M68 30 Q58 8 42 22 L50 30 z" fill="#d0604a" ${sw}/>
    <ellipse cx="34" cy="40" rx="16" ry="11" fill="#b8402a" ${sw}/>
    <ellipse cx="50" cy="32" rx="10" ry="8" fill="#b8402a" ${sw}/>
    <path d="M56 34 L68 36 L56 38 z" fill="#6a1f14"/>
    <path d="M60 32 L70 26 M60 30 L68 22" stroke="#ffd040" stroke-width="3" stroke-linecap="round"/>
    <circle cx="56" cy="28" r="2" fill="#ffd040"/><path d="M44 22 l-3 -8 M50 22 l1 -9" stroke="#f0e6c8" stroke-width="3"/>`);
}
function bombTowerIcon(g: boolean) {
  const stone = g ? '#5a4a3a' : '#9a9486', top = g ? '#3a2a1a' : '#6d4526';
  return svg(128, 160, `${shadow(64, 142, 50)}<rect x="36" y="60" width="56" height="82" rx="6" fill="${stone}" ${sw}/><rect x="30" y="50" width="68" height="14" rx="3" fill="${top}" ${sw}/><circle cx="48" cy="40" r="10" fill="#222228" ${sw}/><circle cx="72" cy="36" r="9" fill="#222228" ${sw}/><circle cx="62" cy="22" r="8" fill="#222228" ${sw}/><rect x="54" y="100" width="20" height="30" rx="3" fill="#2b1d14"/><path d="M44 74 h10 M74 74 h10" stroke="#2b1d14" stroke-width="4"/>`);
}
const labIcon = () => svg(128, 160, `${shadow(64, 140, 56)}<rect x="22" y="74" width="84" height="68" rx="4" fill="#8a8478" ${sw}/><path d="M14 78 L64 34 L114 78 z" fill="#6a3a8a" ${sw}/><rect x="54" y="104" width="20" height="38" rx="3" fill="#2b1d14"/><path d="M64 34 L64 14" stroke="#b87333" stroke-width="4"/><circle cx="64" cy="12" r="6" fill="#7dff6a" ${sw}/><rect x="28" y="84" width="14" height="22" fill="#cfe6f0" ${sw}/><circle cx="35" cy="80" r="8" fill="#7dff6a" ${sw}/><rect x="86" y="84" width="14" height="22" fill="#cfe6f0" ${sw}/><circle cx="93" cy="80" r="8" fill="#f0a0ff" ${sw}/>`);
const coin = () => svg(32, 32, `<circle cx="16" cy="16" r="12" fill="#f2c230" ${sw}/><circle cx="16" cy="16" r="7" fill="none" stroke="#b38512" stroke-width="2.5"/><path d="M11 10 q3 -2 6 0" stroke="#fff6b0" stroke-width="2" fill="none"/>`);
const chickenIcon = () => svg(32, 32, `<circle cx="15" cy="18" r="10" fill="#f4f0e6" ${sw}/><path d="M11 9 q2 -6 4 0 q2 -5 4 1" fill="#d42a2a" stroke="${O}" stroke-width="2"/><path d="M24 16 l6 2 l-6 2 z" fill="#f0a020" stroke="${O}" stroke-width="1.5"/><circle cx="19" cy="16" r="1.6" fill="${O}"/>`);

const goldStoreIcon = () => svg(128, 160, `${shadow(64, 140, 56)}<rect x="20" y="70" width="88" height="62" rx="6" fill="#9a958a" ${sw}/><path d="M12 74 Q64 20 116 74 z" fill="#8a5a2e" ${sw}/><rect x="50" y="98" width="28" height="34" rx="3" fill="#2b1d14"/>${[[40, 120], [56, 124], [72, 120], [64, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#f2c230" stroke="${O}" stroke-width="2"/>`).join('')}`);
const chickenStoreIcon = () => svg(128, 160, `${shadow(64, 140, 56)}<rect x="22" y="72" width="84" height="66" rx="4" fill="#8a5a30" ${sw}/><path d="M12 76 L64 34 L116 76 z" fill="#c9443a" ${sw}/><ellipse cx="64" cy="98" rx="14" ry="18" fill="#f4f0e6" ${sw}/><rect x="40" y="112" width="48" height="26" rx="3" fill="#e8c86a" ${sw}/>`);

export const SPRITES: Record<string, string> = {
  b_hq: hq(false), g_hq: hq(true),
  b_goldMine: goldMine(), g_goldMine: goldMine(),
  b_chickenFarm: chickenFarm(), g_chickenFarm: chickenFarm(), b_goldStore: goldStoreIcon(), b_chickenStore: chickenStoreIcon(),
  b_barracks: barracks(false), g_barracks: barracks(true), b_camp: campIcon(),
  b_cannon: cannon(false), g_cannon: cannon(true), b_mortar: mortarIcon(false), g_mortar: mortarIcon(true), b_airDefense: airDefenseIcon(false), g_airDefense: airDefenseIcon(true),
  b_sarbacaneTower: sarbacaneTowerIcon(false), g_sarbacaneTower: sarbacaneTowerIcon(true), b_lab: labIcon(), b_workshop: workshopIcon(), b_bombTower: bombTowerIcon(false), b_aerialBarracks: aerialBarracksIcon(), g_bombTower: bombTowerIcon(true),
  t_croco: crocoBrute(), t_colossus: colossusIcon(), t_crocoLauncher: crocoLauncherIcon(), t_flyingCroco: flyingCrocoIcon(), t_fireCroco: fireCrocoIcon(), t_healer: healerIcon(), t_crocoSarbacane: crocoSarbacane(), t_babyCroco: babyCroco(), t_whirlCroco: whirlCrocoIcon(), t_dragon: dragonIcon(),
  p_coconut: coconut(), p_dart: dart(), p_thorn: thorn(),
  d_pondL: pond(150, 96), d_pondS: pond(96, 64), d_cattails: cattails(), d_rock: rock(), d_log: log(), d_mushroom: mushroom(), d_rubble: rubble(),
  i_gold: coin(), i_chicken: chickenIcon(),
};

export const spriteUrl = (key: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SPRITES[key])}`;
