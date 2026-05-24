/**
 * generator.js — Secure Password Generator (Core Logic)
 * ======================================================
 * A faithful JavaScript port of password_generator.py.
 * Uses crypto.getRandomValues() — the browser equivalent
 * of Python's secrets module (both wrap the OS CSPRNG).
 *
 * This file has zero UI dependencies and can be imported
 * anywhere: browser, Node.js (with webcrypto), or bundlers.
 *
 * Exported API:
 *   buildPool(opts)              → string
 *   generatePassword(length, pool, noDup) → string
 *   generateMultiple(count, length, pool, noDup) → string[]
 *   calculateEntropy(length, poolSize) → number
 *   checkStrength(bits)          → { label, description, color, pct }
 *   CHAR_POOLS                   → { UPPER, LOWER, DIGITS, SYMBOLS, AMBIGUOUS }
 */

'use strict';

/* ── CHARACTER POOLS ─────────────────────────────────────────── */
const CHAR_POOLS = Object.freeze({
  UPPER   : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',          // A–Z  (26)
  LOWER   : 'abcdefghijklmnopqrstuvwxyz',          // a–z  (26)
  DIGITS  : '0123456789',                           // 0–9  (10)
  SYMBOLS : '!@#$%^&*()-_=+[]{}|;:,.<>?',          // sym  (30)
  AMBIGUOUS: new Set(['0','O','l','1','I']),         // visually confusing
});

/* ── CRYPTOGRAPHICALLY SECURE RANDOM INTEGER ─────────────────── */
/**
 * Returns a uniformly random integer in [0, max).
 * Uses rejection sampling to eliminate modulo bias —
 * identical approach to Python's secrets.randbelow().
 *
 * @param {number} max - Exclusive upper bound (must be > 0)
 * @returns {number}
 */
function secureRandBelow(max) {
  if (max <= 0) throw new RangeError('max must be > 0');
  const limit = Math.floor(0xFFFF_FFFF / max) * max;  // reject zone
  const buf   = new Uint32Array(1);
  let val;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= limit);   // rejection sampling — eliminates modulo bias
  return val % max;
}

/* ── BUILD CHARACTER POOL ────────────────────────────────────── */
/**
 * Assembles a deduplicated character pool from the given options.
 * Mirrors build_pool() in password_generator.py exactly.
 *
 * @param {object} opts
 * @param {boolean} [opts.upper=true]
 * @param {boolean} [opts.lower=true]
 * @param {boolean} [opts.digits=true]
 * @param {boolean} [opts.symbols=true]
 * @param {boolean} [opts.excludeAmbiguous=false]
 * @returns {string} The character pool
 * @throws {Error} If all character types are disabled
 */
function buildPool({
  upper            = true,
  lower            = true,
  digits           = true,
  symbols          = true,
  excludeAmbiguous = false,
} = {}) {
  let raw = '';
  if (upper)   raw += CHAR_POOLS.UPPER;
  if (lower)   raw += CHAR_POOLS.LOWER;
  if (digits)  raw += CHAR_POOLS.DIGITS;
  if (symbols) raw += CHAR_POOLS.SYMBOLS;

  if (!raw) throw new Error('At least one character type must be selected.');

  // Strip ambiguous characters (mirrors Python set membership test)
  if (excludeAmbiguous) {
    raw = [...raw].filter(c => !CHAR_POOLS.AMBIGUOUS.has(c)).join('');
  }

  // Deduplicate while preserving insertion order (mirrors Python logic)
  return [...new Set(raw)].join('');
}

/* ── FISHER-YATES SHUFFLE (CSPRNG) ──────────────────────────── */
/**
 * In-place Fisher-Yates shuffle using secureRandBelow().
 * Produces a uniformly random permutation — every arrangement
 * of n elements is equally probable.
 *
 * @param {Array} arr - Array to shuffle in place
 * @returns {Array} The same array, shuffled
 */
function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandBelow(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── GENERATE A SINGLE PASSWORD ──────────────────────────────── */
/**
 * Generates one cryptographically secure password.
 * Mirrors generate_password() in password_generator.py.
 *
 * Standard mode: each character is sampled independently —
 *   identical to `"".join(secrets.choice(pool) for _ in range(length))`
 *
 * No-duplicates mode: Fisher-Yates shuffle → take first `length` chars —
 *   identical to the shuffle block in the Python script.
 *
 * @param {number} length   - Desired password length
 * @param {string} pool     - Character pool from buildPool()
 * @param {boolean} noDup   - Enforce no duplicate characters
 * @returns {string}
 * @throws {Error} If noDup is true and length > pool.length
 */
function generatePassword(length, pool, noDup = false) {
  if (!pool || pool.length === 0) throw new Error('Pool is empty.');

  if (noDup) {
    if (length > pool.length) {
      throw new Error(
        `No-duplicates mode requires length (${length}) ≤ pool size (${pool.length}).`
      );
    }
    const arr = fisherYates([...pool]);
    return arr.slice(0, length).join('');
  }

  // Standard: independent sampling (maximum entropy)
  return Array.from({ length }, () => pool[secureRandBelow(pool.length)]).join('');
}

/* ── GENERATE MULTIPLE PASSWORDS ─────────────────────────────── */
/**
 * Generates count passwords with identical settings.
 * Mirrors generate_multiple() in password_generator.py.
 *
 * @param {number}  count
 * @param {number}  length
 * @param {string}  pool
 * @param {boolean} noDup
 * @returns {string[]}
 */
function generateMultiple(count, length, pool, noDup = false) {
  return Array.from({ length: count }, () => generatePassword(length, pool, noDup));
}

/* ── SHANNON ENTROPY ─────────────────────────────────────────── */
/**
 * Calculates Shannon entropy in bits.
 * Formula: H = L × log₂(N)
 * Mirrors calculate_entropy() in password_generator.py.
 *
 * @param {number} length    - Password length (L)
 * @param {number} poolSize  - Character pool size (N)
 * @returns {number} Entropy in bits
 */
function calculateEntropy(length, poolSize) {
  if (poolSize <= 1) return 0;
  return length * Math.log2(poolSize);
}

/* ── STRENGTH CHECKER ────────────────────────────────────────── */
/**
 * Maps entropy bits to a strength rating.
 * Thresholds match NIST SP 800-63B guidance.
 * Mirrors check_strength() in password_generator.py.
 *
 * @param {number} bits - Shannon entropy
 * @returns {{ label: string, description: string, color: string, pct: number }}
 */
function checkStrength(bits) {
  if (bits < 40)  return { label: 'Very Weak',  description: 'Easily cracked. Increase length.',         color: '#ff4d6d', pct: 12  };
  if (bits < 60)  return { label: 'Weak',        description: 'Vulnerable to brute-force attacks.',       color: '#ff7043', pct: 28  };
  if (bits < 80)  return { label: 'Fair',         description: 'Acceptable for low-risk accounts.',        color: '#ffb347', pct: 50  };
  if (bits < 100) return { label: 'Strong',       description: 'Good for most purposes.',                  color: '#66bb6a', pct: 70  };
  if (bits < 128) return { label: 'Very Strong',  description: 'Excellent for sensitive accounts.',        color: '#00d4ff', pct: 88  };
  return               { label: 'Excellent',     description: 'Near-uncrackable with current technology.', color: '#00ff88', pct: 100 };
}

/* ── EXPORTS ─────────────────────────────────────────────────── */
// Works in both browser (global) and Node.js (module.exports)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAR_POOLS, buildPool, fisherYates,
    secureRandBelow, generatePassword, generateMultiple,
    calculateEntropy, checkStrength,
  };
} else {
  // Browser global
  window.PwdGen = {
    CHAR_POOLS, buildPool, fisherYates,
    secureRandBelow, generatePassword, generateMultiple,
    calculateEntropy, checkStrength,
  };
}
