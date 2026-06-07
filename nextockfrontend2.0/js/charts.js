// Gráficos interactivos con Highcharts (tooltips al pasar el mouse).

Highcharts.setOptions({
  lang: { thousandsSep: ',', decimalPoint: '.' },
  credits: { enabled: false },
});

const COL = { hist: '#2563eb', tend: '#1d4ed8', pron: '#f59e0b', stock: '#0ea5e9',
  ok: '#16a34a', alerta: '#dc2626', ambar: '#f59e0b', morado: '#7c3aed' };

// Convierte una fecha ('YYYY-MM-DD' o ISO completo) a timestamp UTC
function ts(fecha) {
  return new Date(fecha).getTime();
}
// Convierte [{fecha, valor}] -> [[timestamp, valor]]
function pts(arr) {
  return (arr || []).map((p) => [ts(p.fecha), p.valor]);
}

function chartDemanda(serie) {
  Highcharts.chart('chart-demanda', {
    chart: { type: 'line', zoomType: 'x' },
    title: { text: null },
    xAxis: { type: 'datetime' },
    yAxis: { title: { text: 'Unidades / día' }, min: 0 },
    tooltip: { shared: true, xDateFormat: '%d %b %Y', valueDecimals: 1 },
    series: [
      { name: 'Ventas reales', data: pts(serie.demanda.ventas_reales), color: COL.hist,
        opacity: 0.35, lineWidth: 1, marker: { radius: 2 } },
      { name: 'Tendencia (prom. 7d)', data: pts(serie.demanda.tendencia_7d), color: COL.tend, lineWidth: 3 },
      { name: 'Pronóstico XGBoost', data: pts(serie.demanda.pronostico), color: COL.pron,
        lineWidth: 3, dashStyle: 'ShortDot', marker: { radius: 3 } },
    ],
  });
}

function chartStock(serie) {
  const r = serie.resumen;
  Highcharts.chart('chart-stock', {
    chart: { type: 'area', zoomType: 'x' },
    title: { text: null },
    xAxis: { type: 'datetime' },
    yAxis: {
      title: { text: 'Unidades en stock' }, min: 0,
      plotLines: [
        { value: r.punto_reorden, color: COL.alerta, dashStyle: 'Dash', width: 2,
          label: { text: 'Punto de reorden (' + Math.round(r.punto_reorden) + ')', style: { color: COL.alerta } } },
        { value: r.stock_seguridad, color: COL.ambar, dashStyle: 'Dot', width: 2,
          label: { text: 'Stock seguridad (' + Math.round(r.stock_seguridad) + ')', style: { color: COL.ambar } } },
      ],
    },
    tooltip: { xDateFormat: '%d %b %Y', valueDecimals: 1, valueSuffix: ' u' },
    plotOptions: { area: { fillOpacity: 0.15, color: COL.stock, marker: { radius: 3 } } },
    series: [{ name: 'Stock proyectado', data: pts(serie.stock_proyectado) }],
  });
}

function chartEstados(rep) {
  Highcharts.chart('chart-estados', {
    chart: { type: 'column' },
    title: { text: null },
    xAxis: { categories: ['Óptimo', 'Sobre stock', 'Déficit'] },
    yAxis: { title: { text: 'N° de productos' }, allowDecimals: false },
    tooltip: { valueSuffix: ' productos' },
    legend: { enabled: false },
    plotOptions: { column: { borderRadius: 4, dataLabels: { enabled: true } } },
    series: [{
      name: 'Productos', colorByPoint: true,
      colors: [COL.ok, COL.ambar, COL.alerta],
      data: [rep.n_optimo, rep.n_sobre_stock, rep.n_deficit],
    }],
  });
}

function chartRanking(ranking) {
  Highcharts.chart('chart-ranking', {
    chart: { type: 'bar' },
    title: { text: null },
    xAxis: { categories: ranking.map((r) => r.sku + ' - ' + r.nombre) },
    yAxis: { title: { text: 'Unidades vendidas' } },
    tooltip: { valueSuffix: ' u' },
    legend: { enabled: false },
    series: [{ name: 'Vendidos', color: COL.hist,
      data: ranking.map((r) => r.unidades_vendidas) }],
  });
}

function chartVentas(datos) {
  Highcharts.chart('chart-ventas', {
    chart: { type: 'area', zoomType: 'x' },
    title: { text: null },
    xAxis: { type: 'datetime' },
    yAxis: { title: { text: 'Ingreso (S/)' }, min: 0 },
    tooltip: { xDateFormat: '%d %b %Y', valuePrefix: 'S/ ', valueDecimals: 2 },
    plotOptions: { area: { fillOpacity: 0.12, color: COL.ok, lineColor: COL.ok } },
    series: [{ name: 'Ingreso', data: datos.map((p) => [ts(p.fecha), p.ingreso]) }],
  });
}
