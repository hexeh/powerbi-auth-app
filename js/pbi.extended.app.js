Vue.config.devtools = true;
function deviceType(){
	return /iPad/.test(navigator.userAgent)?"t":/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Silk/.test(navigator.userAgent)?"m":"d";
}
function shakeForm(form, input)
{
	let l = 20;	
	for(let i = 0; i < 5; i++)
	{ 
		$(form).find(input).css('border', '1px solid rgba(244,67,54,1)')	
		$(form).animate(
			{ 
				'margin-top': '+=' + ( l = -l ) + 'px',
				'margin-bottom': '-=' + l + 'px'
			}, 100, function()
			{
				$(form).css('cssText', 'margin: 5% auto !important');
				setTimeout(function(){
					$(form).find(input).css('border', 'none')
				}, 1000);
			});	
	}
}; 
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
		activeMode: 1,
		reportId: '',
		groupId: 'me',
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
		let login = String(Cookies.get('client_login')).toLowerCase()
		let subj = Cookies.get('subject_info')
		$.get('auth/pbi.checkin.php?login=' + login + '&checkin=' + checkin + '&subj=' + subj + '&refresh=' + Cookies.get('refresh_token')).done((r) => {
			if(!r.result)
			{
				auth_app.activeState = -1;
				$('#preloader').fadeOut('slow');
				if(r.reason == 'first time login')
				{
					document.location = r.interactive_auth_url
				}
			}
			else
			{
				pbi_auth = JSON.parse(r.auth_data);
				auth_app.reportId = r['reportId'];
				auth_app.groupId = r['groupId'];
				auth_app.client_name = decodeURI(r['client']);
				auth_app.activeState = 1;
				auth_app.refresh_token = pbi_auth.refresh_token;
				Cookies.set('refresh_token', pbi_auth.refresh_token, {path: ''})
				let checker_report = 0;
				$('#preloader').fadeOut('slow');
				expiration = pbi_auth.expires_in - 1;
				let interval_report = setInterval(function(){
					if(typeof auth_app == 'object' && !checker_report)
					{
						powerbi.accessToken = pbi_auth.access_token;
						auth_app.defineReport();
						window.embedInitiated = true;
						checker_report = 1;
						clearInterval(interval_report);
					}
				}, 500);
			}
		})
	},
	methods: {
		switchModes: function()
		{
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
		setReportPage: function(page, e)
		{
			window.report.setPage(page);
			$(e.currentTarget).parent('ul').children('li').removeClass('active');
			$(e.currentTarget).toggleClass('active');
		},
		defineReport: function()
		{
			window.embedConfiguration = {
				type: 'report',
				id: this.reportId,
				embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=' + this.reportId,
				settings: {
					navContentPaneEnabled: false,
					filterPaneEnabled: false
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
			report.on("loaded", function() {
				console.log('Embedding Finished')
				window.embedFinished = true;
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
			});
		},
		authMe: function(e)
		{
			
			$.get('auth/pbi.auth.php?login=' + String(this.u_login).toLowerCase() + '&pwd=' + this.u_pwd + '&subj=' + this.subject)
				.done( (r) => {
					if(!r.result)
					{
						if(r.reason == 'login incorrect')
						{
							shakeForm('#login_form', 'input[name="login"]');
							$('input[name="login"], input[name="pwd"]').val("");
							console.log('login is wrong')
						}
						if(r.reason == 'password incorrect')
						{
							shakeForm('#login_form', 'input[name="pwd"]');
							$('input[name="login"], input[name="pwd"]').val("");
							console.log('password is wrong')
						}
						if(r.reason == 'first time login')
						{
							document.location = r.interactive_auth_url
						}
						console.log('Wrong User')
						return(false)
					}
					else
					{
						pbi_auth = JSON.parse(r.auth_data);
						auth_app.client_name = decodeURI(r['client']);
						auth_app.activeState = 1;
						auth_app.reportId = r['reportId'];
						auth_app.groupId = r['groupId'];
						auth_app.refresh_token = pbi_auth.refresh_token;
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
								auth_app.defineReport();
								checker_report = 1;
								clearInterval(interval_report)
							}
						}, 500); 
					}
				})
		},
		logoutMe: function()
		{
			Cookies.remove('checkin', { path: '' });
			Cookies.remove('client_login', { path: '' });
			location.reload();
		}
	}
});
