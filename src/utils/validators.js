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
const TEXTO_RE = /^[\p{L}\p{M}\d\s.,&()'#/°:-]+$/u;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const ROLES = Object.freeze(['admin', 'usuario']);
const TIPOS_CUENTA = Object.freeze(['donante', 'ong']);
const CATEGORIAS = Object.freeze(['frutas_verduras', 'panaderia', 'lacteos', 'abarrotes', 'preparados', 'otros']);
const ESTADOS = Object.freeze(['disponible', 'reservado', 'en_transito', 'entregado', 'cancelado']);

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
    telefono: isString(body.telefono) ? body.telefono.trim() : undefined,
    tipo: body.tipo === undefined ? 'donante' : body.tipo
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
  if (!TIPOS_CUENTA.includes(value.tipo)) {
    errors.push('El tipo de cuenta debe ser "donante" u "ong"');
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

const toIsoDate = (d) => d.toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, '0');
/** Fecha local (zona horaria del servidor) en formato AAAA-MM-DD. */
const toLocalIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function isValidIsoDate(str) {
  if (!isString(str) || !FECHA_RE.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && toIsoDate(d) === str;
}

function checkTexto(valor, campo, min, max, errors) {
  if (!isString(valor) || valor.length < min || valor.length > max || !TEXTO_RE.test(valor)) {
    errors.push(`${campo} es obligatorio (${min}-${max} caracteres, sin símbolos especiales)`);
  }
}

/**
 * Valida un lote de alimentos. "hoy" se inyecta para que las pruebas sean
 * deterministas. La caducidad debe estar entre hoy y un año a partir de hoy.
 */
function validateLote(body = {}, hoy = new Date()) {
  const errors = [];
  const value = {
    titulo: isString(body.titulo) ? body.titulo.trim() : body.titulo,
    categoria: body.categoria,
    cantidad_kg: typeof body.cantidad_kg === 'string' ? Number(body.cantidad_kg) : body.cantidad_kg,
    caducidad: body.caducidad,
    direccion: isString(body.direccion) ? body.direccion.trim() : body.direccion,
    lat: body.lat === undefined || body.lat === null || body.lat === '' ? null : Number(body.lat),
    lng: body.lng === undefined || body.lng === null || body.lng === '' ? null : Number(body.lng)
  };

  checkTexto(value.titulo, 'La descripción del lote', 3, 120, errors);
  checkTexto(value.direccion, 'La dirección de recolección', 5, 200, errors);
  if (!CATEGORIAS.includes(value.categoria)) errors.push('La categoría no es válida');
  if (typeof value.cantidad_kg !== 'number' || !Number.isFinite(value.cantidad_kg) ||
      value.cantidad_kg <= 0 || value.cantidad_kg > 10000) {
    errors.push('La cantidad debe ser un número entre 0.1 y 10,000 kg');
  } else {
    value.cantidad_kg = Math.round(value.cantidad_kg * 10) / 10;
  }
  if (isValidIsoDate(value.caducidad)) {
    const min = toLocalIsoDate(hoy);
    const max = toLocalIsoDate(new Date(hoy.getTime() + 365 * 24 * 3600 * 1000));
    if (value.caducidad < min || value.caducidad > max) {
      errors.push('La fecha de caducidad debe estar entre hoy y un año a partir de hoy');
    }
  } else {
    errors.push('La fecha de caducidad debe tener el formato AAAA-MM-DD');
  }
  const badCoord = (n, lim) => n !== null && (!Number.isFinite(n) || Math.abs(n) > lim);
  if (badCoord(value.lat, 90) || badCoord(value.lng, 180) || (value.lat === null) !== (value.lng === null)) {
    errors.push('Las coordenadas no son válidas');
  }
  return { errors, value };
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
  TIPOS_CUENTA,
  CATEGORIAS,
  ESTADOS,
  validateLote,
  isValidIsoDate,
  toLocalIsoDate,
  validatePassword,
  validateRegistro,
  validateLogin,
  isValidRol,
  parseId,
  parsePagination
};
