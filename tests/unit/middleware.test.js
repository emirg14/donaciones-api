const { authenticate, authorize } = require('../../src/middleware/auth');
const { errorHandler, notFound } = require('../../src/middleware/errorHandler');
const { AppError } = require('../../src/utils/errors');

const mockReq = (authorization) => ({ get: () => authorization });
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('authenticate', () => {
  const authService = {
    verifyToken: jest.fn((t) => {
      if (t === 'valido') return { sub: '7', rol: 'admin', email: 'a@x.mx' };
      throw new AppError(401, 'Token inválido');
    })
  };

  test('sin encabezado -> 401', () => {
    const next = jest.fn();
    authenticate(authService)(mockReq(undefined), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Se requiere autenticación' });
  });

  test('esquema distinto de Bearer -> 401', () => {
    const next = jest.fn();
    authenticate(authService)(mockReq('Basic abc'), {}, next);
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  test('token válido -> agrega req.user', () => {
    const next = jest.fn();
    const req = mockReq('Bearer valido');
    authenticate(authService)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 7, rol: 'admin', email: 'a@x.mx' });
  });

  test('token inválido -> propaga el error', () => {
    const next = jest.fn();
    authenticate(authService)(mockReq('Bearer malo'), {}, next);
    expect(next.mock.calls[0][0].message).toBe('Token inválido');
  });
});

describe('authorize', () => {
  test('permite el rol autorizado', () => {
    const next = jest.fn();
    authorize('admin')({ user: { rol: 'admin' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('rechaza otro rol con 403', () => {
    const next = jest.fn();
    authorize('admin')({ user: { rol: 'usuario' } }, {}, next);
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  test('sin usuario autenticado -> 401', () => {
    const next = jest.fn();
    authorize('admin')({}, {}, next);
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});

describe('errorHandler', () => {
  test('notFound genera un 404', () => {
    const next = jest.fn();
    notFound({}, {}, next);
    expect(next.mock.calls[0][0].status).toBe(404);
  });

  test('AppError con detalles', () => {
    const res = mockRes();
    errorHandler(new AppError(400, 'Malo', ['x']), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Malo', detalles: ['x'] });
  });

  test('errores inesperados -> 500 genérico sin filtrar detalles internos', () => {
    const res = mockRes();
    errorHandler(new Error('SQLITE_ERROR: tabla secreta'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });

  test('registra el error en consola fuera del entorno de pruebas', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('x'), {}, mockRes(), jest.fn());
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    process.env.NODE_ENV = original;
  });
});
