/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Main application object
 */
window.App = (function($) {

	'use strict';

	var actions = {
			'MAIN_QUEUE': 'mainQueue'
		},
		entityTypes = {
			LIST: 'list',
			TASK: 'task'
		},
		refreshInterval = null,
		syncErrors = [],
		unrecoverableErrorOccurred;


	/**
	 * Sets global listeners
	 */
	function setListeners() {

		$(document).on('click', '.prevent-default', function (ev) {
			ev.preventDefault();
		});

		/* Clear Input Button */
		$(document).on('click', 'button[type="reset"]', function (ev) {
			ev.preventDefault();
			$(this).siblings('input[type="text"]').first().val('');
		});

		/* Full-width Checkbox Switching */
		$('section[data-type="list"], form').find('a').click(function () {
			var input = $(this).find('input[type="checkbox"]');
			App.switchCheckbox(input);
		});

		/* For tablet UI - disables edit mode when sidebar touched */
		$('section[data-type="sidebar"]').click(function () {
			EditMode.disable();
		});


		/* TODO: on popup close */
		/*GO2.window.onbeforeunload = function() {
		 console.log('pass');
		 GO2._handleMessage(false);
		 };*/
	}

	/**
	 * Handles new version notification and applying
	 */
	function updateVersion() {

		/**
		 * @reference http://www.html5rocks.com/en/tutorials/appcache/beginner/
		 */
		window.applicationCache.addEventListener('updateready', function (e) {
			if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {

				localStorage.setItem('whatsNewShown', false);

				// Browser downloaded a new app cache.
				if (confirm('A new version of Fire Tasks was downloaded. Apply update now?')) {
					window.location.reload();
				}
			} else {
				// Manifest didn't changed. Nothing new to server.
			}
		}, false);
	}

	/**
	 * Handles showing of the "What's New" dialog
	 */
	function showWhatsNew() {
		var whatsNewShown = localStorage.getItem('whatsNewShown');
		if (!(whatsNewShown === 'true')) {
			$.get('WHATSNEW', function (whatsNew) {
				alert(whatsNew);
				localStorage.setItem('whatsNewShown', true);
			});
		}
	}

	function patchOptions() {
		App.options.scope = 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email';
		//App.options.redirect_uri = this.options.redirect_uris[0];
		App.options.redirect_uri = document.location.protocol + '//' + document.location.host + document.location.pathname;
	}

	function setLogger(level) {
		window.Logger = (function(level) {

			var l = 0,
				f = function(){};

			switch (level) {
				case 'ERROR':
					l = 1;
					break;
				case 'WARNING':
					l = 2;
					break;
				case 'INFO':
					l = 3;
					break;
				default:
					l = 0;
			}

			return {
				log: function () {
					console.log.apply(console, arguments);
				},
				info: function () {
					(l >= 3) ? console.info.apply(console, arguments) : f();
				},
				warn: function () {
					(l >= 2) ? console.warn.apply(console, arguments) : f();
				},
				error: function () {
					(l === 1) ? console.error.apply(console, arguments) : f();
				}
			}
		}(level));
	}

	function initStorage() {
		localforage.setDriver('asyncStorage');
	}

	function initSync() {
		Sync.setStorageVariable('syncQueue');
		Sync.setLogLevel('ERROR');
		Sync.action.setDefaultHandler(Auth.makeRequest);
		// TODO: make global progress indicator
		Sync.action(actions.MAIN_QUEUE, null).onStart(function () {
			Task.view.toggleProgress(true);
		}).onFinish(function () {
			Task.view.toggleProgress(false);
		});

		initSyncErrorsListener();

		/* Collects sync errors to local variable to check it later */
		Sync.onError = function (eventDetails) {
			if (eventDetails.eventName == 'Sync.start' && eventDetails.message == "Task failed") {
				updateSyncErrors(eventDetails);
			}
		};

		App.startSyncQueue(); // for possible not completed tasks
	}

	/* Chrome only */
	function showLogo() {
		if (window.chrome) {
			var text = "Fire tasks beta",
				fontFamily = "font-family: Arial", fontSize = "font-size: 10px; padding: 26px 0; line-height: 60px",
				imageUrl = window.location.origin + "/images/icons/icon-64.png",
				backgroundImage = "background-image: url('" + imageUrl + "')",
				color = "color: transparent",
				css = [ fontFamily, fontSize, backgroundImage, color ].join("; ");
			console.log("%c" + text, css);
		}
	}

	/**
	 * Listens to sync errors and breaks app if something really bad happened
	 **/
	function initSyncErrorsListener() {
		var syncErrorsListenerInterval = setInterval(function () {
			if (syncErrors.length >= 3) {
				clearInterval(syncErrorsListenerInterval);
				unrecoverableErrorOccurred = true;
				Sync.pause(actions.MAIN_QUEUE);
				List.pauseSync();
				var blob = new Blob([JSON.stringify(syncErrors)], {type: 'text/plain'}),
					blobURL = window.URL.createObjectURL(blob);
//					link = document.createElement('a');
//				link.id = 'download-dump';
//				//link.setAttribute('style', 'display: none;');
//				link.setAttribute('download', 'dump.txt');
//				link.setAttribute('href', blobURL);
//				link.innerHTML = 'Download Dump';
//				document.body.appendChild(link);
				var data = {
					h1: 'Error occurred',
					p: 'An unrecoverable synchronization error has occurred. <span class="claim">Please</span> download debug data and contact developer.<br />\
						No sensitive data included.<br />\
						<ul class="unrecoverable-error-dialog">\
							<li><a href="' + blobURL + '" download="firetasks-dump.txt">Download dump</a></li>\
							<li><a href="mailto:alex.fiator@gmail.com?subject=Fire Tasks Bug Report&body=<Please add some details>" target="_blank">Compose Email</a></li>\
						</ul>',
					cancel: 'Cancel',
					ok: 'Restart Fire Tasks',
					recommend: true,
					hideCancel: true,
					action: function () {
						location.reload();
					}
				};
				App.confirm(data);
				return false;
			}
			syncErrors = [];
		}, 2000);
	}

	function updateSyncErrors(eventDetails) {
		delete eventDetails.debugData.task.data.pack;
		delete eventDetails.debugData.storedTasks;
		syncErrors.push(eventDetails);
	}


	return {

		getEntityTypes: function () {
			return entityTypes;
		},

		/*install: function(isFFOS) {

			// Turn it to false to always install 'normal' package
			var supportHIDPI = false;
			//var isFFOS = ("mozApps" in navigator && navigator.userAgent.search("Mobile") != -1);

			if ( isFFOS ) {
				var manifestUrl = 'http://koliada.github.io/FireTasks/manifest.webapp';
				var req = navigator.mozApps.install(manifestUrl);
				req.onsuccess = function() {
					//alert(this.result.origin);
					//alert('Fire Tasks installed. Check your home screen!');
				};
				req.onerror = function() {
					alert('Installation failed: ' + this.error.name);
				};

			} else {
				window.location.href = "app.html"
			}
		},*/

		/* JSON data from Google Cloud Console */
		options: {
			"auth_uri": "https://accounts.google.com/o/oauth2/auth",
			"token_uri": "https://accounts.google.com/o/oauth2/token",
			"client_email": "478318582842-6rkd630981kdibb868512f5cll4eg1tj@developer.gserviceaccount.com",
			"redirect_uris": ["http://koliada.github.io/FireTasks/app.html"],
			"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/478318582842-6rkd630981kdibb868512f5cll4eg1tj@developer.gserviceaccount.com",
			"client_id": "478318582842-6rkd630981kdibb868512f5cll4eg1tj.apps.googleusercontent.com",
			"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
		},

		init: function () {
			location.hash = '';

			showLogo();
			updateVersion();
			showWhatsNew();
			setLogger('ERROR');
			patchOptions();
			initStorage();
			initSync();
			setListeners();

			List.init();
			Task.init();
			EditMode.init();
			Settings.init();

			List.loadData();
		},

		/* Interval in seconds */
		setAutoFetch: function (delay) {

			delay = delay || Settings.get('syncInterval');

			if (delay === 0) {
				App.stopAutoFetch();
				Logger.info("Automatic local data refresh won't start because of the settings");
				return;
			}

			if (refreshInterval || !delay) {
				return;
			}

			// make private
			Logger.info('Auto fetch started, timeout ' + delay + ' seconds');
			refreshInterval = setInterval(function () {
				Logger.info('Automatic reload initiated');
				List.getList();
			}, delay * 1000);
		},

		stopAutoFetch: function () {
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
				Logger.info('Auto fetch disabled');
				return true;
			}
			return false;
		},

		/**
		 * Adds new task to global synchronization queue
		 * Uses {@link Sync}
		 * @param {Object} data
		 */
		addSyncTask: function (data) {
			Sync.task({
				actionName: actions.MAIN_QUEUE,
				data: data
			});
		},

		/**
		 * Starts global synchronization queue
		 * Uses {@link Sync}
		 */
		startSyncQueue: function() {
			Sync.start(actions.MAIN_QUEUE);
		},

		// TODO: move labels outside and simplify. Damn, just refactor this shit.
		/**
		 * Handles setup sequence
		 */
		runSetup: function () {
			var setupForm = $('#setup'),
				lblDescription = setupForm.find('span.description').first(),
				lblDescriptionOldValue = lblDescription.html(),
				progress = setupForm.find('progress').first(),
				status = setupForm.find('span[role="status"] span'),
				btnStart = $('#btn-start-import'),
				btnStartOldValue = btnStart.html();

			function onFinish(lists) {
				List.storage.set(lists, function () {
					lblDescription.html('Successful!');
					location.hash = 'drawer';
					btnStart.html('Go to app').prop('disabled', false).off().on('click', function () {
						setupForm.removeClass().addClass('fade-out');
						lblDescription.html(lblDescriptionOldValue);
						progress.val(0);
						status.html('0');
						btnStart.html(btnStartOldValue);
						List.loadData();
					});
				});
			}

			location.hash = '';

			List.preventOnLoadRefresh();
			App.stopAutoFetch();

			setupForm.removeClass().addClass('fade-in');

			// Start button
			btnStart.prop('disabled', false);
			btnStart.off().on('click', function () {
				btnStart.prop('disabled', true);
				progress.addClass('pack-activity');
				lblDescription.html('loading lists...');

				// Fetching lists
				List.getList(function (lists) {
					progress.removeClass('pack-activity');

					if (lists.length > 0) {
						var delim = 100 / lists.length,
							curStatus = 0;
						lblDescription.html('loading tasks...');

						// Fetching tasks for each list
						for (var i = 0; i < lists.length; i++) {
							(function (i) {
								Task.getList(lists[i], function (list, tasks) {
									lists[i].tasks = tasks;
									curStatus += delim;
									progress.val(curStatus);
									status.html(curStatus.toFixed(0));
									if (curStatus >= 100) {
										onFinish(lists);
									}
								}, false);
							}(i));
						}
					}
				});
			});
		},

		/**
		 * Fires on ERROR CODE 404
		 * Tells entities to remove corresponding item
		 * @param entity
		 */
		onResourceNotFound: function (entity) {
			if (!entity) {
				return;
			}
			switch (entity.type) {
				case App.getEntityTypes().LIST:
					utils.status.show('List not found');
					EV.fire('list-not-found', entity.id);
					break;
				case App.getEntityTypes().TASK:
					utils.status.show('Task not found');
					EV.fire('task-not-found', entity.id);
					break;
				default:
					utils.status.show('Resource not found');
			}
		},

		/**
		 * Indicates if unrecoverable error was caught so that Auth should not proceed
		 * @returns {Boolean}
		 */
		unrecoverableErrorOccurred: function () {
			return unrecoverableErrorOccurred || false;
		},

		/**
		 * Firefox OS confirm dialog
		 * @param data
		 *    h1: <header text>
		 *    p: <message text>
		 *    cancel: <cancel button label>
		 *    ok: <confirm button label>
		 *    recommend: <true to set ok button with 'recommend' class, 'danger' otherwise>
		 *    hideCancel: <true to show confirm button only>
		 */
		confirm: function (data) {

			var confirm = $('#confirm');
			confirm.find('h1').html(data.h1);
			confirm.find('p').html(data.p);
			confirm.find('#btn-confirm-cancel').html(data.cancel);
			confirm.find('#btn-confirm-ok').html(data.ok);

			if (data.recommend) {
				confirm.find('#btn-confirm-ok').removeClass('danger').addClass('recommend');
			} else {
				confirm.find('#btn-confirm-ok').removeClass('recommend').addClass('danger');
			}

			if (data.hideCancel) {
				confirm.find('form').first().append(confirm.find('#btn-confirm-cancel').hide());
			} else {
				confirm.find('#btn-confirm-ok').parent('menu').prepend(confirm.find('#btn-confirm-cancel').show());
			}

			confirm.removeClass().addClass('fade-in');

			/* Listeners */
			confirm.unbind('click').on('click', '#btn-confirm-cancel', function () {
				confirm.removeClass().addClass('fade-out');
			}).on('click', '#btn-confirm-ok', function () {
				confirm.removeClass().addClass('fade-out');
				data.action();
			});
		},

		switchCheckbox: function (input) {
			var checked = input.prop('checked');
			input.prop('checked', (checked === false));
			input.change();	// to fire onchange listeners
		},

		showInDevelopmentTooltip: function (timeout) {
			timeout = timeout || 1000;
			utils.status.show('This feature is in development', timeout);
		}
	};

}(jQuery));


(function () {
	App.init();
}());