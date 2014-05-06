/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Edit Mode
 * Handles operations made in so call 'Edit Mode'
 * Also handles representation operations
 */
window.EditMode = (function ($) {

	"use strict";

	var dom = {
			el: $('#edit-mode'),
			list: Task.view.getListEl(),
			btnEnable: $('#btn-edit-tasks'),
			btnDisable: $('#btn-edit-mode-close'),
			btnDelete: $('#btn-delete-tasks'),
			btnMove: $('#btn-move-tasks'),
			btnIndent: $('#btn-unindent-tasks'),
			btnUnindent: $('#btn-indent-tasks')
		},
		CLASS_SELECTED = 'selected',
		preventDisabling = false,
		enabled = false;


	function setListeners() {
		/* Activation */
		dom.btnEnable.on('click', EditMode.enable);
		dom.btnDisable.on('click', EditMode.disable);

		/* Checking in Edit Mode */
		dom.list.on('change', '.pack-checkbox.danger input[type="checkbox"]', onCheck);

		/* Actions */
		dom.btnDelete.on('click', onDelete);
		dom.btnMove.on('click', onMove);
		dom.btnIndent.on('click', onIndentUnindent);
		dom.btnUnindent.on('click', onIndentUnindent);
	}

	/**
	 * Handles tasks selecting
	 */
	function onCheck() {
		var checked = Task.view.getCheckedItems();
		toggleSelected($(this).parents('a').first());
		updateCheckedCounter(checked.length);
	}

	/**
	 * Toggles task selection state
	 * @param {jQuery} a Node
	 */
	function toggleSelected(a) {
		if (!a.hasClass(CLASS_SELECTED)) {
			a.addClass(CLASS_SELECTED);
		} else {
			a.removeClass(CLASS_SELECTED);
		}
	}

	/**
	 * Handles multiple deletion
	 */
	function onDelete() {
		var ids = Task.view.getCheckedItems(),
			listId = List.getLastActive().id;

		if (ids.length === 0) {
			showNoTasksSelectedMessage();
			return;
		}

		var data = {
			h1: 'Delete Tasks',
			p: ids.length + " selected tasks will be deleted. Continue?",
			cancel: 'Cancel',
			ok: 'Delete',
			action: function () {
				EditMode.disable();
				iterate(ids);
			}
		};

		App.confirm(data);

		function iterate(ids) {
			var id = ids.shift();
			var params = {
				listId: listId,
				taskId: id
			};
			Task.deleteTask(params, function () {
				if (ids.length > 0) {
					iterate(ids);
				} else {
					App.startSyncQueue();
				}
			});
		}
	}

	/**
	 * Handles multiple move to another list
	 */
	function onMove() {
		var tasksMoveForm = $('#tasks-move-to'),
			checkedIds = Task.view.getCheckedItems(),
			ids = [],
			listId = List.getLastActive().id;

		if (checkedIds.length === 0) {
			showNoTasksSelectedMessage();
			return;
		}

		buildMoveTasksDialog(bindListeners);

		function toggleListChooser(v) {
			if (v) {
				tasksMoveForm.removeClass().addClass('fade-in');
			} else {
				tasksMoveForm.removeClass().addClass('fade-out');
			}
		}

		/* Excludes children nodes if selected (they will be moved anyway) */
		function filterChildren(idsArray, callback) {
			var id = idsArray.shift();
			Task.storage.get(listId, id, function (task) {
				for (var i = 0; i < idsArray.length; i++) {
					if (task.childrenIds.indexOf(idsArray[i]) > -1) {
						idsArray.splice(i, 1);
						i--;
					}
				}
				ids.push(id);
				if (idsArray.length > 0) {
					filterChildren(idsArray, callback);
				} else {
					callback && callback();
				}
			});
		}

		/* Build target list chooser */
		function buildMoveTasksDialog(callback) {
			var tasksMoveMenu = tasksMoveForm.find('menu').first();
			tasksMoveMenu.html('');
			List.storage.get(null, function (lists) {
				lists.forEach(function (list) {
					if (list.id !== listId) {
						tasksMoveMenu.append('<button data-id="' + list.id + '" class="prevent-default">' + list.title + '</button>');
					}
				});
				tasksMoveMenu.append('<button class="prevent-default">Cancel</button>');	// Cancel button
				toggleListChooser(true);
				callback();
			});
		}

		/* Listens on list chooser */
		function bindListeners() {

			// TODO: bind on creation
			/* Target list chosen */
			tasksMoveForm.find('button[data-id]').off().on('click', function () {

				var targetListId = this.dataset.id;
				EditMode.disable();

				filterChildren(checkedIds, function () {
					iterate(ids.reverse()); // TODO: investigate why we need to reverse ids array
				});

				function iterate(ids) {
					var params = {
						listId: targetListId,
						taskId: ids.shift(),
						forceUpdate: true,
						openList: ids.length === 0,
						startImmediately: ids.length === 0
					};
					Task.updateTask(params, function () {
						if (ids.length > 0) {
							iterate(ids);
						}
					});
				}
			});

			/* Hide target list selector */
			tasksMoveForm.on('click', 'button', function () {
				toggleListChooser(false);
			});
		}
	}

	/**
	 * Handles multiple indent/unindent
	 */
	function onIndentUnindent() {
		var action = this.dataset.action.toLowerCase(),
			ids = Task.view.getCheckedItems(),
			listId = List.getLastActive().id;

		if (ids.length === 0) {
			showNoTasksSelectedMessage();
			return;
		}

		setButtonsDisabled(true);
		EditMode.preventDisabling(true);
		iterate(ids);

		function iterate(ids) {
			var id = ids.shift(),
				moveData = Task.view[action + 'Item'](id, true);

			if (action === 'unindent' && moveData && moveData.nextNodesIds.length > 0) {
				moveData.nextNodesIds.reverse();
				iterateNextNodes(moveData.nextNodesIds, moveData.id);
			} else {
				moveNode(moveData);
			}
		}

		function iterateNextNodes(nodeIds, parentId) {
			var nodeId = nodeIds.shift();
			Task.moveTask(listId, nodeId, parentId, null, false, function () {
				if (nodeIds.length > 0) {
					iterateNextNodes(nodeIds);
				} else {
					moveNode();
				}
			});
		}

		function moveNode(moveData) {
			if (!moveData) {
				goToNext();
				return;
			}

			Task.moveTask(listId, moveData.id, moveData.parentId, moveData.previousId, false, function () {
				goToNext();
			});

			function goToNext() {
				if (ids.length > 0) {
					iterate(ids);
				} else {
					App.startSyncQueue();
					EditMode.preventDisabling(false);
					setButtonsDisabled(false);
				}
			}
		}
	}

	/**
	 * Shows edit mode controls
	 */
	function showOverlay() {
		dom.el.removeClass().addClass('edit');
		toggleListView(true);
	}

	/**
	 * Hide controls
	 */
	function hideOverlay() {
		dom.el.removeClass('edit');
		toggleListView(false);
	}

	/**
	 * Handles task list representation in Edit Mode
	 * Updates list for work in Edit Mode
	 * @param {Boolean} p True to enable Edit Mode representation
	 */
	function toggleListView(p) {
		if (p) {
			// TODO: use JS
			dom.list.append('<li class="dummy"></li>');	// needed for scrolling to the last task of the list
			// TODO: animation (ex. sliding)
			dom.list.find('.danger').show();
			dom.list.find('.pack-checkbox:not(.danger)').hide();
			dom.list.addClass('edit-mode');
		} else {
			dom.list.find('.danger').hide().find('input[type="checkbox"]').prop('checked', false);
			dom.list.find('.dummy').remove();
			dom.list.find('.pack-checkbox:not(.danger)').show();
			dom.list.find('.' + CLASS_SELECTED).removeClass(CLASS_SELECTED);
			Task.view.getCheckedItems(); // TODO: replace with normal setter/emptier
			dom.list.removeClass('edit-mode');
		}
	}

	/**
	 * Updates checked tasks counter
	 * @param {Number} n
	 */
	function updateCheckedCounter(n) {
		dom.el.find('.selected_num').html(n.toString());
	}

	/**
	 * Shows 'No tasks selected' message
	 */
	function showNoTasksSelectedMessage() {
		utils.status.show('No tasks were selected', 1000);
	}

	/**
	 * Disables or enables Edit Mode's buttons
	 * @param {Boolean} disable
	 */
	function setButtonsDisabled(disable) {
		if (disable) {
			dom.btnIndent[0].disabled = true;
			dom.btnUnindent[0].disabled = true;
			dom.btnMove[0].disabled = true;
			dom.btnDelete[0].disabled = true;
		} else {
			dom.btnIndent[0].disabled = false;
			dom.btnUnindent[0].disabled = false;
			dom.btnMove[0].disabled = false;
			dom.btnDelete[0].disabled = false;
		}
	}


	return {

		init: function () {
			setListeners();
		},

		enable: function () {
			enabled = true;
			App.stopAutoFetch();
			Task.preventNextDelayedFetch();
			List.preventOnLoadRefresh();
			updateCheckedCounter(0);
			showOverlay();
		},

		disable: function () {
			if (preventDisabling || !enabled) {
				return;
			}
			enabled = false;
			App.setAutoFetch();
			hideOverlay();
		},

		/**
		 * Prevents Edit Mode of being disabled
		 * @param {Boolean} v
		 */
		preventDisabling: function (v) {
			preventDisabling = v;
		}
	}

}(jQuery));