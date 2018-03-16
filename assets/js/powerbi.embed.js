//remove after testing
//
Vue.config.devtools = true;
//
//

function composeDateFilter(ds,de) {
	if (window.hasOwnProperty('report')) {
		var datesFilter = new window['powerbi-client'].models.AdvancedFilter({
				'table': 'dates',
				'column': 'ДАТА'
			},
			"And",
			[
				{
					'operator':"GreaterThanOrEqual",
					'value': ds.toISOString()
				},
				{
					'operator':"LessThanOrEqual",
					'value': de.toISOString()
			}
			]
		);
		return datesFilter;
	} else {
		setTimeout(function(){composeDateFilter(ds,de)}, 300);
	}
};
var addDatePicker = function() {
	if (window.hasOwnProperty('report') && window.embedFinished) {
		$('#datepicker').show();
		var ysd = new Date();
		ysd.setHours(0,0,0,0);
		ysd.setDate(ysd.getDate() - 1);
		var pastDate = new Date();
		pastDate.setHours(0,0,0,0);
		pastDate.setDate(pastDate.getDate() - 8);
		var datepicker = $('#datepicker input').datepicker({
			language: 'en',
			range: true,
			multipleDatesSeparator: ' ; ',
			toggleSelected: false,
			dateFormat: "dd.mm.yyyy",
			clearButton: true,
			autoClose: true,
			madDate: ysd,
			onRenderCell: function(date, ct) {
				if (date > ysd) {
					return {
						disabled: true
					}
				}
			},
			onSelect: function(fd, d){
				if (d.length > 1) {
					console.log('Selected Range: [ ' + d[0].toISOString() + ' - ' + d[1].toISOString() + ' ]');
					var updatedFilter = composeDateFilter(d[0], d[1])
					pbi_app.applyNewFilter(updatedFilter);
				}
			}
		});
		datepicker.data('datepicker').selectDate([pastDate,ysd]);
	} else {
		window.setTimeout(function(){ addDatePicker(); }, 500);
	}
};

function deviceType(){
	return /iPad/.test(navigator.userAgent)?"t":/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Silk/.test(navigator.userAgent)?"m":"d";
}
function getFunAvailability(name){
	if(typeof window[name] == 'function') {
		return(true);
	} else {
		return(false);
	}
}
function getGreetingTime (m) {
	var g = null; //return g
	
	if(!m || !m.isValid()) { return; }
	
	var split_afternoon = 12;
	var split_evening = 18;
	var currentHour = parseFloat(m.format("HH"));
	
	if(currentHour >= split_afternoon && currentHour <= split_evening) {
		g = "дня";
	} else if(currentHour >= split_evening) {
		g = "вечера";
	} else {
		g = "утра";
	}
	
	return g;
}
var pbi_app = new Vue({
	el: 	'#dashboard-page',
	data: {
		partOfDay: 'времени суток',
		login: '',
		password: '',
		point: 'testing',
		//point: document.location.pathname.replace(/\//g,'').toLowerCase(),
		userData: {},
		activeScreen: 'auth',
		initialFilters: [],
		currentMode: 'view',
		savedReports: [],
		logger: [],
		deviceType: deviceType(),
		reportPages: [],
		storeMode: getFunAvailability('appCookies') ? 'cookies' : ( typeof localStorage == 'object' ? 'localstorage' : 'nostore')
	},
	created: function()	{},
	mounted: function()	{
		this.partOfDay = getGreetingTime(moment());
		switch(this.storeMode) {
			case 'cookies':
				if (appCookies.get('userToken') && appCookies.get('userLogin')) {
					this.getMe(appCookies.get('userLogin'), appCookies.get('userToken'), this.point, 'resume', appCookies.get('pbiRefresh'));
				} else {
					this.login = '';
					this.password = '';
					$('#preloader').fadeOut('slow');
				}
				break;
			case 'localstorage':
				if (localStorage.getItem('userToken') && localStorage.getItem('userLogin')) {
					this.getMe(localStorage.getItem('userLogin'), localStorage.getItem('userToken'), this.point, 'resume',  localStorage.getItem('pbiRefresh'));
				} else {
					this.login = '';
					this.password = '';
					$('#preloader').fadeOut('slow');
				}
				break;
			default:
				this.login = '';
				this.password = '';
				$('#preloader').fadeOut('slow');
		}
	},
	methods: {
		getMe: function(l,c,p,t,r) {
			var proceed = (typeof l == 'string') && (typeof c == 'string') && (typeof p == 'string') && (typeof t == 'string');
				proceed = proceed && (l.length >= 2) && (c.length >= 2) && (p.length >= 2) && (t.length >= 2)
			r = typeof r !== 'undefined' ? r : '';
			if (!proceed) {
				console.log('empty or invalid data');
			} else {
				var that = this;
				$.post(
					'https://pvq.sh/pbi/login.php',
					{
						userLogin: l,
						token: c,
						type: t,
						point: p,
						refresh_token: r
					},
					function(data) {
					if (!data.result) {
						if (data.reason == 'login' && t == 'start') {

						}
						if (data.reason == 'challenge' && t == 'start') {

						}
					} else {
						that.userData = data;
						if (t == 'start') {
							switch(that.storeMode) {
								case 'cookies':
									expiration_info = 1 / ( 24 * 60 );
									if ($('input[name=persist_here]').is(':checked')) {	
										expiration_info = 365;
									};
									appCookies.set('userToken', that.userData['token'], {expires: expiration_info, path: ''});
									appCookies.set('userLogin', that.userData['login'], {expires: expiration_info, path: ''});
									appCookies.set('pbiRefresh', that.userData['auth_data']['refresh'], {expires: expiration_info, path: ''});
									break;
								case 'localstorage':
									localStorage.setItem('userLogin', that.userData['login']);
									localStorage.setItem('userToken', that.userData['token']);
									localStorage.setItem('pbiRefresh', that.userData['auth_data']['refresh']);
									break;
							}
							delete that.login;
							delete that.password;
						}
						document.title = data.app_title + ' | Artics Internet Solutions'
						that.defineReport(data);
					}
				});
			}
		},
		defineReport: function(o) {
			window.embedInitiated = true;
			var models = window['powerbi-client'].models;
			window.embedConfiguration = {
				accessToken: o['auth_data']['access'],
				type: 'report',
				pageView: 'fitToWidth',
				id: this.reportId,
				embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=' + o['report'] + '&groupId=' + o['group'],
				settings: {
					navContentPaneEnabled: false,
					filterPaneEnabled: false,
					layoutType: models.LayoutType.Custom,
					customLayout: {
						displayOption: models.DisplayOption.FitToPage
					}
				},
				permissions: 7,
				viewMode: 0
			};
			console.log('Embedding Initiated');
			var reportContainer = $('#embedContainer');
			window.report = powerbi.embed(reportContainer.get(0), window.embedConfiguration);

			var that = this;
			$('#preloader').fadeOut('slow');
			that.activeScreen = 'report';

			window.report.on("saved", function(r){
				console.log('Save Triggered');
				if(r.detail.saveAs)	{
					that.savedReports.push({'name': r.detail.reportName, 'id': r.detail.reportObjectId})
				}
			});
			window.report.on("loaded", function() {
				console.log('Embedding Finished')
				$('.report__loading').toggle('slow');
				$('.report__actions').toggle('slow');
				$('.report__pages__holder').toggle('slow');
				window.report.getPages().then(function(pages) {
					let pages_list = [];
					pages.forEach(function(page) {
						pages_list.push({
							'name': page.name,
							'displayName' : page.displayName
						})
					});
					that.reportPages = pages_list;
					window.report.setPage(that.reportPages[0].name);
					setTimeout(function(){$('#bi_report_' + that.reportPages[0].name).toggleClass('active')}, 500);
				});
				let newFilters = [];
				window.report.getFilters().then(function(filters) {
					for (var i in filters) {
						if (filters[i].target.table != 'dates') {
								for (var j in filters[i].conditions) {
									if (typeof filters[i].conditions[j].value == 'undefined') {
										filters[i].conditions[j].value = ''
									}
								}
							newFilters.push(filters[i])
						}
					}
					that.initialFilters = newFilters;
					window.embedFinished = true;
				})
			});
		},
		switchModes: function()	{
			if(this.currentMode == 'view')
			{
				window.report.switchMode('edit')
				this.currentMode = 'edit'
			}
			else
			{
				window.report.switchMode('view')
				this.currentMode = 'view'
			}
			$('#switch-report-mode').toggleClass('view');
		},
		setReportPage: function(page, e) {
			window.report.setPage(page);
			$(e.currentTarget).parent('ul').children('li').removeClass('active');
			$(e.currentTarget).toggleClass('active');
		},
		logoutMe: function() {
			switch(this.storeMode) {
				case 'cookies':
					appCookies.remove('userToken', {path: ''});
					appCookies.remove('userLogin', {path: ''});
					appCookies.remove('pbiRefresh', {path: ''});
					break;
				case 'localstorage':
					localStorage.removeItem('userLogin');
					localStorage.removeItem('userToken');
					localStorage.removeItem('pbiRefresh');
					break;
				}
			location.reload();
		},
		applyNewFilter: function(filterConfig) {
			if (window.hasOwnProperty('report') && window.embedFinished) {
				var newFiltersSet = this.initialFilters.concat(filterConfig);
				window.report.setFilters(newFiltersSet);
				console.log('applied')
			} else {
				window.setTimeout(function(){this.applyNewFilter(filterConfig)}, 500);
			}
		}
	}
});
