/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Settings object
 * Handles settings saving and retrieving
 * Also handles Settings Layout representation
 */
window.Settings = (function ($) {

	'use strict';

	var STORAGE_PREFIX = 'settings',
		STORAGE_DELIMITER = '.',
		dom = {
			layout: $('#settings'),
			btnOpen: $('#btn-settings'),
			btnClose: $('#btn-settings-back'),
			fields: {
				logout: $('#settings-logout'),
				email: $('#settings-logout').find('.profile-email'),
				clearCache: $('#settings-clear-cache'),
				syncInterval: $('#settings-sync-interval'),
				syncOnStart: $('#settings-sync-on-start'),
				reloadTasksOnListOpen: $('#settings-reload-tasks-on-list-open'),
				vibrateOnLongPress: $('#settings-vibrate-on-long-press'),
				sidebarAnimation: $('#settings-sidebar-animation')
			}
		},
		types = {
			bool: 'bool',
			integer: 'integer',
			string: 'string'
		},
		elTypes = {
			container: 'container',
			input: 'input',
			select: 'select',
			checkbox: 'checkbox'
		},
		options = {
			email: {
				'el': dom.fields.email,
				'type': types.string,
				'elType': elTypes.container,
				'default': ''
			},
			syncInterval: {
				'el': dom.fields.syncInterval,
				'type': types.integer,
				'elType': elTypes.select,
				'default': 0
			},
			syncOnStart: {
				'el': dom.fields.syncOnStart,
				'type': types.bool,
				'elType': elTypes.checkbox,
				'default': true
			},
			reloadTasksOnListOpen: {
				'el': dom.fields.reloadTasksOnListOpen,
				'type': types.bool,
				'elType': elTypes.checkbox,
				'default': true
			},
			vibrateOnLongPress: {
				'el': dom.fields.vibrateOnLongPress,
				'type': types.bool,
				'elType': elTypes.checkbox,
				'default': true
			},
			sidebarAnimation: {
				'el': dom.fields.sidebarAnimation,
				'type': types.bool,
				'elType': elTypes.checkbox,
				'default': true
			}
		};

	/**
	 * Donate layout
	 * @deprecated
	 */
	(function () {
		var dom = {
			layout: $('#donate'),
			btnOpen: $('#settings-donate'),
			btnClose: $('#btn-donate-back')
		};

		function setListeners() {
			dom.btnOpen.on('click', showLayout);
			dom.btnClose.on('click', hideLayout);
		}

		function showLayout(ev) {
			ev.preventDefault();
			App.showInDevelopmentTooltip();
			//dom.layout.removeClass().addClass('fade-in');
		}

		function hideLayout(ev) {
			ev.preventDefault();
			dom.layout.removeClass().addClass('fade-out');
		}

		setListeners();
	}());

	/**
	 * About layout
	 */
	(function () {
		var dom = {
			layout: $('#about'),
			btnOpen: $('#settings-about'),
			btnClose: $('#btn-about-back')
		};

		function setListeners() {
			dom.btnOpen.on('click', showLayout);
			dom.btnClose.on('click', hideLayout);
		}

		function showLayout(ev) {
			ev.preventDefault();
			dom.layout.removeClass().addClass('fade-in');
		}

		function hideLayout(ev) {
			ev.preventDefault();
			dom.layout.removeClass().addClass('fade-out');
		}

		setListeners();
	}());

	function setListeners() {
		dom.btnOpen.on('click', showLayout);
		dom.btnClose.on('click', hideLayout);
		dom.fields.logout.on('click', onLogout);
		dom.fields.clearCache.on('click', onClearCache);
	}

	/**
	 * Sets settings' default values if no values set
	 */
	function setDefaults() {
		var value;
		for (var option in options) {
			if (options.hasOwnProperty(option)) {
				value = Settings.get(option);
				if (value === null || typeof value === 'undefined') {
					Settings.set(option, options[option]['default']);
				}
			}
		}
	}

	/**
	 * Initiates Settings layout
	 * Sets fields values
	 */
	function initSettingsPage() {
		var value;
		for (var option in options) {
			if (options.hasOwnProperty(option)) {
				value = Settings.get(option);
				switch (options[option].elType) {
					case elTypes.container:
						options[option].el.html(value);
						break;
					case elTypes.checkbox:
						options[option].el.prop('checked', !!(value));
						break;
					case elTypes.input:
						options[option].el.val(value);
						break;
					case elTypes.select:
						options[option].el.find('option[value="' + value + '"]').prop('selected', true);
						break;
				}
			}
		}
	}

	/**
	 * Handles settings save
	 */
	function applyChanges() {
		var value;
		for (var option in options) {
			if (options.hasOwnProperty(option)) {
				switch (options[option].elType) {
					case elTypes.container:
						value = options[option].el.html();
						break;
					case elTypes.checkbox:
						value = options[option].el.prop('checked');
						break;
					case elTypes.input:
						value = options[option].el.val();
						break;
					case elTypes.select:
						value = options[option].el.find('option:selected').val();
						break;
				}
				Settings.set(option, value);
			}
		}
		Logger.info('All options saved');
		EV.fire('options-saved');
	}

	/**
	 * Shows Settings layout
	 */
	function showLayout() {
		initSettingsPage();
		dom.layout.removeClass().addClass('fade-in');
	}

	/**
	 * Hides Settings layout
	 * @param {Boolean} [apply] Whether settings will be saved; true by default
	 */
	function hideLayout(apply) {
		if (typeof apply === 'undefined') {
			apply = true;
		}
		apply && applyChanges();
		dom.layout.removeClass().addClass('fade-out');
	}

	/**
	 * Handles logout button click
	 * @param ev
	 */
	function onLogout(ev) {
		ev.preventDefault();
		var data = {
			h1: 'Log Out',
			p: 'Revoke access given to a Fire Tasks?',
			cancel: 'Cancel',
			ok: 'Log Out',
			action: function () {
				Auth.revokeToken();
			}
		};
		App.confirm(data);
	}

	/**
	 * Tries to reload application cache
	 * @param ev
	 */
	function onClearCache(ev) {
		ev.preventDefault();
		function onNoUpdate() {
			utils.status.show('No new version available');
		}

		window.applicationCache.addEventListener('noupdate', onNoUpdate);
		var data = {
			h1: 'Force update',
			p: 'Clear cache and try to download latest version?',
			cancel: 'Cancel',
			ok: 'Confirm',
			action: function () {
				try {
					window.applicationCache.update();
					setTimeout(function () {
						window.applicationCache.removeEventListener('noupdate', onNoUpdate);
					}, 1000);
				} catch (e) {
					utils.status.show('An error occurred');
				}
			}
		};
		App.confirm(data);
	}


	return {

		init: function () {
			setListeners();
			setDefaults();
			initSettingsPage();
		},

		/**
		 * Retrieves setting from storage
		 * @param {String} key
		 * @returns {*}
		 */
		get: function (key) {
			var value = localStorage.getItem(STORAGE_PREFIX + STORAGE_DELIMITER + key);
			if (value === null || typeof value === 'undefined') {
				return null;
			}
			switch (options[key].type) {
				case types['integer']:
					return parseInt(value);
				case types['float']:
					return parseFloat(value);
				case types['bool']:
					return (value === 'true');
				case types['string']:
					return value;
			}
		},

		/**
		 * Saves setting to storage
		 * @param {String} key
		 * @param {*} value
		 */
		set: function (key, value) {
			localStorage.setItem(STORAGE_PREFIX + STORAGE_DELIMITER + key, value);
		},

		/**
		 * Removes setting from storage
		 * @param {String} key
		 */
		remove: function (key) {
			localStorage.removeItem(STORAGE_PREFIX + STORAGE_DELIMITER + key);
		},

		/**
		 * Public alias for hiding Settings layout
		 * Is used by {@link Auth} on logout sequence
		 * @param {Boolean} [apply] Save settings; true by default
		 */
		hideLayout: function (apply) {
			hideLayout(apply);
		}
	};
}(jQuery));