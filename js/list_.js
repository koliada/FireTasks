/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * List object
 * Handles all lists operations
 */
window.List = function () {

	"use strict";

	var lastActive,
		actions = {
			CREATE: 'createList',
			RENAME: 'renameList',
			DELETE: 'deleteList'
		},
		storageKey = 'lists',
		storageDelimiter = '-';


	/**
	 * Sets event listeners
	 */
	function setListeners() {
		EV.listen('list-selected', updateLastActive);
		EV.listen('list-updated', Task.loadData);
		EV.listen('list-removed', remove);
		EV.listen('list-not-found', remove);
	}

	function sortItemsAlphabetically(items) {
		return items.sort(function (a, b) {
			if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
			if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
			return 0;
		});
	}

	/**
	 * Updates last active list
	 * @param {Object} list
	 */
	function updateLastActive(list) {
		try {
			if (list) {
				lastActive = list;
				localStorage.setItem('lastListId', list.id);
			}
		} catch (e) {
			Logger.log(e);
		}
	}

	/**
	 * Is used for selecting list after list deletion
	 * @param {String} listId
	 * @param callback
	 */
	function getPrevious(listId, callback) {

		if (typeof listId === 'undefined') {
			return;
		}

		List.storage.get(null, function (items) {
			for (var i = 0; i < items.length; i++) {
				if (listId === items[i].id) {
					if (items[i - 1]) {
						callback && callback(items[i - 1]);
					} else {
						callback && callback(items[i + 1]); // returns next if there's no previous
					}
				}
			}
		});
	}

	/**
	 * Handles list removal
	 * Also is used when ERROR CODE 404 caught
	 * @param {String} listId
	 */
	function remove(listId) {
		if (List.view.getActionChooserList().id === List.getLastActive().id || listId === List.getLastActive().id) {
			localStorage.removeItem('lastListId');
			lastActive = null;
			getPrevious(listId, function (previousList) {
				FT.toggleSidebar(true);
				List.storage.remove(listId, function () {
					Task.loadData(previousList);
				});
			});
		} else {
			List.storage.remove(listId);
		}
	}

	function onDataLoaded(items) {
		items = items || [];
		EV.fire('lists-loaded', items);
	}

	/**
	 * Is used for setting last active list on app launch
	 * @param {Array} lists Array of {@link List}
	 */
	function setLastActive(lists) {
		try {
			var lastActiveNeedsToBeSet = true,
				lastActive = List.getLastActive();
			for (var i = 0; i < lists.length; i++) {
				if (lists[i].id === lastActive.id) {
					updateLastActive(lists[i]);
					lastActiveNeedsToBeSet = false;
					break;
				}
			}
			lastActiveNeedsToBeSet && updateLastActive(lists[0]);
		} catch (e) {
			Logger.log(e);
		}
	}

	/**
	 * Creates List resource from provided id and title
	 * @param {String} id
	 * @param {String} title
	 * @returns {{id: *, title: *, kind: string, tasks: Array, updated: string}|null}
	 */
	function createListObject(id, title) {
		if (!id) {
			Logger.warn('createListObject(): no id provided');
			return null;
		}
		return {
			id: id,
			title: title,
			kind: "tasks#taskList",
			tasks: [],
			updated: (new Date()).toUTCString()
		};
	}

	/**
	 * Updates local list with temporary ID with a new one, returned from server
	 * @param {String} tempId
	 * @param {Object} list
	 */
	function updateTemporaryList(tempId, list) {
		List.storage.update(tempId, list, function (list) {
			if (!list) return;
			list.replaceId = tempId;	// replaceId will be used to replace the old node
			EV.fire('list-updated', list);
		});
	}

	return {

		init: function () {
			setListeners();
		},

		/**
		 * Loads lists from local data
		 * @param [items] If set, renders lists immediately
		 */
		loadData: function (items) {
			if (items) {
				setLastActive(items);
				onDataLoaded(items);
				return;
			}
			List.storage.get(null, function (error, lists) {
				if (!error && lists) {
					setLastActive(lists);
					onDataLoaded(lists);
				} else {
					FT.runSetup();
				}
			});
		},

		/**
		 * Fetches lists from server
		 * @param [callback]
		 */
		getList: function (callback) {
			List.view.toggleProgress(true);

			var data = {
				type: 'GET',
				url: 'https://www.googleapis.com/tasks/v1/users/@me/lists'
			};

			Auth.makeRequest(data, function (success, res) {

				if (!success) {
					List.view.toggleProgress(false);
					console.error('Error caught!');
					return;
				}

				var items = res.items || [];

				items = sortItemsAlphabetically(items);
				if (callback) {
					callback(items);
					return;
				}

				List.storage.refresh(items, function (items) {
					Task.getList(List.getLastActive(), function () {
						onDataLoaded(items);
					}, true);
				});
			});
		},

		/**
		 * Fetches list from server
		 * @param listId
		 * @param [callback]
		 */
		getById: function (listId, callback) {
			var data = {
				type: 'GET',
				url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/' + listId,
				entity: {
					type: FT.getEntityTypes().LIST,
					id: listId
				}
			};

			Auth.makeRequest(data, function (success, res) {
				if (success) {
					callback && callback(res);
				} else {
					EV.fire('list-not-found', listId);
					callback && callback(null);
				}
			});
		},

		/**
		 * Handles local data
		 */
		storage: {

			/**
			 * Removes local data for active user completely
			 * @param callback
			 */
			clear: function (callback) {
				localforage.removeItem(storageKey + storageDelimiter + Settings.get('email'), callback);
			},

			/**
			 * Sets local data, removes existing data of current user (uses email)
			 * @param {Object} items
			 * @param callback
			 */
			set: function (items, callback) {
				localforage.setItem(storageKey + storageDelimiter + Settings.get('email'), items, callback);
			},

			/**
			 * Updates local data with fetched data
			 * Adds missing lists
			 * Updates existing lists
			 * Removes lists that are present in fetched data
			 * @param {Object} fetchedItems
			 * @param callback
			 */
			refresh: function (fetchedItems, callback) {
				List.storage.get(null, function (storageItems) {

					if (!storageItems) {
						FT.runSetup();
						return;
					}

					var lastActive = List.getLastActive();

					// Iterating storage items
					for (var i = 0; i < storageItems.length; i++) {

						// Iterating fetched items
						var toBeDeleted = true;
						for (var j = 0; j < fetchedItems.length; j++) {
							if (storageItems[i].id === fetchedItems[j].id) {
								fetchedItems[j].tasks = storageItems[i].tasks || [];
								storageItems[i] = fetchedItems[j];
								if (lastActive.id === storageItems[i].id) {
									updateLastActive(storageItems[i]);
								}
								fetchedItems.splice(j, 1);
								j--;
								toBeDeleted = false;
								break;
							}
						}
						// Remove item from storage if it's not found in fetched results
						if (toBeDeleted) {
							if (lastActive.id === storageItems[i].id) {
								if (storageItems[i - 1]) {
									updateLastActive(storageItems[i - 1]);
								} else {
									updateLastActive(storageItems[i + 1]);
								}
							}
							storageItems.splice(i, 1);
							i--;
						}
					}

					// Pushing new lists from server to storage
					for (var m = 0; m < fetchedItems.length; m++) {
						storageItems.push(fetchedItems[m]);
					}
					storageItems = sortItemsAlphabetically(storageItems);
					List.storage.set(storageItems, callback);
				});
			},

			/**
			 * Retrieves lists from local data
			 * @param {String} listId If not set, all lists will be returned
			 * @param callback
			 */
			get: function (listId, callback) {

				if (!listId) {
					localforage.getItem(storageKey + storageDelimiter + Settings.get('email'), callback);
					return;
				}

				localforage.getItem(storageKey + storageDelimiter + Settings.get('email'), function (items) {
					if (!items) {
						callback();
						return;
					}
					for (var i = 0; i < items.length; i++) {
						if (items[i].id === listId) {
							callback && callback(items[i]);
							break;
						}
					}
				});
			},

			/**
			 * Adds list resource to local data
			 * @param {Object} list
			 * @param callback
			 */
			add: function (list, callback) {
				List.storage.get(null, function (items) {
					items.push(list);
					items = sortItemsAlphabetically(items);
					List.storage.set(items, callback);
				});
			},

			/**
			 * Updates list resource in local data
			 * @param {String} listId
			 * @param {Object} data
			 * @param [callback]
			 */
			update: function (listId, data, callback) {
				listId = listId || List.getLastActive().id;
				List.storage.get(null, function (items) {

					/* Iterating through cache */
					for (var i = 0; i < items.length; i++) {
						if (items[i].id === listId) {

							/* Iterating through passed properties */
							for (var property in data) {
								if (data.hasOwnProperty(property)) {
									items[i][property] = data[property];
								}
							}
							var list = items[i];
							updateLastActive(list);
							items = sortItemsAlphabetically(items);
							break;
						}
					}
					localforage.setItem(storageKey + storageDelimiter + Settings.get('email'), items, function () {
						callback && callback(list);
					});
				});
			},

			/**
			 * Removes list resource from local data
			 * @param {String} listId
			 * @param [callback]
			 */
			remove: function (listId, callback) {
				List.storage.get(null, function (items) {
					for (var i = 0; i < items.length; i++) {
						if (items[i].id === listId) {
							items.splice(i, 1);
							List.storage.set(items, callback);
							break;
						}
					}
				});
			}
		},

		/**
		 * Gets last active list object
		 * Object({id: <list id>}) will be returned if there was no object in memory found
		 * @returns {List|Object}
		 */
		getLastActive: function () {
			return lastActive || {id: localStorage.getItem('lastListId')};
		},

		/**
		 * Handles list creation
		 * Active list is used
		 * Not asynchronous, waits until new list resource is returned
		 * @param {String} name
		 */
		createList: function (name) {

			var data = {
				type: 'POST',
				url: 'https://www.googleapis.com/tasks/v1/users/@me/lists',
				pack: {
					title: name
				}
			};

			var tempId = FT.addSyncTask(data, FT.getSyncCallbacksNames().LIST_CREATED).id;

			var list = createListObject(tempId, name);

			List.storage.add(list, function (items) {
				updateLastActive(list);
				var eid = EV.listen('tasks-rendered', function () {
					FT.startSyncQueue();
					EV.stopListen(eid);
				});
				List.loadData(items);
			});
		},

		/**
		 * Handles list renaming
		 * @param {String} listId
		 * @param {String} value
		 */
		renameList: function (listId, value) {

			var data = {
				type: 'PATCH',
				url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/' + listId,
				pack: {
					title: value
				},
				entity: {
					type: FT.getEntityTypes().LIST,
					id: listId
				}
			};

			FT.addSyncTask(data).start();

			List.storage.update(listId, data.pack, function (list) {
				EV.fire('list-updated', list);
			});
		},

		/**
		 * Handles list deletion
		 * @param {String} listId
		 */
		deleteList: function (listId) {

			var data = {
				type: 'DELETE',
				url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/' + listId,
				entity: {
					type: FT.getEntityTypes().LIST,
					id: listId
				}
			};

			FT.addSyncTask(data).start();

			EV.fire('list-removed', listId);
		},

		/**
		 * To be called on successful remote list creation
		 * By this time local temporary copy of the list should exist
		 * @param success
		 * @param list
		 * @param taskObject A task object from {@link Sync.onEvery}, which id we earlier used as a temporary list id
		 */
		listCreatedCallback: function (success, list, taskObject) {
			if (success && typeof list.id !== 'undefined') {
				FT.pauseSync();
				updateTemporaryList(taskObject.id, list);
				Sync.updateQueueData(function (taskData) {
					debugger;
					return taskData;
				});
				FT.resumeSync();	// won't resume on failed task anyway
			}
		}
	}

}();