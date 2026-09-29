'use strict';

/**
 * Validaciones de entrada (lista blanca). Rechazar caracteres no esperados en
 * los campos de texto es la primera barrera contra XSS e inyecciones.
 */
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const NOMBRE_RE = /^[\p{L}\p{M}\s.'-]{2,100}$/u;
const EMPRESA_RE = /^[\p{L}\p{M}\d\s.,&()'-]{2,150}$/u;
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
const TELEFONO_RE = /^\d{10}$/;
const ROLES = Object.freeze(['admin', 'usuario']);

const isString = (v) => typeof v === 'string';

function validatePassword(password) {
  const errors = [];
  if (!isString(password)) return ['La contraseña es obligatoria'];
  if (password.length < 8) errors.push('La contraseña debe tener al menos 8 caracteres');
  if (password.length > 72) errors.push('La contraseña no puede exceder 72 caracteres');
  if (!/[a-z]/.test(password)) errors.push('La contraseña debe incluir una minúscula');
  if (!/[A-Z]/.test(password)) errors.push('La contraseña debe incluir una mayúscula');
  if (!/\d/.test(password)) errors.push('La contraseña debe incluir un número');
  return errors;
}

function normalizeEmail(email) {
  return isString(email) ? email.trim().toLowerCase() : email;
}

/**
 * Valida el cuerpo del registro de donante. Solo copia los campos permitidos,
 * así se evita la asignación masiva (p. ej. que alguien envíe "rol": "admin").
 */
function validateRegistro(body = {}) {
  const errors = [];
  const value = {
    nombre: isString(body.nombre) ? body.nombre.trim() : body.nombre,
    email: normalizeEmail(body.email),
    password: body.password,
    empresa: isString(body.empresa) ? body.empresa.trim() : undefined,
    rfc: isString(body.rfc) ? body.rfc.trim().toUpperCase() : undefined,
    telefono: isString(body.telefono) ? body.telefono.trim() : undefined
  };

  if (!isString(value.nombre) || !NOMBRE_RE.test(value.nombre)) {
    errors.push('El nombre es obligatorio (2-100 letras, sin caracteres especiales)');
  }
  if (!isString(value.email) || value.email.length > 254 || !EMAIL_RE.test(value.email)) {
    errors.push('El correo electrónico no es válido');
  }
  errors.push(...validatePassword(value.password));
  if (value.empresa !== undefined && !EMPRESA_RE.test(value.empresa)) {
    errors.push('El nombre de la empresa contiene caracteres no permitidos');
  }
  if (value.rfc !== undefined && !RFC_RE.test(value.rfc)) {
    errors.push('El RFC no tiene un formato válido');
  }
  if (value.telefono !== undefined && !TELEFONO_RE.test(value.telefono)) {
    errors.push('El teléfono debe tener 10 dígitos');
  }

  return { errors, value };
}

function validateLogin(body = {}) {
  const errors = [];
  const value = { email: normalizeEmail(body.email), password: body.password };
  if (!isString(value.email) || !EMAIL_RE.test(value.email)) errors.push('El correo electrónico no es válido');
  if (!isString(value.password) || value.password.length === 0) errors.push('La contraseña es obligatoria');
  return { errors, value };
}

function isValidRol(rol) {
  return ROLES.includes(rol);
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const MAX_LIMIT = 100;
const MAX_PAGE = 10000;

/**
 * Normaliza la paginación a enteros acotados. Corrige el hallazgo de OWASP ZAP:
 * un "page" gigantesco (p. ej. 4750925297435195125) generaba un OFFSET fuera
 * del rango de SQLite y un error 500.
 */
function parsePagination(query = {}) {
  const clamp = (raw, def, max) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) return def;
    return Math.min(n, max); // valores gigantes se acotan al máximo permitido
  };
  const limit = clamp(query.limit, 20, MAX_LIMIT);
  const page = clamp(query.page, 1, MAX_PAGE);
  return { limit, page, offset: (page - 1) * limit };
}

module.exports = {
  ROLES,
  validatePassword,
  validateRegistro,
  validateLogin,
  isValidRol,
  parseId,
  parsePagination
};
