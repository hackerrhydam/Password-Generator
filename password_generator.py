"""
Password Generator
==================
A secure, feature-rich password generator using Python's
cryptographically secure secrets module.

Features:
  - Uppercase, lowercase, digits, symbols
  - Exclude ambiguous characters (0, O, l, 1, I)
  - No duplicate characters option
  - Generate multiple passwords at once
  - Entropy/strength checker
  - Interactive menu + command-line argument support

Usage:
  python password_generator.py              # Interactive menu
  python password_generator.py --help       # CLI usage
  python password_generator.py -l 20 -n 5  # 5 passwords of length 20
"""

import secrets
import string
import math
import argparse
import sys


# ─── CHARACTER POOLS ──────────────────────────────────────────────────────────

UPPERCASE   = string.ascii_uppercase          # A-Z
LOWERCASE   = string.ascii_lowercase          # a-z
DIGITS      = string.digits                   # 0-9
SYMBOLS     = "!@#$%^&*()-_=+[]{}|;:,.<>?"   # special characters
AMBIGUOUS   = set("0Ol1I")                    # visually confusing characters


# ─── CORE GENERATOR ───────────────────────────────────────────────────────────

def build_pool(use_upper=True, use_lower=True, use_digits=True,
               use_symbols=True, exclude_ambiguous=False):
    """Build the character pool based on selected options."""
    pool = ""
    if use_upper:   pool += UPPERCASE
    if use_lower:   pool += LOWERCASE
    if use_digits:  pool += DIGITS
    if use_symbols: pool += SYMBOLS

    if not pool:
        raise ValueError("At least one character type must be selected.")

    if exclude_ambiguous:
        pool = "".join(c for c in pool if c not in AMBIGUOUS)

    # Remove duplicates while preserving order
    seen = set()
    unique_pool = ""
    for c in pool:
        if c not in seen:
            seen.add(c)
            unique_pool += c

    return unique_pool


def generate_password(length=16, pool=None, no_duplicates=False,
                      use_upper=True, use_lower=True, use_digits=True,
                      use_symbols=True, exclude_ambiguous=False):
    """
    Generate a single cryptographically secure password.

    Args:
        length (int): Desired password length.
        pool (str): Pre-built character pool (optional).
        no_duplicates (bool): Each character used at most once.
        use_upper (bool): Include uppercase letters.
        use_lower (bool): Include lowercase letters.
        use_digits (bool): Include digits.
        use_symbols (bool): Include symbols.
        exclude_ambiguous (bool): Exclude 0, O, l, 1, I.

    Returns:
        str: The generated password.
    """
    if pool is None:
        pool = build_pool(use_upper, use_lower, use_digits,
                          use_symbols, exclude_ambiguous)

    if no_duplicates:
        if length > len(pool):
            raise ValueError(
                f"No-duplicates mode requires length ({length}) <= "
                f"pool size ({len(pool)}). Add more character types "
                f"or reduce the length."
            )
        # Shuffle pool and take first `length` characters
        pool_list = list(pool)
        # Fisher-Yates shuffle using secrets
        for i in range(len(pool_list) - 1, 0, -1):
            j = secrets.randbelow(i + 1)
            pool_list[i], pool_list[j] = pool_list[j], pool_list[i]
        return "".join(pool_list[:length])

    # Standard: pick `length` characters independently (secure random)
    return "".join(secrets.choice(pool) for _ in range(length))


def generate_multiple(count=5, **kwargs):
    """Generate multiple passwords with the same settings."""
    return [generate_password(**kwargs) for _ in range(count)]


# ─── STRENGTH CHECKER ─────────────────────────────────────────────────────────

def calculate_entropy(password, pool_size):
    """
    Calculate Shannon entropy in bits.
    Formula: length x log2(pool_size)
    """
    if pool_size <= 1:
        return 0
    return len(password) * math.log2(pool_size)


def check_strength(password, pool_size):
    """
    Return a strength rating and description based on entropy.

    Returns:
        tuple: (rating, description, entropy_bits)
    """
    bits = calculate_entropy(password, pool_size)

    if bits < 40:
        return "Very Weak",   "Easily cracked. Increase length.", bits
    elif bits < 60:
        return "Weak",        "Vulnerable to brute force attacks.", bits
    elif bits < 80:
        return "Fair",        "Acceptable for low-risk accounts.", bits
    elif bits < 100:
        return "Strong",      "Good for most purposes.", bits
    elif bits < 128:
        return "Very Strong", "Excellent for sensitive accounts.", bits
    else:
        return "Excellent",   "Near-uncrackable with current technology.", bits


def strength_bar(bits, width=30):
    """Return an ASCII progress bar for entropy visualization."""
    max_bits = 128
    filled = min(int((bits / max_bits) * width), width)
    bar = "X" * filled + "." * (width - filled)
    return f"[{bar}]"


# ─── DISPLAY ──────────────────────────────────────────────────────────────────

def print_separator(char="-", width=60):
    print(char * width)


def print_password_result(password, pool_size, index=None):
    """Display a single password with its strength info."""
    rating, description, bits = check_strength(password, pool_size)
    bar = strength_bar(bits)

    prefix = f"  [{index}] " if index is not None else "  "
    print(f"{prefix}{password}")
    print(f"       Strength : {rating} - {description}")
    print(f"       Entropy  : {bits:.1f} bits  {bar}")
    print()


def print_banner():
    banner = """
+===========================================================+
|           [LOCK]  SECURE PASSWORD GENERATOR  [LOCK]       |
|         Powered by Python secrets module (CSPRNG)         |
+===========================================================+
"""
    print(banner)


# ─── INTERACTIVE MENU ─────────────────────────────────────────────────────────

def get_bool_input(prompt, default=True):
    """Get yes/no input with a default value."""
    default_str = "Y/n" if default else "y/N"
    response = input(f"  {prompt} [{default_str}]: ").strip().lower()
    if response == "":
        return default
    return response in ("y", "yes", "1", "true")


def get_int_input(prompt, default, min_val=1, max_val=999):
    """Get integer input with validation."""
    while True:
        response = input(f"  {prompt} [{default}]: ").strip()
        if response == "":
            return default
        try:
            value = int(response)
            if min_val <= value <= max_val:
                return value
            print(f"  [!]  Please enter a number between {min_val} and {max_val}.")
        except ValueError:
            print("  [!]  Invalid input. Please enter a number.")


def interactive_menu():
    """Run the interactive password generator menu."""
    print_banner()

    while True:
        print("=" * 60)
        print("  CONFIGURE YOUR PASSWORD")
        print("=" * 60)

        # Length
        length = get_int_input("Password length", default=16, min_val=4, max_val=256)

        # Character types
        print()
        print("  Character types to include:")
        use_upper    = get_bool_input("Uppercase letters (A-Z)", default=True)
        use_lower    = get_bool_input("Lowercase letters (a-z)", default=True)
        use_digits   = get_bool_input("Digits (0-9)",            default=True)
        use_symbols  = get_bool_input("Symbols (!@#$...)",       default=True)

        print()
        print("  Options:")
        exclude_ambig = get_bool_input("Exclude ambiguous characters (0, O, l, 1, I)", default=False)
        no_dup        = get_bool_input("No duplicate characters",                       default=False)

        # Count
        count = get_int_input("Number of passwords to generate", default=1, min_val=1, max_val=50)

        # Build pool and validate
        try:
            pool = build_pool(use_upper, use_lower, use_digits, use_symbols, exclude_ambig)
        except ValueError as e:
            print(f"\n  [X]  Error: {e}\n")
            continue

        print()
        print("=" * 60)
        print(f"  GENERATED PASSWORDS  (pool: {len(pool)} chars)")
        print("=" * 60)

        try:
            passwords = generate_multiple(
                count=count,
                length=length,
                pool=pool,
                no_duplicates=no_dup
            )
        except ValueError as e:
            print(f"\n  [X]  Error: {e}\n")
            continue

        print()
        for i, pw in enumerate(passwords, 1):
            print_password_result(pw, len(pool), index=i if count > 1 else None)

        # Ask to generate again
        print("-" * 60)
        again = input("  Generate again? [Y/n]: ").strip().lower()
        if again in ("n", "no"):
            print("\n  Stay secure! [LOCK]\n")
            break
        print()


# ─── CLI ARGUMENT PARSER ──────────────────────────────────────────────────────

def cli_mode():
    """Handle command-line arguments for non-interactive use."""
    parser = argparse.ArgumentParser(
        description="Secure Password Generator - powered by Python secrets module",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python password_generator.py -l 20 -n 5
  python password_generator.py -l 32 --no-symbols
  python password_generator.py -l 16 --exclude-ambiguous --no-duplicates
  python password_generator.py --only-digits -l 8 -n 10
        """
    )

    parser.add_argument("-l", "--length",     type=int, default=16,
                        help="Password length (default: 16)")
    parser.add_argument("-n", "--count",      type=int, default=1,
                        help="Number of passwords to generate (default: 1)")
    parser.add_argument("--no-upper",         action="store_true",
                        help="Exclude uppercase letters")
    parser.add_argument("--no-lower",         action="store_true",
                        help="Exclude lowercase letters")
    parser.add_argument("--no-digits",        action="store_true",
                        help="Exclude digits")
    parser.add_argument("--no-symbols",       action="store_true",
                        help="Exclude symbols")
    parser.add_argument("--exclude-ambiguous",action="store_true",
                        help="Exclude ambiguous characters (0, O, l, 1, I)")
    parser.add_argument("--no-duplicates",    action="store_true",
                        help="Ensure no character is used more than once")
    parser.add_argument("--only-digits",      action="store_true",
                        help="Generate numeric PIN (digits only)")
    parser.add_argument("--quiet",            action="store_true",
                        help="Print passwords only, no strength info")

    args = parser.parse_args()

    use_upper   = not args.no_upper
    use_lower   = not args.no_lower
    use_digits  = not args.no_digits or args.only_digits
    use_symbols = not args.no_symbols and not args.only_digits

    if args.only_digits:
        use_upper = use_lower = use_symbols = False

    try:
        pool = build_pool(use_upper, use_lower, use_digits, use_symbols,
                          args.exclude_ambiguous)
        passwords = generate_multiple(
            count=args.count,
            length=args.length,
            pool=pool,
            no_duplicates=args.no_duplicates
        )
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    if args.quiet:
        for pw in passwords:
            print(pw)
    else:
        print_banner()
        print(f"  Length: {args.length}  |  Count: {args.count}  |  Pool: {len(pool)} chars\n")
        for i, pw in enumerate(passwords, 1):
            print_password_result(pw, len(pool), index=i if args.count > 1 else None)


# ─── ENTRY POINT ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command-line arguments provided -> CLI mode
        cli_mode()
    else:
        # No arguments -> interactive menu
        try:
            interactive_menu()
        except KeyboardInterrupt:
            print("\n\n  Exited. Stay secure! [LOCK]\n")
            sys.exit(0)
