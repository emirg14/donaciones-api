const {
  validateLote, isValidIsoDate, toLocalIsoDate, validateRegistro
} = require('../../src/utils/validators');
const { toCsv, celda } = require('../../src/utils/csv');
const { donanteValido } = require('../helpers');

const HOY = new Date(2026, 8, 29, 12, 0, 0); // 29/09/2026 (hora local)
const loteValido = (o = {}) => ({
  titulo: 'Pan dulce del día',
  categoria: 'panaderia',
  cantidad_kg: 12.34,
  caducidad: '2026-09-30',
  direccion: 'Calle Encino 214, Col. Centro',
  lat: 28.63,
  lng: -106.08,
  ...o
});

describe('validateLote', () => {
  test('acepta un lote válido y redondea los kilos a un decimal', () => {
    const { errors, value } = validateLote(loteValido(), HOY);
    expect(errors).toEqual([]);
    expect(value.cantidad_kg).toBe(12.3);
  });

  test('convierte cadenas numéricas y permite omitir coordenadas', () => {
    const { errors, value } = validateLote(loteValido({ cantidad_kg: '5', lat: '', lng: undefined }), HOY);
    expect(errors).toEqual([]);
    expect(value).toMatchObject({ cantidad_kg: 5, lat: null, lng: null });
  });

  test('usa objeto vacío por defecto y la fecha actual', () => {
    expect(validateLote().errors.length).toBeGreaterThanOrEqual(5);
  });

  test.each([
    [{ titulo: '<script>alert(1)</script>' }, 'descripción'],
    [{ titulo: 'ab' }, 'descripción'],
    [{ direccion: "'; DROP TABLE lotes; --" }, 'dirección'],
    [{ categoria: 'joyas' }, 'categoría'],
    [{ cantidad_kg: 0 }, 'cantidad'],
    [{ cantidad_kg: 10001 }, 'cantidad'],
    [{ cantidad_kg: 'mucho' }, 'cantidad'],
    [{ cantidad_kg: Infinity }, 'cantidad'],
    [{ caducidad: '2026-09-28' }, 'entre hoy'],
    [{ caducidad: '2028-01-01' }, 'entre hoy'],
    [{ caducidad: '2026-02-30' }, 'AAAA-MM-DD'],
    [{ caducidad: 20260930 }, 'AAAA-MM-DD'],
    [{ lat: 95 }, 'coordenadas'],
    [{ lng: 'x' }, 'coordenadas'],
    [{ lat: null }, 'coordenadas']
  ])('rechaza %p', (cambio, fragmento) => {
    expect(validateLote(loteValido(cambio), HOY).errors.join(' ')).toContain(fragmento);
  });

  test('acepta la caducidad de hoy (fecha local)', () => {
    expect(validateLote(loteValido({ caducidad: toLocalIsoDate(HOY) }), HOY).errors).toEqual([]);
  });

  test('isValidIsoDate', () => {
    expect(isValidIsoDate('2026-12-31')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });
});

describe('validateRegistro: tipo de cuenta', () => {
  test('por defecto es "donante" y acepta "ong"', () => {
    expect(validateRegistro(donanteValido()).value.tipo).toBe('donante');
    expect(validateRegistro(donanteValido({ tipo: 'ong' })).errors).toEqual([]);
  });

  test('rechaza tipos desconocidos', () => {
    expect(validateRegistro(donanteValido({ tipo: 'admin' })).errors.join(' ')).toContain('tipo de cuenta');
  });
});

describe('CSV seguro', () => {
  test('neutraliza fórmulas (CSV injection) y escapa comillas y comas', () => {
    expect(celda('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(celda('+SUM(A1)')).toBe("'+SUM(A1)");
    expect(celda('@cmd')).toBe("'@cmd");
    expect(celda('Pan, bolillo')).toBe('"Pan, bolillo"');
    expect(celda(-5)).toBe('-5'); // los números negativos no se alteran
    expect(celda(null)).toBe('');
    expect(celda(undefined)).toBe('');
  });

  test('genera encabezado, filas y BOM UTF-8', () => {
    const csv = toCsv([{ campo: 'a', titulo: 'Columna A' }, { campo: 'b', titulo: 'Kg' }], [{ a: 'Leche', b: 2 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Columna A,Kg\r\nLeche,2\r\n');
  });
});
