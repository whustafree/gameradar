import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { Language, UserStats, Game, ActivityEntry } from '../types';

Chart.register(...registerables);

interface ChartChartsProps {
  platformCount: Record<string, number>;
  totalSavings: number;
  weeklyActivity: { label: string; count: number }[];
  language: Language;
}

export default function ChartCharts({ platformCount, totalSavings, weeklyActivity, language }: ChartChartsProps) {
  const platformChartRef = useRef<HTMLCanvasElement>(null);
  const savingsChartRef = useRef<HTMLCanvasElement>(null);
  const weeklyChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Chart[]>([]);

  // Cleanup all charts on unmount
  useEffect(() => {
    return () => {
      chartInstances.current.forEach(c => c.destroy());
      chartInstances.current = [];
    };
  }, []);

  // Platform donut chart
  useEffect(() => {
    if (!platformChartRef.current || !platformCount) return;
    const ctx = platformChartRef.current.getContext('2d');
    if (!ctx) return;

    const entries = Object.entries(platformCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    if (entries.length === 0) return;

    const colors = [
      'hsl(120, 70%, 40%)', 'hsl(0, 70%, 50%)', 'hsl(215, 70%, 50%)',
      'hsl(270, 60%, 50%)', 'hsl(40, 90%, 50%)', 'hsl(180, 70%, 40%)',
    ];

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: entries.map(([p]) => p),
        datasets: [{
          data: entries.map(([, c]) => c),
          backgroundColor: colors.slice(0, entries.length),
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom' as const,
            labels: { color: '#8a8a96', font: { size: 10 }, padding: 8 },
          }
        },
        cutout: '65%',
      }
    });
    chartInstances.current.push(chart);
    return () => { chart.destroy(); };
  }, [platformCount]);

  // Savings bar chart
  useEffect(() => {
    if (!savingsChartRef.current) return;
    const ctx = savingsChartRef.current.getContext('2d');
    if (!ctx) return;

    const milestones = [100, 500, 1000, 2500, 5000];
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: milestones.map(m => `$${m}`),
        datasets: [{
          label: '',
          data: milestones.map(m => Math.min(totalSavings / m, 1) * 100),
          backgroundColor: milestones.map(m => totalSavings >= m
            ? 'hsl(40, 90%, 50%)' : 'rgba(255,255,255,0.08)'),
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { display: false, max: 100 },
          x: {
            ticks: { color: '#505060', font: { size: 9 } },
            grid: { display: false },
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const milestone = milestones[ctx.dataIndex];
                return `${totalSavings >= milestone ? '✅' : '⏳'} $${Math.min(totalSavings, milestone).toFixed(0)} / $${milestone}`;
              }
            }
          }
        }
      }
    });
    chartInstances.current.push(chart);
    return () => { chart.destroy(); };
  }, [totalSavings]);

  // Weekly activity line chart
  useEffect(() => {
    if (!weeklyChartRef.current || weeklyActivity.every(d => d.count === 0)) return;
    const ctx = weeklyChartRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 100);
    gradient.addColorStop(0, 'hsla(var(--accent-hsl), 0.3)');
    gradient.addColorStop(1, 'hsla(var(--accent-hsl), 0.0)');

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyActivity.map(d => d.label),
        datasets: [{
          label: language === 'es' ? 'Actividad' : 'Activity',
          data: weeklyActivity.map(d => d.count),
          borderColor: 'hsl(var(--accent-hsl))',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'hsl(var(--accent-hsl))',
          pointBorderColor: 'var(--bg-surface)',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#505060', font: { size: 9 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          x: {
            ticks: { color: '#505060', font: { size: 9 } },
            grid: { display: false },
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'var(--glass-bg)',
            titleColor: 'var(--text)',
            bodyColor: 'var(--text-secondary)',
            borderColor: 'var(--glass-border)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} ${language === 'es' ? 'acciones' : 'actions'}`,
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index' as const,
        }
      }
    });
    chartInstances.current.push(chart);
    return () => { chart.destroy(); };
  }, [weeklyActivity, language]);

  return (
    <>
      {/* Platforms donut */}
      {Object.keys(platformCount).length > 0 && (
        <>
          <span className="chart-title" style={{ marginTop: '0.5rem' }}>
            📱 {language === 'es' ? 'Juegos por plataforma' : 'Games by platform'}
          </span>
          <div className="chart-js-wrapper">
            <canvas ref={platformChartRef} style={{ maxHeight: '180px' }} />
          </div>
        </>
      )}

      {/* Savings bar */}
      {totalSavings > 0 && (
        <>
          <span className="chart-title" style={{ marginTop: '0.5rem' }}>
            💰 {language === 'es' ? 'Metas de ahorro' : 'Savings goals'}
          </span>
          <div className="chart-js-wrapper">
            <canvas ref={savingsChartRef} style={{ maxHeight: '140px' }} />
          </div>
        </>
      )}

      {/* Weekly activity line */}
      {weeklyActivity.some(d => d.count > 0) && (
        <>
          <span className="chart-title" style={{ marginTop: '0.5rem' }}>
            📈 {language === 'es' ? 'Actividad semanal' : 'Weekly activity'}
          </span>
          <div className="chart-js-wrapper">
            <canvas ref={weeklyChartRef} style={{ maxHeight: '140px' }} />
          </div>
        </>
      )}
    </>
  );
}
