'use strict';

/**
 * Genera CSV seguro. Además de escapar comillas, antepone un apóstrofo a las
 * celdas que empiezan con = + - @ (o tabulador/retorno) para evitar
 * "CSV/Formula Injection" al abrir el archivo en Excel.
 */
function celda(valor) {
  if (valor === null || valor === undefined) return '';
  let texto = String(valor);
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[",\n\r]/.test(texto)) texto = `"${texto.replaceAll('"', '""')}"`;
  return texto;
}

function toCsv(columnas, filas) {
  const encabezado = columnas.map((c) => celda(c.titulo)).join(',');
  const cuerpo = filas.map((f) => columnas.map((c) => celda(f[c.campo])).join(','));
  // BOM para que Excel reconozca UTF-8 (acentos)
  return `\uFEFF${[encabezado, ...cuerpo].join('\r\n')}\r\n`;
}

module.exports = { toCsv, celda };
