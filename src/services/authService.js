'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

/**
 * Lógica de negocio de autenticación: registro de donantes, inicio de sesión
 * y emisión/verificación de tokens JWT firmados con HS256.
 */
function createAuthService({ repo, config }) {
  const { secret, expiresIn, issuer, audience } = config.jwt;
  // Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe
  // (evita enumerar usuarios midiendo tiempos).
  const dummyHash = bcrypt.hashSync('dummy-password-for-timing', config.bcryptRounds);

  function signToken(user) {
    return jwt.sign({ sub: String(user.id), rol: user.rol, email: user.email }, secret, {
      algorithm: 'HS256',
      expiresIn,
      issuer,
      audience
    });
  }

  function verifyToken(token) {
    try {
      return jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience });
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'El token ha expirado' : 'Token inválido';
      throw new AppError(401, msg);
    }
  }

  async function registrar(data, { rol = 'usuario' } = {}) {
    if (repo.findByEmail(data.email)) {
      throw new AppError(409, 'El correo ya está registrado');
    }
    if (data.rfc && repo.rfcExists(data.rfc)) {
      throw new AppError(409, 'El RFC ya está registrado');
    }
    const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);
    return repo.create({ ...data, passwordHash, rol });
  }

  async function login(email, password) {
    const user = repo.findByEmail(email);
    const ok = await bcrypt.compare(password, user ? user.password_hash : dummyHash);
    if (!user || !ok) {
      throw new AppError(401, 'Credenciales inválidas');
    }
    const publicUser = repo.findById(user.id);
    return { token: signToken(publicUser), usuario: publicUser };
  }

  /** Crea el administrador inicial si se definieron ADMIN_EMAIL y ADMIN_PASSWORD. */
  async function seedAdmin() {
    const { email, password } = config.admin;
    if (!email || !password || repo.findByEmail(email)) return null;
    return registrar({ nombre: 'Administrador', email, password }, { rol: 'admin' });
  }

  return { registrar, login, signToken, verifyToken, seedAdmin };
}

module.exports = { createAuthService };
