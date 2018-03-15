Vue.config.devtools = true;
function deviceType(){
	return /iPad/.test(navigator.userAgent)?"t":/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Silk/.test(navigator.userAgent)?"m":"d";
}
var auth_app = new Vue({
	el: 	'#dashboard-page',
	data: 
	{
		u_login: Cookies.get('client_login') || '',
		u_pwd: '',
		subject: Cookies.get('subject_info') || '',
		refresh_token: Cookies.get('refresh_token') || '',
		client_name: '',
		currentMode: 'view',
		activeState: -1,
		reportId: '',
		current_empl_info: '',
		savedReports: [],
		initialFilters: [],
		groupId: 'me',
		logger: [],
		is_admin: true,
		is_editor: true,
		is_creator: false,
		deviceType: deviceType(),
		reportPages: []
	},
	created: function()
	{
		//console.log('Vue Instance was just created!')
	},
	mounted: function()
	{
		let checkin = Cookies.get('checkin')
		let subj = Cookies.get('subject_info');
		let login = String(Cookies.get('client_login')).toLowerCase()
		$.get('auth/pbi.extended.checkin.php?login=' + login + '&checkin=' + checkin + '&subj=' + subj + '&refresh=' + Cookies.get('refresh_token')).done((r) => {
			if(!r.result)
			{
				auth_app.activeState = -1;
				$('#preloader').fadeOut('slow');
			}
			else
			{
				// pbi_auth = JSON.parse(r.auth_data);
				pbi_auth = r.auth_data;
				auth_app.reportId = r['reportId'];
				auth_app.groupId = r['groupId'];
				auth_app.client_name = decodeURI(r['client']).replace(/&quot;/g, '\"');
				auth_app.activeState = 1;
				auth_app.refresh_token = pbi_auth.refresh_token;
				auth_app.is_admin = r['is_admin'];
				auth_app.is_editor = r['is_editor'];
				auth_app.is_creator = r['is_super'];
				if(r['is_admin'])
				{
					auth_app.savedReports = r.reports;
					auth_app.existedLogins = r['logins'];
				}
				Cookies.set('refresh_token', pbi_auth.refresh_token, {path: ''})
				$('#preloader').fadeOut('slow');
				expiration = pbi_auth.expires_in - 1;
				var interval_report = function() {
					if(typeof auth_app == 'object')	{
						powerbi.accessToken = pbi_auth.access_token;
						var log = {
							'login': auth_app.u_login,
							'action': 'page_open',
							'subject': Cookies.get('subject_info'),
							'details': {
								'type': 'resume_session'
							}
						};
						$.ajax({
							url: 'auth/pbi.storelog.php',
							type: 'post',
							dataType: 'json',
							data: JSON.stringify(log)
						})
						auth_app.defineReport();
						window.embedInitiated = true;
					} else {
						setTimeout(interval_report(), 300);
					}
				}
				interval_report();
			}
		})
	},
	methods: {
		getLog: function() {
			var load = {
				'login': auth_app.u_login,
				'checkin': Cookies.get('checkin'),
				'subj': auth_app.subject
			}
			$.get('auth/pbi.getlog.php?' + $.param(load))
				.done(function(r){
					if(r.result)
						{
							auth_app.logger = r.rows;
						}
				});
		},
		setReportPage: function(page, e) {
			window.report.setPage(page);
			$(e.currentTarget).parent('ul').children('li').removeClass('active');
			$(e.currentTarget).toggleClass('active');
		},
		defineReport: function() {
			var models = window['powerbi-client'].models;
			window.embedConfiguration = {
				type: 'report',
				pageView: 'fitToWidth',
				id: this.reportId,
				embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=' + this.reportId,
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
			if(this.groupId != 'me')
			{
				window.embedConfiguration.embedUrl = 'https://app.powerbi.com/reportEmbed?reportId=' + this.reportId + '&groupId=' + this.groupId
			}
			console.log('Embedding Initiated')
			let reportContainer = $('#embedContainer');

			window.report = powerbi.embed(reportContainer.get(0), embedConfiguration);
			report.on("saved", function(r){
				console.log('Save Triggered');
				var log = {
					'login': auth_app.u_login,
					'action': 'report_save',
					'subject': Cookies.get('subject_info'),
					'details': {}
				}
				if(r.detail.saveAs)
				{
					auth_app.savedReports.push({'name': r.detail.reportName, 'id': r.detail.reportObjectId})
					log.details = {
						'type': 'new',
						'name': r.detail.reportName,
						'id': r.detail.reportObjectId
					}
				}
				else
				{
					log.details = {
						'type': 'existed',
						'name': r.detail.reportName,
						'id': r.detail.reportObjectId
					}
				}
				$.ajax({
					url: 'auth/pbi.storelog.php',
					type: 'post',
					dataType: 'json',
					data: JSON.stringify(log)
				})
			});
			report.on("loaded", function() {
				console.log('Embedding Finished')
				$('.report__loading').toggle('slow');
				$('.report__actions').toggle('slow');
				$('.report__pages__holder').toggle('slow');
				report.getPages()
					.then( (pages) => {
								let pages_list = [];
								pages.forEach(function(page) {
									pages_list.push({
										'name': page.name,
										'displayName' : page.displayName
									})
								});
								auth_app.reportPages = pages_list;
								report.setPage(auth_app.reportPages[0].name);
								setTimeout(function(){$('#bi_report_' + auth_app.reportPages[0].name).toggleClass('active')}, 500);
							})
							.catch(function (error) {
									console.log(error);
							});
				let newFilters = [];
				report.getFilters().then( function(filters){
					for (var i in filters) {
						if (filters[i].target.table != 'dates') {
								for (var j in filters[i].conditions) {
								if (typeof filters[i].conditions[j].value == 'undefined'){
									filters[i].conditions[j].value = ''
								}
							}
							newFilters.push(filters[i])
						}
					}
					auth_app.initialFilters = newFilters;
					window.embedFinished = true;
				})
			});
		},
		authMe: function(e)	{
			function shakeForm(input)
			{
				let l = 20;	
				for(let i = 0; i < 5; i++)
				{ 
					$('#login_form').find(input).css('border', '1px solid rgba(244,67,54,1)')	
					$('#login_form').animate(
					{ 
						'margin-top': '+=' + ( l = -l ) + 'px',
						'margin-bottom': '-=' + l + 'px'
					}, 100, function()
					{
						$('#login_form').css('cssText', 'margin: 5% auto !important');
						setTimeout(function(){
							$('#login_form').find(input).css('border', 'none')
						}, 1000);
					});	
				}
			};
			$.get('auth/pbi.extended.auth.php?login=' + String(this.u_login).toLowerCase() + '&pwd=' + this.u_pwd + '&subj=' + this.subject)
				.done( (r) => {
					if(!r.result)
					{
						if(r.reason == 'login incorrect')
						{
							shakeForm('input[name="login"]');
							$('input[name="login"], input[name="pwd"]').val("");
							console.log('login is wrong')
						}
						if(r.reason == 'password incorrect')
						{
							shakeForm('input[name="pwd"]');
							$('input[name="login"], input[name="pwd"]').val("");
							console.log('password is wrong')
						}
						console.log('Wrong User')
						return(false)
					}
					else
					{
						// pbi_auth = JSON.parse(r.auth_data);
						pbi_auth = r.auth_data;
						auth_app.client_name = decodeURI(r['client']).replace(/&quot;/g, '\"');
						auth_app.activeState = 1;
						auth_app.reportId = r['reportId'];
						auth_app.groupId = r['groupId'];
						auth_app.refresh_token = pbi_auth.refresh_token;
						auth_app.is_admin = r['is_admin'];
						auth_app.is_editor = r['is_editor'];
						auth_app.is_creator = r['is_super'];
						if(r['is_admin'])
						{
							auth_app.savedReports = r.reports;
							auth_app.existedLogins = r['logins'];
						}
						powerbi.accessToken = pbi_auth.access_token;
						console.log('Auth Success');
						expiration_info = 1 / ( 24 * 60 );
						if($('input[name=persist_here]').is(':checked'))
						{	
							expiration_info = 365;
						}
						Cookies.set('checkin', btoa(auth_app.reportId + ':' + this.u_login + "-" + this.u_pwd), {expires: expiration_info, path: ''})
						Cookies.set('refresh_token', this.refresh_token, {expires: expiration_info, path: ''})
						Cookies.set('client_login', this.u_login, {expires: 365, path: ''})
						Cookies.set('subject_info', this.subject, {expires: 365, path: ''})
						let checker_report = 0;
						let interval_report = setInterval(function()
						{
							if($('#embedContainer').length != 0 && !checker_report)
							{
								var log = {
									'login': auth_app.u_login,
									'action': 'page_open',
									'subject': Cookies.get('subject_info'),
									'details': {
										'type': 'start_session'
									}
								};
								$.ajax({
									url: 'auth/pbi.storelog.php',
									type: 'post',
									dataType: 'json',
									data: JSON.stringify(log)
								})
								auth_app.defineReport();
								checker_report = 1;
								clearInterval(interval_report)
							}
						}, 500); 
					}
				})
		},
		logoutMe: function() {
			Cookies.remove('checkin', { path: '' });
			Cookies.remove('client_login', { path: '' });
			var log = {
				'login': auth_app.u_login,
				'action': 'page_open',
				'subject': Cookies.get('subject_info'),
				'details': {
					'type': 'end_session'
				}
			};
			$.ajax({
				url: 'auth/pbi.storelog.php',
				type: 'post',
				dataType: 'json',
				data: JSON.stringify(log)
			})
			location.reload();
		},
		applyNewFilter: function(filterConfig) {
			if (window.hasOwnProperty('report') && window.embedFinished) {
				var newFiltersSet = this.initialFilters.concat(filterConfig);
				window.report.setFilters(newFiltersSet);
				console.log('applied')
			} else {
				window.setTimeout(function(){auth_app.applyNewFilter(filterConfig)}, 500);
			}
		}
	}
});
