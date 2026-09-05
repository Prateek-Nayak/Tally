export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  return null;
}

/** At least 8 characters, one uppercase letter, one number - same bar as ipo-tracker. */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password needs at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password needs at least one number.";
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "Enter your name.";
  return null;
}
