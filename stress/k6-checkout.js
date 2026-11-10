import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * Prueba de carga k6 para POST /api/pos/cobros.
 *
 * Requisitos: k6 instalado, backend en ejecución y BD con datos semilla.
 * ADVERTENCIA: consume stock real y crea órdenes reales.
 *
 * Ejemplo:
 *   k6 run -e BASE_URL=http://localhost:8080/api -e USUARIO=admin -e PASSWORD=admin123 stress/k6-checkout.js
 *
 * Variables opcionales:
 *   -e PRODUCTO_ID=1 -e SEDE_ID=1 -e CLIENTE_ID=1
 */
const checkoutDuration = new Trend('checkout_duration', true);
const checkoutOk = new Rate('checkout_ok');
const checkoutStock = new Rate('checkout_stock_rechazado');
const checkoutOtros = new Counter('checkout_otros');

export const options = {
  scenarios: {
    checkout: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 20 },
        { duration: '20s', target: 20 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    checkout_ok: ['rate>0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080/api';
const USER = __ENV.USUARIO || 'admin';
const PASS = __ENV.PASSWORD || 'admin123';

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
}

export function setup() {
  const login = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ username: USER, password: PASS }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(login, { 'login 200': (r) => r.status === 200 });
  if (login.status !== 200) {
    throw new Error(`Login falló (${login.status}): ${login.body}`);
  }

  const token = login.json('token');
  const h = authHeaders(token);

  let productoId = __ENV.PRODUCTO_ID ? Number(__ENV.PRODUCTO_ID) : 0;
  let sedeId = __ENV.SEDE_ID ? Number(__ENV.SEDE_ID) : 0;
  let clienteId = __ENV.CLIENTE_ID ? Number(__ENV.CLIENTE_ID) : null;
  let stockInicial = 0;

  if (!productoId) {
    const productos = http.get(`${BASE}/productos`, h);
    const lista = productos.json();
    const p = Array.isArray(lista) ? lista.find((x) => x.activo !== false && x.stock > 0) : null;
    if (!p) throw new Error('No hay productos con stock para la prueba');
    productoId = p.idProducto;
    stockInicial = p.stock;
  } else {
    const p = http.get(`${BASE}/productos/${productoId}`, h);
    if (p.status === 200) stockInicial = p.json('stock') || 0;
  }

  if (!sedeId) {
    const sedes = http.get(`${BASE}/sedes`, h);
    const lista = sedes.json();
    const s = Array.isArray(lista) ? lista.find((x) => x.activa !== false) : null;
    if (!s) throw new Error('No hay sedes activas para la prueba');
    sedeId = s.idSede;
  }

  if (!clienteId) {
    const clientes = http.get(`${BASE}/pos/clientes`, h);
    const lista = clientes.json();
    if (Array.isArray(lista) && lista.length > 0) clienteId = lista[0].idUsuario;
  }

  return { token, productoId, sedeId, clienteId, stockInicial };
}

export default function (data) {
  const body = JSON.stringify({
    items: [{ productoId: data.productoId, cantidad: 1 }],
    sedeId: data.sedeId,
    clienteId: data.clienteId,
    metodoPago: 'EFECTIVO',
  });

  const res = http.post(`${BASE}/pos/cobros`, body, authHeaders(data.token));
  checkoutDuration.add(res.timings.duration);

  const ok = res.status === 201;
  const sinStock = res.status === 409;
  checkoutOk.add(ok);
  checkoutStock.add(sinStock);
  if (!ok && !sinStock) checkoutOtros.add(1);

  check(res, {
    'checkout 201 o 409 (stock)': (r) => r.status === 201 || r.status === 409,
  });

  sleep(0.2);
}

export function teardown(data) {
  const h = authHeaders(data.token);
  const res = http.get(`${BASE}/productos/${data.productoId}`, h);
  if (res.status === 200) {
    const stockFinal = res.json('stock');
    console.log(`Stock producto ${data.productoId}: inicial=${data.stockInicial}, final=${stockFinal}`);
    if (stockFinal < 0) {
      throw new Error('SOBREVENTA DETECTADA: stock final negativo');
    }
  }
}

export function handleSummary(data) {
  return {
    'stress/k6-summary.json': JSON.stringify(data, null, 2),
  };
}
