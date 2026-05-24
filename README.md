# 🔐 Secure Password Generator

A cryptographically secure password generator built with Python's `secrets` module — zero external dependencies.

Live web demo → [View on GitHub Pages](https://YOUR-USERNAME.github.io/password-generator/)

---

## 📁 Project Structure

```
password-generator/
├── index.html              # GitHub Pages website (main entry)
├── style.css               # All CSS styles (separated from HTML)
├── generator.js            # Core password logic — no UI dependencies
├── script.js               # UI layer — wires DOM to generator.js
├── password_generator.py   # Original Python script (downloadable)
└── README.md               # This file
```

---

## 🚀 Quick Start — Python Script

```bash
# Interactive menu
python password_generator.py

# 5 passwords of length 20
python password_generator.py -l 20 -n 5

# No symbols, length 32
python password_generator.py -l 32 --no-symbols

# Digits-only PIN, quiet output
python password_generator.py --only-digits -l 6 --quiet

# All options
python password_generator.py --help
```

**Requirements:** Python 3.6+, no pip installs needed.

---

## 🌐 GitHub Pages — Publishing

1. Push this repo to GitHub (public)
2. Go to **Settings → Pages**
3. Set source: **Deploy from branch → main → / (root)**
4. Visit `https://YOUR-USERNAME.github.io/REPO-NAME/`

---

## 🧠 How It Works

| Component | Python | JavaScript |
|-----------|--------|------------|
| Randomness | `secrets.choice()` / `secrets.randbelow()` | `crypto.getRandomValues()` |
| Shuffle | Fisher-Yates via `secrets.randbelow()` | Fisher-Yates via `secureRandBelow()` |
| Entropy | `math.log2(pool_size) * length` | `Math.log2(pool.length) * length` |
| Bias elimination | Rejection sampling | Rejection sampling |

Both implementations are **functionally identical** — the JS is a faithful port of the Python.

---

## 📊 Strength Thresholds (NIST SP 800-63B aligned)

| Entropy | Rating |
|---------|--------|
| < 40 bits | Very Weak |
| 40–59 bits | Weak |
| 60–79 bits | Fair |
| 80–99 bits | Strong |
| 100–127 bits | Very Strong |
| 128+ bits | Excellent |

---

## 📄 License

MIT — free to use, modify, and distribute.
