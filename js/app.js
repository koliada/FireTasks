/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Main application object
 */
window.FT = (function($) {

	'use strict';

	var version = '0.7.0',
		devMode = true,
		manifestUrl = devMode ? 'http://dev.alex-koliada.com/FireTasks/manifest.webapp' : 'http://koliada.github.io/FireTasks/manifest.webapp',
		actions = {
			'MAIN_QUEUE': 'mainQueue'
		},
		entityTypes = {
			LIST: 'list',
			TASK: 'task'
		},
		syncCalled = false,
		isOnline = true,
		refreshInterval = null,
		syncErrors = [],
		unrecoverableErrorOccurred;


	/**
	 * Sets global listeners
	 */
	function setListeners() {

		EV.listen('options-saved', onOptionsSaved);
		EV.listen('tasks-rendered', function () {
			checkInstructionalOverlay();
			setupStartupSynchronization();
		});

		window.addEventListener('online', function (e) {
			Logger.info('Connection is ONLINE');
			updateConnectionStatus(true);
			EV.fire('connection-online');
		}, false);
		window.addEventListener('offline', function (e) {
			Logger.info('Connection is OFFLINE');
			updateConnectionStatus(false);
			EV.fire('connection-offline');
		}, false);

		$(document).on('click', '.prevent-default', function (ev) {
			ev.preventDefault();
		});

		$('form').on('submit', function (ev) {
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
			FT.switchCheckbox(input);
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
	 * Triggers showing of instructional overlay if needed
	 */
	function checkInstructionalOverlay() {
		if (!(localStorage.getItem('instructionalOverlayShown') === 'true')) {
			FT.showInstructionalOverlay();
			localStorage.setItem('instructionalOverlayShown', true);
		}
	}

	/**
	 * Sets up startup synchronization
	 */
	function setupStartupSynchronization() {
		if (!Settings.get('syncOnStart')) {
			Logger.info("onStart refresh won't start because of the setting");
			return;
		}
		if (!FT.isOnline()) {
			Logger.info("onStart refresh won't start immediately because internet connection is offline. Waiting for connection restore");
			EV.listen('connection-online', function () {
				callSync();
			});
			return;
		}
		if (!syncCalled) {
			callSync();
		}

		function callSync() {
			syncCalled = true;
			FT.loadAll();
		}
	}

	/**
	 * Updates connection status
	 * @param [online] True to indicate that application is online
	 */
	function updateConnectionStatus(online) {
		isOnline = online || window.navigator.onLine;
	}

	/**
	 * Handles new version checking and applying
	 * @param {Function} [callback]
	 */
	function updateVersion(callback) {

		/**
		 * @reference http://www.html5rocks.com/en/tutorials/appcache/beginner/
		 */
		window.applicationCache.addEventListener('updateready', function (e) {
			if (window.applicationCache.status == window.applicationCache.UPDATEREADY ||
				window.applicationCache.status == window.applicationCache.IDLE ||
				window.applicationCache.status == window.applicationCache.UNCACHED) {

				localStorage.setItem('whatsNewShown', false);
				localStorage.setItem('instructionalOverlayShown', false);

				// Browser downloaded a new app cache.
				if (confirm('A new version of Fire Tasks was downloaded. Apply update now?')) {
					window.location.reload();
				}
			} else {
				// Manifest didn't changed. Nothing new to server.
			}
		}, false);

		window.applicationCache.addEventListener('error', function () {
			utils.status.show('A cache error occurred');
		});

		/*if (navigator.mozApps) {
			var req = navigator.mozApps.getInstalled();
			req.onsuccess = function () {
				var ver = req.result[0].manifest.version;
				$.ajax({
					url: FT.getManifestUrl(),
					responseType: 'json',
					cache: false
				}).done(function (manifest) {
					if (FT.getVersionInteger(ver) < FT.getVersionInteger(manifest.version)) {
						if (confirm('A new version of Fire Tasks was found. Install now?')) {
							FT.install();
						}
						callback && callback(true);
					} else {
						onNoUpdate();
					}
				}).fail(onError);
			};
			req.onerror = onError;
		}

		function onNoUpdate() {
			utils.status.show('No new version available');callback &&
			callback && callback(false);
		}

		function onError() {
			utils.status.show('An error occurred');
			callback && callback(false);
		}*/
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
			}, 'html');
		}
	}

	function patchOptions() {
		FT.options.scope = 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email';
		//FT.options.redirect_uri = this.options.redirect_uris[0];
		FT.options.redirect_uri = document.location.protocol + '//' + document.location.host + document.location.pathname;
	}

	function setLogger(level) {
		if (['ERROR', 'WARNING', 'INFO'].indexOf(level) === -1) {
			throw ('Logger.setLevel(): wrong logging level, expected values: ERROR|WARNING|INFO');
		}
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
				},
				getLevel: function () {
					return level;
				},
				/* May be useful for debugging */
				setLevel: setLogger
			}
		}(level));
		return window.Logger;
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

		FT.startSyncQueue(); // for possible not completed tasks
	}

	/* Chrome only */
	function showLogo() {
		if (window.chrome) {
			var text = "Fire tasks beta",
				fontFamily = "font-family: Arial", fontSize = "font-size: 10px; padding: 26px 0; line-height: 60px",
				url = window.location.href.replace('app.html', '').replace('#', '').replace('?', ''),
				imageUrl = url + "/images/icons/icon-64.png",
				backgroundImage = "background-image: url('" + imageUrl + "')",
				color = "color: transparent",
				css = [ fontFamily, fontSize, backgroundImage, color ].join("; ");
			console.log("%c" + text, css);
		}
		console.info('Thank you for your interest in Fire Tasks! For any details please refer to https://github.com/koliada/FireTasks');
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
				Sync.clearStorage();
				List.pauseSync();
				var blob = new Blob([JSON.stringify(syncErrors)], {type: 'text/plain'}),
					blobURL = window.URL.createObjectURL(blob),
					confirmData = {
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
				FT.confirm(confirmData);
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

	function showInstructionalOverlay() {
		var overlayEl = $('#instructional-overlay')[0],
			canvasEl = overlayEl.querySelector('canvas'),
			ctx = canvasEl.getContext('2d'),
			tasksActionsCls = 'show-tasks-actions',
			types = {
				list: 'LIST',
				task: 'TASK'
			};

		function findPos(type) {
			var el = (type === types.list) ? List.view.getListEl()[0] : Task.view.getListEl()[0];
			var rect = el.getBoundingClientRect();
			return {
				x: rect.left,
				y: rect.top
			};
		}

		function hideOverlay() {
			FT.toggleSidebar(true);
			overlayEl.classList.remove('fade-in');
			canvasEl.classList.remove(tasksActionsCls);
			overlayEl.classList.add('fade-out');
			overlayEl.removeEventListener('click', hideOverlay);
		}

		function showOverlay() {
			FT.toggleSidebar(true);
			overlayEl.classList.remove('fade-out');
			overlayEl.classList.add('fade-in');
		}

		function drawCanvas(type) {
			var targetXY = findPos(type),
				radius = 8,
				circleX = targetXY.x + radius + ((type === types.list) ? 120 : 160),
				circleY = targetXY.y + radius + ((type === types.list) ? 14 : 22),
				line1Length = 80,
				line1 = {
					x: circleX + line1Length,
					y: circleY
				},
				line2Height = 36,
				line2 = {
					x: line1.x,
					y: line1.y + line2Height
				},
				text1Height = 20,
				text1 = {
					x: line2.x - 180,
					y: line2.y + text1Height + 6
				},
				label = (type === types.list) ? "Tap & hold to get list actions" : "Tap & hold to enter Edit Mode";
			ctx.beginPath();
			ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
			ctx.lineTo(line1.x, line1.y);
			ctx.lineTo(line2.x, line2.y);
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#FFF';
			ctx.lineJoin = 'round';
			ctx.font = text1Height + 'px FiraSans';
			ctx.fillStyle = "#FFF";
			ctx.fillText(label, text1.x, text1.y);
			ctx.stroke();
		}

		function invokePhoneLayout() {
			drawCanvas(types.task);
			FT.toggleSidebar(false);
			canvasEl.classList.add(tasksActionsCls);
			overlayEl.addEventListener('click', hideOverlay);
			overlayEl.removeEventListener('click', invokePhoneLayout);
		}

		if (FT.getBodySize().width >= 1280) {
			overlayEl.addEventListener('click', hideOverlay);
		} else {
			overlayEl.addEventListener('click', invokePhoneLayout);
		}

		drawCanvas(types.list);
		showOverlay();
	}

	function onOptionsSaved() {
		FT.setAutoFetch();
		FT.setAnimations();
	}


	return {

		getVersion: function () {
			return version;
		},

		getEntityTypes: function () {
			return entityTypes;
		},

		install: function () {
			// Turn it to false to always install 'normal' package
			//var supportHIDPI = false;
			if (FT.isFFOS) {
				var req = navigator.mozApps.install(FT.getManifestUrl());
				req.onsuccess = function () {
					//alert(this.result.origin);
					//alert('Fire Tasks installed. Check your home screen!');
				};
				req.onerror = function () {
					alert('Installation failed: ' + this.error.name);
				};
			} else {
				window.location.href = 'app.html#';
			}
		},

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
			updateConnectionStatus();
			showLogo();
			updateVersion();
			showWhatsNew();
			setLogger('ERROR');
			patchOptions();
			initStorage();
			initSync();
			setListeners();

			FT.toggleSidebar();
			FT.setAnimations();

			Auth.init();
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
				FT.stopAutoFetch();
				Logger.info("Automatic local data refresh won't start because of the settings");
				return;
			}

			if (refreshInterval || !delay) {
				return;
			}

			if (delay < 60) {
				Logger.warn('Delay value should be equal to or greater than 60 (measured in seconds)');
				return;
			}

			// make private
			Logger.info('Auto fetch started, timeout ' + delay + ' seconds');
			refreshInterval = setInterval(function () {
				if (!FT.isOnline()) {
					Logger.info('Automatic reload skipped because of offline mode');
					return;
				}
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

		preventStartupSync: function () {
			Logger.info('Startup sync prevented');
			syncCalled = true;
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
					FT.toggleSidebar(true);
					btnStart.html('Go to app').prop('disabled', false).off().on('click', function () {
						List.loadData();
						setupForm.removeClass('fade-in').addClass('fade-out');
						showInstructionalOverlay();
						lblDescription.html(lblDescriptionOldValue);
						progress.val(0);
						status.html('0');
						btnStart.html(btnStartOldValue);
					});
				});
			}

			FT.toggleSidebar();

			FT.preventStartupSync();
			FT.stopAutoFetch();

			setupForm.removeClass('fade-out').addClass('fade-in');

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
		 * Loads all data from the server
		 * Refreshes views at the end
		 * @param {Function} [callback] Callback to be called after all data is fetched
		 */
		loadAll: function (callback) {
			var processed = 0,
				timeStart = (new Date()).getTime();
			Logger.info('loadAll(): synchronization started');
			FT.stopAutoFetch();
			Auth.dataCalculation.start();
			List.getList(function (lists) {
				if (lists.length > 0) {
					for (var i = 0; i < lists.length; i++) {
						(function (i) {
							Task.getList(lists[i], function (list, tasks) {
								lists[i].tasks = tasks;
								if (processed++ === lists.length - 1) {
									List.view.toggleProgress(false);
									Task.view.toggleProgress(false);
									List.storage.set(lists, function () {
										Logger.info('loadAll(): synchronization completed, time: ' + ((new Date()).getTime() - timeStart).toString() + ' ms, data transferred: ' + Auth.dataCalculation.getValue() + ' bytes');
										//Task.view.getSortModeManager().isMyOrder() && Task.view.getListEl().sortable('destroy');
										var list = List.getLastActive();
										delete list.tasks; // triggers refresh from storage
										EV.fire('list-selected', list); // updates last active
										EV.fire('lists-loaded', lists); // triggers lists view re-render and tasks load
										callback && callback(lists);
									});
								}
							}, false);
						}(i));
					}
				}
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
				case FT.getEntityTypes().LIST:
					EV.fire('list-not-found', entity.id);
					break;
				case FT.getEntityTypes().TASK:
					// First making sure that list exists
					List.getById(entity.listId, function (list) {
						if (list) {
							EV.fire('task-not-found', entity.id);
						}
					});
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
		 *    action <confirm button action>
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

			confirm.removeClass('fade-out').addClass('fade-in');

			/* Listeners */
			confirm.unbind('click').on('click', '#btn-confirm-cancel', function () {
				confirm.removeClass('fade-in').addClass('fade-out');
			}).on('click', '#btn-confirm-ok', function () {
				confirm.removeClass('fade-in').addClass('fade-out');
				data.action && data.action();
			});
		},

		switchCheckbox: function (input) {
			var checked = input.prop('checked');
			input.prop('checked', (checked === false));
			input.change();	// to fire onchange listeners
		},

		isFFOS: ("mozApps" in navigator && navigator.userAgent.search("Mobile") != -1),

		isMozActivityAvailable: typeof MozActivity !== 'undefined',

		showInDevelopmentTooltip: function (timeout) {
			timeout = timeout || 1000;
			utils.status.show('This feature is in development', timeout);
		},

		/**
		 * Toggles sidebar
		 * @param [v] True to open
		 */
		toggleSidebar: function (v) {
			if (v && location.hash.indexOf('drawer') === -1) {
				location.hash = 'drawer';
			} else if (!v) {
				location.hash = '';
			}
		},

		// TODO: move to a more appropriate place?
		/**
		 * Sets animation
		 * Uses {@link Settings.get}
		 */
		setAnimations: function () {
			var noAnimation = Settings.get('noAnimations');
			if (noAnimation === true) {
				document.getElementById('drawer').classList.add('no-animation');
				$('[data-position="back"]').addClass('no-animation');
				$('[data-type="edit"]').addClass('no-animation');
				$('label.pack-switch').addClass('no-animation');
				Logger.info('setAnimations(): animations suppressing enabled');
			} else {
				document.getElementById('drawer').classList.remove('no-animation');
				$('[data-position="back"]').removeClass('no-animation');
				$('[data-type="edit"]').removeClass('no-animation');
				$('label.pack-switch').removeClass('no-animation');
				Logger.info('setAnimations(): animations suppressing disabled');
			}
		},

		/**
		 * Parses version number to integer number
		 * @param {String} versionString
		 * @returns {Number}
		 */
		getVersionInteger: function (versionString) {
			versionString = versionString || FT.getVersion();
			return parseInt(versionString.replace(/\./g, ''));
		},

		getManifestUrl: function () {
			return manifestUrl;
		},

		isOnline: function () {
			return isOnline;
		},

		showInstructionalOverlay: showInstructionalOverlay,

		getBodySize: function () {
			return {
				width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0,
				height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0
			};
		}
	};

}(jQuery));


(function () {
	if (location.pathname.indexOf('app.html') === -1) {
		FT.install();
		return;
	}
	utils.status.init();
	FT.init();
}());

/**
 * Google Analytics
 */
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-18750158-8', 'koliada.github.io');
ga('send', 'pageview');