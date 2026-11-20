import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { STATIONS, type Demo, type StationId } from '../demo';
import { calculateProfit, formatCOP, retryTask, type Product, type StoreState, type Supplier } from '../commerce';

type Props = {
  station: StationId | null;
  demo: Demo;
  commerce: { store: StoreState; setStore: (updater: (current: StoreState) => StoreState) => void; createProduct: (product: Omit<Product, 'id' | 'demo' | 'updatedAt'>) => void; createSupplier: (supplier: Omit<Supplier, 'id' | 'demo' | 'updatedAt'>) => void };
  onClose: () => void;
};

export default function CommercePanel({ station, demo, commerce, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [productName, setProductName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  useEffect(() => {
    if (!station) return;
    closeButton.current?.focus({ preventScroll: true });
  }, [station]);
  if (!station) return null;
  const agent = STATIONS.find(item => item.id === station)!;
  const status = demo.getStatus(station);
  const tasks = commerce.store.tasks.filter(task => task.station === station);
  const product = commerce.store.products[0];

  return (
    <aside className="agent-panel" role="dialog" aria-modal="false" aria-labelledby="panel-title" style={{ '--agent-accent': agent.accent } as CSSProperties}>
      <div className="panel-handle" />
      <header className="panel-header">
        <div className="panel-agent-number">{agent.initial}</div>
        <div><p className="panel-eyebrow">AGENTE COMERCIAL</p><h2 id="panel-title">{agent.name}</h2></div>
        <button ref={closeButton} className="panel-close" onClick={onClose} aria-label="Cerrar panel del agente">×</button>
      </header>
      <div className="panel-scroll">
        <p className="panel-role">{agent.role}</p>
        <span className={`panel-status panel-status-${status.kind}`} role="status"><i />{status.label}</span>
        <section className="panel-section"><h3>TAREA ACTUAL</h3><p>{status.task}</p></section>
        <section className="panel-section"><h3>RESULTADO</h3><p className="panel-result-text" aria-live="polite">{status.result}</p></section>

        {station === 'products' && <div className="commerce-card"><span className="panel-example">DATOS DE EJEMPLO AISLADOS</span><h3>{product.name}</h3><p>{product.description}</p><form onSubmit={event => { event.preventDefault(); if (!productName.trim()) return; commerce.createProduct({ name: productName.trim(), source: 'Registro manual', description: 'Pendiente de describir y verificar', evidence: 'Sin evidencia externa', demandSignal: 'hipotesis', verified: false, supplierId: commerce.store.suppliers[0]?.id ?? '', supplierReference: '', salePriceCOP: 0, purchaseCostCOP: 0, shippingPaidCOP: 0, shippingChargedCOP: 0, commissionCOP: 0, advertisingCOP: 0, otherCOP: 0 }); setProductName(''); }}><label>Nuevo producto<input value={productName} onChange={event => setProductName(event.target.value)} placeholder="Nombre del producto" /></label><button type="submit">Crear candidato</button></form></div>}
        {station === 'suppliers' && <div className="commerce-card"><h3>{commerce.store.suppliers[0].name}</h3><p>Cobertura: {commerce.store.suppliers[0].coverage}</p><form onSubmit={event => { event.preventDefault(); if (!supplierName.trim()) return; commerce.createSupplier({ name: supplierName.trim(), contact: 'Pendiente', coverage: 'Pendiente de verificar', dispatchTerms: 'Pendiente de verificar', costCOP: 0, source: 'Registro manual' }); setSupplierName(''); }}><label>Nuevo proveedor<input value={supplierName} onChange={event => setSupplierName(event.target.value)} placeholder="Nombre del proveedor" /></label><button type="submit">Crear proveedor</button></form></div>}
        {station === 'profitability' && product && <div className="commerce-card"><h3>{formatCOP(calculateProfit(product).grossContributionCOP)}</h3>{(() => { const profit = calculateProfit(product); return <><p>Ingreso: {formatCOP(profit.revenueCOP)}</p><p>Costos: {formatCOP(profit.purchaseCOP + profit.deliveryPaidCOP + profit.commissionCOP + profit.advertisingCOP + profit.otherCOP)}</p><p>Margen: {profit.marginPercent === null ? 'Pendiente' : `${profit.marginPercent}%`}</p>{profit.missing.length > 0 && <p className="panel-caption">Faltantes: {profit.missing.join(', ')}</p>}</> })()}</div>}
        {station === 'catalog' && <div className="commerce-card"><span className="panel-example">BORRADOR LOCAL</span><h3>{product.name}</h3><p>Estado: borrador · Publicación: pendiente de autorización</p></div>}
        {station === 'advertising' && <div className="commerce-card"><h3>Propuesta no publicada</h3><p>Características asociadas al producto y presupuesto requerido.</p><p className="panel-caption">Pendiente de integración publicitaria.</p></div>}
        {station === 'orders' && <div className="commerce-card"><h3>Pedidos internos</h3><p>Estados separados de pago, envío y devolución.</p><p className="panel-caption">Sin pedidos reales ni integración de checkout.</p></div>}
        {station === 'support' && <div className="commerce-card"><h3>Respuestas verificables</h3><p>La información del pedido y del proveedor debe revisarse antes de enviar.</p><p className="panel-caption">WhatsApp pendiente de conexión oficial.</p></div>}
        {station === 'analytics' && <div className="commerce-card"><h3>{commerce.store.products.length + commerce.store.suppliers.length} registros persistidos</h3><p>Zona horaria: America/Bogota</p><p>Incluye datos demo identificados.</p></div>}

        <section className="panel-section"><h3>HISTORIAL DE TAREAS</h3>{tasks.length === 0 ? <p>No hay tareas registradas.</p> : tasks.slice(0, 6).map(item => <div className="task-row" key={item.id}><div><strong>{item.type}</strong><small>{item.status} · intento {item.attempts}</small></div>{item.status === 'failed' && <button onClick={() => commerce.setStore(current => retryTask(current, item.id))}>Reintentar</button>}</div>)}</section>
      </div>
      <footer className="panel-footer"><i />Datos locales · COP · Colombia</footer>
    </aside>
  );
}
