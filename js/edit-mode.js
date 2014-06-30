/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Edit Mode
 * Handles operations made in so called 'Edit Mode'
 * Also handles layout
 */
window.EditMode = (function ($) {

	"use strict";

	var dom = {
			el: $('#edit-mode'),
			list: Task.view.getListEl(),
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
	 * @param {Element} [el]
	 * @param {Boolean} [checked] If not set, will be toggled
	 */
	function onCheck(el, checked) {
		el = el.currentTarget || el;
		var checkedIds = EditMode.getCheckedItems();
		if (checkedIds.length === 0) {
			EditMode.disable();
			return;
		}
		toggleSelected($(el).parents('a').first(), checked);
		updateCheckedCounter(checkedIds.length);
	}

	/**
	 * Toggles task selection state
	 * @param {jQuery} a Node
	 * @param {Boolean} [checked] If not set, will be toggled
	 */
	function toggleSelected(a, checked) {
		if (typeof checked === 'undefined') {
			a[0].classList.toggle(CLASS_SELECTED);
		} else if (checked === true) {
			a[0].classList.add(CLASS_SELECTED);
		} else {
			a[0].classList.remove(CLASS_SELECTED);
		}
	}

	/**
	 * Handles multiple deletion
	 */
	function onDelete() {
		var ids = EditMode.getCheckedItems(),
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

		FT.confirm(data);

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
					FT.startSyncQueue();
				}
			});
		}
	}

	/**
	 * Handles multiple move to another list
	 *
	 * Sequence:
	 * 	buildMoveTasksDialog() - generates target list chooser
	 * 	bindListeners() - binds click handlers to the list items
	 * 	filterChildren() - filters child nodes when target list gets selected, fills up the ids[] array
	 * 	every internal iterate() function triggers Task.updateTask() method with 'start immediately' parameter only on last selected item
	 */
	function onMove() {
		var tasksMoveForm = $('#tasks-move-to'),
			checkedIds = EditMode.getCheckedItems(),
			ids = [],
			listId = List.getLastActive().id;

		if (!FT.isOnline()) {
			utils.status.show('You are offline.\nUnfortunately, Fire Tasks is unable to move tasks in offline mode at the moment :(', 4000);
			return;
		}

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

				// First checking if target list exists
				List.getById(targetListId, function(list) {
					if (list) {
						EditMode.disable();
						filterChildren(checkedIds, function () {
							iterate(ids.reverse()); // TODO: investigate why we need to reverse ids array
						});
					} else {
						FT.confirm({
							h1: 'Target list not found',
							p: 'Target list seems deleted. We need to resynchronize data to keep data consistent.',
							ok: 'Resynchronize',
							recommend: true,
							hideCancel: true,
							action: function () {
								EditMode.disable();
								FT.loadAll();
							}
						});
					}
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
			ids = EditMode.getCheckedItems(),
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
					EditMode.preventDisabling(false);
					setButtonsDisabled(false);
					FT.startSyncQueue();
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
	 * @param {Boolean} enable True to enable Edit Mode representation
	 */
	function toggleListView(enable) {
		if (enable) {
			// TODO: animation (ex. sliding)
			dom.list.find('.danger').show();
			dom.list.find('.pack-checkbox:not(.danger)').hide();
			dom.list.addClass('edit-mode');
		} else {
			dom.list.find('.danger').hide().find('input[type="checkbox"]').prop('checked', false);
			dom.list.find('.pack-checkbox:not(.danger)').show();
			dom.list.find('.' + CLASS_SELECTED).removeClass(CLASS_SELECTED);
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

		enable: function (resetCounter) {
			if (typeof resetCounter === 'undefined') resetCounter = true;
			enabled = true;
			FT.stopAutoFetch();
			FT.preventStartupSync();
			EditMode.preventDisabling(false);
			setButtonsDisabled(false);
			resetCounter && updateCheckedCounter(0);
			showOverlay();
		},

		disable: function () {
			if (preventDisabling || !enabled) {
				return;
			}
			enabled = false;
			FT.setAutoFetch();
			hideOverlay();
		},

		isEnabled: function () {
			return enabled;
		},

		/**
		 * Prevents Edit Mode of being disabled
		 * @param {Boolean} v
		 */
		preventDisabling: function (v) {
			preventDisabling = v;
		},

		/**
		 * Counts checked nodes in Edit Mode
		 * @returns {Array} Ids array
		 */
		getCheckedItems: function () {
			var checked = [];
			dom.list.find('.pack-checkbox.danger input[type="checkbox"]:checked').each(function (index, item) {
				checked.push($(item).parents('a').first().attr('data-id'));
			});
			return checked;
		},

		/**
		 * Marks node selected
		 * @param {String} taskId
		 * @param {Boolean} checked
		 */
		setNodeChecked: function (taskId, checked) {
			var node = dom.list[0].querySelector('a[data-id="'+ taskId +'"]'),
				el = node && node.querySelector('.pack-checkbox.danger input[type="checkbox"]');
			if (!el) {
				return;
			}
			el.checked = Boolean(checked);
			onCheck(el);
		}
	}

}(jQuery));