/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Task view
 * Handles all lists representation operations
 *
 * @requires {@link Task}
 */
Task.view = (function ($) {

	"use strict";

	var labels = {
			LBL_CREATE: 'Create',
			LBL_UPDATE: 'Update',
			LBL_LOADING: 'Loading tasks...'
		},
		dom = {
			drawer: $('section#drawer'),
			list: $('#tasks').find('ol').first(),
			form: $('#task-form'),
			progressBar: $('#progress-tasks'),
			actionChooser: $('#tasks-actions'),
			sortModeChooser: $('#tasks-sort-mode'),
			btnSortTasks: $('#btn-sort-tasks'),
			btnSortTasksMyOrder: $('#btn-sort-tasks-my-order'),
			btnSortTasksAlphabetical: $('#btn-sort-tasks-alphabetical'),
			btnSortTasksDueDate: $('#btn-sort-tasks-due-date'),
			btnShareTasks: $('#btn-share-tasks'),
			btnActions: $('#btn-tasks-actions'),
			btnNewTask: $('#btn-new-task'),
			btnBack: $('#btn-task-form-back'),
			btnOk: $('#btn-task-form-ok'),
			btnDelete: $('#btn-task-form-delete')
		};

	var sortModeManager = (function () {
		var sortMode,
			sortModes = {
				myOrder: 'MY-ORDER',
				alphabetical: 'ALPHABETICAL',
				dueDate: 'DUE-DATE'
			},
			sortModeStorageKey = 'tasksSortMode';

		return {
			/**
			 * Saves active sorting mode to storage
			 * @param [value] If skipped, 'My order' will be used
			 */
			set: function (value) {
				if (typeof value === 'undefined') {
					value = sortModeManager.get();
					if (value === null || typeof value === 'undefined') {
						localStorage.setItem(sortModeStorageKey, sortModes.myOrder);
						sortMode = sortModes.myOrder;
					}
				} else {
					var present = false;
					for (var mode in sortModes) {
						if (!sortModes.hasOwnProperty(mode)) continue;
						if (sortModes[mode] === value) {
							present = true;
							break;
						}
					}
					if (!present) {
						throw "Unrecognized sorting mode passed, expected values: MY-ORDER|ALPHABETICAL|DUE-DATE";
					}
					localStorage.setItem(sortModeStorageKey, value);
					sortMode = value;
				}
			},

			/**
			 * Returns saved sorting mode without any processing
			 * If there's no cached value, fetches from storage
			 * @returns {*}
			 */
			get: function () {
				return (typeof sortMode === 'undefined') ? localStorage.getItem(sortModeStorageKey) : sortMode;
			},

			/**
			 * Returns object with pre-defined sort types
			 * @returns {{myOrder: string, alphabetical: string, dueDate: string}}
			 */
			getSortModes: function () {
				return sortModes;
			},

			isMyOrder: function () {
				return this.get() === sortModes.myOrder;
			},

			isAlphabetical: function () {
				return this.get() === sortModes.alphabetical;
			},

			isDueDate: function () {
				return this.get() === sortModes.dueDate;
			}
		}
	}());


	function setListeners() {
		EV.listen('list-renamed', setListTitle);
		EV.listen('list-selected', function () {
			setListTitle()
		});
		EV.listen('tasks-loaded', renderList);
		EV.listen('tasks-rendered', function () {
			setListTitle(List.getLastActive())
		});
		EV.listen('task-updated', updateNode);
		EV.listen('task-mark-completed', toggleCompletedState);
		EV.listen('task-removed', removeNode);

		/* List actions and buttons */
		dom.list.on('click', onListClick);
		dom.list.on('change', '.pack-checkbox:not(.danger) input[type="checkbox"]', onToggleCompleted);
		dom.btnActions.on('click', showActionChooser);
		dom.btnNewTask.on('click', onNewTask);
		dom.btnDelete.on('click', onDeleteTask);

		/* Action chooser */
		// TODO: event delegation
		var buttons = dom.actionChooser[0].querySelectorAll('button');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].addEventListener('click', onActionButtonClicked);
		}

		/* Sort mode chooser */
		// TODO: event delegation
		buttons = dom.sortModeChooser[0].querySelectorAll('button');
		for (i = 0; i < buttons.length; i++) {
			buttons[i].addEventListener('click', onSortButtonClicked);
		}

		/* Task Form */
		dom.btnBack.on('click', hideForm);
		dom.btnOk.on('click', onFormSubmit);

		/* TODO: remove */
		/* Due date picker */
		dom.form.find('[name="due"]').parents('label').first().click(function (ev) {
			ev.preventDefault();
			FT.showInDevelopmentTooltip();
		});
	}

	/**
	 * Builds element for given task resource
	 * @param {Object} task
	 * @returns {Element}
	 */
	function createNode(task) {

		var li = document.createElement('li'),
			a = document.createElement('a'),
			labelCheckbox = document.createElement('label'),
			labelCheckboxDanger = document.createElement('label'),
			divClickable = document.createElement('div'),
			labelHandle = document.createElement('label'),
			olInner = document.createElement('ol');

		li.classList.add('task-item');
		if (task.status === 'completed') {
			li.classList.add('completed');
		}
		//a.href = '#';
		a.dataset.id = task.id;
		a.setAttribute('draggable', 'false');
		a.setAttribute('oncontextmenu', 'return(false);');
		labelCheckboxDanger.className = 'pack-checkbox danger';
		labelCheckboxDanger.innerHTML = '<input type="checkbox"><span></span>';
		labelCheckbox.className = 'pack-checkbox';
		labelCheckbox.innerHTML = '<input type="checkbox" ' + ((task.status === 'completed') ? 'checked' : '') + '><span></span>';
		divClickable.classList.add('clickable');
		!sortModeManager.isMyOrder() && divClickable.classList.add('not-sortable');
		divClickable.innerHTML = '<p class="item-title"><span>' + task.title + '</span></p>' +
			((!task.notes || task.notes == '') ? '' : '<p class="item-notes">' + task.notes + '</p>');
		Longpress.bindLongPressHandler(divClickable, 400, onLongPress, onEditTask, EditMode.isEnabled);
		labelHandle.classList.add('task-handle');
		labelHandle.innerHTML = '<div class="action-icon menu"></div>';
		if (sortModeManager.isMyOrder() && typeof task.children !== 'undefined' && task.children.length !== 0) {
			task.children.forEach(function(child) {
				olInner.appendChild(createNode(child));
			});
		}
		a.appendChild(labelCheckboxDanger);
		a.appendChild(labelCheckbox);
		a.appendChild(divClickable);
		sortModeManager.isMyOrder() && a.appendChild(labelHandle);
		li.appendChild(a);
		li.appendChild(olInner);

		return li;
	}

	/**
	 * Handles DOM element sorting
	 * Fires when user drops sortable task
	 * @param {Object} el jQuery element
	 */
	function onTaskSort(el) {

		var taskId = $(el).find('a').first().attr('data-id'),
			previousId = getPreviousIdFromDom(taskId),
			parentId = getParentIdFromDom(taskId),
			listId = List.getLastActive().id;

		Task.moveTask(listId, taskId, parentId, previousId, true);
	}

	/**
	 * Gets parent node id
	 * @param {String} taskId
	 * @returns {String|null}
	 */
	function getParentIdFromDom(taskId) {
		return dom.list.find('li.task-item a[data-id="' + taskId + '"]').first().parent('li.task-item').parents('li.task-item').first().find('a').first().attr('data-id') || null;
	}

	/**
	 * Gets previous node id
	 * @param {String} taskId
	 * @returns {String|null}
	 */
	function getPreviousIdFromDom(taskId) {
		return dom.list.find('li.task-item a[data-id="' + taskId + '"]').first().parent('li.task-item').prev('li').find('a').first().attr('data-id') || null;
	}

	/**
	 * Binds jQuery UI Sortable
	 */
	function bindSortable() {

		dom.list.sortable({
			connectWith: dom.list,
			items: ".task-item",
			handle: ".task-handle",
			axis: "y",
			placeholder: "sortable-placeholder",
			scrollSensitivity: 70,
			update: function (event, ui) {
				onTaskSort(ui.item[0]);
				FT.setAutoFetch();
			},
			start: function (event, ui) {
				/* Disable Edit Mode */
				EditMode.disable();
				FT.stopAutoFetch();

				/* Collapse children nodes */
				var children = $(ui.item[0]).find('li');
				if (children.length > 0) {
					$(ui.item[0]).find('.item-title').first().prepend('<span class="item-children-num">(+' + children.length + ' more)&nbsp;</span>');
					children.hide();
					$(this).sortable("refreshPositions");
					$(ui.item[0]).css('height', 'auto');
				}

				/* Adjust placeholder height */
				$('.sortable-placeholder').css('height', parseInt(window.getComputedStyle(ui.item[0], null)['height']));
			},
			change: function (event, ui) {
				/*
				 Shift moved item to the level of the target placeholder
				 Adjusts item's width
				 */
				$(ui.item[0]).css('width', $(ui.placeholder[0]).css('width'));
				$(ui.item[0]).offset({ left: $(ui.placeholder[0]).offset().left });
			},
			stop: function (event, ui) {
				/* Expand children nodes */
				var children = $(ui.item[0]).find('li');
				children.show();
				$(ui.item[0]).find('.item-children-num').remove();
				$(ui.item[0]).css('height', 'auto');
				$(this).sortable("refreshPositions");
			}
		});
	}

	/**
	 * Counts currently visible task nodes
	 * @returns {Number}
	 */
	function getNodeCount() {
		return dom.list.find('li.task-item a:not(:hidden)').length;
	}

	/**
	 * Gets node by task id
	 * @param {String} taskId
	 * @returns {Object} jQuery object
	 */
	function getNodeById(taskId) {
		return dom.list.find('a[data-id="' + taskId + '"]').parent('li.task-item');
	}

	/**
	 * Gets task id from node
	 * @param {Object} node jQuery object
	 * @returns {String}
	 */
	function getNodeId(node) {
		return node.find('[data-id]').first().attr('data-id');
	}

	/**
	 * Prepares form for task creating/editing
	 * @param action
	 * @param data
	 */
	function renderForm(action, data) {

		dom.form.find('input').val('');
		dom.form.find('textarea').val('');

		if (action === 'CREATE') {
			data.ok = labels.LBL_CREATE;
			data.h1 = 'Create Task';
			data.completed = false;
			data.due_date = '';
		}

		if (action === 'UPDATE') {
			data.ok = labels.LBL_UPDATE;
			data.h1 = 'Edit Task';
		}

		dom.form.find('h1').html(data.h1);
		dom.btnOk.html(data.ok).attr('data-action', action);
		dom.form.find('input[name="title"]').val(data.title);
		dom.form.find('input[name="completed"]').prop('checked', (!!data.completed));
		dom.form.find('textarea[name="notes"]').val(data.notes);
		dom.form.find('input[name="due"]').val(data.due_date);

		if (typeof data.id !== 'undefined') {
			dom.btnDelete.show()[0].dataset.id = data.id;
			dom.btnOk[0].dataset.id = data.id;
		} else {
			dom.btnDelete.hide();
		}

		var taskLists = dom.form.find('select[name="listId"]'),
			activeListId = List.getLastActive().id;
		taskLists.html('');

		List.storage.get(null, function (lists) {
			for (var i = 0; i < lists.length; i++) {
				var selected = (lists[i].id === activeListId) ? ' selected' : '';
				taskLists.append('<option value="' + lists[i].id + '"' + selected + '>' + lists[i].title + '</option>');
			}
			showForm();
		});
	}

	/**
	 * Shows form for task creating/editing
	 */
	function showForm() {
		dom.form.removeClass('fade-out').addClass('fade-in');
		/* TODO: make first input active */
		FT.stopAutoFetch();
	}

	/**
	 * Hides form opened by {@link showForm}
	 */
	function hideForm() {
		dom.form.removeClass('fade-in').addClass('fade-out');
		FT.setAutoFetch();
	}

	/**
	 * Form data serialization
	 * @returns {Object}
	 */
	function getFormData() {
		var formData = {};
		dom.form.find('input, textarea, select').each(function (index, field) {
			if (field.type === 'checkbox') {
				formData[field.name] = field.checked;
				return;
			}
			formData[field.name] = field.value.trim();
		});
		return formData;
	}

	/**
	 * Updates node in DOM
	 * @param {Object} task Task resource
	 */
	function updateNode(task) {
		try {
			var oldNode = dom.list.find('a[data-id="' + task.id + '"]').parent('li')[0],
				newNode = createNode(task);
			oldNode.parentNode.replaceChild(newNode, oldNode);
		} catch (e) {
		}
	}

	/**
	 * Marks task completed
	 * @param {Object} task Task resource
	 */
	function toggleCompletedState(task) {
		var node = getNodeById(task.id);
		node.find('.pack-checkbox:not(.danger) input[type="checkbox"]')[0].checked = (task.status === 'completed');
		if (task.status === 'completed') {
			node[0].classList.add('completed');
		} else {
			node[0].classList.remove('completed');
		}
	}

	/**
	 * Removes node from DOM
	 * @param {String} taskId
	 */
	function removeNode(taskId) {
		var node = getNodeById(taskId);
		node.remove();
		/*node.find('a').first().slideUp(function() {
		 node.remove();
		 });*/
	}

	/**
	 * Renders task list and appends to DOM
	 * @param {TaskCollection} items Set of task resources
	 */
	function renderList(items) {

		if (items.length === 0) {
			renderEmptyList();
			return;
		}

		Longpress.unbind();

		var domList = dom.list[0];
		domList.innerHTML = '';

		items = sortTasks(items);

		items.forEach(function(task) {
			domList.appendChild(createNode(task));
		});

		for (var i = 0; i < 2; i++) {
			domList.appendChild(document.createElement('br'));
		}

		Task.view.toggleProgress(false);
		sortModeManager.isMyOrder() && bindSortable();
		EV.fire('tasks-rendered');
	}

	/**
	 * Renders empty list
	 * Is used when there are no tasks in list
	 */
	function renderEmptyList() {
		dom.list.html('<li><a draggable="false"><p style="text-align: center;">This list is empty</p></a></li>');
		EV.fire('tasks-rendered');
		Task.view.toggleProgress(false);
	}

	/**
	 * Sets list title in header
	 * @param {Object} [list] List resource
	 */
	function setListTitle(list) {
		var listTitle = (list && list.title) || labels.LBL_LOADING;
		dom.drawer.find('header h2').html(listTitle);
	}

	/**
	 * Fires when anything in the area of main drawer is clicked
	 */
	function onListClick() {
		FT.toggleSidebar();
	}

	/**
	 * Handles marking task completed
	 */
	function onToggleCompleted() {
		var listId = List.getLastActive().id,
			taskId = getNodeId($(this).parents('li').first()),
			pack = {},
			update_children = false;

		if (this.checked === true) {
			pack.status = 'completed';
			update_children = true;
		} else {
			pack.status = 'needsAction';
			pack.completed = null;
		}

		var params = {
			taskId: taskId,
			pack: pack,
			listId: listId,
			openList: false,
			forceUpdate: true
		};
		Task.updateTask(params, function () {
			if (!update_children) {
				FT.startSyncQueue();
				return;
			}
			Task.storage.get(listId, taskId, function (task) {

				iterateChildren(task.childrenIds);

				function iterateChildren(childrenIds) {
					var childId = childrenIds.shift(),
						params = {
							taskId: childId,
							pack: {
								status: 'completed'
							},
							listId: listId,
							openList: false
						};
					if (!childId) {
						FT.startSyncQueue();
						return;
					}
					Task.updateTask(params, function () {
						if (childrenIds.length > 0) {
							iterateChildren(childrenIds);
						} else {
							FT.startSyncQueue();
						}
					});
				}
			});
		});
	}

	/**
	 * Prepares new task form
	 */
	function onNewTask() {
		if (!FT.isOnline()) {
			utils.status.show('You are offline.\nUnfortunately, Fire Tasks is unable to create tasks in offline mode at the moment :(', 4000);
			return;
		}
		renderForm('CREATE', {});
	}

	/**
	 * Prepares task editing form
	 * @param {Event} ev
	 */
	function onEditTask(ev) {

		/* Edit mode doesn't need task editing */
		var el = ev.currentTarget,
			editMode = $(el).siblings('.danger').first(),
			taskId = $(el).parent('a')[0].dataset.id;
		if (editMode.is(':visible')) {
			FT.switchCheckbox(editMode.find('input[type="checkbox"]'));
			return;
		}

		Task.storage.get(null, taskId, onTaskLoaded);

		function onTaskLoaded(task) {
			try {
				var data = {
					id: taskId,
					title: task.title,
					completed: task.completed,
					notes: task.notes || ''
					//due_date: task.due,
				};

				renderForm('UPDATE', data);
			} catch (e) {
				console.error(e);
			}
		}
	}

	function onLongPress(ev) {
		var el = ev.currentTarget;
		Task.storage.get(null, el.parentElement.dataset.id, function(task) {
			EditMode.enable();
			EditMode.setNodeChecked(task.id, true);
		});
	}

	/**
	 * Prepares confirm dialog for task deletion
	 */
	function onDeleteTask() {
		var taskId = this.dataset.id,
			listId = List.getLastActive().id;

		var data = {
			h1: 'Delete Task',
			p: "This task will be deleted. Continue?",
			cancel: 'Cancel',
			ok: 'Delete',
			action: function () {
				hideForm();
				var params = {
					listId: listId,
					taskId: taskId,
					startImmediately: true
				};
				Task.deleteTask(params);
			}
		};
		FT.confirm(data);
	}

	/**
	 * Handles form submission
	 * Starts task create or update sequence
	 */
	function onFormSubmit() {

		var id = $(this).attr('data-id'),
			action = $(this).attr('data-action'),
			formData = getFormData();

		if (formData.completed) {
			formData.status = 'completed';
			delete formData.completed;
		} else {
			formData.status = 'needsAction';
			formData.completed = null;
		}

		var params = {
			taskId: id || null,
			pack: formData,
			listId: formData.listId,
			openList: true,
			forceUpdate: true,
			startImmediately: true
		};

		delete params.pack.listId;
		delete params.pack.due; // TODO: add due date

		hideForm();

		/* Skip if no task name was entered */
		if (formData.title != '') {
			if (action === 'CREATE') {
				Task.createTask(params);
			}
			if (action === 'UPDATE') {
				Task.updateTask(params);
			}
		}
	}

	/**
	 * Sorts tasks array
	 * @param {TaskCollection} items
	 * @returns {Array} Sorted array (original array if sorting mode equals 'my order')
	 */
	function sortTasks(items) {

		if (sortModeManager.isAlphabetical()) {
			return items.toPlainArray().sort(function (a, b) {
				var res = (a.title.toLowerCase() >= b.title.toLowerCase());
				return res ? 1 : -1;
			});
		} else if (sortModeManager.isDueDate()) {
			return items.toPlainArray().sort();
		} else {
			return items;
		}
	}

	/**
	 * Saves new sorting mode and initiates task list reload
	 * @param {String} mode
	 */
	function setSortMode(mode) {
		if (sortModeManager.get() === mode) {
			Logger.info('setSortMode(): passed sorting mode is already set');
			return;
		}
		sortModeManager.set(mode);
		Task.loadData();
	}

	/**
	 * Shows available task actions
	 * @param ev
	 */
	function showActionChooser(ev) {
		FT.stopAutoFetch();
		dom.actionChooser.removeClass('fade-out').addClass('fade-in');
	}

	/**
	 * Hides action chooser opened with {@link showActionChooser}
	 */
	function hideActionChooser() {
		FT.setAutoFetch();
		dom.actionChooser.removeClass('fade-in').addClass('fade-out');
	}

	/**
	 * Shows sort mode chooser
	 */
	function showSortModeChooser() {
		FT.stopAutoFetch();
		dom.sortModeChooser.removeClass('fade-out').addClass('fade-in');
	}

	/**
	 * Hides sort mode chooser opened with {@link showSortModeChooser}
	 */
	function hideSortModeChooser() {
		FT.stopAutoFetch();
		dom.sortModeChooser.removeClass('fade-in').addClass('fade-out');
	}

	/**
	 * Handles action chooser buttons clicks
	 * @param ev
	 */
	function onActionButtonClicked(ev) {
		switch (ev.target.id) {
			case dom.btnSortTasks[0].id:
				onSortTasks();
				break;
			case dom.btnShareTasks[0].id:
				onShareTasks();
				break;
		}
		ev.preventDefault();
		hideActionChooser();
	}

	/**
	 * Handles sort mode buttons clicks
	 * @param ev
	 */
	function onSortButtonClicked(ev) {
		switch (ev.target.id) {
			case dom.btnSortTasksMyOrder[0].id:
				setSortMode(sortModeManager.getSortModes().myOrder);
				break;
			case dom.btnSortTasksAlphabetical[0].id:
				setSortMode(sortModeManager.getSortModes().alphabetical);
				break;
			case dom.btnSortTasksDueDate[0].id:
				setSortMode(sortModeManager.getSortModes().dueDate);
				break;
		}
		ev.preventDefault();
		hideSortModeChooser();
	}

	/**
	 * Calls sort mode dialog
	 */
	function onSortTasks() {
		showSortModeChooser();
	}

	function onShareTasks() {

		Task.storage.get(null, null, function (tasks) {
			tasks = sortModeManager.isMyOrder() ? tasks : tasks.toPlainArray();
			var listTitle = List.getLastActive().title,
				text = listTitle + '\n' + tasks.toText(Settings.get('ignoreCompletedWhenSharing'));
			share(new Blob([text], {type: 'text/plain'}), listTitle + '.txt');
		}, true);

		function share(blob, name) {
			if (FT.isMozActivityAvailable) {
				new MozActivity({
					name: 'share',
					data: {
						number: 1,
						blobs: [blob],
						filenames: [name]
					}
				});
			} else {
				var url = window.URL.createObjectURL(blob);
				FT.confirm({
					h1: 'Download file',
					p: 'Use links below to initiate file download.<br/>\
						<a href="' + url + '" download="' + name + '">Download "' + name + '"</a><br/>\
						<a href="' + location.href + '" onclick="window.open(\'' + url + '\');">Alternative link</a>',
					ok: 'Done',
					recommend: true,
					hideCancel: true,
					action: function () {
						window.URL.revokeObjectURL(blob);
					}
				});
			}
		}
	}

	sortModeManager.set();
	setListeners();


	return {

		/**
		 * Toggles main progress indicator
		 * @param {Boolean} show
		 */
		toggleProgress: function (show) {
			dom.btnActions.prop('disabled', show);
			dom.btnNewTask.prop('disabled', show);
			if (show) {
				dom.progressBar.show();
			} else {
				dom.progressBar.hide();
			}
		},

		/**
		 * Indents task element
		 * @param {String} taskId
		 * @returns {Object} Data to be used for server request {@link Task.moveTask}
		 */
		indentItem: function (taskId) {
			var node = getNodeById(taskId),
				previousNode = node.prev('li'),
				childNodes = previousNode.find('ol').first().children('li'),
				childNodesLength = childNodes.length;

			if (previousNode.length === 0) {
				return null;
			}

			previousNode.find('ol').first().append(node);

			return {
				id: taskId,
				parentId: getNodeId(previousNode),
				previousId: getNodeId($(childNodes[childNodesLength - 1]))
			};
		},

		/**
		 * Unindents task element
		 * @param {String} taskId
		 * @param {Boolean} [touchNextSiblings] True to gather next nodes ids, used to move this nodes into unindented node
		 * @returns {*}
		 */
		unindentItem: function (taskId, touchNextSiblings) {
			var node = getNodeById(taskId),
				parentNode = node.parents('li').first(),
				nextNodes = node.nextAll('li'),
				targetNode = parentNode.parent('ol'),
				nextNodesIds = [];

			touchNextSiblings = touchNextSiblings || false;

			if (targetNode.length === 0) {
				return null;
			}

			if (touchNextSiblings && nextNodes.length > 0) {
				nextNodes.each(function (idx, nextNode) {
					node.find('ol').first().append($(nextNode));
					nextNodesIds.push(getNodeId($(nextNode)));
				});
			}

			parentNode.after(node);

			return {
				id: taskId,
				parentId: getNodeId(targetNode.parent('li')),
				previousId: getNodeId(parentNode),
				nextNodesIds: nextNodesIds
			};
		},

		/**
		 * Hides node
		 * @param {String} taskId
		 */
		hideNode: function (taskId) {
			getNodeById(taskId).find('a').first().hide();
			if (getNodeCount() === 0) {
				renderEmptyList();
			}
		},

		/**
		 * Returns task list DOM element
		 * For {@link EditMode}
		 * @returns {*}
		 */
		getListEl: function () {
			return dom.list;
		},

		/**
		 * Returns sortModeManager that can be useful for debugging
		 */
		getSortModeManager: function () {
			return sortModeManager;
		}
	}

}(jQuery));