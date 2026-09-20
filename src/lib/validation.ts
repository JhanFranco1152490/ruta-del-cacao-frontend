export function validateIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value) return 'Ingresa tu documento o correo electrónico.';
  if (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Ingresa un correo electrónico válido.';
  }
  return '';
}

export function validateEmail(email: string) {
  if (!email.trim()) return 'Ingresa tu correo electrónico.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Ingresa un correo electrónico válido.';
  }
  return '';
}

export function validatePassword(password: string) {
  if (!password) return 'Ingresa tu contraseña.';
  if (password.length < 8 || password.length > 50) {
    return 'La contraseña debe tener entre 8 y 50 caracteres.';
  }
  if (/^\d+$/.test(password))
    return 'La contraseña no puede contener solo números.';
  return '';
}
