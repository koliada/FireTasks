/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Task object
 * Handles all tasks operations
 */
window.Task = (function ($) {

	"use strict";

	var tasksRefreshTimeout = null;

	function setListeners() {
		EV.listen('lists-rendered', Task.loadData);
		EV.listen('task-not-found', onNotFound);
	}

	/**
	 * Builds tasks tree from fetched data
	 * @link http://blog.tcs.de/creating-trees-from-sql-queries-in-javascript/
	 * @param {Object} options
	 * @returns {Array}
	 */
	function makeTree(options) {
		var children, e, id, o, pid, temp, _i, _len, _ref;
		id = options.id || "id";
		pid = options.parentid || "parent";
		children = options.children || "children";
		temp = {};
		o = [];
		_ref = options.q;
		for (_i = 0, _len = _ref.length; _i < _len; _i++) {
			e = _ref[_i];
			e[children] = [];
			temp[e[id]] = e;
			if (temp[e[pid]] != null) {
				temp[e[pid]][children].push(e);
			} else {
				o.push(e);
			}
		}
		return o;
	}

	/**
	 * Populates task's children ids to an array
	 * @param {Object} task Task resource
	 * @returns {Array}
	 */
	function populateChildrenIds(task) {

		/* TODO: is that alright at all?! */
		function iterate(obj) {
			var children = '';

			if (typeof obj !== 'undefined' && typeof obj.children !== 'undefined') {
				$.each(obj.children, function (key, child) {

					children += child.id + ',';

					if (typeof child.children !== 'undefined' && child.children.length !== 0) {
						//children += Tasks.getChildrenIDs(child.id, child);
						children += iterate(child);
					}
				});
			}

			return children;
		}

		var children = iterate(task).split(',');
		children.pop();

		return children;
	}

	/**
	 * Recursively finds task resource from set of tasks
	 * @param {String} taskId
	 * @param {Array} obj Tasks array to search in; can be lists array, lists will be iterated
	 * @returns {Object|null} Task resource
	 */
	function iterateGet(taskId, obj) {
		if (!obj || obj.length === 0) {
			return null;
		}

		if (obj[0].kind == 'tasks#taskList') {
			for (var i = 0; i < obj.length; i++) {
				var child = iterate(taskId, obj[i].tasks);
				if (child) {
					return child;
				}
			}
		}

		if (obj[0].kind == 'tasks#task') {
			return iterate(taskId, obj);
		}

		return null;

		function iterate(id, obj) {
			for (var i = 0; i < obj.length; i++) {
				var item = obj[i];
				if (item.id === id) {
					return getChildrenAndReturn(item);
				} else if (typeof item.children !== 'undefined' && item.children.length > 0) {
					var child = iterateGet(id, item.children);
					if (child && child.id === id) {
						return getChildrenAndReturn(child);
					}
				}
			}
			return null;
		}
	}

	/**
	 * Service function for {@link iterateGet}
	 * Appends children ids and returns task resource
	 * @param {Object} task Task resource
	 * @returns {Object} Task resource
	 */
	function getChildrenAndReturn(task) {
		task.childrenIds = populateChildrenIds(task);
		return task;
	}

	/**
	 * Recursively finds task resource from set of tasks and updates its properties
	 * @param {String} taskId
	 * @param {Object} data Data to update with
	 * @param {Array} tasks Set of tasks to search in
	 * @returns {Object|null} Task resource
	 */
	function iterateUpdate(taskId, data, tasks) {

		if (!tasks || tasks.length === 0) {
			return null;
		}

		/* Iterating through cache */
		for (var i = 0; i < tasks.length; i++) {
			if (tasks[i].id === taskId) {

				/* Iterating through passed properties */
				for (var property in data) {
					if (data.hasOwnProperty(property)) {
						tasks[i][property] = data[property];
						if (property === 'status') {
							if (data[property] === 'completed') {
								tasks[i]['completed'] = new Date();
							} else if (data[property] === 'needsAction') {
								delete tasks[i]['completed'];
							}
						}
					}
				}
				return tasks[i];

			} else {

				/* Iterating through child nodes */
				for (var j = 0; j < tasks[i].children.length; j++) {
					var item = iterateUpdate(taskId, data, [tasks[i].children[j]]);
					if (item) {
						return item;
					}
				}
			}
		}
		return undefined;
	}

	/**
	 * Recursively finds task resource from set of tasks and removes it
	 * @param {String} taskId
	 * @param {Array} tasks Set of tasks to search in
	 * @returns {Object|null} Task resource
	 */
	function iterateRemove(taskId, tasks) {
		if (!tasks) {
			return null;
		}
		for (var i = 0; i < tasks.length; i++) {
			if (tasks[i].id === taskId) {
				tasks.splice(i, 1);
				return tasks;
			} else if (tasks[i].children && tasks[i].children.length > 0) {
				var children = iterateRemove(taskId, tasks[i].children);
				if (children) {
					tasks[i].children = children;
					return tasks;
				}
			}
		}
		return null;
	}

	/**
	 * Recursively finds corresponding tasks array and inserts given Task resource
	 * @param {String} listId List if to insert task into
	 * @param {Array} lists Set of lists
	 * @param {Object} taskToInsert Task resource to insert
	 * @param {String} [parentId] Parent task id to insert to
	 * @param {String} [previousId] Previous task id to insert after
	 * @returns {Array|null} Set of lists
	 */
	function iterateInsert(listId, lists, taskToInsert, parentId, previousId) {
		for (var i = 0; i < lists.length; i++) {
			if (lists[i].id === listId) {
				var tasks = iterate(lists[i].tasks, taskToInsert, parentId, previousId);
				if (tasks) {
					lists[i].tasks = tasks;
					return lists;
				}
			}
		}

		return null;

		function iterate(obj, taskToMove, parentId, previousId) {
			if (parentId) {
				for (var i = 0; i < obj.length; i++) {
					if (obj[i].id === parentId) {

						/* Iterate children */
						if (previousId) {
							for (var j = 0; j < obj[i].children.length; j++) {
								if (obj[i].children[j].id === previousId) {
									obj[i].children.splice(j + 1, 0, taskToMove);
									return obj;
								}
							}
						} else {
							obj[i].children.unshift(taskToMove);
							return obj;
						}
					}

					var children = iterate(obj[i].children, taskToMove, parentId, previousId);
					if (children) {
						obj[i].children = children;
						return obj;
					}
				}
				return null;
			}

			if (previousId) {
				for (var k = 0; k < obj.length; k++) {
					if (obj[k].id === previousId) {
						obj.splice(k + 1, 0, taskToMove);
						return obj;
					}
				}
			}

			obj.unshift(taskToMove);
			return obj;
		}
	}

	/* TODO: OMG! */
	/**
	 * Handles task movement to another list
	 * Is used either if different list was chosen on the Task form or from Edit Mode's multiple move
	 * @param {Object} params Parameters passed to {@link Task.updateTask}
	 * @param {Object} storageTask Task resource from local storage
	 * @param callback
	 */
	function moveToAnotherList(params, storageTask, callback) {
		var updateData = {},
			lastListId = List.getLastActive().id;

		iterate(storageTask, params.pack, null, null, updateStorage);

		function iterate(task, pack, parent, previous, callback) {

			pack = pack || task;

			var deleteParams = {
				listId: lastListId,
				taskId: task.id,
				moveChildren: false,
				touchStorage: false
			};
			Task.deleteTask(deleteParams, function () {

				var createParams = {
					listId: params.listId,
					pack: prepareInsert(pack),
					openList: false,
					touchStorage: false
				};
				if (parent)    createParams.pack.parent = parent.id;
				if (previous)    createParams.pack.previous = previous.id;
				Task.createTask(createParams, function (insertedTask) {

					updateData[task.id] = insertedTask;

					iterateChildren(task.children, null);

					function iterateChildren(children, previous) {
						var child = children.shift();
						if (!child) {
							callback && callback(parent);
							return;
						}
						iterate(child, null, insertedTask, previous, function (previous) {
							if (children.length > 0) {
								iterateChildren(children, previous);
							} else {
								callback && callback(previous);
							}
						});
					}
				});
			});
		}

		/* Updates local data */
		function updateStorage() {
			List.storage.get(null, function (lists) {

				// Iterating lists
				for (var i = 0; i < lists.length; i++) {
					if (lists[i].id === lastListId) {

						var task = iterateGet(storageTask.id, lists[i].tasks);
						lists[i].tasks = iterateRemove(storageTask.id, lists[i].tasks);
						task = update(task);
						lists = iterateInsert(params.listId, lists, task);
						if (!lists) {
							console.error("Crap! Couldn't insert task. Aborting.");
							return;
						}
						if (list) break;
					}
					if (lists[i].id === params.listId) {
						var list = lists[i];
						if (task) break;
					}
				}
				List.storage.set(lists, function () {
					finish(list);
				});
			});
		}

		/* Updates task resource */
		function update(task) {
			var id = task.id, // will be overridden
				propertiesCanBeAbsent = ['notes', 'completed', 'due'];

			// Iterating properties
			for (var prop in updateData[id]) {
				if (updateData[id].hasOwnProperty(prop)) {
					task[prop] = updateData[id][prop];
				}
			}

			// Delete non-existing properties
			for (var p in task) {
				if (task.hasOwnProperty(p)) {
					if (!updateData[id][p] && propertiesCanBeAbsent.indexOf(p) > -1) {
						delete task[p];
					}
				}
			}
			task.children.forEach(function (child) {
				update(child);
			});
			return task;
		}

		/* Prepares task resource for insertion to another list; removes unnecessary properties */
		function prepareInsert(task) {
			var obj = {},
				prop,
				arr = ['id', 'children', 'childrenIds', 'parent', 'previous'];
			for (prop in task) {
				if (task.hasOwnProperty(prop)) {
					if (arr.indexOf(prop) === -1) {
						obj[prop] = task[prop];
					}
				}
			}
			return obj;
		}

		/* Finishes sequence */
		function finish(list) {
			if (params.startImmediately) {
				FT.startSyncQueue();
			}
			if (params.openList) {
				Task.loadData(list);
			}
			callback && callback(list);
		}
	}

	/**
	 * Handles ERROR CODE 404
	 * Removes task resource from local data
	 * @param {String} taskId
	 */
	function onNotFound(taskId) {
		Task.storage.get(null, taskId, function (task) {
			if (task) {
				EV.fire('task-removed', task.id); // tells view to remove node
				Task.storage.remove(null, task.id);
			}
		})
	}

	/**
	 * Fires when set of tasks was loaded
	 * @param {Array} [tasks] Set of tasks
	 */
	function onDataLoaded(tasks) {
		tasks = tasks || [];
		EV.fire('tasks-loaded', tasks);
	}


	return {

		init: function () {
			setListeners();
		},

		/**
		 * Loads tasks from local data
		 * @param {Object} [list] List resource; Last active by default
		 */
		loadData: function (list) {
			list = list || List.getLastActive();
			EV.fire('list-selected', list);

			if (list.tasks) {
				onDataLoaded(list.tasks);
				return;
			}

			Task.storage.get(list.id, null, function (tasks) {
				if (tasks) {
					onDataLoaded(tasks);
				} else {
					Task.getList(list);
				}
			});
		},

		/**
		 * Fetches tasks from server
		 * @param {Object} [list] List resource; Last active by default
		 * @param [callback]
		 * @param {Boolean} [updateList] False to forbid update given list resource with fetched tasks; true by default
		 */
		getList: function (list, callback, updateList) {

			if (typeof updateList === 'undefined') {
				updateList = true;
			}

			list = list || List.getLastActive();

			Task.view.toggleProgress(true);

			var data = {
				type: 'GET',
				url: 'https://www.googleapis.com/tasks/v1/lists/' + list.id + '/tasks'
			};

			Auth.makeRequest(data, function (success, res) {

				if (!success || (success && arguments[3] == 'Not Found')) {
					EV.fire('list-not-found', list.id);
					return;
				}

				var items = res.items || [];

				items = makeTree({q: items});

				if (updateList) {
					List.storage.update(list.id, {tasks: items}, function () {
						onDataLoaded(items);
						onFinish();
					});
				} else {
					onFinish();
				}

				function onFinish() {
					if (callback) {
						callback(list, items);
					}
				}

			}, function (success, jqXHR) {
				// List not found
				if (jqXHR.status == 503) {
					EV.fire('list-not-found', list.id);
				} else {
					console.error('Unusual error has occurred');
					if (typeof callback !== 'undefined') callback();
					else Task.view.toggleProgress(false);
				}
			});
		},

		/**
		 * Fetches task from server
		 * @param listId
		 * @param taskId
		 * @param [callback]
		 */
		getById: function (listId, taskId, callback) {
			listId = listId || List.getLastActive().id;
			var data = {
				type: 'GET',
				url: 'https://www.googleapis.com/tasks/v1/lists/' + listId + '/tasks/' + taskId,
				entity: {
					type: FT.getEntityTypes().TASK,
					id: taskId,
					listId: listId
				}
			};

			Auth.makeRequest(data, function (success, res) {
				if (success) {
					callback && callback(res);
				} else {
					EV.fire('task-not-found', taskId);
					callback && callback(null);
				}
			});
		},

		storage: {

			/**
			 * Retrieves task resource from local data
			 * @param {String} [listId] List id to lookup in; Last active by default
			 * @param {String} [taskId] null to retrieve full set of tasks of the given list id
			 * @param callback
			 */
			get: function (listId, taskId, callback) {
				listId = listId || List.getLastActive().id;
				List.storage.get(listId, function (list) {
					if (!taskId) {
						callback(list.tasks);
						return;
					}
					callback(iterateGet(taskId, list.tasks));
				});
			},

			/**
			 * Updates task resource in local data
			 * @param {String} [listId] List id to lookup in; Last active by default
			 * @param {String} taskId Id of the task to update
			 * @param {Object} data Set of properties to update with
			 * @param callback
			 */
			update: function (listId, taskId, data, callback) {
				listId = listId || List.getLastActive().id;
				List.storage.get(null, function (lists) {

					/* Iterating through lists */
					for (var i = 0; i < lists.length; i++) {
						if (lists[i].id === listId) {

							var task = iterateUpdate(taskId, data, lists[i].tasks);
							if (task) {
								break;
							}
						}
					}
					List.storage.set(lists, function () {
						callback && callback(task);
					});
				});
			},

			/**
			 * Removes task resource from local data
			 * @param {String} [listId] List id to remove from; Last active by default
			 * @param {String} [taskId] Id of the task to remove; null to remove all tasks of the given list
			 * @param callback
			 */
			remove: function (listId, taskId, callback) {
				listId = listId || List.getLastActive().id;
				List.storage.get(null, function (lists) {
					for (var i = 0; i < lists.length; i++) {
						if (lists[i].id === listId) {
							if (!taskId) {
								lists[i].tasks = [];
								List.storage.set(lists, callback);
								break;
							}
							lists[i].tasks = iterateRemove(taskId, lists[i].tasks);
							List.storage.set(lists, callback);
						}
					}
				});
			},

			/**
			 * Inserts task resource to local data
			 * @param {String} [listId] List id to insert to; Last active by default
			 * @param {Object} taskToInsert Task resource to insert
			 * @param {String} [parentId] Parent task id to insert to
			 * @param {String} [previousId] Previous task id to insert after
			 * @param callback
			 */
			insert: function (listId, taskToInsert, parentId, previousId, callback) {
				listId = listId || List.getLastActive().id;
				taskToInsert.kind = taskToInsert.kind || 'tasks#task';
				taskToInsert.children = taskToInsert.children || [];
				List.storage.get(null, function (lists) {

					/* Iterating through lists */
					for (var i = 0; i < lists.length; i++) {
						if (lists[i].id === listId) {
							lists = iterateInsert(listId, lists, taskToInsert, parentId, previousId);
							if (!lists) {
								console.error("Crap! Couldn't insert task. Aborting.");
								return;
							}
							break;
						}
					}
					List.storage.set(lists, function (lists) {
						callback && callback(lists);
					});
				});
			},

			/**
			 * Moves task in local data
			 * @param {String} [listId] List id to insert to; Last active by default
			 * @param {String} taskId Id of the task to move
			 * @param {String} [parentId] Parent task id to insert to
			 * @param {String} [previousId] Previous task id to insert after
			 * @param callback
			 */
			move: function (listId, taskId, parentId, previousId, callback) {
				listId = listId || List.getLastActive().id;
				List.storage.get(null, function (lists) {

					/* Iterating through lists */
					for (var i = 0; i < lists.length; i++) {
						if (lists[i].id === listId) {
							var taskToMove = iterateGet(taskId, lists[i].tasks);
							lists[i].tasks = iterateRemove(taskId, lists[i].tasks);
							lists = iterateInsert(listId, lists, taskToMove, parentId, previousId);
							if (!lists) {
								console.error("Crap! Couldn't insert task. Aborting.");
								return;
							}
							break;
						}
					}
					List.storage.set(lists, function (lists) {
						callback && callback(lists);
					});
				});
			}
		},

		/**
		 * Handles task creation
		 * Not asynchronous, waits until new task resource is returned
		 * @param {Object} params
		 * @param [callback]
		 */
		createTask: function (params, callback) {

			if (typeof params.openList === 'undefined') {
				params.openList = true;
			}

			if (typeof params.touchStorage === 'undefined') {
				params.touchStorage = true;
			}

			params.parentId = params.parentId || params.pack.parent || null;
			params.previousId = params.previousId || params.pack.previous || null;

			var data = {
				type: 'POST',
				url: 'https://www.googleapis.com/tasks/v1/lists/' + params.listId + '/tasks',
				pack: params.pack,
				entity: {
					type: FT.getEntityTypes().TASK,
					id: null,
					listId: params.listId
				}
			};

			data.query_params = '';
			if (params.previousId !== null) {
				data.query_params += 'previous=' + params.previousId + '&';
			}
			if (params.parentId !== null) {
				data.query_params += 'parent=' + params.parentId;
			}

			Task.view.toggleProgress(true);
			Auth.makeRequest(data, function (success, res) {
				if (success && res) {
					params.pack = res;
					doInsert(params, callback);
				} else {
					Task.view.toggleProgress(false);
				}
			});

			function doInsert(params, callback) {

				if (params.touchStorage) {
					Task.storage.insert(params.listId, params.pack, params.parentId, params.previousId, onFinish);
				} else {
					onFinish();
				}

				function onFinish() {
					setTimeout(function () {
						if (params.openList) {

							List.storage.get(params.listId, function (list) {
								Task.loadData(list);
							});

						}

						callback && callback(params.pack);
					}, 0);
				}
			}
		},

		/**
		 * Handles update of the task
		 * @param {Object} params
		 * @param [callback]
		 */
		updateTask: function (params, callback) {

			var lastListId = List.getLastActive().id;

			Task.storage.get(lastListId, params.taskId, function (storageTask) {

				/* Prevents unnecessary request if task is already completed */
				if (!params.forceUpdate && storageTask.completed) {
					callback && callback();
					return;
				}

				if (typeof params.openList === 'undefined') {
					params.openList = true;
				}

				/* Update in same list */
				if (lastListId === params.listId) {
					var data = {
						type: 'PATCH',
						url: 'https://www.googleapis.com/tasks/v1/lists/' + params.listId + '/tasks/' + params.taskId,
						pack: params.pack,
						entity: {
							type: FT.getEntityTypes().TASK,
							id: params.taskId,
							listId: params.listId
						}
					};
					FT.addSyncTask(data);

					Task.storage.update(params.listId, params.taskId, params.pack, function (task) {
						if (params.startImmediately) {
							FT.startSyncQueue();
						}
						if ((Object.keys(params.pack).length === 1 && params.pack.status === 'completed') ||
							(Object.keys(params.pack).length === 2 && params.pack.status === 'needsAction' && params.pack.completed === null)) {
							EV.fire('task-mark-completed', task);
						} else {
							EV.fire('task-updated', task);
						}

						callback && callback();
					});

				} else {
					/* Move to another list */
					moveToAnotherList(params, storageTask, callback);
				}
			});
		},

		/**
		 * Handles task deletion
		 * @param {Object} params
		 * @param [callback]
		 */
		deleteTask: function (params, callback) {

			if (typeof params.moveChildren === 'undefined') {
				params.moveChildren = true;
			}

			if (typeof params.touchStorage === 'undefined') {
				params.touchStorage = true;
			}

			var data = {
				type: 'DELETE',
				url: 'https://www.googleapis.com/tasks/v1/lists/' + params.listId + '/tasks/' + params.taskId,
				entity: {
					type: FT.getEntityTypes().TASK,
					id: params.taskId,
					listId: params.listId
				}
			};
			FT.addSyncTask(data);

			Task.view.hideNode(params.taskId);

			if (params.moveChildren) {
				Task.storage.get(params.listId, params.taskId, function (task) {

					iterate(task.children.reverse());

					function iterate(children) {
						var child = children.shift();
						if (!child) {
							onFinish();
							return;
						}
						var moveData = Task.view.unindentItem(child.id);
						Task.moveTask(params.listId, moveData.id, moveData.parentId, moveData.previousId, false, function () {
							if (children.length > 0) {
								iterate(children);
							} else {
								onFinish();
							}
						});
					}
				});
			} else {
				onFinish();
			}

			function onFinish() {

				if (params.touchStorage) {
					Task.storage.remove(params.listId, params.taskId, finalize);
				} else {
					finalize();
				}

				function finalize() {
					setTimeout(function () {
						if (params.startImmediately) {
							FT.startSyncQueue();
						}
						EV.fire('task-removed', params.taskId);
						callback && callback(params.taskId);
					}, 0);
				}
			}
		},

		/**
		 * Handles movement of the task within current list
		 * @param {String} [listId] Id of the list to move task within; Last active by default
		 * @param {String} taskId Id of the task to move
		 * @param {String} [parentId] Parent task id to insert to
		 * @param {String} [previousId] Previous task id to insert after
		 * @param {Boolean} [startImmediately] True to start sync queue immediately
		 * @param [callback]
		 */
		moveTask: function (listId, taskId, parentId, previousId, startImmediately, callback) {

			listId = listId || List.getLastActive();
			parentId = parentId || null;
			previousId = previousId || null;
			var previousProcessed = false, parentProcessed = false;

			var data = {
				type: 'POST',
				url: 'https://www.googleapis.com/tasks/v1/lists/' + listId + '/tasks/' + taskId + '/move',
				entity: {
					type: FT.getEntityTypes().TASK,
					id: taskId,
					listId: listId
				}
			};

			data.query_params = '';

			// We need to ensure that previous and parent tasks are present on the server
			if (previousId !== null) {
				Task.getById(listId, previousId, function (task) {
					if (task && !task.deleted) {
						data.query_params += 'previous=' + previousId + '&';
						previousProcessed = true;
						doMove();
					} else {
						abort();
					}
				});
			} else {
				previousProcessed = true;
			}
			if (parentId !== null) {
				Task.getById(listId, parentId, function (task) {
					if (task && !task.deleted) {
						data.query_params += 'parent=' + parentId + '&';
						parentProcessed = true;
						doMove();
					} else {
						abort();
					}
				});
			} else {
				parentProcessed = true;
			}

			doMove(); // fires if parentId and previousId are null

			function doMove() {
				if (!previousProcessed || !parentProcessed) {
					return;
				}
				FT.addSyncTask(data);
				Task.storage.move(listId, taskId, parentId, previousId, function (lists) {
					if (startImmediately) {
						FT.startSyncQueue();
					}
					if (typeof callback !== 'undefined') callback(lists);
				});
			}

			function abort() {
				if (EditMode.isEnabled()) {
					// restores EditMode with selection
					var selIds = EditMode.getCheckedItems(),
						token = EV.listen('tasks-rendered', function () {
							EditMode.enable();
							selIds.forEach(function (id) {
								EditMode.setNodeChecked(id, true);
							});
							//EditMode.abortBatch();
							EV.stopListen(token);
						});
				}
				Task.getList();
			}
		}
	};

}(jQuery));