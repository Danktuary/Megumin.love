document.addEventListener('DOMContentLoaded', () => {
	const formatNumber = number => number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
	const statistics = {};
	const chartContext = document.getElementsByTagName('canvas')[0];
	const tickArray = [25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000];

	// Establish basic chart model without data
	const chart = new Chart(chartContext, {
		type: 'line',
		data: {
			labels: [],
			datasets: [{
				data: [],
				label: 'Clicks',
			}]
		},
		options: {
			scales: {
				yAxes: [{
					type: 'logarithmic',
					ticks: {
						callback: tick => tick.toLocaleString('de-DE'),
						min: 25000,
						max: 100000000
					},
					afterBuildTicks: axis => axis.ticks = tickArray
				}]
			},
			tooltips: {
				callbacks: {
					label: (tItems, lData) => `${lData.datasets[0].data[tItems.index].toLocaleString('de-DE')}`
				}
			}
		}
	});

	const alltime = document.getElementById('alltime');
	const daily = document.getElementById('daily');
	const weekly = document.getElementById('weekly');
	const monthly = document.getElementById('monthly');
	const yearly = document.getElementById('yearly');
	const average = document.getElementById('average');


	const updateStatistics = stats => {
		alltime.innerText = `All-time clicks: ${formatNumber(stats.summary.alltime)}`;
		daily.innerText = `Today's clicks: ${formatNumber(stats.summary.daily)}`;
		weekly.innerText = `This week's clicks: ${formatNumber(stats.summary.weekly)}`;
		monthly.innerText = `This month's clicks: ${formatNumber(stats.summary.monthly)}`;
		yearly.innerText = `This year's clicks: ${formatNumber(stats.summary.yearly)}`;
		average.innerText = `Average clicks a day (in this month): ~${formatNumber(stats.summary.average)}`;

		chart.data.labels = stats.chartData.map(entry => entry = entry.month);
		chart.data.datasets[0].data = stats.chartData.map(entry => entry = entry.clicks);
		chart.update();
	};

	fetch('/api/statistics/summary').then(res => res.json()).then(summary => {
		statistics.summary = summary;
	}).then(() => fetch('/api/statistics/chartData').then(res => res.json()).then(cData => {
		statistics.chartData = cData;
	})).then(() => {
		updateStatistics(statistics);

		fetch('/api/conInfo').then(res => res.json()).then(con => {
			const domainOrIP = document.URL.split('/')[2].split(':')[0];
			const host = con.ssl ? `wss://${domainOrIP}` : `ws://${domainOrIP}:${con.port}`;

			const ws = new WebSocket(host);

			ws.addEventListener('open', event => {
				ws.addEventListener('message', message => {
					let data;

					try {
						data = JSON.parse(message.data);
					}
					catch (e) {
						data = {};
					}

					if (!['counterUpdate', 'soundUpdate', 'crazyMode', 'notification'].includes(data.type)) return;

					if (data.type === 'counterUpdate' && data.statistics) {
						if (data.statistics.newChartData) {
							statistics.chartData[statistics.chartData.length - 1] = data.statistics.newChartData;
						}
						statistics.summary = data.statistics.summary;

						return updateStatistics(statistics);
					}
					else if (data.type === 'notification' && data.notification) {
						document.getElementById('notification').innerText = data.notification.text;
						return util.fade(document.getElementById('notification-wrapper'), data.notification.duration * 1000, 0.1);
					}
				});
			});
		});
	});
});