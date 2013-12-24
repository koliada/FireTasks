
var App = {

	install: function(isFFOS) {

		// Turn it to false to always install 'normal' package
		var supportHIDPI = false;
		//var isFFOS = ("mozApps" in navigator && navigator.userAgent.search("Mobile") != -1);

		if ( isFFOS ) {
			var manifestUrl = 'http://koliada.github.io/FireTasks/manifest.webapp';
			var req = navigator.mozApps.install(manifestUrl);
			req.onsuccess = function() {
				//alert(this.result.origin);
				//alert('Fire Tasks installed. Check your home screen!');
			};
			req.onerror = function() {
				alert('Installation failed: ' + this.error.name);
			};

		} else {
			window.location.href = "app.html"
		}
	},

	updateVersion: function() {
		/* http://www.html5rocks.com/en/tutorials/appcache/beginner/ */
		window.applicationCache.addEventListener('updateready', function(e) {
			if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
				// Browser downloaded a new app cache.
				if (confirm('A new version of Fire Tasks was installed. Apply update now?')) {
					window.location.reload();
				}
			} else {
				// Manifest didn't changed. Nothing new to server.
			}
		}, false);
	},

	/* JSON data from Google Cloud Console */
	options: {
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://accounts.google.com/o/oauth2/token",
		"client_email": "478318582842-6rkd630981kdibb868512f5cll4eg1tj@developer.gserviceaccount.com",
		"redirect_uris": ["http://koliada.github.io/FireTasks/app.html"],
		"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/478318582842-6rkd630981kdibb868512f5cll4eg1tj@developer.gserviceaccount.com",
		"client_id": "478318582842-6rkd630981kdibb868512f5cll4eg1tj.apps.googleusercontent.com",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
	},

	init: function() {

		this.updateVersion();

		this.options.scope = 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email';
		//this.options.redirect_uri = this.options.redirect_uris[0];
		this.options.redirect_uri = document.location.protocol + '//' + document.location.host + document.location.pathname;

		this.setListeners();
		Settings.setDefaults();

		/* Load lists */
		Lists.getList();
	},

	setListeners: function() {


		/* == GENERAL == */

		/* Clear Input Button */
		$(document).on('click', 'button[type="reset"]', function(ev) {
			ev.preventDefault();
			$(this).siblings('input[type="text"]').first().val('');
		});

		/* Full-width Checkbox Switching */
		$('section[data-type="list"], form').find('a').click(function(ev) {
			ev.preventDefault();
			var input = $(this).find('input[type="checkbox"]');
			var checked = input.prop('checked');
			input.prop('checked', (checked === false));
			input.change();	// to fire onchange listeners
		});



		/* == DRAWER == */

		/* Open Settings */
		$('#btn-settings').click(function () {
			Settings.initSettingsPage();
			$('#settings').removeClass().addClass('fade-in');
		});
		$('#btn-settings-back').click(function () {
			$('#settings').removeClass().addClass('fade-out');
			Settings.applyChanges();
		});


		/* Sync/Refresh */
		$('#btn-sync-lists').click(function() {
			Lists.getList();
		});


		/* Open List */
		$('#lists').on('click', 'li.list-item a', function() {
			var id = $(this).attr('data-id');
			var list = Lists.get(id);

			if( list != false ) {
				Tasks.getList(list);
			}
		});


		/* List Actions */
		$('#btn-list-actions').click(function() {
			$('#list-actions').removeClass().addClass('fade-in');
		});
		$('#list-actions').find('button').click(function () {
			$('#list-actions').removeClass().addClass('fade-out');
			/* TODO: check if there are any lists loaded (case: canceled authentication) */
		});



		/* == LISTS == */

		/* = Create/Rename List = */
		var list_form = $('#list-form');

		/* New List */
		$('#btn-new-list').click(function() {

			var data = {
				h1: 'Create Task List',
				ok: Lists.LBL_CREATE,
				name: ''
			};

			Lists.prepareListForm(data);
			list_form.removeClass().addClass('fade-in');
			/* TODO: make first input active */
			//list_form.find('[name="list_name"]').focus();

		});
		/* Rename List */
		$('#btn-rename-list').click(function() {

			var list = Lists.getLastList();

			var data = {
				h1: 'Rename Task List',
				ok: Lists.LBL_UPDATE,
				name: list.title
			};

			Lists.prepareListForm(data);
			list_form.removeClass().addClass('fade-in').find('[name="list_name"]').focus();

		});
		/* Close List Form */
		$('#btn-list-form-back, #btn-list-form-ok').click(function () {

			list_form.removeClass().addClass('fade-out');

		});
		/* Confirm List Form */
		$('#btn-list-form-ok').click(function () {

			var action = $(this).text();
			var input = list_form.find('input[name="list_name"]');
			var value = input.val();

			/* Skip if no list name was entered */
			if( value.trim() != '' ) {
				if( action === Lists.LBL_CREATE ) {
					Lists.createList(value);
				}
				if( action === Lists.LBL_UPDATE ) {
					Lists.renameList(value);
				}
			}

			input.val('');
		});


		/* Delete List */
		$('#btn-delete-list').click(function() {

			var list = Lists.getLastList();

			if( list.title === 'Uncategorized' ) {
				alert('You cannot delete your default list');
				return;
			}

			var data = {
				h1: 'Delete List',
				p: "Do you want to delete the list '"+ list.title +"'? This cannot be undone.",
				cancel: 'Cancel',
				ok: 'Delete',
				action: function() {
					Lists.deleteList(list.id);
				}
			};

			App.confirm(data);
		});



		/* == TASKS == */
		var tasks_ul = $('#tasks');

		/* Mark Task Completed */
		tasks_ul.on('change', 'li.task-item input[type="checkbox"]', function(ev) {

			ev.stopPropagation(); // TODO: remove?

			var list = Lists.getLastList();
			var id = $(this).parents('a').first().attr('data-id');
			var pack = {};
			var complete_children = false;

			if( $(this).prop('checked') === true ) {
				pack.status = 'completed';
				complete_children = true;
			} else {
				pack.status = 'needsAction';
				pack.completed = null;
			}

			Tasks.updateTask( list.id, id, pack, complete_children );

			/* Gathering children IDs */
			var children = [];
			if( complete_children === true ) {
				children = Tasks.getChildrenIDs(id).split(',');
				children.pop();
			}

			/* Updating children */
			$.each(children, function(index, child_id) {

				if( child_id.trim() == '' ) {
					return;
				}

				var pack = {
					status: 'completed'
				};
				Tasks.updateTask( list.id, child_id, pack );
			});
		});


		/* Edit Mode */
		$('#btn-edit-tasks').click(function() {
			App.showInDevelopmentTooltip();
		});


		/* = Create / Edit Task Form = */
		var task_form = $('#task-form');

		/* New Task */
		$('#btn-new-task').click(function() {

			var data = {
				h1: 'Create Task',
				ok: Tasks.LBL_CREATE,
				title: '',
				completed: false,
				note: '',
				due_date: '',
				task_list: Lists.getLastList().id
			};

			Tasks.prepareTaskForm(data);
			task_form.removeClass().addClass('fade-in');
			/* TODO: make first input active */
		});
		/* Edit Task */
		tasks_ul.on('click', 'a div.clickable', function(ev) {

			ev.preventDefault();

			var id = $(this).parent('a').attr('data-id');
			var task = Tasks.getTaskObject(id);
			var completed = ( $(this).parents('li.task-item').first().hasClass('completed') );

			var data = {
				id: id,
				h1: 'Edit Task',
				ok: Tasks.LBL_UPDATE,
				title: task.title,
				completed: completed,
				notes: task.notes,
				due_date: task.due,
				task_list: Lists.getLastList().id
			};

			Tasks.prepareTaskForm(data);
			task_form.removeClass().addClass('fade-in');
		});
		/* Close Task Form */
		$('#btn-task-form-back, #btn-task-form-ok').click(function() {

			task_form.removeClass().addClass('fade-out');

		});
		/* Confirm Task Form */
		$('#btn-task-form-ok').click(function() {

			var id = $(this).attr('data-id');
			var action = $(this).text();
			//var notes_html = task_form.find('textarea[name="task_notes"]').html().trim();

			/* TODO: add due date */
			var pack = {
				title: task_form.find('input[name="task_name"]').val().trim(),
				notes: task_form.find('textarea[name="task_notes"]').val().trim()
			};

			if( task_form.find('input[name="task_completed"]').prop('checked') === true ) {
				pack.status = 'completed';
			} else if( action === Tasks.LBL_UPDATE ) {
				pack.status = 'needsAction';
				pack.completed = null;
			}

			var list_id = task_form.find('select[name="task_list"]').val();

			/* Skip if no task name was entered */
			if( pack.name != '' ) {
				if( action === Tasks.LBL_CREATE ) {
					Tasks.createTask(list_id, pack);
				}
				if( action === Tasks.LBL_UPDATE ) {
					Tasks.updateTask(list_id, id, pack, true);
				}
			}
		});

		/* Delete Task */
		$('#btn-task-form-delete').click(function() {

			var id = $(this).attr('data-id');
			var list_id = Lists.getLastList().id;

			var data = {
				h1: 'Delete Task',
				p: "This task will be deleted. Continue?",
				cancel: 'Cancel',
				ok: 'Delete',
				action: function() {
					task_form.removeClass().addClass('fade-out');
					Tasks.deleteTask(list_id, id);
				}
			};

			App.confirm(data);
		});

		/* TODO: remove */
		task_form.find('[name="task_due_date"]').parents('label').first().click(function(ev) {
			ev.preventDefault();
			App.showInDevelopmentTooltip();
		});



		/* == SETTINGS == */

		/* Tree View (Experimental) */
		$('#settings-tree-view').change(function() {
			Settings.save('tree_view', $(this).prop('checked'));
		});


		/* Log Out */
		$('#settings-logout').on('click', function(ev) {
			ev.preventDefault();

			var data = {
				h1: 'Log Out',
				p: 'Revoke access given to a Fire Tasks?',
				cancel: 'Cancel',
				ok: 'Sign Out',
				action: function() {
					Auth.revokeToken();
				}
			};

			App.confirm(data);
		});


		/* Open Donate Screen */
		$('#settings-donate').click(function(ev) {
			ev.preventDefault();
			App.showInDevelopmentTooltip();
			//$('#donate').removeClass().addClass('fade-in');
		});
		$('#btn-donate-back').click(function (ev) {
			ev.preventDefault();
			$('#donate').removeClass().addClass('fade-out');
		});


		/* Open About Screen */
		$('#settings-about').click(function(ev) {
			ev.preventDefault();
			$('#about').removeClass().addClass('fade-in');
		});
		$('#btn-about-back').click(function (ev) {
			ev.preventDefault();
			$('#about').removeClass().addClass('fade-out');
		});


		/*GO2.window.onbeforeunload = function() {
		 console.log('pass');
		 GO2._handleMessage(false);
		 };*/
	},

	confirm: function(data) {

		var confirm = $('#confirm');
		confirm.find('h1').html(data.h1);
		confirm.find('p').html(data.p);
		confirm.find('#btn-confirm-cancel').html(data.cancel);
		confirm.find('#btn-confirm-ok').html(data.ok);

		confirm.removeClass().addClass('fade-in');

		/* Listeners */
		confirm.on('click', '#btn-confirm-cancel', function () {
			confirm.removeClass().addClass('fade-out');
		}).on('click', '#btn-confirm-ok', function () {
			confirm.removeClass().addClass('fade-out');
			data.action();
		});
	},

	showInDevelopmentTooltip: function(timeout) {
		var timeout = timeout || 1000;
		utils.status.show('This feature is in development', timeout);
	}
};


$(function() {

	App.init();
});