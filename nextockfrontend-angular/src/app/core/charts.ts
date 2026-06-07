import * as Highcharts from 'highcharts';
import { Reporte, Series } from './models';

const COL = { hist: '#2563eb', tend: '#1d4ed8', pron: '#f59e0b', stock: '#0ea5e9',
  ok: '#16a34a', alerta: '#dc2626', ambar: '#f59e0b' };

const ts = (f: string) => new Date(f).getTime();
const pts = (arr: { fecha: string; valor: number }[]) =>
  (arr || []).map((p) => [ts(p.fecha), p.valor] as [number, number]);

export function optDemanda(s: Series): Highcharts.Options {
  return {
    chart: { type: 'line', zoomType: 'x' } as any,
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { type: 'datetime' },
    yAxis: { title: { text: 'Unidades / día' }, min: 0 },
    tooltip: { shared: true, xDateFormat: '%d %b %Y', valueDecimals: 1 },
    series: [
      { type: 'line', name: 'Ventas reales', data: pts(s.demanda.ventas_reales), color: COL.hist, opacity: 0.35, lineWidth: 1 },
      { type: 'line', name: 'Tendencia (prom. 7d)', data: pts(s.demanda.tendencia_7d), color: COL.tend, lineWidth: 3 },
      { type: 'line', name: 'Pronóstico XGBoost', data: pts(s.demanda.pronostico), color: COL.pron, lineWidth: 3, dashStyle: 'ShortDot' },
    ],
  };
}

export function optStock(s: Series): Highcharts.Options {
  const r = s.resumen;
  return {
    chart: { type: 'area', zoomType: 'x' } as any,
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { type: 'datetime' },
    yAxis: {
      title: { text: 'Unidades en stock' }, min: 0,
      plotLines: [
        { value: r.punto_reorden, color: COL.alerta, dashStyle: 'Dash', width: 2,
          label: { text: 'Reorden (' + Math.round(r.punto_reorden) + ')', style: { color: COL.alerta } } },
        { value: r.stock_seguridad, color: COL.ambar, dashStyle: 'Dot', width: 2,
          label: { text: 'Seguridad (' + Math.round(r.stock_seguridad) + ')', style: { color: COL.ambar } } },
      ],
    },
    tooltip: { xDateFormat: '%d %b %Y', valueDecimals: 1, valueSuffix: ' u' },
    plotOptions: { area: { fillOpacity: 0.15, color: COL.stock } },
    series: [{ type: 'area', name: 'Stock proyectado', data: pts(s.stock_proyectado) }],
  };
}

export function optEstados(rep: Reporte): Highcharts.Options {
  return {
    chart: { type: 'column' },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { categories: ['Óptimo', 'Sobre stock', 'Déficit'] },
    yAxis: { title: { text: 'N° de productos' }, allowDecimals: false },
    legend: { enabled: false },
    tooltip: { valueSuffix: ' productos' },
    plotOptions: { column: { borderRadius: 4, dataLabels: { enabled: true }, colorByPoint: true,
      colors: [COL.ok, COL.ambar, COL.alerta] } as any },
    series: [{ type: 'column', name: 'Productos', data: [rep.n_optimo, rep.n_sobre_stock, rep.n_deficit] }],
  };
}

export function optRanking(rk: { sku: string; nombre: string; unidades_vendidas: number }[]): Highcharts.Options {
  return {
    chart: { type: 'bar' },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { categories: rk.map((r) => r.sku + ' - ' + r.nombre) },
    yAxis: { title: { text: 'Unidades vendidas' } },
    legend: { enabled: false },
    series: [{ type: 'bar', name: 'Vendidos', color: COL.hist, data: rk.map((r) => r.unidades_vendidas) }],
  };
}

// HU-14: cuellos de botella — productos por agotarse. Las barras de los
// productos en DÉFICIT (cuellos de botella) se resaltan en rojo.
export function optCuellos(prods: any[]): Highcharts.Options {
  const data = prods
    .filter((p) => p.dias_hasta_quiebre != null)
    .sort((a, b) => a.dias_hasta_quiebre - b.dias_hasta_quiebre)
    .slice(0, 12);
  return {
    chart: { type: 'bar' },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { categories: data.map((p) => `${p.sku} - ${p.nombre}`) },
    yAxis: { title: { text: 'Días hasta quiebre' }, allowDecimals: false },
    legend: { enabled: false },
    tooltip: { pointFormat: 'Días hasta quiebre: <b>{point.y}</b>' },
    plotOptions: { bar: { dataLabels: { enabled: true } } },
    series: [{
      type: 'bar', name: 'Días',
      data: data.map((p) => ({
        y: p.dias_hasta_quiebre,
        // rojo = cuello de botella (déficit / se agota), teal = normal
        color: p.estado === 'DEFICIT' ? COL.alerta : COL.tend,
      })),
    }],
  };
}

export function optVentas(datos: { fecha: string; ingreso: number }[]): Highcharts.Options {
  return {
    chart: { type: 'area', zoomType: 'x' } as any,
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { type: 'datetime' },
    yAxis: { title: { text: 'Ingreso (S/)' }, min: 0 },
    tooltip: { xDateFormat: '%d %b %Y', valuePrefix: 'S/ ', valueDecimals: 2 } as any,
    plotOptions: { area: { fillOpacity: 0.12, color: COL.ok, lineColor: COL.ok } },
    series: [{ type: 'area', name: 'Ingreso', data: datos.map((p) => [ts(p.fecha), p.ingreso] as [number, number]) }],
  };
}

export { Highcharts };
