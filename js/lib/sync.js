/*
 * Alexei Koliada 2014
 *
 * CC-BY-SA
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Queues Tasks to be executed later one-by-one
 *
 * Implements some kind of the Command Pattern. See http://en.wikipedia.org/wiki/Command_pattern for details
 *
 *
 * Features:
 * - Setting Actions with the pair 'Name-Function'
 * - Adding Tasks with the pair 'ActionName-TaskData'
 * - Storing tasks in browser's localStorage for case of accidental application stop
 * - Pausing and resuming running queue
 * - Executing task queues of different actions separately
 * - Listening to the 'started', 'finished' and 'paused' events
 *
 *
 * Usage:
 *
 * Sync.setLogLevel( [string] level ) Set logging level; possible values: ALL|WARNING|ERROR
 * Sync.setStorageVariable( [string] name ) Override default localStorage key; Default key is 'koliada.sync'
 *
 * -- Actions --
 * Sync.action.setDefaultHandler( [function] handler ) Set default handler for Actions
 * Sync.action( [string] actionName, [function] actionHandler) Add Action with <actionName> and <actionHandler> handler;
 *        <actionHandler> function must accept two params: 'data' and 'callback',
 *            callback to be called in the end of the execution with one boolean 'success' parameter:
 *            Sync.action('MyAction', function(data, callback) {
 * 				...
 * 				callback( [boolean] true/false );
 * 			});
 *        Set <actionHandler> to false or null to use default handler set with {@link Sync.action.setDefaultHandler()}.
 *        Returns Action <actionName> with additional methods:
 *            - .remove()        See below
 *            - .start()    [chainable] Synonym for {@link Sync.start(<actionName>)}
 *            - .pause()        [chainable] Synonym for {@link Sync.pause(<actionName>)}
 *            - .resume()        [chainable] Synonym for {@link Sync.resume(<actionName>)}
 *            - .onStart()    [chainable] See 'Listening for events' section below
 *            - .onPause()    [chainable] See 'Listening for events' section below
 *            - .onFinish()    [chainable]  'Listening for events' section below
 * Sync.action( [string] actionName ) Get handler for Action <actionName>
 * Sync.action( [string] actionName ).remove() Remove Action <actionName>
 * Sync.action() Get all present Actions
 *
 * -- Tasks --
 * Sync.task( [object] task ) Add Task to Queue; returns array of recently added Tasks
 *        Object structure:
 *        {
 *			{String} actionName: <Name of the corresponding Action added with Sync.action()>,
 *			{Object} 	   data: <Set of data to be passed to the Action>
 *		}
 * Sync.task( [array] tasks ) Does the same with the exception that the tasks are passed in an array; returns array of generated ids
 * Sync.task( [string|integer] taskId ) Get task by <taskId>
 * Sync.task() Get all Tasks
 * Hint: Returned objects contain control methods:
 *        Sync.task(...)[i].start()  Synonym for {@link Sync.start(<actionName>)} - Useful for immediate start of Tasks of corresponding Action <actionName>
 *                         .pause()  Synonym for {@link Sync.pause(<actionName>)}
 *                         .resume() Synonym for {@link Sync.resume(<actionName>)}
 *
 * -- Operating --
 * Sync.start( [string] actionName ) Start execution of the Tasks in the Queue of the Action <actionName>
 *        If there are any tasks in the Storage, executes them first;
 *        If Task fails, it will be retried over and over until success.
 * Sync.pause( [string] actionName ) Pause execution, next Task of the Action <actionName> will be halted
 * Sync.resume( [string] actionName ) Resume execution after being paused with {@link Sync.pause()}
 *
 * -- Listening for events --
 * Chainable methods are available with getter or setter Sync.action(...). Obviously, NOT applicable to getter without params: Sync.action().
 * Sync.action(...).onStart[ [string] actionName ]() Fires on {@link Sync.start()} and {@link Sync.resume()} as it also calls the {@link Sync.start()} eventually
 *                   .onPause[ [string] actionName ]() Fires when Queue of the Action <actionName> is paused
 *                   .onFinish[ [string] actionName ]() Fires when all Tasks in a Queue of the Action <actionName> have been successfully completed
 *        Example:
 *        Sync.action('MyAction', null)
 *            .onStart(function() {...})
 *            .onPause(function() {...})
 *            .onFinish(function() {...});
 *
 * Also, action-independent Sync.onError is available:
 *        Sync.onError( [object] eventDetails ) Fires on any error occurred
 *
 * In case of errors it could be useful to call Sync.clearStorage() so that failed tasks won't be queued again
 * In need of hard resetting the currently running queue you can call Sync.clearStarted()
 * Sync.getStoredTasks() can be used to check stored queue (if any)
 */

;
(function (scope, factory) {

	var sync = {};
	factory(sync);
	scope.Sync = sync;

}(this, function (sync) {

	"use strict";

	var queue = [],
		Actions = {},
		STORAGE_VAR = 'koliada.sync',
		logLevels = ['ALL', 'WARNING', 'ERROR'],
		logLevel = 'WARNING',
		currentlyRunning = {},
		paused = {},
		started = [],
		eventTypes = {
			INFO: 'info',
			WARNING: 'warning',
			ERROR: 'error'
		};


	sync.version = '0.1';
	sync.onError = function (eventDetails) {
	};


	/**
	 * Handles events
	 * @param eventType {String}
	 * @param eventDetails {Object}
	 */
	function handleEvent(eventType, eventDetails) {
		switch (eventType) {
			case eventTypes.INFO:
				if (['ALL'].indexOf(logLevel) > -1) {
					console.info('Info: ', eventDetails);
				}
				break;
			case eventTypes.WARNING:
				if (['ALL', 'WARNING'].indexOf(logLevel) > -1) {
					console.warn('Warning: ', eventDetails);
				}
				break;
			case eventTypes.ERROR:
				if (['ALL', 'WARNING', 'ERROR'].indexOf(logLevel) > -1) {
					console.error('Error: ', eventDetails);
				}
				sync.onError(eventDetails);
				break;
		}
	}


	/**
	 * Provides object-to-array conversion for methods which expect arrays
	 * @param {*} obj
	 * @returns {Array}
	 */
	function toArray(obj) {
		if (!Array.isArray(obj)) {
			obj = [obj];
		}

		return obj;
	}


	/**
	 * Reads and writes Queue data within localStorage
	 * @param {Object} [data] Data to be written to Storage; Skip to get data
	 * @returns {*}
	 */
	function storage(data) {
		if (typeof data === 'undefined') {
			var s = localStorage.getItem(STORAGE_VAR);
			if (typeof s !== 'undefined') {
				return JSON.parse(s);
			} else {
				return null;
			}
		}

		localStorage.setItem(STORAGE_VAR, JSON.stringify(data));
		return true;
	}


	/**
	 * Clears Queue stored within localStorage
	 */
	function clearStorage() {
		localStorage.removeItem(STORAGE_VAR);
	}


	/**
	 * Gets stored Queue and pushes it to the current Queue
	 * Excludes recently added Tasks
	 * @returns {undefined}
	 */
	function getStoredTasks() {
		var storedTasks = storage();

		if (storedTasks && storedTasks.length > 0) {

			var queueIds = [];
			queue.forEach(function (task) {
				queueIds.push(task.id);
			});

			storedTasks.forEach(function (storedTask) {
				if (queueIds.indexOf(storedTask.id) === -1) {
					queue = toArray(storedTask).concat(queue);
				}
			});
		}

		//storage([]);	// Some kind of emptier
	}


	/**
	 * Returns unique id based on timestamp
	 * @returns {number}
	 */
	function getUniqueId() {
		var time = new Date().getTime();
		while (time == new Date().getTime()) {
		}
		return new Date().getTime();
	}


	/** Actions Storage **/
	Actions = {

		actions: {},
		defaultHandler: function () {
			handleEvent(eventTypes.ERROR, {
				message: "'defaultHandler' not set. Use 'sync.action.setDefaultHandler(func)' or attach separate handler for this Action."
			});
		},

		/**
		 * Returns Action by name or all Actions if no <actionName> passed
		 * @param {String} actionName
		 * @returns {Object|undefined}
		 */
		get: function (actionName) {
			var actions = this.actions;

			if (typeof actionName === 'undefined') {
				return actions;
			}

			for (var action in actions) {
				if (actions.hasOwnProperty(action)) {
					if (action === actionName) {
						(function (action) {
							actions[action].remove = function () {
								delete actions[action];
								return true;
							};
						}(action));
						return actions[action];
					}
				}
			}

			return undefined;
		},

		/**
		 * Sets Action <actionName> with <actionData>
		 * @param {String} actionName
		 * @param {Function} actionHandler
		 * @returns {Function}
		 */
		set: function (actionName, actionHandler) {

			if (actionName) {

				var action = {
					func: actionHandler || this.defaultHandler,
					start: function () {
						Sync.start(actionName);
						return action;
					},
					pause: function () {
						Sync.pause(actionName);
						return action;
					},
					resume: function () {
						Sync.resume(actionName);
						return action;
					},
					onStart: function (func) {
						action.onstart = func || function(){};
						return action;
					},
					onPause: function (func) {
						action.onpause = func || function(){};
						return action;
					},
					onFinish: function (func) {
						action.onfinish = func || function(){};
						return action;
					}
				};

				this.actions[actionName] = action;
				this.actions[actionName].onStart().onPause().onFinish();
				return this.actions[actionName];

			} else {
				return null;
			}
		}
	};


	/**
	 * Overrides default Storage key name
	 * @param {String} name
	 * @returns {boolean}
	 */
	sync.setStorageVariable = function (name) {
		if (typeof name !== 'undefined') {
			STORAGE_VAR = name.toString();
			return true;
		}
		return false;
	};


	/**
	 * Sets logging level
	 * @param {String} level ALL|WARNING|ERROR
	 */
	sync.setLogLevel = function (level) {
		if (typeof level === 'string') {
			if (logLevels.indexOf(level) > -1) {
				logLevel = level;
			} else {
				handleEvent(eventTypes.WARNING, {
					eventName: 'Sync.setLogLevel',
					message: "'" + level + "' is not a proper logging level. Possible values: ALL|WARNING|ERROR."
				})
			}
		}
	};


	/**
	 * Adds, gets or removes actions
	 * @param {String} [actionName] Name of the Action to be retrieved; Skip to retrieve all actions from Actions Storage
	 * @param {Function} [actionHandler] Handler to be assigned to Action <actionName>; 'null' to remove Action <actionName> from Actions Storage
	 * @returns {*}
	 *
	 * @example Sync.action( [ {String} actionName ] [, Object actionHandler ] )
	 */
	sync.action = function (actionName, actionHandler) {

		if (typeof actionName === 'undefined') {
			return Actions.get();
		}
		if (typeof actionHandler === 'undefined') {
			return Actions.get(actionName);
		}

		return Actions.set(actionName, actionHandler);
	};


	/**
	 * Sets default handler for Actions in Actions Storage
	 * @param {Function} func
	 * @returns {Boolean}
	 */
	sync.action.setDefaultHandler = function (func) {
		if (func) {
			Actions.defaultHandler = func;
			return true;
		}
		return false;
	};


	/**
	 * Adds task to Tasks Queue
	 * @param {Object|Array|String} param Object or array of objects to add to Tasks Queue; ID of the Task to get; Skip to get all
	 *    {
	 * 		{String}   actionName: <Name of the corresponding Action>,
	 * 		{Object}   data: <Set of data to be passed to the Action>
	 * 	}
	 * @returns {Array|Object} Array of recently added tasks (single object if one object passed) | Task Object | Array of all Tasks
	 */
	sync.task = function (param) {

		if (typeof param === 'undefined') param = -1;

		if (typeof param === 'string' || typeof param === 'number') {

			if (param === -1) {
				return queue;
			}

			for (var i = 0; i < queue.length; i++) {
				if (queue[i].id === param.toString()) {
					(function (i) {
						queue[i].remove = function () {
							queue.slice(i, 1);
							storage(queue);
							return true;
						};
					}(i));

					return queue[i];
				}
			}
			return undefined;
		}

		/* Now we finally gonna add some Tasks */
		var tasks = toArray(param);

		var returnArray = [];
		tasks.forEach(function (task) {
			var id = getUniqueId().toString();
			if (task.actionName && task.data) {
				var data = {
					id: id,
					actionName: task.actionName,
					data: task.data,
					start: function () {
						Sync.start(this.actionName);
						return this;
					},
					pause: function () {
						Sync.pause(this.actionName);
						return this;
					},
					resume: function () {
						Sync.resume(this.actionName);
						return this;
					}
				};
				queue.push(data);
				returnArray.push(data);
			} else {
				handleEvent(eventTypes.ERROR, {
					eventName: 'Sync.task',
					message: "'actionName' or 'data' not passed"
				});
			}
		});

		storage(queue);

		return returnArray;
	};


	/**
	 * Starts synchronization
	 * @param {String} actionName
	 * @returns {undefined}
	 */
	sync.start = function (actionName) {

		if (started[actionName]) {
			handleEvent(eventTypes.INFO, {
				actionName: actionName,
				eventName: 'Sync.start',
				message: "Queue '" + actionName + "' already running"
			});
			return;
		}

		if (typeof actionName === 'undefined') {
			handleEvent(eventTypes.ERROR, {
				eventName: 'Sync.start',
				message: "'actionName' not passed"
			});
			return;
		}

		if (paused[actionName] && paused[actionName] === true) {
			handleEvent(eventTypes.INFO, {
				actionName: actionName,
				eventName: 'Sync.start',
				message: "Next task halted"
			});
			currentlyRunning[actionName] = null;
			Actions.actions[actionName].onpause();
			return;
		}

		if (!currentlyRunning[actionName]) {
			Actions.actions[actionName].onstart();
		}

		getStoredTasks();
		for (var i = 0; i < queue.length; i++) {
			if (queue[i].actionName === actionName) {
				var task = queue.splice(i, 1)[0];
				break;
			}
		}

		if (typeof task === 'undefined') {
			handleEvent(eventTypes.WARNING, {
				eventName: 'Sync.start',
				message: 'No tasks to execute',
				debugData: {
					actionName: actionName,
					queue: queue,
					currentlyRunning: currentlyRunning[actionName],
					storage: storage()
				}
			});
			Actions.actions[actionName].onfinish();
			return;
		}

		currentlyRunning[actionName] = task.id;
		started[actionName] = true;

		Actions.actions[task.actionName].func(task.data, function () {

			var args = Array.prototype.slice.call(arguments),
				success = args[0];

			started[actionName] = null;

			if (success !== true) {
				handleEvent(eventTypes.ERROR, {
					eventName: 'Sync.start',
					message: "Task failed",
					debugData: {
						task: task,
						queue: queue,
						currentlyRunning: currentlyRunning[actionName],
						storedTasks: storage()
					}
				});
				queue.unshift(task);
				sync.start(actionName);
				return;
			}

			if (success === true) {
				storage(queue);

				if (queue.length > 0) {
					sync.start(actionName);
				} else {
					started[actionName] = null;
					currentlyRunning[actionName] = null;
					Actions.actions[actionName].onfinish(args);
				}
			}
		});
	};

	/**
	 * Hardly Clears tasks queue
	 */
	sync.clearStarted = function () {
		started = [];
	};


	/**
	 * Pauses running Queue of the Action <actionName>
	 * @param {String} actionName
	 * @returns {undefined}
	 */
	sync.pause = function (actionName) {

		if (typeof actionName === 'undefined') {
			handleEvent(eventTypes.ERROR, {
				eventName: 'Sync.pause',
				message: "'actionName' not passed"
			});
			return;
		}

		if (!paused[actionName] || paused[actionName] === false) {
			paused[actionName] = true;
			handleEvent(eventTypes.INFO, {
				eventName: 'Sync.pause',
				message: "Queue '" + actionName + "' was told to pause"
			});
		}
	};


	/**
	 * Resumes paused Queue of the Action <actionName>
	 * @param {String} actionName
	 * @returns {undefined}
	 */
	sync.resume = function (actionName) {

		if (typeof actionName === 'undefined') {
			handleEvent(eventTypes.ERROR, {
				eventName: 'Sync.resume',
				message: "'actionName' not passed"
			});
			return;
		}

		/* If there are any tasks so far, we cannot resume until queue pauses */
		if (!currentlyRunning[actionName]) {
			if (paused[actionName] === true) {
				paused[actionName] = false;
				this.start(actionName);
				handleEvent(eventTypes.INFO, {
					actionName: actionName,
					eventName: 'Sync.resume',
					message: "Queue resumed"
				});
			}
		} else {
			handleEvent(eventTypes.WARNING, {
				actionName: actionName,
				eventName: 'Sync.resume',
				message: "Cannot resume if last task didn't finish yet"
			});
		}
	};

	/**
	 * Alias for internal clearing of the stored Queue
	 * @type {clearStorage}
	 */
	sync.clearStorage = clearStorage;

	/**
	 * Fetches Queue data from Storage
	 * @returns {Object|null}
	 */
	sync.getStoredTasks = function () {
		return storage();
	}
}));