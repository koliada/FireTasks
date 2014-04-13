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
			actionChooser: $('#list-actions'),
			btnNewList: $('#btn-new-list'),
			btnRenameList: $('#btn-rename-list'),
			btnDeleteList: $('#btn-delete-list'),
			list: $('section[data-type="sidebar"]').find('nav ul'),
			form: $('#list-form'),
			btnBack: $('#btn-list-form-back'),
			btnOk: $('#btn-list-form-ok')
		},
		actionChooserList = {};


	function setListeners() {
		EV.listen('list-selected', selectNode);
		EV.listen('lists-loaded', renderList);
		EV.listen('list-renamed', updateNode);
		EV.listen('list-removed', removeNode);
		EV.listen('list-not-found', removeNode);

		/* Buttons */
		dom.btnSync.on('click', onSyncClick);
		dom.btnNewList.on('click', onNewList);

		/* Action chooser */
		// TODO: event delegation
		var buttons = dom.actionChooser[0].querySelectorAll('button');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].addEventListener('click', onButtonClicked);
		}

		/* List form */
		dom.btnBack.on('click', hideForm);
		dom.btnOk.on('click', onFormSubmit);
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
			id: actionChooserList.id,
			name: actionChooserList.title
		};
		renderForm('UPDATE', data);
	}

	/**
	 * Prepares confirm dialog for list deletion
	 */
	function onDeleteList() {
		var list = actionChooserList;
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
		dom.form.find('#btn-list-form-ok').html(data.ok)[0].dataset.id = data.id;
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
			title = input.val(),
			id = this.dataset.id;

		hideForm();

		/* Skip if no list name was entered */
		if (title.trim() != '') {
			if (action === labels.LBL_CREATE) {
				List.createList(title);
			}
			if (action === labels.LBL_UPDATE && actionChooserList.title != title) {
				List.renameList(id, title);
			}
		}
	}

	/**
	 * Creates HTML for given item
	 * @param {Object} list
	 * @returns {Element}
	 */
	function createNode(list) {
		var a = document.createElement('a'),
			li = document.createElement('li');
		a.dataset.id = list.id;
		a.classList.add('prevent-default');
		a.setAttribute('draggable', 'false');
		a.setAttribute('oncontextmenu', 'return(false);');
		a.innerHTML = list.title;
		if (list.selected) {
			a.classList.add('list-selected');
		}
		Longpress.bindLongPressHandler(a, 400, showActionChooser, openList/*, bindActionChooserButtonsClick, unbindActionChooserButtonsClick*/);
		li.classList.add('list-item');
		li.appendChild(a);
		return li;
	}

	/**
	 * Renders a list of Lists and append to DOM
	 * @param {Array} items
	 */
	function renderList(items) {

		var domList = dom.list[0];
		domList.innerHTML = '';

		items.forEach(function(list) {
			domList.appendChild(createNode(list)); // rename
		});

		for (var i = 0; i < 4; i++) {
			domList.appendChild(document.createElement('br'));
		}

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
				newNode = createNode(list),
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
	function selectNode(list) {
		var domItem = $('section[data-type="sidebar"] a[data-id="' + list.id + '"]');
		$('section[data-type="sidebar"] .list-selected').removeClass('list-selected');
		domItem.addClass('list-selected');
	}

	/**
	 * Handles 'opening' a selected list
	 * Closes sidebar and loads list's tasks
	 */
	function openList(ev) {
		var id = ev.target.dataset.id;
		List.storage.get(id, function (list) {
			if (list) {
				Task.setDelayedFetch();
				Task.loadData(list);
				App.toggleSidebar();
			}
		});
	}

	/**
	 * Shows available list actions
	 * @param ev
	 */
	function showActionChooser(ev) {
		var el = ev.target;
		List.storage.get(el.dataset.id, function (list) {
			actionChooserList = list;
			dom.actionChooser.find('header')[0].innerHTML = list.title;
			dom.btnDeleteList[0].disabled = list.title === 'Uncategorized';
			dom.actionChooser.removeClass().addClass('fade-in');
		});
	}

	/**
	 * Hides action chooser opened with {@link showActionChooser}
	 */
	function hideActionChooser() {
		dom.actionChooser.removeClass().addClass('fade-out');
	}

	/**
	 * Handles action chooser buttons clicks
	 * @param ev
	 */
	function onButtonClicked(ev) {
		switch (ev.target.id) {
			case dom.btnRenameList[0].id:
				onRenameList(ev);
				break;
			case dom.btnDeleteList[0].id:
				onDeleteList();
				break;
		}
		ev.preventDefault();
		hideActionChooser();
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
		},

		getActionChooserList: function () {
			return actionChooserList;
		},

		/**
		 * Returns lists list DOM element
		 * @returns {Element}
		 */
		getListEl: function () {
			return dom.list;
		}
	};

}(jQuery));