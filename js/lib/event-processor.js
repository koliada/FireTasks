(function (scope, factory) {

	var ev = {};
	factory(ev);

	/**
	 * Event Processor
	 *
	 * @singleton
	 * @name EV
	 * @type {Object}
	 * @exports EV as window.EV
	 */
	scope.EV = ev;

}(this, function (ev) {

	var events = {},
		uid = -1;

	/**
	 * Subscribe for event
	 *
	 * @public
	 * @name EV.listen
	 * @param event {String} Event name to be subscribed
	 * @param method {Function} Function to be executed when event fires
	 * @returns {*} Token on success, boolean false otherwise
	 */
	ev.listen = function (event, method) {

		if (!event) {
			console.log('No event passed. Abort.');
			return false;
		}
		if (!method) {
			console.log('No method passed. Abort.');
			return false;
		}

		/* Initialize event storage if not set */
		if (!events[event]) {
			events[event] = [];
		}

		/* Unique ID for event */
		var token = (++uid).toString();

		events[event].push({
			token: token,
			method: method
		});

		return token;
	};

	/**
	 * Unsubscribe from event
	 *
	 * @public
	 * @name EV.stopListen
	 * @param token {String} Unique id of subscription to remove
	 * @returns {*} Token on success, boolean false otherwise
	 */
	ev.stopListen = function (token) {
		for (var e in events) {
			if (events.hasOwnProperty(e)) {
				if (events[e]) {
					for (var i = 0, l = events[e].length; i < l; i++) {
						if (events[e][i].token === token) {
							events[e].splice(i, 1);
							return token;
						}
					}
				}
			}
		}

		console.log('Token not found.');
		return false;
	};

	/**
	 * Remove all listeners from given event
	 *
	 * @public
	 * @name EV.removeListeners
	 * @param event {String} Event to remove all subscribers from
	 * @returns {boolean}
	 */
	ev.removeListeners = function (event) {

		if (!events[event]) {
			console.log('Event not found.');
			return false;
		}

		events[event] = [];

		return true;
	};

	/**
	 * Fire event
	 *
	 * @public
	 * @name EV.fire
	 * @param event {String} Event to fire
	 * @param [data] {*} Any data to be passed to subscribers
	 * @returns {boolean}
	 */
	ev.fire = function (event, data) {

		if (!events[event]) {
			console.log("Event '" + event + "' not found.");
			return false;
		}

		//console.log('Event \'' + event + '\' fired. Data: ', data);

		var subscribers = events[event].slice(); // cloning

		setTimeout(function () {

			subscribers.forEach(function (subscriber) {
				subscriber.method(data);
			});

		}, 0);

		return true;
	};
}));