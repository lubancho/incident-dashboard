(function () {
  const U = window.IncidentUtils;

  function baseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 280
      },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,.96)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 10
        }
      }
    };
  }

  function destroyChart(chart) {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  }

  function buildLineOrBar(ctx, type, labels, values, label, color, chartState) {
    destroyChart(chartState.chart);
    chartState.chart = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [{
          label,
          data: values,
          borderColor: color,
          backgroundColor: color,
          fill: type === 'line' ? false : true,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: type === 'line' ? 3 : 0,
          pointHoverRadius: 4
        }]
      },
      options: {
        ...baseOptions(),
        scales: {
          x: {
            grid: { color: 'rgba(100,116,139,.10)' },
            ticks: { color: '#64748b', maxRotation: 0, autoSkip: true }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(100,116,139,.10)' },
            ticks: { color: '#64748b', precision: 0 }
          }
        }
      }
    });
  }

  function buildDoughnut(ctx, labels, values, chartState) {
    destroyChart(chartState.chart);
    chartState.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        ...baseOptions(),
        cutout: '62%',
        plugins: {
          ...baseOptions().plugins,
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 16 }
          }
        }
      }
    });
  }

  function buildHorizontalBar(ctx, labels, values, chartState) {
    destroyChart(chartState.chart);
    chartState.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Incidents',
          data: values,
          backgroundColor: '#0b5fff',
          borderColor: '#0b5fff',
          borderRadius: 10,
          barThickness: 18
        }]
      },
      options: {
        ...baseOptions(),
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(100,116,139,.10)' },
            ticks: { color: '#64748b', precision: 0 }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#334155' }
          }
        }
      }
    });
  }

  function renderCharts(viewModel, appState) {
    const dailyCtx = document.getElementById('dailyChart');
    const weeklyCtx = document.getElementById('weeklyChart');
    const monthlyCtx = document.getElementById('monthlyChart');
    const distributionCtx = document.getElementById('distributionChart');
    const objectsCtx = document.getElementById('objectsChart');

    if (!appState.charts) appState.charts = {};
    if (!appState.charts.daily) appState.charts.daily = {};
    if (!appState.charts.weekly) appState.charts.weekly = {};
    if (!appState.charts.monthly) appState.charts.monthly = {};
    if (!appState.charts.distribution) appState.charts.distribution = {};
    if (!appState.charts.objects) appState.charts.objects = {};

    buildLineOrBar(dailyCtx, 'bar', viewModel.charts.daily.labels, viewModel.charts.daily.values, 'Daily incidents', '#0b5fff', appState.charts.daily);
    buildLineOrBar(weeklyCtx, 'bar', viewModel.charts.weekly.labels, viewModel.charts.weekly.values, 'Weekly incidents', '#16a34a', appState.charts.weekly);
    buildLineOrBar(monthlyCtx, 'bar', viewModel.charts.monthly.labels, viewModel.charts.monthly.values, 'Monthly incidents', '#d97706', appState.charts.monthly);
    buildDoughnut(distributionCtx, viewModel.charts.distribution.labels, viewModel.charts.distribution.values, appState.charts.distribution);
    buildHorizontalBar(objectsCtx, viewModel.charts.top.map(x => x.object), viewModel.charts.top.map(x => x.total), appState.charts.objects);
  }

  window.IncidentCharts = {
    renderCharts,
    destroyChart
  };
})();

