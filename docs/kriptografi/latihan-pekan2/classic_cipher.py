import math


def egcd(a: int, b: int) -> tuple[int, int, int]:
    """Algoritma Euclid Diperluas untuk mencari FPB dan koefisien Bezout."""
    if a == 0:
        return b, 0, 1
    gcd, x1, y1 = egcd(b % a, a)
    x = y1 - (b // a) * x1
    y = x1
    return gcd, x, y


def mod_inverse(a: int, m: int) -> int:
    """Mencari invers modulo a mod m menggunakan Extended Euclid."""
    gcd, x, _ = egcd(a, m)
    if gcd != 1:
        raise ValueError(
            f"Invers modulo tidak ada karena FPB({a}, {m}) = {gcd} != 1"
        )
    return x % m


def affine_encrypt(text: str, a: int, b: int) -> str:
    """Mengenkripsi teks menggunakan Affine Cipher: E(x) = (a*x + b) mod 26."""
    if math.gcd(a, 26) != 1:
        raise ValueError("Kunci 'a' harus relatif prima dengan 26.")

    result = []
    for char in text.upper():
        if char.isalpha():
            x = ord(char) - ord("A")
            encrypted_char = chr(((a * x + b) % 26) + ord("A"))
            result.append(encrypted_char)
        else:
            result.append(char)
    return "".join(result)


def affine_decrypt(cipher_text: str, a: int, b: int) -> str:
    """Mendekripsi teks menggunakan Affine Cipher: D(y) = a^-1 * (y - b) mod 26."""
    a_inv = mod_inverse(a, 26)
    result = []
    for char in cipher_text.upper():
        if char.isalpha():
            y = ord(char) - ord("A")
            decrypted_char = chr(((a_inv * (y - b)) % 26) + ord("A"))
            result.append(decrypted_char)
        else:
            result.append(char)
    return "".join(result)