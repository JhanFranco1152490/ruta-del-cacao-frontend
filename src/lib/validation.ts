export function validateIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value) return 'Ingresa tu documento o correo electrónico.';
  if (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Ingresa un correo electrónico válido.';
  }
  return '';
}

export function validateDocument(
  documentType: 'CC' | 'CE' | 'PPT' | 'NIT',
  value: string,
) {
  const normalized = value
    .trim()
    .replace(/[.\s-]/g, '')
    .toUpperCase();
  if (!normalized) return 'Ingresa tu número de documento.';
  if (!/^\d+$/.test(normalized)) {
    return 'El número de documento debe contener solo dígitos.';
  }
  if (normalized.length > 15) {
    return 'El número de documento debe tener máximo 15 dígitos.';
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
