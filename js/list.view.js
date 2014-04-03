/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * List view
 * Handles all lists representation operations
 *
 * @requires {@link List}
 */
if (window.List) window.List.view = (function($) {

	"use strict";

	var labels = {
			LBL_CREATE: 'Create',
			LBL_UPDATE: 'Rename'
		},
		dom = {
			progressBar: $('#progress-lists'),
			btnSync: $('#btn-sync-lists'),
			btnActions: $('#btn-list-actions'),
			actionChooser: $('#list-actions'),
			btnNewList: $('#btn-new-list'),
			btnRenameList: $('#btn-rename-list'),
			btnDeleteList: $('#btn-delete-list'),
			list: $('section[data-type="sidebar"]').find('nav ul'),
			form: $('#list-form'),
			btnBack: $('#btn-list-form-back'),
			btnOk: $('#btn-list-form-ok')
		};


	function setListeners() {
		EV.listen('list-selected', selectList);
		EV.listen('lists-loaded', renderList);
		EV.listen('list-renamed', updateNode);
		EV.listen('list-removed', removeNode);
		EV.listen('list-not-found', removeNode);

		/* Buttons */
		dom.btnSync.on('click', onSyncClick);
		dom.list.on('click', 'li.list-item a', openList);
		dom.btnNewList.on('click', onNewList); // will become separate button

		/* Action chooser */
		dom.btnActions.on('click', showActionChooser);
		dom.actionChooser.find('button').on('click', hideActionChooser);
		dom.btnRenameList.on('click', onRenameList);
		dom.btnDeleteList.on('click', onDeleteList);

		/* List form */
		dom.btnBack.on('click', hideForm);
		dom.btnOk.on('click', onFormSubmit);

		// TODO: experimental: long press
//		$('#lists').on('mousedown', 'li.list-item a', function() {
//			//this.dataset.mouseDownStart = +new Date();
//			App.longPressInterval = setInterval(function() {
//				clearInterval(App.longPressInterval);
//				$('#list-actions').removeClass().addClass('fade-in');
//			}, 400);
//		}).on('mouseup', 'li.list-item a', function() {
//			clearInterval(App.longPressInterval);
//			/*var now = +new Date(),
//			 than = this.dataset.mouseDownStart;
//
//			 now - than >= 400 && (function(el) {
//			 $('#list-actions').removeClass().addClass('fade-in');
//			 }(this));*/
//		});
	}

	/**
	 * Handles 'Sync now' button
	 */
	function onSyncClick() {
		App.stopAutoFetch();
		List.preventOnLoadRefresh();
		List.getList();
	}

	/**
	 * Prepares new list form
	 */
	function onNewList() {
		renderForm('CREATE', {});
	}

	/**
	 * Prepares updating form
	 */
	function onRenameList() {
		var data = {
			name: List.getLastActive().title
		};
		renderForm('UPDATE', data);
	}

	/**
	 * Prepares confirm dialog for list deletion
	 */
	function onDeleteList() {
		var list = List.getLastActive();
		if (list.title === 'Uncategorized') {
			utils.status.show('You cannot delete default list', 1500);
			return;
		}

		var data = {
			h1: 'Delete List',
			p: "Do you want to delete the list '" + list.title + "'? This cannot be undone.",
			cancel: 'Cancel',
			ok: 'Delete',
			action: function () {
				List.deleteList(list.id);
			}
		};
		App.confirm(data);
	}

	/**
	 * Prepares form for list creating/editing
	 * @param {String} action
	 * @param {Object} data
	 */
	function renderForm(action, data) {
		if (action === 'CREATE') {
			data.ok = labels.LBL_CREATE;
			data.h1 = 'Create Task List';
			data.name = data.name || '';
		}
		if (action === 'UPDATE') {
			data.ok = labels.LBL_UPDATE;
			data.h1 = 'Rename Task List';
		}

		dom.form.find('h1').html(data.h1);
		dom.form.find('#btn-list-form-ok').html(data.ok);
		dom.form.find('input[name="list_name"]').val(data.name);

		showForm();
	}


	/**
	 * Shows form for list creating/editing
	 */
	function showForm() {
		dom.form.removeClass().addClass('fade-in');
		/* TODO: make first input active */
		App.stopAutoFetch();
	}

	/**
	 * Hides form opened with {@link showForm}
	 */
	function hideForm() {
		dom.form.removeClass().addClass('fade-out');
		App.setAutoFetch();
	}

	/**
	 * Handles form submission
	 * Starts create or rename sequence
	 */
	function onFormSubmit() {
		var action = $(this).text(),
			input = dom.form.find('input[name="list_name"]'),
			value = input.val();

		hideForm();

		/* Skip if no list name was entered */
		if (value.trim() != '') {
			if (action === labels.LBL_CREATE) {
				List.createList(value);
			}
			if (action === labels.LBL_UPDATE) {
				List.renameList(value);
			}
		}
	}

	/**
	 * Creates HTML for given item
	 * @param {Object} list
	 * @returns {string}
	 */
	function getNodeHtml(list) {
		var selected = (list.selected) ? 'class="list-selected"' : '';
		return '<li class="list-item"><a ' + selected + ' data-id="' + list.id + '" href="#">' + list.title + '</a></li>'
	}

	/**
	 * Renders a list of Lists and append to DOM
	 * @param {Array} items
	 */
	function renderList(items) {

		dom.list.html('');

		var listItems = '';
		$.each(items, function (index, list) {
			listItems += getNodeHtml(list);
		});

		listItems += '<br /><br/><br /><br />';

		dom.list.append(listItems);
		List.view.toggleProgress(false);
		EV.fire('lists-rendered');
	}

	/**
	 * Is used for renaming nodes
	 * @param {String} title
	 * @returns {HTMLElement|null}
	 */
	function getPreviousAlphabetically(title) {
		var previousNode = null;
		dom.list.find('a').each(function (index, item) {
			if ($(item).text().toLowerCase() > title.toLowerCase()) {
				return false;
			} else {
				previousNode = item.parentNode;
				return true;
			}
		});
		return previousNode;
	}

	/**
	 * Updates node in DOM
	 * @param {Object} list List resource
	 */
	function updateNode(list) {
		try {
			if (List.getLastActive().id === list.id) {
				list.selected = true;
			}

			var oldNode = dom.list.find('a[data-id="' + list.id + '"]').parent('li')[0],
				newNode = $(getNodeHtml(list))[0],
				previousNode = getPreviousAlphabetically($(newNode).find('a').text());

			oldNode.parentNode.replaceChild(newNode, oldNode);
			if (previousNode == oldNode) {
				return;
			}
			if (previousNode) {
				newNode.parentNode.insertBefore(newNode, previousNode.nextSibling);
			} else {
				newNode.parentNode.insertBefore(newNode, newNode.parentNode.firstChild);
			}
		} catch (e) {
			Logger.log(e);
		}
	}

	/**
	 * Removes node from DOM
	 * @param listId
	 */
	function removeNode(listId) {
		$('.list-item').find('a[data-id="' + listId + '"]').slideUp(function () {
			$(this).remove();
		});
	}

	/**
	 * Selects node in DOM
	 * @param list List resource to be selected
	 */
	function selectList(list) {
		var domItem = $('section[data-type="sidebar"] a[data-id="' + list.id + '"]');
		$('section[data-type="sidebar"] .list-selected').removeClass('list-selected');
		domItem.addClass('list-selected');
	}

	/**
	 * Handles 'opening' a selected list
	 * Closes sidebar and loads list's tasks
	 */
	function openList() {
		var id = this.dataset.id;
		List.storage.get(id, function (list) {
			if (list) {
				location.hash = '';
				Task.setDelayedFetch();
				Task.loadData(list);
			}
		});
	}

	/**
	 * Shows available list actions
	 */
	function showActionChooser() {
		dom.actionChooser.removeClass().addClass('fade-in');
	}

	/**
	 * Hides action chooser opened with {@link showActionChooser}
	 */
	function hideActionChooser() {
		/* TODO: check if there are any lists loaded (case: canceled authentication) */
		dom.actionChooser.removeClass().addClass('fade-out');
	}

	setListeners();


	return {

		/**
		 * Toggles progress indicator in sidebar
		 * @param {Boolean} show
		 */
		toggleProgress: function (show) {

			$('#btn-sync-lists').prop('disabled', show);
			$('#btn-list-actions').prop('disabled', show);

			if (show) {
				dom.progressBar.show();
			} else {
				dom.progressBar.hide();
				App.setAutoFetch();
			}
		}
	};

}(jQuery));