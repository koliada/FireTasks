
var Auth = {

	token: '',

	getAccessToken: function( callback, refresh ) {

		/* Used for auth through gapi library */
		/*function handleAuthResult( res ) {

			if( res === null ) {
				Auth.getAccessToken(callback, refresh);
				return;
			}

			var access_token = res.access_token;

			Auth.validateToken(access_token, function(valid) {
				if(valid) {

					$.ajax({
						url: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + access_token,
						type: 'GET',
						dataType: 'json',
						timeout: 10000
					}).done(function(res) {
							Auth.token = access_token;
							Storage.save( {access_token: access_token, email: res.email} );
							callback(access_token);
						});
				}
			});
		}*/

		refresh = refresh || false;

		if(refresh == true) {
			Storage.remove('access_token');
			GO2.logout();
		} else {
			var access_token = Storage.get( 'access_token' );
		}


		/* If token is not present in localStorage || force re-login */
		if( typeof access_token === 'undefined' ) {

			/*gapi.auth.authorize({
				client_id: App.options.client_id,
				scope: App.options.scope,
				immediate:
//					(refresh === false)
					refresh
			}, handleAuthResult);*/

			/*$('#progress_lists').hide();
			$('#progress_tasks').hide();*/

			if( typeof Storage.get('email') !== 'undefined' ) {
				App.options.email = Storage.get('email');
			}

			var token_old = Auth.token;

			GO2.init(App.options);
			GO2.login( false, (refresh === false) );	// (force_approval_prompt, immediate)

			/* Checking if iframe has failed */
			if( refresh === false ) {
				var interval = setInterval(function() {
					//console.log('interval');
					clearInterval(interval);
					if( token_old === Auth.token ) {
						GO2.logout();
						GO2.login(false, false);
					}
				}, 2000);	// should be enough
			}

			GO2.onlogin = function( access_token ) {

				Auth.validateToken(access_token, function(valid) {
					if(valid) {

						$.ajax({
							url: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + access_token,
							type: 'GET',
							dataType: 'json',
							timeout: 10000
						}).done(function(res) {
								Auth.token = access_token;
								Storage.save( {access_token: access_token, email: res.email} );
								callback(access_token);
							});
						/* TODO: handle some additional processing */
					}
				});
			};

			/* TODO: Check */
			GO2.oncancel = function() {
				alert('Fire Tasks requires Google Authentication for proper work. We will add offline mode later.');
			};

			return;
		}


		Auth.token = access_token;
		callback(access_token);
	},

	makeRequest: function( data, callback_success, callback_error ) {


		Auth.getAccessToken( function(token) {

			var fields = ( typeof data.fields === 'undefined' ) ? '' : '&fields=' + data.fields;
			var query_params = ( typeof data.query_params !== 'undefined' ) ? '?' + data.query_params + '&' : '?';
			var url = data.url + query_params + 'access_token=' + Auth.token + fields;
			var type = data.type;
			pack = JSON.stringify(data.pack) || {};

			$.ajax({
				url: url,
				data: pack,
				timeout: 10000,
				type: type,
				contentType : 'application/json; charset=UTF-8',
				dataType: 'json'
			}).done( function( data, textStatus, jqXHR ) {
					callback_success( data, textStatus, jqXHR );
				}).fail( function( jqXHR, textStatus, errorThrown ) {

					if( jqXHR.status == '0' ) {
						utils.status.show('No connection', 4000);
					}

					else if( jqXHR.status == '401' ) {
						//utils.status.show('Access token has expired. Refreshing...');

						Storage.remove('access_token');
						GO2.logout();
						Auth.getAccessToken( function() {
							//console.log('here reload');
							Auth.makeRequest(data, callback_success, callback_error);
						});
						return;
					}

					else {
						/* TODO: why this happens on DELETE? */
						if( type != 'DELETE' ) {
							utils.status.show('An error occurred: ' + jqXHR.status + ' - ' + errorThrown);
						}
					}

					//console.log(jqXHR, textStatus, errorThrown);
					if( typeof callback_error !== 'undefined' ) {
						callback_error( jqXHR, textStatus, errorThrown );
					} else {
						callback_success( jqXHR, textStatus, errorThrown );
					}
				});

		});
	},

	validateToken: function( token, callback ) {

		$.ajax({
			url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
			data: {
				access_token: token
			},
			timeout: 10000,
			type: 'GET',
			dataType: 'json'
		}).done( function( data ) {

				if( data.audience == App.options.client_id ) {
					callback(true);
				}

			}).fail( function( jqXHR, textStatus, errorThrown ) {

				var data = jqXHR.responseJSON;

				if( typeof data.error !== 'undefined' && data.error == 'invalid_token' ) {
					utils.status.show('Invalid token');
					/* TODO: do some additional actions here */
				}

				utils.status.show('An error has occurred while validating the token');

				callback(false);
			});
	},

	revokeToken: function() {

		$.ajax({
			url: 'https://accounts.google.com/o/oauth2/revoke?token=' + Auth.token,
			type: 'GET',
			dataType: 'jsonp',
			timeout: 10000,
			statusCode: {
				200: function() {
					alert('Your were successfully logged out');
					Storage.remove('access_token');
					Storage.remove('email');
					Storage.remove('last_list');
					delete Auth.token;
					location.reload();
				},
				400: function() {
					utils.status.show('Something went wrong :(', 4000);
				}
			}
		});
	}
};