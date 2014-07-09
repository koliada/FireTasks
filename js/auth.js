
/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

// TODO: investigate how to make this shit run as clock
/**
 * Singleton for communicating with Google API
 */
window.Auth = (function ($) {

	"use strict";

	var token = '',
		noConnectionErrors = 0,
		dom = {
			authWaitingDialog: $('#auth-waiting-dialog'),
			btnReopenDialog: $('#btn-auth-waiting-reopen-dialog')
		};

	function openAuthWaitingDialog(callback) {
		dom.authWaitingDialog.removeClass('fade-out').addClass('fade-in');
		dom.btnReopenDialog.on('click', function () {
			login(callback, true);
		});
	}

	function hideAuthWaitingDialog() {
		dom.authWaitingDialog.removeClass('fade-in').addClass('fade-out');
		dom.btnReopenDialog.off();
	}

	function login (callback, refresh) {

		var controlTimeout;
		var email = Settings.get('email');

		if (email) {
			FT.options.email = email;
		} else {
			FT.options.email = null;
			refresh = true;
		}

		var tokenOld = token;

		GO2.init(FT.options);
		if (refresh === true) {
			openAuthWaitingDialog(callback);
		}
		GO2.login(false, (refresh === false));	// (force_approval_prompt, immediate)

		/* Checking if iframe has failed */
		if (refresh === false) {
			controlTimeout = setTimeout(function() {
				//console.log('interval');
				clearTimeout(controlTimeout);
				if (tokenOld === token) {
					GO2.logout();
					openAuthWaitingDialog(callback);
					GO2.login(false, false);
					FT.stopAutoFetch();
				}
			}, 5000);	// should be enough
		}

		GO2.onlogin = function(accessToken) {

			hideAuthWaitingDialog();

			validateToken(accessToken, function(valid) {
				if(valid) {

					$.ajax({
						url: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken,
						type: 'GET',
						dataType: 'json',
						timeout: 10000
					}).done(function (res) {
						token = accessToken;
						localStorage.setItem('accessToken', accessToken);
						if (FT.options.email && FT.options.email != res.email) {
							List.storage.clear(function () {
								alert('You have signed in as different user');
								FT.runSetup();
							});
							return;
						}
						Settings.set('email', res.email);
						//FT.setAutoFetch();
						callback && callback(accessToken);
					}).fail(function (jqXHR, textStatus, errorThrown) {
						"use strict";
						// TODO: I event don't know if this gonna work
						utils.status.show('Something went wrong :(\nRetrying...', 2000);
						GO2.logout();
						login(callback, true);
					});
				}
			});
		};
	}

	function getAccessToken (callback, refresh) {

		refresh = refresh || false;

		if (refresh == true) {
			localStorage.removeItem('accessToken');
			GO2.logout();
			login(callback, refresh);
			return;
		} else {
			var accessToken = localStorage.getItem('accessToken');
		}

		if (!accessToken) {
			login(callback, refresh);
			return;
		}

		token = accessToken;
		callback && callback(accessToken);
	}

	function validateToken (token, callback) {

		$.ajax({
			url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
			data: {
				access_token: token
			},
			timeout: 10000,
			type: 'GET',
			dataType: 'json'
		}).done(function(data) {

			if (data.audience == FT.options.client_id) {
				callback(true);
			}

		}).fail(function( jqXHR, textStatus, errorThrown ) {

			var data = jqXHR.responseJSON || {};

			if (typeof data.error !== 'undefined' && data.error == 'invalid_token') {
				utils.status.show('Invalid token');
				/* TODO: do some additional actions here */
			}

			utils.status.show('An error has occurred while validating the token');

			callback(false);
		});
	}

	return {

		init: function () {
			$.ajaxSetup({
				xhr: function () {
					return new window.XMLHttpRequest({mozSystem: true, cache: false});
				}
			});
		},

		dataCalculation: (function() {
			var started = false,
				value = 0;

			return {
				start: function () {
					value = 0;
					started = true;
				},

				getStarted: function () {
					return started;
				},

				setValue: function (v) {
					value = parseInt(v) || 0;
				},

				getValue: function (resetValue) {
					if (typeof resetValue === 'undefined') resetValue = true;
					var valueCopy = value;
					if (resetValue) {
						value = 0;
					}
					started = false;
					return valueCopy;
				}
			};
		}()),

		makeRequest: function( data, callback_success, callback_error ) {

			if (FT.unrecoverableErrorOccurred()) {
				console.error('Auth has caught unrecoverable error and will not proceed.');
				return;
			}


			getAccessToken(function(token) {

				var fields = ( typeof data.fields === 'undefined' ) ? '' : '&fields=' + data.fields;
				var query_params = ( typeof data.query_params !== 'undefined' ) ? '?' + data.query_params + '&' : '?';
				var url = data.url + query_params + 'access_token=' + token + fields;
				var type = data.type;
				var pack = JSON.stringify(data.pack) || {};

				$.ajax({
					url: url,
					data: pack,
					timeout: 10000,
					type: type,
					contentType : 'application/json; charset=UTF-8',
					dataType: 'json'
				}).done(function(res, textStatus, jqXHR) {
					// TODO: remove when 'show deleted' functionality is available
					if (res && res.deleted) {
						FT.onResourceNotFound(data.entity);
					}
					noConnectionErrors = 0;
					callback_success(true, res, textStatus, jqXHR);
				}).fail(function(jqXHR, textStatus, errorThrown) {

					function proceed() {
						FT.startSyncQueue();
						FT.setAutoFetch();
						Task.view.toggleProgress(true);
						Auth.makeRequest(data, callback_success, callback_error);
					}

					if (jqXHR.status == 0) {

						List.view.toggleProgress(false);
						Task.view.toggleProgress(false);
						EditMode.isEnabled() && EditMode.enable(false); // enables buttons so that user can proceed, resetCounter = false
						FT.stopAutoFetch();
						Sync.clearStarted();
						if (FT.isOnline()) {
							if (noConnectionErrors > 1) {
								setTimeout(function () {
									noConnectionErrors--;
									proceed();
								}, 10000);
								return;
							}
							utils.status.show('No connection. Retrying...', 1500);
							Logger.warn('No connection. Retrying...');
							setTimeout(function () {
								noConnectionErrors++;
								proceed();
							}, 1000);
						} else {
							EV.listen('connection-online', function () {
								proceed();
							});
						}

						return;
					}

					else if (jqXHR.status == 401) {
						//utils.status.show('Access token has expired. Refreshing...');
						localStorage.removeItem('accessToken');
						FT.stopAutoFetch();
						GO2.logout();
						getAccessToken(function() {
							//console.log('here reload');
							FT.setAutoFetch();
							Auth.makeRequest(data, callback_success, callback_error);
						});
						return;
					}

					else if (jqXHR.status == 404) {
						FT.onResourceNotFound(data.entity);
						callback_success(true, null, textStatus, errorThrown, data.entity);
						return;
					}

					else if (jqXHR.status == 403) {
						if (jqXHR.responseJSON && jqXHR.responseJSON.error && jqXHR.responseJSON.error.message && jqXHR.responseJSON.error.message == 'Daily Limit Exceeded') {
							utils.status.show('API Daily Limit Exceeded :(', 6000);
							List.view.toggleProgress(false);
							Task.view.toggleProgress(false);
							console.error(jqXHR.responseJSON.error);
							return;
						}
						Auth.makeRequest(data, callback_success, callback_error);
						return;
					}

					else {
						//utils.status.show('An error occurred: ' + jqXHR.status + ' - ' + errorThrown);
						utils.status.show('An error occurred: ' + jqXHR.status + ' - ' + jqXHR.responseJSON.error.errors[0].message, 1000);
					}

					//console.log(jqXHR, textStatus, errorThrown);
					/* TODO: remove callback_error */
					if( typeof callback_error !== 'undefined' ) {
						callback_error(false, jqXHR, textStatus, errorThrown);
					} else {
						callback_success(false, jqXHR, textStatus, errorThrown);
					}
				}).always(function(){
					"use strict";
					var jqXHR = (arguments[0] && arguments[0].getResponseHeader) ? arguments[0] : arguments[2];
					if (Auth.dataCalculation.getStarted()) {
						Auth.dataCalculation.setValue(Auth.dataCalculation.getValue() + (parseInt(jqXHR.getResponseHeader('Content-Length') || 0)));
					}
				});
			});
		},

		revokeToken: function() {

			// TODO: progress indication while request
			getAccessToken(function(accessToken) {

				$.ajax({
					url: 'https://accounts.google.com/o/oauth2/revoke?token=' + accessToken,
					type: 'GET',
					dataType: 'jsonp',
					timeout: 10000,
					statusCode: {
						200: function() {
							alert('Your were successfully logged out');
							List.storage.clear(function() {
								localStorage.removeItem('accessToken');
								localStorage.removeItem('lastListId');
								Settings.remove('email');
								token = null;
								GO2.logout();
								Settings.hideLayout(false);
								FT.runSetup();
								//window.location.reload();
							});
						},
						400: function() {
							utils.status.show('Something went wrong :(', 4000);
							Auth.revokeToken();
						}
					}
				});
			});
		}
	}

}(jQuery));