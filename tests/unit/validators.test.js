const {
  validatePassword,
  validateRegistro,
  validateLogin,
  isValidRol,
  parseId,
  parsePagination
} = require('../../src/utils/validators');
const { donanteValido } = require('../helpers');

describe('validatePassword', () => {
  test('acepta una contraseña robusta', () => {
    expect(validatePassword('Segura2026')).toEqual([]);
  });

  test.each([
    [undefined, 'obligatoria'],
    ['Ab1', 'al menos 8'],
    ['A'.repeat(70) + 'a1b', 'exceder 72'],
    ['SINMINUSCULA1', 'minúscula'],
    ['sinmayuscula1', 'mayúscula'],
    ['SinNumeroAqui', 'número']
  ])('rechaza %p', (pwd, fragmento) => {
    expect(validatePassword(pwd).join(' ')).toContain(fragmento);
  });
});

describe('validateRegistro', () => {
  test('acepta un donante válido y normaliza correo y RFC', () => {
    const { errors, value } = validateRegistro(
      donanteValido({ email: '  MARIA@Alimentos.MX ', rfc: 'ano010101ab1' })
    );
    expect(errors).toEqual([]);
    expect(value.email).toBe('maria@alimentos.mx');
    expect(value.rfc).toBe('ANO010101AB1');
  });

  test('acepta registro mínimo sin campos opcionales', () => {
    const { errors, value } = validateRegistro({ nombre: 'Juan', email: 'j@x.mx', password: 'Segura2026' });
    expect(errors).toEqual([]);
    expect(value.empresa).toBeUndefined();
  });

  test('ignora campos no permitidos como "rol" (asignación masiva)', () => {
    const { value } = validateRegistro(donanteValido({ rol: 'admin', id: 99 }));
    expect(value).not.toHaveProperty('rol');
    expect(value).not.toHaveProperty('id');
  });

  test('usa objeto vacío por defecto', () => {
    expect(validateRegistro().errors.length).toBeGreaterThan(0);
  });

  test.each([
    ['nombre', '<script>alert(1)</script>', 'nombre'],
    ['nombre', 123, 'nombre'],
    // Nota: "admin'--@x.mx" es un correo VÁLIDO según RFC 5321, por eso la defensa
    // contra SQLi descansa en consultas parametrizadas y no solo en la validación.
    ['email', "admin@x.mx' OR '1'='1", 'correo'],
    ['email', 'sin-arroba', 'correo'],
    ['empresa', '<img src=x onerror=alert(1)>', 'empresa'],
    ['rfc', "' OR 1=1 --", 'RFC'],
    ['telefono', '12345', 'teléfono']
  ])('rechaza %s inválido: %p', (campo, valor, fragmento) => {
    const { errors } = validateRegistro(donanteValido({ [campo]: valor }));
    expect(errors.join(' ')).toContain(fragmento);
  });

  test('rechaza correos demasiado largos', () => {
    const { errors } = validateRegistro(donanteValido({ email: `${'a'.repeat(250)}@x.mx` }));
    expect(errors.join(' ')).toContain('correo');
  });
});

describe('validateLogin', () => {
  test('acepta credenciales bien formadas', () => {
    expect(validateLogin({ email: 'A@B.MX', password: 'x' })).toEqual({
      errors: [],
      value: { email: 'a@b.mx', password: 'x' }
    });
  });

  test('rechaza cuerpo vacío', () => {
    expect(validateLogin().errors).toHaveLength(2);
  });

  test('rechaza objetos en lugar de cadenas (inyección NoSQL/tipo)', () => {
    const { errors } = validateLogin({ email: { $ne: null }, password: { $ne: null } });
    expect(errors).toHaveLength(2);
  });
});

describe('isValidRol y parseId', () => {
  test('roles permitidos', () => {
    expect(isValidRol('admin')).toBe(true);
    expect(isValidRol('usuario')).toBe(true);
    expect(isValidRol('root')).toBe(false);
  });

  test.each([
    ['5', 5],
    ['0', null],
    ['-1', null],
    ['1.5', null],
    ['1 OR 1=1', null],
    ['abc', null]
  ])('parseId(%p) = %p', (raw, esperado) => {
    expect(parseId(raw)).toBe(esperado);
  });
});

describe('parsePagination (regresión del hallazgo de OWASP ZAP)', () => {
  test('valores por defecto', () => {
    expect(parsePagination()).toEqual({ limit: 20, page: 1, offset: 0 });
  });

  test('acota página y límite a rangos seguros', () => {
    expect(parsePagination({ page: '4750925297435195125', limit: '20' })).toEqual({ limit: 20, page: 10000, offset: 199980 });
    expect(parsePagination({ page: '99999999999999999999999', limit: '1e9' })).toEqual({ limit: 1, page: 10000, offset: 9999 });
    expect(parsePagination({ page: '3', limit: '500' })).toEqual({ limit: 100, page: 3, offset: 200 });
    expect(parsePagination({ page: '-2', limit: 'abc' })).toEqual({ limit: 20, page: 1, offset: 0 });
  });
});
