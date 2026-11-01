<<<<<<< HEAD
# casio-calculator
=======
# CASIO fx-991ES PLUS (2nd Edition) Web Calculator

A web-based scientific calculator replicating the physical **CASIO fx-991ES PLUS (2nd edition, Pink)** using pure **HTML5, CSS3, and modern JavaScript**.

---

## 🌟 Key Features

1. **Authentic Hardware Aesthetic**:
   - Pink / dusty rose chassis with realistic drop-shadows and bevels.
   - Dual-row olive green LCD display with active status indicators (`S`, `A`, `M`, `STO`, `RCL`, `D`, `R`, `Math`, `▲`, `▼`).
   - Integrated solar panel simulation with glass reflection.
   - 4-way mauve directional D-Pad.
   - Authentic color scheme: Mauve navigation/numeric buttons, white scientific function buttons, and green `DEL` and `AC` buttons.
   - Accurate secondary function printings (Gold for **SHIFT**, Red for **ALPHA**).

2. **Full Scientific Calculation Engine**:
   - **Basic & Advanced Arithmetic**: Operations with brackets, implicit multiplications (`2π`, `3(4)`), powers (`x²`, `x³`, `xʸ`), roots (`√`, `³√`, `ˣ√`), reciprocals (`x⁻¹`), factorials (`x!`).
   - **Trigonometry**: `sin`, `cos`, `tan`, and their inverses (`sin⁻¹`, `cos⁻¹`, `tan⁻¹`) in both **DEG** and **RAD** angle modes.
   - **Hyperbolic**: `sinh`, `cosh`, `tanh`, `sinh⁻¹`, `cosh⁻¹`, `tanh⁻¹`.
   - **Logarithms**: Common logarithm (`log`), natural logarithm (`ln`), and custom base log (`log_b(x)`).
   - **Fractions & Exact Math**: Natural fraction notation (`1⌟2 + 3⌟4 = 5⌟4`) with real-time toggle via `S<=>D`.
   - **Combinatorics & Probability**: Permutations (`nPr`), Combinations (`nCr`), `Ran#`, and `RanInt#`.
   - **Calculus & Summation**: Numerical derivative (`d/dx`), definite numerical integral (`∫dx`), and finite summation (`Σ`).
   - **Equation Solving**: Numerical Newton-Raphson solver via `SOLVE` (`SHIFT` + `CALC`).
   - **Memory & Registers**: Independent memory (`M+`, `M-`, `MR`), variable storage registers (`A`–`F`, `X`, `Y`).
   - **History Navigation**: Up (`▲`) and Down (`▼`) keys to scroll through past expressions and results.

3. **Responsive Design**:
   - Fluid auto-scaling with CSS `clamp()` for desktop, tablet, and mobile displays.
   - Screen height constraints handling for laptops and landscape mode.
   - Touch-optimized with `touch-action: manipulation` (no double-tap delay).

4. **Keyboard Input Support**:
   - `0`–`9`, `+`, `-`, `*`, `/`, `^`, `Enter` (`=`), `Backspace` (`DEL`), `Escape` (`AC`), `s` (`sin`), `c` (`cos`), `t` (`tan`), `l` (`log`), `p` (`π`), `e` (`e`).

---

## 🚀 How to Run

No installations, build steps, or server dependencies are needed.

1. **Directly in Browser**:
   Double click [`index.html`](file:///d:/casio%20calculator/index.html) to open it in Chrome, Edge, Firefox, or Safari.

2. **In VS Code**:
   Right-click [`index.html`](file:///d:/casio%20calculator/index.html) and select **Open with Live Server** (or open it with your default browser).

---

## 📁 File Structure

```
d:\casio calculator\
├── index.html       # HTML5 semantic structure & calculator UI markup
├── style.css        # Responsive CSS3 styling & Casio hardware theme
├── script.js        # Mathematical parser, solver, and state manager
└── README.md        # Documentation
```

>>>>>>> f7d8ef9 (initial commit)
