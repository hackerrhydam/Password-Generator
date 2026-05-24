/**
 * script.js — Secure Password Generator (UI Layer)
 * ==================================================
 * Handles all DOM interactions for index.html.
 * Depends on generator.js being loaded first (window.PwdGen).
 *
 * Responsibilities:
 *   - Slider sync & live entropy preview
 *   - Password generation & output rendering
 *   - Tab switching for source code panels
 *   - Copy-to-clipboard (single & all)
 *   - Mobile hamburger menu
 *   - Code panel population via highlighter
 */

'use strict';

/* ── SHORTHAND ───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const { buildPool, generateMultiple, calculateEntropy, checkStrength } = window.PwdGen;

/* ══════════════════════════════════════════════════════════════
   SLIDERS — sync display values and update entropy preview
   ══════════════════════════════════════════════════════════════ */
function syncSliders() {
  $('lenSlider').addEventListener('input', e => {
    $('lenDisplay').textContent = e.target.value;
    updateEntropyPreview();
  });
  $('cntSlider').addEventListener('input', e => {
    $('cntDisplay').textContent = e.target.value;
  });
}

/* ══════════════════════════════════════════════════════════════
   LIVE ENTROPY PREVIEW
   Updates whenever length or character-type toggles change
   ══════════════════════════════════════════════════════════════ */
function updateEntropyPreview() {
  const length = parseInt($('lenSlider').value);
  let pool;
  try {
    pool = buildPool({
      upper:            $('useUpper').checked,
      lower:            $('useLower').checked,
      digits:           $('useDigits').checked,
      symbols:          $('useSymbols').checked,
      excludeAmbiguous: $('noAmbig').checked,
    });
  } catch {
    $('epVal').textContent    = '—';
    $('epRating').textContent = 'Select a character type';
    $('epFill').style.width   = '0%';
    return;
  }

  const bits = calculateEntropy(length, pool.length);
  const s    = checkStrength(bits);

  $('epVal').textContent          = `${bits.toFixed(1)} bits`;
  $('epVal').style.color          = s.color;
  $('epRating').textContent       = s.label;
  $('epRating').style.color       = s.color;
  $('epFill').style.width         = `${s.pct}%`;
  $('epFill').style.background    = s.color;
}

// Wire toggles to entropy preview
function wireToggles() {
  ['useUpper','useLower','useDigits','useSymbols','noAmbig'].forEach(id => {
    $(id).addEventListener('change', updateEntropyPreview);
  });
}

/* ══════════════════════════════════════════════════════════════
   PASSWORD GENERATION
   ══════════════════════════════════════════════════════════════ */
function runGenerator() {
  const length = parseInt($('lenSlider').value);
  const count  = parseInt($('cntSlider').value);
  const noDup  = $('noDup').checked;

  let pool;
  try {
    pool = buildPool({
      upper:            $('useUpper').checked,
      lower:            $('useLower').checked,
      digits:           $('useDigits').checked,
      symbols:          $('useSymbols').checked,
      excludeAmbiguous: $('noAmbig').checked,
    });
  } catch (e) {
    flashError(e.message); return;
  }
  if (noDup && length > pool.length) {
    flashError(`No-duplicates requires length (${length}) ≤ pool size (${pool.length}).`);
    return;
  }

  let passwords;
  try {
    passwords = generateMultiple(count, length, pool, noDup);
  } catch (e) {
    flashError(e.message); return;
  }

  // Build output
  const out = $('termOutput');
  out.innerHTML = `
    <div style="color:#58a6ff;font-family:var(--mono);font-size:.75rem;margin-bottom:1.2rem;line-height:1.8">
      Pool: <span style="color:var(--green)">${pool.length} chars</span>
      &nbsp;·&nbsp; Length: <span style="color:var(--green)">${length}</span>
      &nbsp;·&nbsp; Count: <span style="color:var(--green)">${count}</span>
      &nbsp;·&nbsp; Mode: <span style="color:var(--amber)">${noDup ? 'no-dup' : 'standard'}</span>
    </div>`;

  passwords.forEach((pw, i) => {
    const bits = calculateEntropy(length, pool.length);
    const s    = checkStrength(bits);

    const el = document.createElement('div');
    el.className = 'pw-entry';
    el.style.animationDelay = `${i * 0.055}s`;
    el.dataset.pw = pw;
    el.innerHTML = `
      <div class="pw-string" title="Click to copy" tabindex="0"
           onclick="copyPassword(this)" onkeydown="if(event.key==='Enter')copyPassword(this)">
        ${escHtml(pw)}
      </div>
      <div class="pw-meta">
        [${i + 1}] &nbsp; Entropy: ${bits.toFixed(1)} bits &nbsp;·&nbsp; Pool: ${pool.length}
      </div>
      <div class="pw-bar" style="width:${s.pct}%; background:${s.color}"></div>
      <div class="pw-strength" style="color:${s.color}">${s.label} — ${s.description}</div>
    `;
    out.appendChild(el);
  });
}

function flashError(msg) {
  const out = $('termOutput');
  out.innerHTML = `
    <div style="color:var(--red);font-family:var(--mono);font-size:.82rem;line-height:1.8">
      ✖ &nbsp;${escHtml(msg)}<br><br>
      <span style="color:var(--muted)">Adjust your settings and try again.</span>
    </div>`;
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ── COPY PASSWORD ───────────────────────────────────────────── */
function copyPassword(el) {
  const text = el.textContent.trim();
  navigator.clipboard.writeText(text).then(() => showToast('✓ Copied!'));
}

/* ── COPY ALL ────────────────────────────────────────────────── */
function copyAllPasswords() {
  const entries = document.querySelectorAll('.pw-string');
  if (!entries.length) return;
  const all = [...entries].map(e => e.textContent.trim()).join('\n');
  navigator.clipboard.writeText(all).then(() => showToast(`✓ Copied ${entries.length} passwords!`));
}

/* ── CLEAR OUTPUT ────────────────────────────────────────────── */
function clearOutput() {
  $('termOutput').innerHTML = `
    <div class="term-welcome" style="color:var(--muted);font-family:var(--mono);font-size:.78rem">
      Output cleared. Generate new passwords above.
    </div>`;
}

/* ── TOAST ───────────────────────────────────────────────────── */
let _toastTimer;
function showToast(msg) {
  const t = $('copyToast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ══════════════════════════════════════════════════════════════
   TAB SWITCHING — Source Code section
   ══════════════════════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   MOBILE HAMBURGER MENU
   ══════════════════════════════════════════════════════════════ */
function initMobileMenu() {
  const btn  = $('hamburger');
  const menu = $('mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('open'));
}
function closeMobile() {
  const menu = $('mobileMenu');
  if (menu) menu.classList.remove('open');
}

/* ══════════════════════════════════════════════════════════════
   CODE PANELS — populate with syntax-highlighted snippets
   Each string mirrors the matching section in password_generator.py
   ══════════════════════════════════════════════════════════════ */
const CODE_SNIPPETS = {
  't1': `<span class="cm"># ── CHARACTER POOLS ──────────────────────────────────────────</span>

<span class="kw">import</span> <span class="nm">secrets</span>
<span class="kw">import</span> <span class="nm">string</span>
<span class="kw">import</span> <span class="nm">math</span>

<span class="nm">UPPERCASE</span>  = <span class="nm">string</span>.<span class="fn">ascii_uppercase</span>          <span class="cm"># A–Z  (26 chars)</span>
<span class="nm">LOWERCASE</span>  = <span class="nm">string</span>.<span class="fn">ascii_lowercase</span>          <span class="cm"># a–z  (26 chars)</span>
<span class="nm">DIGITS</span>     = <span class="nm">string</span>.<span class="fn">digits</span>                   <span class="cm"># 0–9  (10 chars)</span>
<span class="nm">SYMBOLS</span>    = <span class="st">"!@#$%^&amp;*()-_=+[]{}|;:,&lt;&gt;?"</span>    <span class="cm"># Special (30 chars)</span>
<span class="nm">AMBIGUOUS</span>  = <span class="kw">set</span>(<span class="st">"0Ol1I"</span>)                    <span class="cm"># Visually confusing</span>


<span class="kw">def</span> <span class="fn">build_pool</span>(<span class="nm">use_upper</span>=<span class="nb">True</span>, <span class="nm">use_lower</span>=<span class="nb">True</span>,
               <span class="nm">use_digits</span>=<span class="nb">True</span>, <span class="nm">use_symbols</span>=<span class="nb">True</span>,
               <span class="nm">exclude_ambiguous</span>=<span class="nb">False</span>):
    <span class="st">"""Build the character pool based on selected options."""</span>
    <span class="nm">pool</span> = <span class="st">""</span>
    <span class="kw">if</span> <span class="nm">use_upper</span>:   <span class="nm">pool</span> += <span class="nm">UPPERCASE</span>
    <span class="kw">if</span> <span class="nm">use_lower</span>:   <span class="nm">pool</span> += <span class="nm">LOWERCASE</span>
    <span class="kw">if</span> <span class="nm">use_digits</span>:  <span class="nm">pool</span> += <span class="nm">DIGITS</span>
    <span class="kw">if</span> <span class="nm">use_symbols</span>: <span class="nm">pool</span> += <span class="nm">SYMBOLS</span>

    <span class="kw">if not</span> <span class="nm">pool</span>:
        <span class="kw">raise</span> <span class="fn">ValueError</span>(<span class="st">"At least one character type must be selected."</span>)

    <span class="kw">if</span> <span class="nm">exclude_ambiguous</span>:
        <span class="nm">pool</span> = <span class="st">""</span>.<span class="fn">join</span>(<span class="nm">c</span> <span class="kw">for</span> <span class="nm">c</span> <span class="kw">in</span> <span class="nm">pool</span> <span class="kw">if</span> <span class="nm">c</span> <span class="kw">not in</span> <span class="nm">AMBIGUOUS</span>)

    <span class="cm"># Deduplicate while preserving insertion order</span>
    <span class="nm">seen</span>, <span class="nm">unique_pool</span> = <span class="kw">set</span>(), <span class="st">""</span>
    <span class="kw">for</span> <span class="nm">c</span> <span class="kw">in</span> <span class="nm">pool</span>:
        <span class="kw">if</span> <span class="nm">c</span> <span class="kw">not in</span> <span class="nm">seen</span>:
            <span class="nm">seen</span>.<span class="fn">add</span>(<span class="nm">c</span>)
            <span class="nm">unique_pool</span> += <span class="nm">c</span>
    <span class="kw">return</span> <span class="nm">unique_pool</span>`,

  't2': `<span class="cm"># ── CORE GENERATOR ───────────────────────────────────────────</span>

<span class="kw">def</span> <span class="fn">generate_password</span>(<span class="nm">length</span>=<span class="nb">16</span>, <span class="nm">pool</span>=<span class="nb">None</span>, <span class="nm">no_duplicates</span>=<span class="nb">False</span>,
                      <span class="nm">use_upper</span>=<span class="nb">True</span>, <span class="nm">use_lower</span>=<span class="nb">True</span>,
                      <span class="nm">use_digits</span>=<span class="nb">True</span>, <span class="nm">use_symbols</span>=<span class="nb">True</span>,
                      <span class="nm">exclude_ambiguous</span>=<span class="nb">False</span>):
    <span class="st">"""Generate a single cryptographically secure password."""</span>
    <span class="kw">if</span> <span class="nm">pool</span> <span class="kw">is</span> <span class="nb">None</span>:
        <span class="nm">pool</span> = <span class="fn">build_pool</span>(<span class="nm">use_upper</span>, <span class="nm">use_lower</span>,
                          <span class="nm">use_digits</span>, <span class="nm">use_symbols</span>, <span class="nm">exclude_ambiguous</span>)

    <span class="kw">if</span> <span class="nm">no_duplicates</span>:
        <span class="kw">if</span> <span class="nm">length</span> > <span class="kw">len</span>(<span class="nm">pool</span>):
            <span class="kw">raise</span> <span class="fn">ValueError</span>(
                <span class="st">f"No-duplicates mode requires length ({length}) ≤ "</span>
                <span class="st">f"pool size ({len(pool)})."</span>
            )
        <span class="cm"># Fisher-Yates shuffle using secrets.randbelow()</span>
        <span class="nm">pool_list</span> = <span class="kw">list</span>(<span class="nm">pool</span>)
        <span class="kw">for</span> <span class="nm">i</span> <span class="kw">in</span> <span class="fn">range</span>(<span class="kw">len</span>(<span class="nm">pool_list</span>) - <span class="nb">1</span>, <span class="nb">0</span>, -<span class="nb">1</span>):
            <span class="nm">j</span> = <span class="nm">secrets</span>.<span class="fn">randbelow</span>(<span class="nm">i</span> + <span class="nb">1</span>)
            <span class="nm">pool_list</span>[<span class="nm">i</span>], <span class="nm">pool_list</span>[<span class="nm">j</span>] = <span class="nm">pool_list</span>[<span class="nm">j</span>], <span class="nm">pool_list</span>[<span class="nm">i</span>]
        <span class="kw">return</span> <span class="st">""</span>.<span class="fn">join</span>(<span class="nm">pool_list</span>[:<span class="nm">length</span>])

    <span class="cm"># Standard: independent sampling (maximum entropy)</span>
    <span class="kw">return</span> <span class="st">""</span>.<span class="fn">join</span>(<span class="nm">secrets</span>.<span class="fn">choice</span>(<span class="nm">pool</span>) <span class="kw">for</span> _ <span class="kw">in</span> <span class="fn">range</span>(<span class="nm">length</span>))


<span class="kw">def</span> <span class="fn">generate_multiple</span>(<span class="nm">count</span>=<span class="nb">5</span>, **<span class="nm">kwargs</span>):
    <span class="st">"""Generate multiple passwords with the same settings."""</span>
    <span class="kw">return</span> [<span class="fn">generate_password</span>(**<span class="nm">kwargs</span>) <span class="kw">for</span> _ <span class="kw">in</span> <span class="fn">range</span>(<span class="nm">count</span>)]`,

  't3': `<span class="cm"># ── STRENGTH CHECKER ─────────────────────────────────────────</span>

<span class="kw">def</span> <span class="fn">calculate_entropy</span>(<span class="nm">password</span>, <span class="nm">pool_size</span>):
    <span class="st">"""H = L × log₂(N)  (Shannon entropy in bits)"""</span>
    <span class="kw">if</span> <span class="nm">pool_size</span> &lt;= <span class="nb">1</span>:
        <span class="kw">return</span> <span class="nb">0</span>
    <span class="kw">return</span> <span class="kw">len</span>(<span class="nm">password</span>) * <span class="nm">math</span>.<span class="fn">log2</span>(<span class="nm">pool_size</span>)


<span class="kw">def</span> <span class="fn">check_strength</span>(<span class="nm">password</span>, <span class="nm">pool_size</span>):
    <span class="nm">bits</span> = <span class="fn">calculate_entropy</span>(<span class="nm">password</span>, <span class="nm">pool_size</span>)

    <span class="kw">if</span>   <span class="nm">bits</span> &lt;  <span class="nb">40</span>:  <span class="kw">return</span> <span class="st">"Very Weak"</span>,   <span class="st">"Easily cracked."</span>,           <span class="nm">bits</span>
    <span class="kw">elif</span> <span class="nm">bits</span> &lt;  <span class="nb">60</span>:  <span class="kw">return</span> <span class="st">"Weak"</span>,         <span class="st">"Vulnerable to brute force."</span>,  <span class="nm">bits</span>
    <span class="kw">elif</span> <span class="nm">bits</span> &lt;  <span class="nb">80</span>:  <span class="kw">return</span> <span class="st">"Fair"</span>,          <span class="st">"OK for low-risk accounts."</span>,   <span class="nm">bits</span>
    <span class="kw">elif</span> <span class="nm">bits</span> &lt; <span class="nb">100</span>:  <span class="kw">return</span> <span class="st">"Strong"</span>,        <span class="st">"Good for most purposes."</span>,     <span class="nm">bits</span>
    <span class="kw">elif</span> <span class="nm">bits</span> &lt; <span class="nb">128</span>:  <span class="kw">return</span> <span class="st">"Very Strong"</span>,   <span class="st">"Excellent."</span>,                <span class="nm">bits</span>
    <span class="kw">else</span>:             <span class="kw">return</span> <span class="st">"Excellent"</span>,     <span class="st">"Near-uncrackable."</span>,          <span class="nm">bits</span>


<span class="kw">def</span> <span class="fn">strength_bar</span>(<span class="nm">bits</span>, <span class="nm">width</span>=<span class="nb">30</span>):
    <span class="st">"""ASCII progress bar: █ filled, ░ empty, 30-char wide."""</span>
    <span class="nm">max_bits</span> = <span class="nb">128</span>
    <span class="nm">filled</span>   = <span class="kw">min</span>(<span class="kw">int</span>((<span class="nm">bits</span> / <span class="nm">max_bits</span>) * <span class="nm">width</span>), <span class="nm">width</span>)
    <span class="nm">bar</span>      = <span class="st">"█"</span> * <span class="nm">filled</span> + <span class="st">"░"</span> * (<span class="nm">width</span> - <span class="nm">filled</span>)
    <span class="kw">return</span> <span class="st">f"[{bar}]"</span>


<span class="kw">def</span> <span class="fn">print_password_result</span>(<span class="nm">password</span>, <span class="nm">pool_size</span>, <span class="nm">index</span>=<span class="nb">None</span>):
    <span class="nm">rating</span>, <span class="nm">description</span>, <span class="nm">bits</span> = <span class="fn">check_strength</span>(<span class="nm">password</span>, <span class="nm">pool_size</span>)
    <span class="nm">bar</span>    = <span class="fn">strength_bar</span>(<span class="nm">bits</span>)
    <span class="nm">prefix</span> = <span class="st">f"  [{index}] "</span> <span class="kw">if</span> <span class="nm">index</span> <span class="kw">is not</span> <span class="nb">None</span> <span class="kw">else</span> <span class="st">"  "</span>
    <span class="fn">print</span>(<span class="st">f"{prefix}{password}"</span>)
    <span class="fn">print</span>(<span class="st">f"       Strength : {rating} — {description}"</span>)
    <span class="fn">print</span>(<span class="st">f"       Entropy  : {bits:.1f} bits  {bar}"</span>)
    <span class="fn">print</span>()`,

  't4': `<span class="cm"># ── INTERACTIVE MENU ─────────────────────────────────────────</span>

<span class="kw">def</span> <span class="fn">interactive_menu</span>():
    <span class="fn">print_banner</span>()

    <span class="kw">while</span> <span class="nb">True</span>:
        <span class="fn">print</span>(<span class="st">"═" * 60</span>)
        <span class="fn">print</span>(<span class="st">"  CONFIGURE YOUR PASSWORD"</span>)
        <span class="fn">print</span>(<span class="st">"═" * 60</span>)

        <span class="nm">length</span>     = <span class="fn">get_int_input</span>(<span class="st">"Password length"</span>, default=<span class="nb">16</span>,
                                   min_val=<span class="nb">4</span>, max_val=<span class="nb">256</span>)
        <span class="nm">use_upper</span>  = <span class="fn">get_bool_input</span>(<span class="st">"Uppercase letters (A-Z)"</span>)
        <span class="nm">use_lower</span>  = <span class="fn">get_bool_input</span>(<span class="st">"Lowercase letters (a-z)"</span>)
        <span class="nm">use_digits</span> = <span class="fn">get_bool_input</span>(<span class="st">"Digits (0-9)"</span>)
        <span class="nm">use_sym</span>    = <span class="fn">get_bool_input</span>(<span class="st">"Symbols (!@#$...)"</span>)
        <span class="nm">exc_amb</span>    = <span class="fn">get_bool_input</span>(<span class="st">"Exclude ambiguous chars"</span>, default=<span class="nb">False</span>)
        <span class="nm">no_dup</span>     = <span class="fn">get_bool_input</span>(<span class="st">"No duplicate characters"</span>,  default=<span class="nb">False</span>)
        <span class="nm">count</span>      = <span class="fn">get_int_input</span>(<span class="st">"Number of passwords"</span>, default=<span class="nb">1</span>,
                                   min_val=<span class="nb">1</span>, max_val=<span class="nb">50</span>)

        <span class="kw">try</span>:
            <span class="nm">pool</span>      = <span class="fn">build_pool</span>(<span class="nm">use_upper</span>, <span class="nm">use_lower</span>, <span class="nm">use_digits</span>,
                                    <span class="nm">use_sym</span>, <span class="nm">exc_amb</span>)
            <span class="nm">passwords</span> = <span class="fn">generate_multiple</span>(
                count=<span class="nm">count</span>, length=<span class="nm">length</span>,
                pool=<span class="nm">pool</span>, no_duplicates=<span class="nm">no_dup</span>
            )
        <span class="kw">except</span> <span class="fn">ValueError</span> <span class="kw">as</span> <span class="nm">e</span>:
            <span class="fn">print</span>(<span class="st">f"\\n  ✖  Error: {e}\\n"</span>)
            <span class="kw">continue</span>

        <span class="kw">for</span> <span class="nm">i</span>, <span class="nm">pw</span> <span class="kw">in</span> <span class="fn">enumerate</span>(<span class="nm">passwords</span>, <span class="nb">1</span>):
            <span class="fn">print_password_result</span>(<span class="nm">pw</span>, <span class="kw">len</span>(<span class="nm">pool</span>), index=<span class="nm">i</span>)

        <span class="nm">again</span> = <span class="fn">input</span>(<span class="st">"  Generate again? [Y/n]: "</span>).<span class="fn">strip</span>().<span class="fn">lower</span>()
        <span class="kw">if</span> <span class="nm">again</span> <span class="kw">in</span> (<span class="st">"n"</span>, <span class="st">"no"</span>):
            <span class="fn">print</span>(<span class="st">"\\n  Stay secure! 🔐\\n"</span>)
            <span class="kw">break</span>
        <span class="fn">print</span>()`,

  't5': `<span class="cm"># ── CLI MODE ─────────────────────────────────────────────────</span>

<span class="kw">def</span> <span class="fn">cli_mode</span>():
    <span class="nm">parser</span> = <span class="nm">argparse</span>.<span class="fn">ArgumentParser</span>(
        description=<span class="st">"Secure Password Generator"</span>,
        formatter_class=<span class="nm">argparse</span>.<span class="fn">RawDescriptionHelpFormatter</span>
    )
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"-l"</span>, <span class="st">"--length"</span>,           type=<span class="kw">int</span>, default=<span class="nb">16</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"-n"</span>, <span class="st">"--count"</span>,            type=<span class="kw">int</span>, default=<span class="nb">1</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--no-upper"</span>,             action=<span class="st">"store_true"</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--no-lower"</span>,             action=<span class="st">"store_true"</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--no-digits"</span>,            action=<span class="st">"store_true"</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--no-symbols"</span>,           action=<span class="st">"store_true"</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--exclude-ambiguous"</span>,    action=<span class="st">"store_true"</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--no-duplicates"</span>,        action=<span class="st">"store_true"</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--only-digits"</span>,          action=<span class="st">"store_true"</span>)
    <span class="nm">parser</span>.<span class="fn">add_argument</span>(<span class="st">"--quiet"</span>,                action=<span class="st">"store_true"</span>)

    <span class="nm">args</span> = <span class="nm">parser</span>.<span class="fn">parse_args</span>()

    <span class="nm">use_upper</span>   = <span class="kw">not</span> <span class="nm">args</span>.<span class="nm">no_upper</span>
    <span class="nm">use_lower</span>   = <span class="kw">not</span> <span class="nm">args</span>.<span class="nm">no_lower</span>
    <span class="nm">use_digits</span>  = <span class="kw">not</span> <span class="nm">args</span>.<span class="nm">no_digits</span> <span class="kw">or</span> <span class="nm">args</span>.<span class="nm">only_digits</span>
    <span class="nm">use_symbols</span> = <span class="kw">not</span> <span class="nm">args</span>.<span class="nm">no_symbols</span> <span class="kw">and not</span> <span class="nm">args</span>.<span class="nm">only_digits</span>

    <span class="kw">if</span> <span class="nm">args</span>.<span class="nm">only_digits</span>:
        <span class="nm">use_upper</span> = <span class="nm">use_lower</span> = <span class="nm">use_symbols</span> = <span class="nb">False</span>

    <span class="kw">try</span>:
        <span class="nm">pool</span>      = <span class="fn">build_pool</span>(<span class="nm">use_upper</span>, <span class="nm">use_lower</span>, <span class="nm">use_digits</span>,
                               <span class="nm">use_symbols</span>, <span class="nm">args</span>.<span class="nm">exclude_ambiguous</span>)
        <span class="nm">passwords</span> = <span class="fn">generate_multiple</span>(
            count=<span class="nm">args</span>.<span class="nm">count</span>, length=<span class="nm">args</span>.<span class="nm">length</span>,
            pool=<span class="nm">pool</span>, no_duplicates=<span class="nm">args</span>.<span class="nm">no_duplicates</span>
        )
    <span class="kw">except</span> <span class="fn">ValueError</span> <span class="kw">as</span> <span class="nm">e</span>:
        <span class="fn">print</span>(<span class="st">f"Error: {e}"</span>, file=<span class="nm">sys</span>.<span class="nm">stderr</span>)
        <span class="nm">sys</span>.<span class="fn">exit</span>(<span class="nb">1</span>)

    <span class="kw">if</span> <span class="nm">args</span>.<span class="nm">quiet</span>:
        <span class="kw">for</span> <span class="nm">pw</span> <span class="kw">in</span> <span class="nm">passwords</span>: <span class="fn">print</span>(<span class="nm">pw</span>)
    <span class="kw">else</span>:
        <span class="fn">print_banner</span>()
        <span class="fn">print</span>(<span class="st">f"  Length: {args.length}  |  Count: {args.count}  |  Pool: {len(pool)} chars\\n"</span>)
        <span class="kw">for</span> <span class="nm">i</span>, <span class="nm">pw</span> <span class="kw">in</span> <span class="fn">enumerate</span>(<span class="nm">passwords</span>, <span class="nb">1</span>):
            <span class="fn">print_password_result</span>(<span class="nm">pw</span>, <span class="kw">len</span>(<span class="nm">pool</span>), index=<span class="nm">i</span> <span class="kw">if</span> <span class="nm">args</span>.<span class="nm">count</span> > <span class="nb">1</span> <span class="kw">else</span> <span class="nb">None</span>)


<span class="cm"># ── ENTRY POINT ──────────────────────────────────────────────</span>
<span class="kw">if</span> __<span class="nm">name</span>__ == <span class="st">"__main__"</span>:
    <span class="kw">if</span> <span class="kw">len</span>(<span class="nm">sys</span>.<span class="nm">argv</span>) > <span class="nb">1</span>:
        <span class="fn">cli_mode</span>()          <span class="cm"># Arguments present → CLI mode</span>
    <span class="kw">else</span>:
        <span class="kw">try</span>:
            <span class="fn">interactive_menu</span>()
        <span class="kw">except</span> <span class="fn">KeyboardInterrupt</span>:
            <span class="fn">print</span>(<span class="st">"\\n\\n  Exited. Stay secure! 🔐\\n"</span>)
            <span class="nm">sys</span>.<span class="fn">exit</span>(<span class="nb">0</span>)`,
};

function populateCodePanels() {
  Object.entries(CODE_SNIPPETS).forEach(([id, html]) => {
    const el = document.getElementById(`code-${id}`);
    if (el) el.innerHTML = html;
  });
}

/* ══════════════════════════════════════════════════════════════
   INIT — wire everything up on DOMContentLoaded
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  syncSliders();
  wireToggles();
  initTabs();
  initMobileMenu();
  populateCodePanels();
  updateEntropyPreview();

  // Button event listeners
  $('genBtn').addEventListener('click', runGenerator);
  $('clearBtn').addEventListener('click', clearOutput);
  $('copyAllBtn').addEventListener('click', copyAllPasswords);

  // Auto-generate on load so the terminal isn't empty
  runGenerator();
});

/* ── EXPOSE helpers called from inline HTML attributes ───────── */
window.copyPassword  = copyPassword;
window.closeMobile   = closeMobile;
