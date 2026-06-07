export interface Perfil {
  id: number;
  email: string;
  nombre: string;
  telefono: string | null;
  bodega: string | null;
  rol: string;
  foto: string | null;
  registrado: string;
}

export interface SesionResp {
  access_token: string;
  usuario: { id: number; email: string; nombre: string };
}

export interface Producto {
  productId: number;
  sourceProductId: string;
  productName: string;
  category: string;
  salePrice: number | string;
  purchasePrice: number | string;
}

export interface Metricas {
  productos_total?: number;
  unidades_en_stock?: number;
  valor_inventario?: number;
  productos_bajo_stock?: number;
  productos_agotados?: number;
  tasa_quiebre_pct?: number;
  sin_datos?: boolean;
  mensaje?: string;
}

export interface Punto { fecha: string; valor: number; }

export interface Series {
  sku: string;
  nombre: string;
  categoria: string;
  estado: string;
  resumen: {
    stock_actual: number;
    demanda_proyectada: number;
    nivel_recomendado_pedido: number;
    prob_quiebre_pct: number;
    fecha_agotamiento: string | null;
    punto_reorden: number;
    stock_seguridad: number;
  };
  demanda: { ventas_reales: Punto[]; tendencia_7d: Punto[]; pronostico: Punto[] };
  stock_proyectado: Punto[];
}

export interface FilaReporte {
  sku: string;
  nombre: string;
  estado: string;
  stock_actual: number;
  demanda_diaria_prom: number;
  dias_hasta_quiebre: number | null;
  cantidad_recomendada_pedir: number;
}

export interface Reporte {
  productos: FilaReporte[];
  n_optimo: number;
  n_sobre_stock: number;
  n_deficit: number;
}

export interface Finanzas {
  ingreso_total: number;
  costo_total: number;
  utilidad_bruta: number;
  margen_pct: number;
  unidades_vendidas: number;
}
