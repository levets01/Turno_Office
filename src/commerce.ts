import { useCallback, useEffect, useState } from 'react';

export type COP = number;

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type StationId = 'products' | 'suppliers' | 'profitability' | 'catalog' | 'advertising' | 'orders' | 'support' | 'analytics';

export type CommerceTaskType =
  | 'register-product'
  | 'verify-supplier'
  | 'calculate-profit'
  | 'create-catalog-draft'
  | 'prepare-ad-draft'
  | 'register-order-draft'
  | 'prepare-support-response'
  | 'refresh-analytics';

export type CommerceTask = {
  id: string;
  station: StationId;
  type: CommerceTaskType;
  status: TaskStatus;
  responsible: 'agent' | 'operator';
  inputs: Record<string, unknown>;
  inputVersion: number;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  dependencies: string[];
  correlationId: string;
  provider?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  coverage: string;
  dispatchTerms: string;
  costCOP: COP;
  source: string;
  updatedAt: string;
  demo: boolean;
};

export type Product = {
  id: string;
  name: string;
  source: string;
  description: string;
  evidence: string;
  demandSignal: 'hipotesis' | 'observada' | 'ventas-reales';
  verified: boolean;
  supplierId: string;
  supplierReference: string;
  salePriceCOP: COP;
  purchaseCostCOP: COP;
  shippingPaidCOP: COP;
  shippingChargedCOP: COP;
  commissionCOP: COP;
  advertisingCOP: COP;
  otherCOP: COP;
  demo: boolean;
  updatedAt: string;
};

export type StoreState = { products: Product[]; suppliers: Supplier[]; tasks: CommerceTask[] };
export const COMMERCE_STORAGE_KEY = 'codex-commerce:store:v1';

export function emptyStore(): StoreState {
  return {
    suppliers: [{ id: 'demo-supplier-1', name: 'Proveedor demo Colombia', contact: 'Pendiente de configurar', coverage: 'Bogotá y principales ciudades', dispatchTerms: 'Datos de ejemplo; validar antes de operar', costCOP: 0, source: 'Registro local de demostración', updatedAt: '2026-11-20T00:00:00.000Z', demo: true }],
    products: [{ id: 'demo-product-1', name: 'Producto ejemplo', source: 'Fuente ficticia', description: 'Producto de demostración identificado y aislado.', evidence: 'Sin evidencia externa verificada', demandSignal: 'hipotesis', verified: false, supplierId: 'demo-supplier-1', supplierReference: 'REF-DEMO-001', salePriceCOP: 125000, purchaseCostCOP: 62000, shippingPaidCOP: 12000, shippingChargedCOP: 15000, commissionCOP: 9000, advertisingCOP: 5000, otherCOP: 0, demo: true, updatedAt: '2026-11-20T00:00:00.000Z' }],
    tasks: []
  };
}

export function readStore(): StoreState {
  try {
    const raw = localStorage.getItem(COMMERCE_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.suppliers) || !Array.isArray(parsed.tasks)) return emptyStore();
    return { products: parsed.products, suppliers: parsed.suppliers, tasks: parsed.tasks };
  } catch { return emptyStore(); }
}

export function saveStore(store: StoreState): boolean {
  try { localStorage.setItem(COMMERCE_STORAGE_KEY, JSON.stringify(store)); return true; } catch { return false; }
}

export function toCOP(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type ProfitBreakdown = {
  revenueCOP: COP;
  purchaseCOP: COP;
  deliveryPaidCOP: COP;
  commissionCOP: COP;
  advertisingCOP: COP;
  otherCOP: COP;
  grossContributionCOP: COP;
  marginPercent: number | null;
  missing: string[];
};

export function calculateProfit(product: Product): ProfitBreakdown {
  const missing: string[] = [];
  if (!product.salePriceCOP) missing.push('Precio de venta');
  if (!product.purchaseCostCOP) missing.push('Costo de compra');
  if (!product.shippingPaidCOP) missing.push('Envío pagado');
  if (!product.verified) missing.push('Verificación del producto');
  const revenue = product.salePriceCOP + product.shippingChargedCOP;
  const costs = product.purchaseCostCOP + product.shippingPaidCOP + product.commissionCOP + product.advertisingCOP + product.otherCOP;
  const contribution = toCOP(revenue - costs);
  return { revenueCOP: toCOP(revenue), purchaseCOP: toCOP(product.purchaseCostCOP), deliveryPaidCOP: toCOP(product.shippingPaidCOP), commissionCOP: toCOP(product.commissionCOP), advertisingCOP: toCOP(product.advertisingCOP), otherCOP: toCOP(product.otherCOP), grossContributionCOP: contribution, marginPercent: revenue > 0 ? toCOP(contribution / revenue * 100) : null, missing };
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

export function newCorrelationId(prefix = 'cc'): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function createTask(store: StoreState, station: StationId, type: CommerceTaskType, inputs: Record<string, unknown>, responsible: 'agent' | 'operator' = 'agent', dependencies: string[] = []): { store: StoreState; task: CommerceTask } {
  const now = new Date().toISOString();
  const task: CommerceTask = {
    id: newCorrelationId('task'), station, type, status: 'queued', responsible,
    inputs, inputVersion: 1, attempts: 0, dependencies,
    correlationId: newCorrelationId('corr'), createdAt: now, updatedAt: now,
  };
  return { store: { ...store, tasks: [task, ...store.tasks] }, task };
}

export function runTask(store: StoreState, taskId: string): StoreState {
  const now = new Date().toISOString();
  return {
    ...store,
    tasks: store.tasks.map(task => {
      if (task.id !== taskId) return task;
      try {
        const attempts = task.attempts + 1;
        let result: Record<string, unknown>;
        switch (task.type) {
          case 'calculate-profit': {
            const product = store.products.find(item => item.id === task.inputs.productId);
            if (!product) throw new Error('El producto seleccionado no existe');
            result = { breakdown: calculateProfit(product), demo: product.demo };
            break;
          }
          case 'register-product':
            result = { action: 'Producto registrado o preparado para verificación', verified: false };
            break;
          case 'verify-supplier':
            result = { action: 'Cobertura y condiciones quedan pendientes de validación', verified: false };
            break;
          case 'create-catalog-draft':
            result = { action: 'Borrador de catálogo creado', publication: 'draft' };
            break;
          case 'prepare-ad-draft':
            result = { action: 'Propuesta publicitaria preparada', authorized: false };
            break;
          case 'register-order-draft':
            result = { action: 'Pedido interno preparado', idempotencyRequired: true };
            break;
          case 'prepare-support-response':
            result = { action: 'Respuesta preparada', reviewRequired: true };
            break;
          case 'refresh-analytics':
            result = {
              period: 'America/Bogota', created: store.products.length,
              persistedRecords: store.products.length + store.suppliers.length,
              demoRecordsIncluded: true,
            };
            break;
          default:
            throw new Error('Tipo de tarea no admitido');
        }
        return { ...task, status: 'completed', attempts, result, error: undefined, updatedAt: now };
      } catch (error) {
        return { ...task, status: 'failed', attempts: task.attempts + 1,
          error: error instanceof Error ? error.message : 'Error desconocido', updatedAt: now };
      }
    }),
  };
}

export function retryTask(store: StoreState, taskId: string): StoreState {
  const queued = {
    ...store,
    tasks: store.tasks.map(task => task.id === taskId
      ? { ...task, status: 'queued' as TaskStatus, error: undefined, updatedAt: new Date().toISOString() }
      : task),
  };
  return runTask(queued, taskId);
}

export function executeAllAgentTasks(store: StoreState): StoreState {
  const stationTypes: [StationId, CommerceTaskType][] = [
    ['products', 'register-product'], ['suppliers', 'verify-supplier'],
    ['profitability', 'calculate-profit'], ['catalog', 'create-catalog-draft'],
    ['advertising', 'prepare-ad-draft'], ['orders', 'register-order-draft'],
    ['support', 'prepare-support-response'], ['analytics', 'refresh-analytics'],
  ];
  let next = store;
  for (const [station, type] of stationTypes) {
    const inputs = type === 'calculate-profit' && store.products[0]
      ? { productId: store.products[0].id }
      : {};
    const created = createTask(next, station, type, inputs);
    next = runTask(created.store, created.task.id);
  }
  return next;
}

export function useCommerce() {
  const [store, setStore] = useState<StoreState>(readStore);
  const [running, setRunning] = useState(false);

  useEffect(() => { saveStore(store); }, [store]);

  const runAll = useCallback(() => {
    if (running) return;
    setRunning(true);
    window.setTimeout(() => {
      setStore(current => executeAllAgentTasks(current));
      setRunning(false);
    }, 850);
  }, [running]);

  const createProduct = useCallback((product: Omit<Product, 'id' | 'demo' | 'updatedAt'>) => {
    setStore(current => {
      const now = new Date().toISOString();
      const complete: Product = { ...product, id: newCorrelationId('product'), demo: false, updatedAt: now };
      const created = createTask({ ...current, products: [complete, ...current.products] }, 'products', 'register-product', { productId: complete.id });
      return runTask(created.store, created.task.id);
    });
  }, []);

  const createSupplier = useCallback((supplier: Omit<Supplier, 'id' | 'demo' | 'updatedAt'>) => {
    setStore(current => {
      const now = new Date().toISOString();
      const complete: Supplier = { ...supplier, id: newCorrelationId('supplier'), demo: false, updatedAt: now };
      const created = createTask({ ...current, suppliers: [complete, ...current.suppliers] }, 'suppliers', 'verify-supplier', { supplierId: complete.id });
      return runTask(created.store, created.task.id);
    });
  }, []);

  const retry = useCallback((taskId: string) => {
    setStore(current => retryTask(current, taskId));
  }, []);

  return { store, setStore, running, runAll, createProduct, createSupplier, retry };
}
