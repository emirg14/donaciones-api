'use strict';

/**
 * Datos de demostración para la presentación. Todas las empresas, ONG,
 * personas y direcciones son FICTICIAS. Los correos usan el dominio reservado
 * ".test" (RFC 2606), que no existe en internet.
 */
const PASSWORD_DEMO = 'Demo2026';

const CUENTAS = [
  { clave: 'admin', rol: 'admin', tipo: 'donante', nombre: 'Andrea Solís', email: 'admin@alimentrega.test', empresa: 'Alimentrega (operación)' },
  { clave: 'espiga', tipo: 'donante', nombre: 'Laura Méndez', email: 'laura@espigadorada.test', empresa: 'Panadería La Espiga Dorada', rfc: 'EDO150301AB1', telefono: '6140000001' },
  { clave: 'valle', tipo: 'donante', nombre: 'Jorge Castañeda', email: 'jorge@vallenorte.test', empresa: 'Supermercados Valle Norte', rfc: 'SVN100512CD2', telefono: '6140000002' },
  { clave: 'rios', tipo: 'donante', nombre: 'Mariana Ríos', email: 'mariana@hermanosrios.test', empresa: 'Frutas y Verduras Hermanos Ríos', telefono: '6140000003' },
  { clave: 'sierra', tipo: 'donante', nombre: 'Tomás Aguirre', email: 'tomas@sierraalta.test', empresa: 'Lácteos Sierra Alta', telefono: '6140000004' },
  { clave: 'nido', tipo: 'ong', nombre: 'Rosa Villalobos', email: 'rosa@nidodelnorte.test', empresa: 'Comedor Comunitario Nido del Norte', telefono: '6140000005' },
  { clave: 'luz', tipo: 'ong', nombre: 'Héctor Prieto', email: 'hector@luzdetarde.test', empresa: 'Casa Hogar Luz de Tarde', telefono: '6140000006' }
];

// [donante, ong, titulo, categoria, kg, estado final, días atrás]
const LOTES = [
  ['espiga', 'nido', 'Pan blanco y bolillo del día anterior', 'panaderia', 38, 'entregado', 13],
  ['valle', 'luz', 'Abarrotes con empaque dañado (arroz y frijol)', 'abarrotes', 120, 'entregado', 12],
  ['rios', 'nido', 'Jitomate y calabaza de segunda', 'frutas_verduras', 85, 'entregado', 10],
  ['sierra', 'luz', 'Yogur y leche próximos a caducar', 'lacteos', 64, 'entregado', 9],
  ['espiga', 'luz', 'Pan dulce surtido', 'panaderia', 22, 'entregado', 7],
  ['valle', 'nido', 'Comida preparada del área de rosticería', 'preparados', 30, 'entregado', 6],
  ['rios', 'luz', 'Manzana y plátano maduro', 'frutas_verduras', 140, 'entregado', 4],
  ['sierra', 'nido', 'Queso fresco y crema', 'lacteos', 26, 'entregado', 2],
  ['valle', 'luz', 'Cereales y galletas por cambio de etiqueta', 'abarrotes', 75, 'entregado', 1],
  ['espiga', 'nido', 'Tortillas de harina y conchas', 'panaderia', 18, 'en_transito', 0],
  ['rios', 'luz', 'Lechuga, pepino y zanahoria', 'frutas_verduras', 60, 'reservado', 0],
  ['valle', null, 'Pollo rostizado y guarniciones del día', 'preparados', 25, 'disponible', 0],
  ['sierra', null, 'Leche entera (48 litros)', 'lacteos', 50, 'disponible', 0],
  ['rios', null, 'Naranja y toronja para jugo', 'frutas_verduras', 95, 'disponible', 0],
  ['valle', null, 'Pasta y salsa de tomate en lata abollada', 'abarrotes', 40, 'cancelado', 3]
];

const DIRECCIONES = {
  espiga: 'Calle Encino 214, Col. Jardines del Bosque',
  valle: 'Blvd. Los Álamos 3100, Col. Valle Norte',
  rios: 'Central de Abastos, Bodega 17',
  sierra: 'Av. Industrias 880, Parque Industrial Sierra'
};

const CAMINO = {
  entregado: ['reservado', 'en_transito', 'entregado'],
  en_transito: ['reservado', 'en_transito'],
  reservado: ['reservado'],
  disponible: [],
  cancelado: ['cancelado']
};

const fecha = (diasAtras, horas = 0) =>
  new Date(Date.now() - diasAtras * 86400000 + horas * 3600000).toISOString().replace('T', ' ').slice(0, 19);

async function seedDemo({ authService, loteService, db }) {
  const usuarios = {};
  for (const c of CUENTAS) {
    const { clave, rol = 'usuario', ...datos } = c;
    usuarios[clave] = await authService.registrar({ ...datos, password: PASSWORD_DEMO }, { rol });
  }
  const actor = (u) => ({ id: u.id, rol: u.rol, tipo: u.tipo });
  const setFechaEvento = db.prepare('UPDATE lote_eventos SET creado_en = ? WHERE lote_id = ? AND estado = ?');
  const setFechaLote = db.prepare('UPDATE lotes SET creado_en = ?, actualizado_en = ? WHERE id = ?');
  const hoy = new Date();

  LOTES.forEach(([donante, ong, titulo, categoria, kg, estado, dias], i) => {
    const caducidad = new Date(hoy.getTime() + (2 - dias + (i % 3)) * 86400000).toISOString().slice(0, 10);
    const lote = loteService.crear(actor(usuarios[donante]), {
      titulo, categoria, cantidad_kg: kg, caducidad, direccion: DIRECCIONES[donante]
    });
    const pasos = CAMINO[estado];
    pasos.forEach((paso, k) => {
      const quien = paso === 'cancelado' ? usuarios[donante] : usuarios[ong];
      loteService.cambiarEstado(actor(quien), lote.id, paso);
      setFechaEvento.run(fecha(dias, 2 + k * 3), lote.id, paso);
    });
    setFechaEvento.run(fecha(dias), lote.id, 'disponible');
    setFechaLote.run(fecha(dias), fecha(dias, pasos.length * 3), lote.id);
  });

  // La demo arranca con las notificaciones leídas; las nuevas aparecerán en vivo.
  db.exec('UPDATE notificaciones SET leida = 1');

  return [
    { etiqueta: 'Empresa donante', descripcion: usuarios.espiga.empresa, email: usuarios.espiga.email, password: PASSWORD_DEMO },
    { etiqueta: 'ONG', descripcion: usuarios.nido.empresa, email: usuarios.nido.email, password: PASSWORD_DEMO },
    { etiqueta: 'Administrador', descripcion: usuarios.admin.empresa, email: usuarios.admin.email, password: PASSWORD_DEMO }
  ];
}

module.exports = { seedDemo, PASSWORD_DEMO, CUENTAS };
