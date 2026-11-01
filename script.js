/* =====================================================================
   CASIO fx-991ES PLUS Scientific Engine & UI Logic
   ===================================================================== */

// Math Constants
const PI = Math.PI;
const E = Math.E;

// Physical Scientific Constants
const CONSTANTS = {
  '1': { name: 'c', val: 299792458 },
  '2': { name: 'h', val: 6.62607015e-34 },
  '3': { name: 'G', val: 6.67430e-11 },
  '4': { name: 'e', val: 1.60217663e-19 },
  '5': { name: 'me', val: 9.1093837e-31 },
  '6': { name: 'mp', val: 1.67262192e-27 },
  '7': { name: 'k', val: 1.380649e-23 },
  '8': { name: 'R', val: 8.314462618 }
};

// Calculator State
const state = {
  isPoweredOn: true,
  expression: '',
  cursorPos: 0,
  resultVal: 0,
  resultStr: '0',
  errorActive: false,
  errorMsg: '',
  angleMode: 'DEG', // 'DEG', 'RAD', 'GRAD'
  shiftActive: false,
  alphaActive: false,
  activeMenu: null,  // null, 'MODE', 'SETUP', 'HYP', 'CLR', 'DRG', 'CONST'
  registers: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0, Ans: 0 },
  history: [],
  historyIndex: -1,
  sdCycle: 0,
  dmsActive: false
};

// DOM Elements
const exprTextEl = document.getElementById('exprText');
const lcdCursorEl = document.getElementById('lcdCursor');
const lcdResultEl = document.getElementById('lcdResult');
const indShiftEl = document.getElementById('indShift');
const indAlphaEl = document.getElementById('indAlpha');
const indMemEl = document.getElementById('indMem');
const indDegEl = document.getElementById('indDeg');
const indRadEl = document.getElementById('indRad');
const indGraEl = document.getElementById('indGra');
const indUpEl = document.getElementById('indUp');
const indDownEl = document.getElementById('indDown');

// -------------------------------------------------------------------------
// Math Helpers
// -------------------------------------------------------------------------

function toRadians(deg, mode = state.angleMode) {
  if (mode === 'DEG') return deg * (Math.PI / 180.0);
  if (mode === 'GRAD') return deg * (Math.PI / 200.0);
  return deg;
}

function fromRadians(rad, mode = state.angleMode) {
  if (mode === 'DEG') return rad * (180.0 / Math.PI);
  if (mode === 'GRAD') return rad * (200.0 / Math.PI);
  return rad;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('Math ERROR');
  if (n > 69) throw new Error('Math ERROR: Overflow');
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function nPr(n, r) {
  n = Math.round(n);
  r = Math.round(r);
  if (n < 0 || r < 0 || r > n) throw new Error('Math ERROR');
  return factorial(n) / factorial(n - r);
}

function nCr(n, r) {
  n = Math.round(n);
  r = Math.round(r);
  if (n < 0 || r < 0 || r > n) throw new Error('Math ERROR');
  return factorial(n) / (factorial(r) * factorial(n - r));
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    let t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function toFraction(val) {
  if (!Number.isFinite(val)) return null;
  let sign = val < 0 ? -1 : 1;
  let absVal = Math.abs(val);
  let bestNum = 1, bestDen = 1, minDiff = 1e9;

  for (let den = 1; den <= 5000; den++) {
    let num = Math.round(absVal * den);
    let diff = Math.abs(absVal - num / den);
    if (diff < minDiff) {
      minDiff = diff;
      bestNum = num;
      bestDen = den;
      if (diff < 1e-10) break;
    }
  }

  if (minDiff > 1e-6 || bestDen === 1) return null;
  let div = gcd(bestNum, bestDen);
  return { num: sign * (bestNum / div), den: bestDen / div };
}

// -------------------------------------------------------------------------
// Safe Expression Evaluation
// -------------------------------------------------------------------------

function evaluateMath(rawExpr) {
  let s = rawExpr.trim();
  if (!s) return 0;

  // Unary minus and Casio symbols
  s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  s = s.replace(/\(-\)/g, '-');
  s = s.replace(/π/g, 'PI');
  s = s.replace(/\bAns\b/g, 'registers.Ans');

  // Scientific notation ×10^(n)
  s = s.replace(/(\d+(?:\.\d+)?)\s*\*\s*10\s*\^\s*\((-?\d+)\)/g, (m, g1, g2) => `(${g1}*Math.pow(10,${g2}))`);
  s = s.replace(/(\d+(?:\.\d+)?)\s*\*\s*10\s*\^\s*(-?\d+)/g, (m, g1, g2) => `(${g1}*Math.pow(10,${g2}))`);

  // Functions mapping (BEFORE individual superscripts like ⁻¹ or ³!)
  s = s.replace(/sin⁻¹/g, 'asin')
       .replace(/cos⁻¹/g, 'acos')
       .replace(/tan⁻¹/g, 'atan')
       .replace(/sinh⁻¹/g, 'asinh')
       .replace(/cosh⁻¹/g, 'acosh')
       .replace(/tanh⁻¹/g, 'atanh')
       .replace(/³√/g, 'cbrt')
       .replace(/ˣ√/g, 'nthRoot')
       .replace(/√/g, 'sqrt')
       .replace(/log_base/g, 'logBase');

  // Fractions: a⌟b⌟c (mixed) & a⌟b (simple)
  s = s.replace(/(\d+)\s*⌟\s*(\d+)\s*⌟\s*(\d+)/g, (m, g1, g2, g3) => `(${g1} + (${g2})/(${g3}))`);
  s = s.replace(/(\d+(?:\.\d+)?)\s*⌟\s*(\d+(?:\.\d+)?)/g, (m, g1, g2) => `((${g1})/(${g2}))`);

  // Combinations & Permutations
  s = s.replace(/(\d+(?:\.\d+)?)\s*nCr\s*(\d+(?:\.\d+)?)/g, (m, g1, g2) => `nCr(${g1},${g2})`);
  s = s.replace(/(\d+(?:\.\d+)?)\s*nPr\s*(\d+(?:\.\d+)?)/g, (m, g1, g2) => `nPr(${g1},${g2})`);

  // Factorial: e.g. 5!
  s = s.replace(/(\b\d+(?:\.\d+)?|\b[A-Za-z_]\w*|\))\s*!/g, (m, g1) => `factorial(${g1})`);

  // Percent: e.g. 50%
  s = s.replace(/(\b\d+(?:\.\d+)?|\b[A-Za-z_]\w*|\))\s*%/g, (m, g1) => `((${g1})/100)`);

  // Powers: x^y, x², x³, x⁻¹
  s = s.replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁻¹/g, '^(-1)');
  s = s.replace(/\^/g, '**');

  // Standalone 'e' constant vs Euler's number
  s = s.replace(/(?<![A-Za-z0-9_])e(?![A-Za-z0-9_])/g, 'E');

  // Implicit multiplication:
  // 1. Standalone number followed by (: 2(3) -> 2*(3)
  s = s.replace(/(?<![A-Za-z_])(\d+(?:\.\d+)?)\s*\(/g, (m, g1) => g1 + '*(');
  // 2. Parenthesis followed by (: )( -> )*(
  s = s.replace(/\)\s*\(/g, ')*(');
  // 3. Parenthesis followed by number or identifier: )2 -> )*2, )sin -> )*sin
  s = s.replace(/\)\s*([0-9A-Za-z_])/g, (m, g1) => ')*' + g1);
  // 4. Number followed by variable, constant, or function (e.g. 2PI, 3Ans, 4X, 5sin(30))
  // Exclude scientific notation like 1e5 or 1E-5
  s = s.replace(/(?<![A-Za-z_])(\d+(?:\.\d+)?)\s*(?!(?:e|E)[+-]?\d+)([A-Za-z_]\w*)/g, (m, g1, g2) => g1 + '*' + g2);
  // 5. Constant or variable followed by function or identifier: PI sin(30) -> PI*sin(30)
  s = s.replace(/\b(PI|E|registers\.Ans|[A-F]|X|Y|M)\s+([A-Za-z_]\w*)\b/g, (m, g1, g2) => g1 + '*' + g2);
  // 6. Constant or variable followed by (: PI(4) -> PI*(4)
  s = s.replace(/\b(PI|E|registers\.Ans|[A-F]|X|Y|M)\s*\(/g, (m, g1) => g1 + '*(');

  // Auto close open parentheses
  let openP = (s.match(/\(/g) || []).length;
  let closeP = (s.match(/\)/g) || []).length;
  if (openP > closeP) s += ')'.repeat(openP - closeP);

  // Math environment
  const env = {
    PI, E,
    registers: state.registers,
    A: state.registers.A, B: state.registers.B, C: state.registers.C,
    D: state.registers.D, E_reg: state.registers.E, F: state.registers.F,
    X: state.registers.X, Y: state.registers.Y, M: state.registers.M,
    sin: (x) => {
      if (state.angleMode === 'DEG') {
        let norm = ((x % 360) + 360) % 360;
        if (norm === 0 || norm === 180) return 0;
        if (norm === 90) return 1;
        if (norm === 270) return -1;
        if (norm === 30 || norm === 150) return 0.5;
        if (norm === 210 || norm === 330) return -0.5;
      }
      let rad = toRadians(x);
      let v = Math.sin(rad);
      return Math.abs(v) < 1e-15 ? 0 : v;
    },
    cos: (x) => {
      if (state.angleMode === 'DEG') {
        let norm = ((x % 360) + 360) % 360;
        if (norm === 90 || norm === 270) return 0;
        if (norm === 0) return 1;
        if (norm === 180) return -1;
        if (norm === 60 || norm === 300) return 0.5;
        if (norm === 120 || norm === 240) return -0.5;
      }
      let rad = toRadians(x);
      let v = Math.cos(rad);
      return Math.abs(v) < 1e-15 ? 0 : v;
    },
    tan: (x) => {
      if (state.angleMode === 'DEG') {
        let norm = ((x % 180) + 180) % 180;
        if (norm === 90) throw new Error('Math ERROR');
        if (norm === 0) return 0;
        if (norm === 45) return 1;
        if (norm === 135) return -1;
      }
      let rad = toRadians(x);
      let c = Math.cos(rad);
      if (Math.abs(c) < 1e-15) throw new Error('Math ERROR');
      let v = Math.tan(rad);
      return Math.abs(v) < 1e-15 ? 0 : v;
    },
    asin: (x) => {
      if (x < -1 || x > 1) throw new Error('Math ERROR');
      return fromRadians(Math.asin(x));
    },
    acos: (x) => {
      if (x < -1 || x > 1) throw new Error('Math ERROR');
      return fromRadians(Math.acos(x));
    },
    atan: (x) => fromRadians(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    log: (x) => { if (x <= 0) throw new Error('Math ERROR'); return Math.log10(x); },
    ln: (x) => { if (x <= 0) throw new Error('Math ERROR'); return Math.log(x); },
    logBase: (b, x) => {
      if (b <= 0 || b === 1 || x <= 0) throw new Error('Math ERROR');
      return Math.log(x) / Math.log(b);
    },
    sqrt: (x) => { if (x < 0) throw new Error('Math ERROR'); return Math.sqrt(x); },
    cbrt: Math.cbrt,
    nthRoot: (n, x) => {
      if (n === 0) throw new Error('Math ERROR');
      if (x < 0) {
        if (Math.round(n) % 2 !== 0) return -Math.pow(-x, 1 / n);
        throw new Error('Math ERROR');
      }
      return Math.pow(x, 1 / n);
    },
    factorial, nPr, nCr,
    Pol: (x, y) => Math.hypot(x, y),
    Rec: (r, th) => r * Math.cos(toRadians(th)),
    RanSharp: () => Math.round(Math.random() * 1000) / 1000,
    RanInt: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
    round: Math.round,
    abs: Math.abs
  };

  // Calculus functions: d/dx(f(X), x) and ∫(f(X), a, b)
  let diffMatch = s.match(/^(?:d\/dx|diff)\s*\((.+),([^,]+)\)$/);
  if (diffMatch) {
    let fStr = diffMatch[1], xVal = evaluateMath(diffMatch[2]);
    let h = 1e-6;
    let origX = state.registers.X;
    state.registers.X = xVal + h;
    let y2 = evaluateMath(fStr);
    state.registers.X = xVal - h;
    let y1 = evaluateMath(fStr);
    state.registers.X = origX;
    return (y2 - y1) / (2 * h);
  }

  let intMatch = s.match(/^(?:∫|integrate)\s*\((.+),([^,]+),([^,]+)\)$/);
  if (intMatch) {
    let fStr = intMatch[1], a = evaluateMath(intMatch[2]), b = evaluateMath(intMatch[3]);
    let n = 200, h = (b - a) / n, sum = 0;
    let origX = state.registers.X;
    state.registers.X = a; sum += evaluateMath(fStr);
    state.registers.X = b; sum += evaluateMath(fStr);
    for (let i = 1; i < n; i++) {
      state.registers.X = a + i * h;
      sum += evaluateMath(fStr) * (i % 2 === 0 ? 2 : 4);
    }
    state.registers.X = origX;
    return sum * (h / 3);
  }

  let sumMatch = s.match(/^(?:Σ|summation)\s*\((.+),([^,]+),([^,]+)\)$/);
  if (sumMatch) {
    let fStr = sumMatch[1], a = Math.round(evaluateMath(sumMatch[2])), b = Math.round(evaluateMath(sumMatch[3]));
    let total = 0;
    let origX = state.registers.X;
    for (let x = a; x <= b; x++) {
      state.registers.X = x;
      total += evaluateMath(fStr);
    }
    state.registers.X = origX;
    return total;
  }

  // Safe evaluation
  const argNames = Object.keys(env);
  const argVals = Object.values(env);
  const fn = new Function(...argNames, `return (${s});`);
  let result = fn(...argVals);

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    if (Number.isNaN(result)) throw new Error('Math ERROR');
    throw new Error('Math ERROR: Overflow');
  }

  if (Math.abs(result) < 1e-14) result = 0;
  if (Math.abs(result - Math.round(result)) < 1e-11) result = Math.round(result);

  return result;
}

// -------------------------------------------------------------------------
// Format Display Result
// -------------------------------------------------------------------------

function formatNumber(val) {
  if (typeof val === 'string') return val;
  if (Math.abs(val) >= 1e10 || (Math.abs(val) > 0 && Math.abs(val) < 1e-3)) {
    return val.toExponential(5).replace('e+', '×10^').replace('e-', '×10^-');
  }
  return parseFloat(val.toFixed(9)).toString();
}

// -------------------------------------------------------------------------
// UI Refresh & LCD Updates
// -------------------------------------------------------------------------

function updateLCD() {
  if (!state.isPoweredOn) {
    exprTextEl.textContent = '';
    lcdCursorEl.style.display = 'none';
    lcdResultEl.textContent = '';
    document.querySelectorAll('.lcd-status-item').forEach(el => el.classList.remove('active'));
    return;
  }

  // Status indicators
  indShiftEl.classList.toggle('active', state.shiftActive);
  indAlphaEl.classList.toggle('active', state.alphaActive);
  indMemEl.classList.toggle('active', state.registers.M !== 0);
  indDegEl.classList.toggle('active', state.angleMode === 'DEG');
  indRadEl.classList.toggle('active', state.angleMode === 'RAD');
  indGraEl.classList.toggle('active', state.angleMode === 'GRAD');

  let hasUp = state.history.length > 0 && state.historyIndex > 0;
  let hasDown = state.history.length > 0 && state.historyIndex < state.history.length;
  indUpEl.classList.toggle('active', hasUp);
  indDownEl.classList.toggle('active', hasDown);

  // Menu Handling
  if (state.activeMenu) {
    lcdCursorEl.style.display = 'none';
    if (state.activeMenu === 'MODE') {
      exprTextEl.textContent = '1:COMP    2:STAT';
      lcdResultEl.textContent = '3:TABLE   4:EQN';
    } else if (state.activeMenu === 'SETUP') {
      exprTextEl.textContent = '1:MthIO 2:LineIO 3:Deg';
      lcdResultEl.textContent = '4:Rad   5:Gra    8:Norm';
    } else if (state.activeMenu === 'HYP') {
      exprTextEl.textContent = '1:sinh  2:cosh  3:tanh';
      lcdResultEl.textContent = '4:sinh⁻¹ 5:cosh⁻¹ 6:tanh⁻¹';
    } else if (state.activeMenu === 'CLR') {
      exprTextEl.textContent = 'Clear: 1:Setup 2:Memory';
      lcdResultEl.textContent = '3:All     [AC]:Cancel';
    } else if (state.activeMenu === 'DRG') {
      exprTextEl.textContent = 'Convert to: 1:Deg 2:Rad';
      lcdResultEl.textContent = '3:Gra     [AC]:Cancel';
    } else if (state.activeMenu === 'CONST') {
      exprTextEl.textContent = '1:c  2:h  3:G  4:e';
      lcdResultEl.textContent = '5:me 6:mp 7:k  8:R';
    }
    return;
  }

  // Error Handling
  if (state.errorActive) {
    exprTextEl.textContent = state.errorMsg;
    lcdResultEl.textContent = '[AC]:Cancel  [◀][▶]:Goto';
    lcdCursorEl.style.display = 'none';
    return;
  }

  // Expression & Cursor
  exprTextEl.textContent = state.expression;
  lcdCursorEl.style.display = 'inline-block';
  lcdResultEl.textContent = state.resultStr;
}

// -------------------------------------------------------------------------
// Actions
// -------------------------------------------------------------------------

function insertText(text) {
  state.expression = state.expression.slice(0, state.cursorPos) + text + state.expression.slice(state.cursorPos);
  state.cursorPos += text.length;
  updateLCD();
}

function deleteChar() {
  if (state.cursorPos > 0) {
    state.expression = state.expression.slice(0, state.cursorPos - 1) + state.expression.slice(state.cursorPos);
    state.cursorPos--;
    updateLCD();
  }
}

function calculateResult() {
  if (!state.expression.trim()) return;
  try {
    let res = evaluateMath(state.expression);
    state.resultVal = res;
    state.resultStr = formatNumber(res);
    state.registers.Ans = res;
    state.errorActive = false;

    state.history.push({ expr: state.expression, res: state.resultStr });
    state.historyIndex = state.history.length;
    state.sdCycle = 0;
  } catch (err) {
    state.errorActive = true;
    state.errorMsg = err.message || 'Math ERROR';
  }
  updateLCD();
}

function toggleSD() {
  if (state.resultVal === null || state.resultVal === undefined) return;
  const frac = toFraction(state.resultVal);
  if (!frac) return;

  state.sdCycle = (state.sdCycle + 1) % 3;
  if (state.sdCycle === 1) {
    state.resultStr = `${frac.num}⌟${frac.den}`;
  } else if (state.sdCycle === 2 && Math.abs(frac.num) > frac.den) {
    let sign = frac.num < 0 ? '-' : '';
    let whole = Math.floor(Math.abs(frac.num) / frac.den);
    let rem = Math.abs(frac.num) % frac.den;
    state.resultStr = `${sign}${whole}⌟${rem}⌟${frac.den}`;
  } else {
    state.resultStr = formatNumber(state.resultVal);
  }
  updateLCD();
}

function toggleDMS() {
  if (!state.dmsActive && state.resultVal !== null) {
    let deg = state.resultVal;
    let sign = deg < 0 ? '-' : '';
    let absDeg = Math.abs(deg);
    let d = Math.floor(absDeg);
    let remM = (absDeg - d) * 60;
    let m = Math.floor(remM);
    let s = Math.round((remM - m) * 60 * 100) / 100;
    state.resultStr = `${sign}${d}°${m}'${s}"`;
    state.dmsActive = true;
  } else {
    state.resultStr = formatNumber(state.resultVal);
    state.dmsActive = false;
  }
  updateLCD();
}

function pressKey(keyId) {
  if (keyId === 'ON') {
    state.isPoweredOn = true;
    state.expression = '';
    state.cursorPos = 0;
    state.resultStr = '0';
    state.errorActive = false;
    state.activeMenu = null;
    updateLCD();
    return;
  }

  if (!state.isPoweredOn) return;

  if (state.errorActive) {
    if (keyId === 'AC' || keyId === 'DEL') {
      state.errorActive = false;
      state.errorMsg = '';
      updateLCD();
    }
    return;
  }

  if (state.activeMenu) {
    handleMenu(keyId);
    return;
  }

  if (keyId === 'SHIFT') {
    state.shiftActive = !state.shiftActive;
    state.alphaActive = false;
    updateLCD();
    return;
  }
  if (keyId === 'ALPHA') {
    state.alphaActive = !state.alphaActive;
    state.shiftActive = false;
    updateLCD();
    return;
  }

  const isShift = state.shiftActive;
  const isAlpha = state.alphaActive;
  state.shiftActive = false;
  state.alphaActive = false;

  // SHIFT Actions
  if (isShift) {
    switch (keyId) {
      case 'AC': state.isPoweredOn = false; break;
      case 'MODE': state.activeMenu = 'SETUP'; break;
      case 'CALC': solveEquation(); break;
      case 'INTEGRAL': insertText('d/dx('); break;
      case 'RECIPROCAL': insertText('!'); break;
      case 'LOG_BASE': insertText('Σ('); break;
      case 'SQRT': insertText('³√('); break;
      case 'SQUARE': insertText('³'); break;
      case 'POWER': insertText('ˣ√('); break;
      case 'LOG': insertText('10^('); break;
      case 'LN': insertText('e^('); break;
      case 'SIN': insertText('sin⁻¹('); break;
      case 'COS': insertText('cos⁻¹('); break;
      case 'TAN': insertText('tan⁻¹('); break;
      case 'RCL': insertText('STO'); break;
      case 'LPAREN': insertText('%'); break;
      case 'RPAREN': insertText(','); break;
      case 'SD': toggleSD(); break;
      case 'M_PLUS': state.registers.M -= (state.resultVal || 0); break;
      case '7': state.activeMenu = 'CONST'; break;
      case '9': state.activeMenu = 'CLR'; break;
      case 'MUL': insertText(' nPr '); break;
      case 'DIV': insertText(' nCr '); break;
      case 'ADD': insertText('Pol('); break;
      case 'SUB': insertText('Rec('); break;
      case 'DOT': insertText('Ran#'); break;
      case 'EXP10': insertText('π'); break;
      case 'ANS': state.activeMenu = 'DRG'; break;
      default: insertText(keyId); break;
    }
    updateLCD();
    return;
  }

  // ALPHA Actions
  if (isAlpha) {
    switch (keyId) {
      case 'CALC': insertText('='); break;
      case 'INTEGRAL': insertText(':'); break;
      case 'NEG': insertText('A'); break;
      case 'DMS': insertText('B'); break;
      case 'HYP': insertText('C'); break;
      case 'SIN': insertText('D'); break;
      case 'COS': insertText('E'); break;
      case 'TAN': insertText('F'); break;
      case 'LPAREN': insertText('X'); break;
      case 'RPAREN': insertText('Y'); break;
      case 'SD': case 'M_PLUS': insertText('M'); break;
      case 'DOT': insertText('RanInt('); break;
      case 'EXP10': insertText('e'); break;
      default: break;
    }
    updateLCD();
    return;
  }

  // Primary Actions
  switch (keyId) {
    case '0': case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8': case '9':
      insertText(keyId);
      break;
    case 'DOT': insertText('.'); break;
    case 'ADD': insertText('+'); break;
    case 'SUB': insertText('−'); break;
    case 'MUL': insertText('×'); break;
    case 'DIV': insertText('÷'); break;
    case 'LPAREN': insertText('('); break;
    case 'RPAREN': insertText(')'); break;
    case 'NEG': insertText('−'); break;
    case 'EXP10': insertText('×10^('); break;
    case 'ANS': insertText('Ans'); break;
    case 'SIN': insertText('sin('); break;
    case 'COS': insertText('cos('); break;
    case 'TAN': insertText('tan('); break;
    case 'LN': insertText('ln('); break;
    case 'LOG': insertText('log('); break;
    case 'SQRT': insertText('√('); break;
    case 'SQUARE': insertText('²'); break;
    case 'POWER': insertText('^('); break;
    case 'RECIPROCAL': insertText('⁻¹'); break;
    case 'FRAC': insertText('⌟'); break;
    case 'INTEGRAL': insertText('∫('); break;
    case 'LOG_BASE': insertText('log_base('); break;
    case 'DMS': toggleDMS(); break;
    case 'HYP': state.activeMenu = 'HYP'; break;
    case 'SD': toggleSD(); break;
    case 'M_PLUS':
      state.registers.M += (state.resultVal || 0);
      state.resultStr = state.registers.M.toString();
      break;
    case 'CALC': calculateResult(); break;
    case 'MODE': state.activeMenu = 'MODE'; break;
    case 'DEL': deleteChar(); break;
    case 'AC':
      state.expression = '';
      state.cursorPos = 0;
      state.resultStr = '0';
      state.activeMenu = null;
      break;
    case 'EQUAL': calculateResult(); break;
    default: break;
  }
  updateLCD();
}

function pressDpad(direction) {
  if (direction === 'LEFT') {
    state.cursorPos = Math.max(0, state.cursorPos - 1);
  } else if (direction === 'RIGHT') {
    state.cursorPos = Math.min(state.expression.length, state.cursorPos + 1);
  } else if (direction === 'UP') {
    if (state.history.length && state.historyIndex > 0) {
      state.historyIndex--;
      const item = state.history[state.historyIndex];
      state.expression = item.expr;
      state.cursorPos = item.expr.length;
      state.resultStr = item.res;
    }
  } else if (direction === 'DOWN') {
    if (state.history.length && state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      const item = state.history[state.historyIndex];
      state.expression = item.expr;
      state.cursorPos = item.expr.length;
      state.resultStr = item.res;
    }
  }
  updateLCD();
}

function handleMenu(key) {
  if (key === 'AC') {
    state.activeMenu = null;
    updateLCD();
    return;
  }

  if (state.activeMenu === 'MODE') {
    state.activeMenu = null;
  } else if (state.activeMenu === 'SETUP') {
    if (key === '3') state.angleMode = 'DEG';
    if (key === '4') state.angleMode = 'RAD';
    if (key === '5') state.angleMode = 'GRAD';
    state.activeMenu = null;
  } else if (state.activeMenu === 'HYP') {
    const hypMap = { '1': 'sinh(', '2': 'cosh(', '3': 'tanh(', '4': 'sinh⁻¹(', '5': 'cosh⁻¹(', '6': 'tanh⁻¹(' };
    if (hypMap[key]) insertText(hypMap[key]);
    state.activeMenu = null;
  } else if (state.activeMenu === 'CLR') {
    if (key === '2' || key === '3') {
      state.registers.M = 0;
      Object.keys(state.registers).forEach(k => state.registers[k] = 0);
      state.expression = '';
      state.cursorPos = 0;
      state.resultStr = '0';
    }
    state.activeMenu = null;
  } else if (state.activeMenu === 'DRG') {
    if (key === '1') state.angleMode = 'DEG';
    if (key === '2') state.angleMode = 'RAD';
    if (key === '3') state.angleMode = 'GRAD';
    state.activeMenu = null;
  } else if (state.activeMenu === 'CONST') {
    if (CONSTANTS[key]) insertText(CONSTANTS[key].val.toString());
    state.activeMenu = null;
  }
  updateLCD();
}

function solveEquation() {
  let eq = state.expression;
  if (!eq) eq = '2X-6=0';
  let fStr = eq.includes('=') ? `(${eq.split('=')[0]}) - (${eq.split('=')[1]})` : eq;
  let x0 = 0, x1 = 0.001;

  for (let i = 0; i < 50; i++) {
    state.registers.X = x0;
    let y0 = evaluateMath(fStr);
    state.registers.X = x1;
    let y1 = evaluateMath(fStr);
    if (Math.abs(y1) < 1e-9) {
      state.resultStr = `X=${formatNumber(x1)}`;
      updateLCD();
      return;
    }
    let denom = y1 - y0;
    if (Math.abs(denom) < 1e-14) break;
    let x2 = x1 - y1 * (x1 - x0) / denom;
    x0 = x1;
    x1 = x2;
  }
  state.resultStr = `X=${formatNumber(x1)}`;
  updateLCD();
}

// -------------------------------------------------------------------------
// Physical Keyboard Listener
// -------------------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  const key = e.key;

  if (key >= '0' && key <= '9') pressKey(key);
  else if (key === '.') pressKey('DOT');
  else if (key === '+') pressKey('ADD');
  else if (key === '-') pressKey('SUB');
  else if (key === '*') pressKey('MUL');
  else if (key === '/') pressKey('DIV');
  else if (key === '(') pressKey('LPAREN');
  else if (key === ')') pressKey('RPAREN');
  else if (key === 'Enter' || key === '=') { e.preventDefault(); pressKey('EQUAL'); }
  else if (key === 'Backspace') { e.preventDefault(); pressKey('DEL'); }
  else if (key === 'Escape' || key === 'Delete') pressKey('AC');
  else if (key === 'ArrowLeft') pressDpad('LEFT');
  else if (key === 'ArrowRight') pressDpad('RIGHT');
  else if (key === 'ArrowUp') pressDpad('UP');
  else if (key === 'ArrowDown') pressDpad('DOWN');
  else if (key === 's') pressKey('SIN');
  else if (key === 'c') pressKey('COS');
  else if (key === 't') pressKey('TAN');
  else if (key === 'l') pressKey('LN');
  else if (key === 'g') pressKey('LOG');
  else if (key === 'r') pressKey('SQRT');
  else if (key === 'p') insertText('π');
  else if (key === 'e') insertText('e');
  else if (key === '^') insertText('^(');
});

// Initialize on load
updateLCD();

