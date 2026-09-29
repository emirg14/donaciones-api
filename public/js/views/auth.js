import { h, clear } from '../dom.js';
import { api, session } from '../api.js';
import { marca, toast } from './shared.js';
import { tarjetasDemo } from './landing.js';

function campo(etiqueta, attrs, ayuda) {
  return h('label', { class: 'campo' },
    h('span', { class: 'campo__etq' }, etiqueta),
    h('input', attrs),
    ayuda ? h('span', { class: 'campo__ayuda' }, ayuda) : null);
}

function listaErrores(caja, err) {
  clear(caja, h('strong', {}, err.message), err.detalles.length ? h('ul', {}, err.detalles.map((d) => h('li', {}, d))) : null);
  caja.hidden = false;
}

function marco(root, titulo, subtitulo, contenido, lateral) {
  clear(root,
    h('div', { class: 'auth' },
      h('div', { class: 'auth__panel' },
        marca({ grande: true }),
        h('h1', {}, titulo),
        h('p', { class: 'muted' }, subtitulo),
        contenido),
      h('aside', { class: 'auth__lado' }, lateral)));
}

const ladoInfo = () => h('div', { class: 'auth__lado-txt' },
  h('h2', {}, 'Cada kilo cuenta.'),
  h('p', {}, 'En México se desperdician millones de toneladas de alimento al año mientras muchas familias no tienen qué comer. Alimentrega conecta ambos lados con transparencia.'),
  h('p', { class: 'small' }, 'Tu sesión se protege con JSON Web Tokens y tu contraseña se guarda cifrada con bcrypt.'));

export function vistaLogin(root, config, params) {
  const errores = h('div', { class: 'alerta alerta--error', hidden: true });
  const form = h('form', { class: 'form', novalidate: true },
    params.get('expirada') ? h('div', { class: 'alerta' }, 'Tu sesión expiró. Vuelve a iniciar sesión.') : null,
    params.get('nuevo') ? h('div', { class: 'alerta alerta--ok' }, 'Cuenta creada. Ya puedes iniciar sesión.') : null,
    errores,
    campo('Correo electrónico', { type: 'email', name: 'email', required: true, autocomplete: 'email' }),
    campo('Contraseña', { type: 'password', name: 'password', required: true, autocomplete: 'current-password' }),
    h('button', { class: 'btn btn--pri btn--bloque', type: 'submit' }, 'Iniciar sesión'),
    h('p', { class: 'muted centro' }, '¿No tienes cuenta? ', h('a', { href: '#/registro' }, 'Regístrate')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errores.hidden = true;
    const datos = Object.fromEntries(new FormData(form));
    try {
      const { token, usuario } = await api.login(datos.email, datos.password);
      session.guardar(token, usuario);
      location.hash = '#/panel';
    } catch (err) {
      listaErrores(errores, err);
    }
  });

  const lateral = config.demo
    ? h('div', { class: 'auth__lado-txt' }, h('h2', {}, 'Cuentas de demostración'), h('p', {}, 'Contraseña de todas: Demo2026'), tarjetasDemo(config.cuentas))
    : ladoInfo();
  marco(root, 'Bienvenido de nuevo', 'Inicia sesión para continuar.', form, lateral);
}

export function vistaRegistro(root, _config, params) {
  let tipo = params.get('tipo') === 'ong' ? 'ong' : 'donante';
  const errores = h('div', { class: 'alerta alerta--error', hidden: true });
  const etqEmpresa = h('span', { class: 'campo__etq' });
  const opciones = h('div', { class: 'selector', role: 'radiogroup', 'aria-label': 'Tipo de cuenta' });

  function pintarTipo() {
    etqEmpresa.textContent = tipo === 'ong' ? 'Nombre de la organización' : 'Nombre de la empresa';
    clear(opciones,
      [['donante', 'Empresa donante', 'Tengo alimentos para donar'], ['ong', 'Organización (ONG)', 'Recibo y distribuyo alimentos']].map(([v, t, d]) =>
        h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(tipo === v), class: `selector__op${tipo === v ? ' activo' : ''}`,
          onclick: () => { tipo = v; pintarTipo(); }
        }, h('strong', {}, t), h('span', {}, d))));
  }
  pintarTipo();

  const form = h('form', { class: 'form', novalidate: true },
    errores,
    opciones,
    h('div', { class: 'form__fila' },
      campo('Nombre de contacto', { name: 'nombre', required: true, autocomplete: 'name', maxlength: 100 }),
      h('label', { class: 'campo' }, etqEmpresa, h('input', { name: 'empresa', required: true, maxlength: 150 }))),
    campo('Correo electrónico', { type: 'email', name: 'email', required: true, autocomplete: 'email' }),
    campo('Contraseña', { type: 'password', name: 'password', required: true, autocomplete: 'new-password' }, 'Mínimo 8 caracteres, con mayúscula, minúscula y número.'),
    h('div', { class: 'form__fila' },
      campo('RFC (opcional)', { name: 'rfc', maxlength: 13 }),
      campo('Teléfono (opcional)', { name: 'telefono', inputmode: 'numeric', maxlength: 10 }, '10 dígitos')),
    h('button', { class: 'btn btn--pri btn--bloque', type: 'submit' }, 'Crear cuenta'),
    h('p', { class: 'muted centro' }, '¿Ya tienes cuenta? ', h('a', { href: '#/login' }, 'Inicia sesión')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errores.hidden = true;
    const datos = Object.fromEntries(new FormData(form));
    ['rfc', 'telefono'].forEach((k) => { if (!datos[k]) delete datos[k]; });
    try {
      await api.registro({ ...datos, tipo });
      toast('Cuenta creada correctamente');
      location.hash = '#/login?nuevo=1';
    } catch (err) {
      listaErrores(errores, err);
    }
  });

  marco(root, 'Crea tu cuenta', 'Únete a la red en menos de un minuto.', form, ladoInfo());
}
