
var App = {

	tasks_list_el: $('#tasks').find('ol').first(),

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

		/**
		 * @reference http://www.html5rocks.com/en/tutorials/appcache/beginner/
		 */
		window.applicationCache.addEventListener('updateready', function(e) {
			if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {

				Storage.save({ whats_new_shown: false });

				// Browser downloaded a new app cache.
				if (confirm('A new version of Fire Tasks was downloaded. Apply update now?')) {
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

		var whats_new_shown = Storage.get('whats_new_shown');
		if( typeof whats_new_shown === 'undefined' || whats_new_shown === 'false' ) {
			$.get('WHATSNEW', function(whats_new) {
				alert(whats_new);
				Storage.save({ whats_new_shown: true });
			});
		}

		this.options.scope = 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email';
		//this.options.redirect_uri = this.options.redirect_uris[0];
		this.options.redirect_uri = document.location.protocol + '//' + document.location.host + document.location.pathname;

		this.setListeners();
		Settings.setDefaults();
		Settings.initSettingsPage();

		/* Load lists */
		Lists.getList();
	},

	setListeners: function() {


		/* == GENERAL == */ {

			/* Clear Input Button */
			$(document).on('click', 'button[type="reset"]', function(ev) {
				ev.preventDefault();
				$(this).siblings('input[type="text"]').first().val('');
			});

			/* Full-width Checkbox Switching */
			$('section[data-type="list"], form').find('a').click(function(ev) {
				ev.preventDefault();
				var input = $(this).find('input[type="checkbox"]');

				App.switchCheckbox(input);
			});
		}


		/* == SIDEBAR == */ {

			$('section[data-type="sidebar"]').click(function() {
				App.editMode.disable();
			});

			/* Open Settings */
			$('#btn-settings').click(function () {
				Settings.initSettingsPage();
				$('#settings').removeClass().addClass('fade-in');
			});
			$('#btn-settings-back').click(function () {
				$('#settings').removeClass().addClass('fade-out');
				Settings.applyChanges();
			});

			/* Sync/Refresh All */
			$('#btn-sync-lists').click(function() {
				Lists.getList();
			});

			$('#btn-sync-tasks').click(function() {
				Tasks.getList();
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
		}


		/* == LISTS == */ {

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
		}


		/* == TASKS == */ {

			/* Mark Task Completed */
			App.tasks_list_el.on('change', '.pack-checkbox:not(.danger) input[type="checkbox"]', function(ev) {

				ev.stopPropagation(); // TODO: remove?

				var list = Lists.getLastList();
				var id = $(this).parents('a').first().attr('data-id');
				var pack = {};
				var update_children = false;

				if( $(this).prop('checked') === true ) {
					pack.status = 'completed';
					update_children = true;
				} else {
					pack.status = 'needsAction';
					pack.completed = null;
				}

				/* Gathering children IDs */
				var children = [];
				if( update_children ) {
					children = Tasks.getChildrenIDs(id);
				}

				App.toggleTasksProgress(true);

				/* Updating queue */
				var parent_updated = $.Deferred(),
					children_updated = $.Deferred();

				Tasks.updateTask(list.id, id, pack, update_children, function() {
					parent_updated.resolve();
				});

				/* Updating children */
				if(children.length > 0) {
					var children_updated_num = 0;
					$.each(children, function(index, child_id) {

						if( child_id.trim() == '' ) { // Just formality
							return;
						}

						var pack = {
							status: 'completed'
						};
						Tasks.updateTask( list.id, child_id, pack, false, function() {
							children_updated_num++;
							if(children_updated_num === children.length)
								children_updated.resolve();
						});
					});
				} else {
					children_updated.resolve();
				}

				/* Hide progress bar when both deferred objects done */
				$.when(parent_updated, children_updated).always(function() {
					App.toggleTasksProgress(false);
				});
			});


			/* = Create / Edit Task Form = */ {
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
				App.tasks_list_el.on('click', 'a div.clickable', function(ev) {

					/* Edit mode doesn't need task editing */
					var edit_mode = $(this).siblings('.danger').first();
					if( edit_mode.is(':visible') ) {
						App.switchCheckbox( edit_mode.find('input[type="checkbox"]') );
						return;
					}

					ev.preventDefault();

					var id = $(this).parent('a').attr('data-id');
					/* TODO: restore when Task object will be updated */
					//var task = Tasks.getTaskObject(id);
					var task = App.tasks_list_el.find('a[data-id="'+ id +'"]').first();
					var completed = ( $(this).parents('li.task-item').first().hasClass('completed') );

					var data = {
						id: id,
						h1: 'Edit Task',
						ok: Tasks.LBL_UPDATE,
						//title: task.title,
						title: task.find('.item-title').text(),
						completed: completed,
						//notes: task.notes,
						notes: task.find('.item-notes').text(),
						//due_date: task.due,
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
						App.toggleTasksProgress(true);
						if( action === Tasks.LBL_CREATE ) {
							Tasks.createTask(list_id, pack, true, function() {
								//App.toggleTasksProgress(false);
							});
						}
						if( action === Tasks.LBL_UPDATE ) {
							Tasks.updateTask(list_id, id, pack, true, function() {
									App.toggleTasksProgress(false);
							});
						}
					}
				});
			}


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
						App.toggleTasksProgress(true);
						Tasks.deleteTask(list_id, id, function() {
							/* TODO: Add some animation and other magic to exclude reloading */
							//App.tasks_list_el.find('a[data-id="'+ id +'"]').remove(); // hides only current task, leaving its children
							Tasks.getList(); // reload list
						});
					}
				};

				App.confirm(data);
			});


			/* TODO: remove */
			task_form.find('[name="task_due_date"]').parents('label').first().click(function(ev) {
				ev.preventDefault();
				App.showInDevelopmentTooltip();
			});
		}


		/* == EDIT MODE == */ {

			/* Edit Mode Activation */
			$('#btn-edit-tasks').click(function() {
				App.editMode.enable();
			});
			$('#btn-edit-mode-close').click(function() {
				App.editMode.disable();
			});

			/* Checking Tasks */
			App.tasks_list_el.on('change', '.pack-checkbox.danger input[type="checkbox"]', function() {
				App.editMode.toggleSelected($(this));
				var checked = Tasks.getCheckedItems();
				App.editMode.updateCheckedCounter(checked.length);
			});

			/* Delete Tasks */
			$('#btn-delete-tasks').click(function() {

				var ids = Tasks.getCheckedItems();

				if( ids.length === 0 ) {
					App.editMode.showNoTasksSelectedMessage();
					return;
				}

				var list_id = Lists.getLastList().id;

				var data = {
					h1: 'Delete Tasks',
					p: ids.length + " selected tasks will be deleted. Continue?",
					cancel: 'Cancel',
					ok: 'Delete',
					action: function() {

						/* Disable Edit Mode */
						App.editMode.disable();

						App.toggleTasksProgress(true);

						/*
						 Deleting one by one with complete refreshes.
						 See Tasks.deleteTask for reference.
						 */
						/* TODO: maybe move deferred to method? */
						var dfd = $.Deferred(),
							promise = dfd.promise();

						dfd.resolve();

						var time_start = new Date().getTime() / 1000;

						$.each(ids, function(index, id) {

							promise = promise.then(function() {
								return $.Deferred(function(d) {

									Tasks.deleteTask(list_id, id, function(){
										/* TODO: make deletion more proper with updating Tasks.tasks object */
										/* Update DOM so that next iteration could base on deleted nodes */
										//App.tasks_list_el.find('a[data-id="'+ id +'"]').remove();
										Tasks.getList(Lists.getLastList(), function() {
											d.resolve();
										}); // reload list (very, very wrong)
									});

								});
							});
						});

						promise.always(function() {
							var time_end = new Date().getTime() / 1000;
							//console.log('DONE ALL', ' ' + time_end - time_start + ' s');
							//Tasks.getList(); // reload list (mainly to refresh moved children)
							App.toggleTasksProgress(false);
						});
					}
				};

				App.confirm(data);
			});

			/* Move Tasks */
			var tasks_move_form = $('#tasks-move-to');
			$('#btn-move-tasks').click(function() {

				var ids = Tasks.getCheckedItems();

				if( ids.length === 0 ) {
					App.editMode.showNoTasksSelectedMessage();
					return;
				}

				var cur_list_id = Lists.getLastList().id;

				/* Build target list chooser */
				var tasks_move_menu = tasks_move_form.find('menu').first();
				tasks_move_menu.html('');
				$.each(Lists.lists_sorted, function(key, list) {
					if( list.id !== cur_list_id )
						tasks_move_menu.append('<button data-id="'+ list.id +'">'+ list.title +'</button>');
				});
				tasks_move_menu.append('<button>Cancel</button>');	// Cancel button
				$('#tasks-move-to').removeClass().addClass('fade-in');

				// TODO: bind on creation
				/* Target list chosen */
				$('button[data-id]').click(function() {

					/* TODO: maybe reload list before any actions? */

					App.editMode.disable();

					var target_list_id = $(this).attr('data-id');

					App.toggleTasksProgress(true);

					/* Gathering and filtering IDs */
					var IDs_to_move = [];
                    var ids_length = ids.length; // caching for performance
					for( var i = 0; i < ids_length; i++ ) {
						IDs_to_move.push(ids[i]);
						var children = Tasks.getChildrenIDs(ids[i]);
                        var children_length = children.length;
						for( var c = 0; c < children_length; c++ ) {
							IDs_to_move.push(children[c]);
						}
					}

					var IDs_filtered = [];
                    var IDs_to_move_length = IDs_to_move.length;
					for( var f = 0; f < IDs_to_move_length; f++ ) {
						if( IDs_filtered.indexOf(IDs_to_move[f]) === -1 )
							IDs_filtered.push(IDs_to_move[f]);
					}

					/* Getting objects for filtered IDs */
					var IDs_objects = [];
                    var IDs_filtered_length = IDs_filtered.length;
					for( var o = 0; o < IDs_filtered_length; o++ ) {
						IDs_objects.push(Tasks.getTaskObject(IDs_filtered[o]));
					}

					//console.log('ids', ids, ids.length);
					//console.log('IDs_to_move', IDs_to_move, IDs_to_move.length);
					//console.log('IDs_filtered', IDs_filtered, IDs_filtered.length);

					/* Moving tasks one by one */
					var dfd = $.Deferred(),
						promise = dfd.promise();

					dfd.resolve();

					var new_IDs = []; // old_ID : new_ID
					$.each(IDs_objects, function(index, task) {

						promise = promise.then(function() {
							return $.Deferred(function(d) {

								/* TODO: First create, then delete. Otherwise, data loss may occur. */
								Tasks.deleteTask(cur_list_id, task.id, function(){

									/* Getting parent ID */
									var parent_id = Tasks.getParentIdFromDOM(task.id);
									if( IDs_filtered.indexOf(parent_id) === -1 ) {
										parent_id = null;
									} else {
										if( (parent_id in new_IDs) )
											parent_id = new_IDs[parent_id]
									}

									/* Getting previous ID */
									var previous_id = Tasks.getPreviousIdFromDOM(task.id);
									if( IDs_filtered.indexOf(previous_id) === -1 ) {
										previous_id = null;
									} else {
										if( (previous_id in new_IDs) )
											previous_id = new_IDs[previous_id]
									}

									var task_id = task.id;

									delete task.children;
									delete task.id;
									delete task.parent;

									Tasks.createTask(target_list_id, task, false, function(res) {
										new_IDs[task_id] = res.id;
										d.resolve(res.id);
									}, parent_id, previous_id); // not very cool to add that params after the callback
								}, false); // move children set to false

							});
						});
					});

					promise.always(function() {
						//console.log('MOVE: DONE ALL');
						Tasks.getList(Lists.get(target_list_id));
					});
				});

				/* Hide target list selector */
				tasks_move_form.on('click', 'button', function () {
					$('#tasks-move-to').removeClass().addClass('fade-out');
				});
			});

			$('#btn-unindent-tasks, #btn-indent-tasks').click(function() {

				var action = $(this).attr('data-action').toUpperCase();
				var ids = Tasks.getCheckedItems();

				if( ids.length === 0 ) {
					App.editMode.showNoTasksSelectedMessage();
					return;
				}

				var cur_list_id = Lists.getLastList().id;

				var buttons = App.editMode.el.find('div[role="toolbar"]').find('button');
				buttons.prop('disabled', true);

				var pack = {};
				$.each(ids, function(index, id) {
					pack[id] = {
						id: id,
						parent_id: Tasks.getParentIdFromDOM(id),
						previous_id: Tasks.getPreviousIdFromDOM(id)
					};
				});

				//console.log('pack', pack);

				App.toggleTasksProgress(true);

				/* Indenting tasks one by one */
				var dfd = $.Deferred(),
					promise = dfd.promise();

				dfd.resolve();

				var updated_num = 0;
				$.each(pack, function(index, task) {

					promise = promise.then(function() {
						return $.Deferred(function(d) {

							/* INDENT */
							if( action === 'INDENT' ) {

								/* If node has Previous and Previous is also being moved */
								if( task.previous_id !== null && (task.previous_id in pack) && pack[task.previous_id].previous_id !== null ) {

									//console.log(Tasks.getTaskObject(task.id).title, 'MOVE WITH PARENT');

									var parent_id = pack[task.previous_id].previous_id;
									while( true ) {
										if( ((parent_id in pack) && pack[parent_id].previous_id === null) || ! (parent_id in pack) )
											break;
										parent_id = Tasks.getPreviousIdFromDOM(parent_id);
									}

									var parent_children = Tasks.getChildrenIDs(task.previous_id);

									var previous_id = task.previous_id;
									if(parent_children.length > 0) {
										$.each(parent_children, function(i, child_id) {
											if( ((child_id in pack) && pack[child_id].previous_id === null) || ! (child_id in pack) ) {
												parent_id = task.previous_id;
												previous_id = child_id;
											}
										});
									}

									Tasks.moveTask(cur_list_id, task.id, parent_id, previous_id, function() {
										updated_num++;
										d.resolve();
									});

								/* If node has Previous but that Previous is not gonna be moved */
								} else if( task.previous_id !== null ) {

									var prev_children = Tasks.getTaskObject(task.previous_id).children;

									var previous_id = ( typeof prev_children[prev_children.length - 1] !== 'undefined' ) ? prev_children[prev_children.length - 1].id : null;
									$.each(prev_children, function(i, c) {
										if( (previous_id in pack) )
											previous_id = ( typeof prev_children[prev_children.length - 1 - i] !== 'undefined' ) ? prev_children[prev_children.length - 1 - i].id : null;
									});

									//console.log(Tasks.getTaskObject(task.id).title, 'JUST INDENT, previous_id: ', previous_id);

									Tasks.moveTask(cur_list_id, task.id, task.previous_id, previous_id, function() {
										updated_num++;
										d.resolve();
									});

								/* If node has no Previous */
								} else {
									//console.log(Tasks.getTaskObject(task.id).title, 'SKIP');
									d.resolve();
								}
							}

							/* UNINDENT */
							else if( action === 'UNINDENT' ) {

								/* If node has Parent and Parent is also being moved */
								if( task.parent_id !== null && (task.parent_id in pack) && pack[task.parent_id].parent_id !== null ) {
									//console.log(Tasks.getTaskObject(task.id).title, 'HAS PREVIOUS: SKIP');
									d.resolve();

								/* If node has Parent but that Parent is not gonna be moved */
								} else if( (task.parent_id !== null && (task.parent_id in pack) && pack[task.parent_id].parent_id === null)
									|| (task.parent_id !== null && ! (task.parent_id in pack)) ) {

									//console.log(Tasks.getTaskObject(task.id).title, 'JUST UNINDENT');

									if( (task.previous_id in pack) &&
										( (pack[task.previous_id].parent_id !== null && (pack[task.previous_id].parent_id in pack) && pack[pack[task.previous_id].parent_id].parent_id === null)
											|| (pack[task.previous_id].parent_id !== null && ! (pack[task.previous_id].parent_id in pack)) )) {
										var parent_id = Tasks.getParentIdFromDOM(pack[task.previous_id].parent_id) || null;
										var previous_id = task.previous_id;
										//console.log('HAS PREVIOUS. parent_id:', parent_id, 'previous_id:', previous_id);
									} else {

										var parent_previous_id = Tasks.getPreviousIdFromDOM(task.parent_id);

										if( parent_previous_id !== null && (parent_previous_id in pack) &&
											( (pack[parent_previous_id].parent_id !== null && (pack[parent_previous_id].parent_id in pack) && pack[pack[parent_previous_id].parent_id].parent_id === null)
												|| (pack[parent_previous_id].parent_id !== null && ! (pack[parent_previous_id].parent_id in pack)) )) {
											var parent_id = parent_previous_id;
										} else {
											var parent_id = Tasks.getParentIdFromDOM(task.parent_id) || null;
										}
										var previous_id = task.parent_id;

										//console.log('NO PREVIOUS. parent_id:', parent_id, 'previous_id:', previous_id);
									}

									Tasks.moveTask(cur_list_id, task.id, parent_id, previous_id, function() {

										/* Moving previous' children that come after movable node */
										var children = App.editMode.getNextAllUnCheckedFromDOM(task.id);

										if(children.length > 0) {

											/* Moving children one by one */
											var dfd_c = $.Deferred(),
												promise_c = dfd_c.promise();

											dfd_c.resolve();

											$.each(children, function(i, child_id) {

												promise_c = promise_c.then(function() {
													return $.Deferred(function(d_c) {

														if( child_id === task.id ) {
															if( i === (children.length - 1) ) {
																d_c.resolve();
															}
															return;
														}

														var previous_child_id = null;
														if( i === 0 ) {
															previous_child_id = null;
														} else if( children[i-1] === task.id ) {
															previous_child_id = children[i-2] || null;
														} else {
															previous_child_id = children[i-1];
														}

														Tasks.moveTask(cur_list_id, child_id, task.id, previous_child_id, function() {
															d_c.resolve();
														});
													});
												});
											});

											promise_c.always(function() {
												updated_num++;
												d.resolve();
											});

										} else {
											updated_num++;
											d.resolve();
										}
									});

								/* If node has no Parent */
								} else {
									//console.log(Tasks.getTaskObject(task.id).title, 'SKIP');
									d.resolve();
								}
							}
						});
					});
				});

				promise.always(function() {
					//console.log(action + ': ALL DONE');

					if( updated_num > 0 ) {
						Tasks.getList(Lists.getLastList(), function() {
							App.editMode.enable();
							$.each(pack, function(index, task) {
								App.tasks_list_el.find('a[data-id="'+ task.id +'"]').find('.pack-checkbox.danger').first().find('input[type="checkbox"]').prop('checked', true).change();
							});
							App.toggleTasksProgress(false);
							buttons.prop('disabled', false);
						});
					} else {
						App.toggleTasksProgress(false);
						buttons.prop('disabled', false);
					}
				});
			});
		}


		/* == SETTINGS == */ {

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
		}


		/* TODO: on popup close */
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
		confirm.unbind('click').on('click', '#btn-confirm-cancel', function () {
			confirm.removeClass().addClass('fade-out');
		}).on('click', '#btn-confirm-ok', function () {
			confirm.removeClass().addClass('fade-out');
			data.action();
		});
	},

	switchCheckbox: function(input) {
		var checked = input.prop('checked');
		input.prop('checked', (checked === false));
		input.change();	// to fire onchange listeners
	},

	toggleTasksProgress: function(show) {

		$('#btn-sync-tasks').prop('disabled', show);
		$('#btn-edit-tasks').prop('disabled', show);

		if(show) {
			$('#progress_tasks').show();
		} else {
			$('#progress_tasks').hide();
		}
	},

	editMode: {

		/* Assuming that editMode always is called in the context of App */

		el: $('#edit-mode'),
		CLASS_SELECTED: 'selected',

		enable: function() {
			this.updateCheckedCounter(0);
			this.el.removeClass().addClass('edit');
			App.tasks_list_el.append('<li class="dummy"></li>');	// needed for scrolling to the last task of the list
			// TODO: animation (ex. sliding)
			App.tasks_list_el.find('.danger').show();
			App.tasks_list_el.find('.pack-checkbox:not(.danger)').hide();
			App.tasks_list_el.addClass('edit-mode');
		},

		disable: function() {
			this.el.removeClass('edit');
			App.tasks_list_el.find('.danger').hide().find('input[type="checkbox"]').prop('checked', false);
			App.tasks_list_el.find('.dummy').remove();
			App.tasks_list_el.find('.pack-checkbox:not(.danger)').show();
			App.tasks_list_el.find('.' + this.CLASS_SELECTED).removeClass(this.CLASS_SELECTED);
			/* TODO: remove */
			/* Empty Tasks.checked */
			Tasks.getCheckedItems(); // TODO: replace with normal setter/emptier
			App.tasks_list_el.removeClass('edit-mode');
		},

		updateCheckedCounter: function(n) {
			this.el.find('.selected_num').html(n.toString());
		},

		showNoTasksSelectedMessage: function() {
			utils.status.show('No tasks were selected', 1000);
		},

		toggleSelected: function(el) {

			var a = el.parents('a').first();

			if( ! a.hasClass(this.CLASS_SELECTED) )
				a.addClass(this.CLASS_SELECTED);
			else
				a.removeClass(this.CLASS_SELECTED);
		},

		getNextAllUnCheckedFromDOM: function(task_id) {
			var ids = [];
			App.tasks_list_el.find('li.task-item a[data-id="'+ task_id +'"]').first().parent('li.task-item').nextAll().each(function(i, n) {
				if( $(n).find('.pack-checkbox.danger').first().find('input[type="checkbox"]').prop('checked') === false ) {
					ids.push( $(n).find('a').first().attr('data-id') );
				}
			});

			return ids;
		}
	},

	showInDevelopmentTooltip: function(timeout) {
		timeout = timeout || 1000;
		utils.status.show('This feature is in development', timeout);
	}
};


$(function() {

	App.init();
});