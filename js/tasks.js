var Tasks = {

	LBL_CREATE: 'Create',
	LBL_UPDATE: 'Update',

	tasks: {},

	getList: function( list, callback ) {

		list = list || Lists.getLastList();
		Lists.markSelected(list.id);

		/* Storing active list */
		Storage.save( {last_list: list.id} );

		App.toggleTasksProgress(true);

		var data = {
			type: 'GET',
			url: 'https://www.googleapis.com/tasks/v1/lists/' + list.id + '/tasks'
		};

		Auth.makeRequest( data, function(res) {

			var drawer = $('section#drawer');
			drawer.find('header h2').html( list.title );

			var l = drawer.find('article div[data-type="list"] ol');
			l.html('');
			if( typeof res.items !== 'undefined' ) {

				if( Tasks.treeMode() ) {
					/* Making tree */
					Tasks.tasks = Tasks._makeTree({q: res.items});
				} else {
					Tasks.tasks = res.items;
				}

				/* Building HTML */
				var list_html = '';
				$.each(Tasks.tasks, function(key, item) {
					list_html += Tasks._getTasksHTML(item);
				});
				l.html(list_html);

				/* Sortable */
				$("#tasks ol").sortable({
					connectWith: "#tasks ol",
					items: ".task-item",
					handle: ".task-handle",
					axis: "y",
					placeholder: "sortable-placeholder",
					update: function(event, ui) {
						if (this === ui.item.parent()[0]) {
							Tasks._sortTask(ui.item[0]);
						}
					},
					start: function( event, ui ) {
						/* Disable Edit Mode */
						App.editMode.disable();

						/* Collapse children nodes */
						var children = $(ui.item[0]).find('li');
						if(children.length > 0) {
							$(ui.item[0]).find('.item-title').first().prepend('<span class="item-children-num">(+'+ children.length +' more) </span>');
							children.hide();
							$(this).sortable( "refreshPositions" );
							$(ui.item[0]).css('height', 'auto');
						}

						/* Adjust placeholder's height */
						$('.sortable-placeholder').css('height', parseInt(getComputedStyle(ui.item[0])['height']));
					},
					change: function( event, ui ) {
						/*
						 Shift moved item to the level of the target placeholder
						 Adjusts item's width
						 */
						$(ui.item[0]).css( 'width', $(ui.placeholder[0]).css('width') );
						$(ui.item[0]).offset({ left: $(ui.placeholder[0]).offset().left });
					},
					stop: function( event, ui ) {
						/* Expand children nodes */
						var children = $(ui.item[0]).find('li');
						children.show();
						$(ui.item[0]).find('.item-children-num').remove();
						$(ui.item[0]).css('height', 'auto');
						$(this).sortable( "refreshPositions" );
					}
				});

			} else {
				l.html(
					'<li>The list is empty</li>'
				);
			}

			if( typeof callback !== 'undefined' ) callback();
			else App.toggleTasksProgress(false);

		}, function( jqXHR, textStatus, errorThrown ) {
			if( jqXHR.status == '404' ) {
				Storage.remove('last_list');
				Tasks.getList();
			} else {
				if( typeof callback !== 'undefined' ) callback();
				else App.toggleTasksProgress(false);
			}
		});
	},

	_getTasksHTML: function(item) {

		var completed = ( item.status === 'completed' ) ? 'completed ' : '';
		var checked = ( item.status === 'completed' ) ? 'checked' : '';
		var due = ( typeof item.due === 'undefined' ) ? '' : '<span class="item-due">Due date: ' + item.due + '</span>';
		/* TODO: due date */
		var notes = ( typeof item.notes === 'undefined' ) ? '' : '<p class="item-notes">' /*+ due*/ + item.notes + '</p>';
		var handle = '<label class="task-handle"><div class="action-icon menu"></div></label>';

		var html = '';

		html +=
			'<li class="' + completed + 'task-item">' +
				'<a href="#" data-id="' + item.id + '">' +
				'<label class="pack-checkbox danger">\
					<input type="checkbox">\
					<span></span>\
				</label>' +
				'<label class="pack-checkbox">' +
					'<input type="checkbox" ' + checked + '>' +
					'<span></span>' +
				'</label>' +
				'<div class="clickable"><p class="item-title">' + item.title + '</p>' +
				notes +
				'</div>'+ handle +'</a>' +
			'<ol>';

		if( typeof item.children !== 'undefined' && item.children.length !== 0 ) {
			$.each(item.children, function(index, child){
				html += Tasks._getTasksHTML(child);
			});
		}

		html += '</ol></li>';

		return html;
	},

	/* http://blog.tcs.de/creating-trees-from-sql-queries-in-javascript/ */
	_makeTree: function(options) {
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
	},

	getTaskObject: function(id, obj) {

		obj = obj || Tasks.tasks;
		var task;

		$.each(obj, function(key, item) {
			if( item.id === id ) {
				task = item;
				return false;
			} else if( typeof item.children !== 'undefined' && item.children.length > 0 ) {
				var child = Tasks.getTaskObject(id, item.children);
				if( typeof child !== 'undefined' && child.id === id ) {
					task = child;
					return false;
				}
			}
		});

		return task;
	},

	/* TODO: should update object */
	/*updateTaskObject: function(id, pack, obj) {

		var obj = obj || Tasks.tasks;
		var task;

		$.each(obj, function(key, item) {
			if( item.id === id ) {
				task = item;
				return false;
			} else if( typeof item.children !== 'undefined' && item.children.length !== 0 ) {
				var child = Tasks.getTaskObject(id, item.children);
				if( typeof child !== 'undefined' && child.id === id ) {
					task = child;
					return false;
				}
			}
		});

		return task;
	},*/

	getChildrenIDs: function(id, obj) {

		/* TODO: is that alright at all?! */
		function getChildrenIDsString(id, obj) {

			obj = obj || Tasks.getTaskObject(id);
			var children = '';

			if( typeof obj !== 'undefined' && typeof obj.children !== 'undefined' ) {
				$.each(obj.children, function(key, child) {

					children += child.id + ',';

					if( typeof child.children !== 'undefined' && child.children.length !== 0 ) {
						//children += Tasks.getChildrenIDs(child.id, child);
						children += getChildrenIDsString(child.id, child);
					}
				});
			}

			return children;
		}

		var children = getChildrenIDsString(id).split(',');
		children.pop();

		return children;
	},

	/**
	 * @deprecated
	 * @returns {string}
	 */
	treeMode: function() {
		//return ( this.view_type === 'tree' );
		return 'tree';
	},

	prepareTaskForm: function(data) {
		var form = $('#task-form');
		form.find('input').val('');
		form.find('textarea').html('');

		if( typeof data.id !== 'undefined' ) {
			$('#btn-task-form-delete').show().attr('data-id', data.id);
		} else {
			$('#btn-task-form-delete').hide();
		}

		form.find('h1').html(data.h1);
		form.find('#btn-task-form-ok').html(data.ok).attr('data-id', data.id);
		form.find('input[name="task_name"]').val(data.title);
		form.find('input[name="task_completed"]').prop('checked', data.completed);
		form.find('textarea[name="task_notes"]').html(data.notes);
		form.find('input[name="task_due_date"]').val(data.due_date);

		var task_lists = form.find('select[name="task_list"]');
		task_lists.html('');

		$.each(Lists.lists_sorted, function(key, list) {
			var selected = (list.id === data.task_list) ? ' selected' : '';
			task_lists.append('<option value="'+ list.id +'"'+ selected +'>'+ list.title +'</option>');
		});
	},

	updateTask: function( list_id, id, pack, parent, callback ) {

		var task = $('#tasks').find('a[data-id="' + id + '"]').parent('li.task-item');
		var checkbox = task.find('.pack-checkbox:not(.danger) input[type="checkbox"]').first();
		var last_list_id = Lists.getLastList().id;

		/* Preventing unnecessary action if task is already completed */
		parent = parent || false; // TODO: doesn't make any sense. Fix here and everywhere.
		if( checkbox.prop('checked') === true && pack.status === 'completed' && parent === false ) {
			callback();
			return;
		}

		checkbox.prop('disabled', true);	// disables current checkbox

		/* Sometimes users move tasks from one list to another */
		if( last_list_id === list_id ) {

			var data = {
				type: 'PATCH',
				url: 'https://www.googleapis.com/tasks/v1/lists/' + list_id + '/tasks/' + id,
				pack: pack
			};

			Auth.makeRequest( data, function(res) {

				checkbox.prop('disabled', false);

				if( Tasks.treeMode() ) {

					if( res.status === 'completed' ) {
						task.addClass('completed');
						checkbox.prop('checked', true);
					} else if( res.status === 'needsAction' ) {
						task.removeClass('completed');
						checkbox.prop('checked', false);
					} else {

						/* restore previous state on fail */
						//checkbox.prop('checked', ( checkbox.checked !== true ));	// inverted value;
					}

					if( typeof res.id !== 'undefined' && parent === true ) {
						/* TODO: maybe get task resource from API? */

						if( typeof res.title == '' ) {
							task.find('a').first().find('.item-title').first().html('&nbsp;');
						} else {
							task.find('a').first().find('.item-title').first().html(res.title);
						}

						if( typeof res.notes !== 'undefined' ) {
							task.find('a').first().find('.item-notes').first().remove();
							task.find('div').first().append('<p class="item-notes">' + res.notes + '</p>');	// TODO: move to function
						} else {
							task.find('a').first().find('.item-notes').first().remove();
						}
					}
				} else {
					Tasks.getList();
				}

				//Tasks.updateTaskObject(res.id, res);

				if( typeof callback !== 'undefined' ) callback();
			});

		/* Move to another list */
		} else {
			Tasks.deleteTask(last_list_id, id, function(){
				Tasks.createTask(list_id, pack, true, function() {
					//if( typeof callback !== 'undefined' ) callback(false);
				});
			});
		}
	},

	/* TODO: Unify. Place all parameters to one object? */
	createTask: function(list_id, pack, open_list, callback, parent_id, previous_id) {

		if(typeof open_list === 'undefined')
			open_list = true;

		parent_id = parent_id || null;
		previous_id = previous_id || null;

		//console.log('parent', (parent_id !== null) ? Tasks.getTaskObject(parent_id).title : null);
		//console.log('previous', (previous_id !== null) ? Tasks.getTaskObject(previous_id).title : null);

		var data = {
			type: 'POST',
			url: 'https://www.googleapis.com/tasks/v1/lists/' + list_id + '/tasks',
			fields: 'id',
			pack: pack
		};

		data.query_params = '';
		if( previous_id !== null ) {
			data.query_params += 'previous=' + previous_id + '&';
		}
		if( parent_id !== null ) {
			data.query_params += 'parent=' + parent_id;
		}

		Auth.makeRequest( data, function(res) {

			/* TODO: add some animation */
			if(open_list) {
				Tasks.getList(Lists.get(list_id));
			}

			if( typeof callback !== 'undefined' ) callback(res);
		});
	},

	deleteTask: function(list_id, task_id, callback, move_children) {

		if(typeof move_children === 'undefined')
			move_children = true;

		var data = {
			type: 'DELETE',
			url: 'https://www.googleapis.com/tasks/v1/lists/'+ list_id +'/tasks/' + task_id
		};

		Auth.makeRequest( data, function(data, textStatus, jqXHR) {

			if( jqXHR.status == '204' ) {	// No Content

				/* Updating children to unindent */
				if(move_children) {

					var a = $('#tasks').find('li.task-item a[data-id="'+ task_id +'"]');

					var parent_id = Tasks.getParentIdFromDOM(task_id);

					var children_DOM = a.siblings('ol').first();
					var children = Tasks.getChildrenIDs(task_id);

					var list = Lists.getLastList();

					if(children.length > 0) {

						/*
						 We have to move child by child so that they could know their previous item.
						 If it is not chained, some tasks move earlier than their neighbours so moving failes.

						 Reference: http://stackoverflow.com/questions/14989628/use-jquery-deferreds-for-variable-number-of-ajax-requests
						 */
						/* TODO: check twice before committing */
						var dfd = $.Deferred(),
							promise = dfd.promise();

						dfd.resolve();

						var children_updated_num = 0;
						$.each(children, function(index, child_id) {

							/* TODO: maybe gather objects at once? */
							if(Tasks.getTaskObject(child_id).parent === task_id) {

								promise = promise.then(function() {
									return $.Deferred(function(d) {

										if(children_updated_num === 0) {
											var previous_id = Tasks.getPreviousIdFromDOM(task_id);
										} else {
											var previous_id = Tasks.getPreviousIdFromDOM(child_id);
										}

										children_updated_num++;

										Tasks.moveTask( list.id, child_id, parent_id, previous_id, function() {
											d.resolve();
										});

									});
								});
							}
						});

						promise.always(function() {
							//console.log('DONE deleteTask');
							if( typeof callback !== 'undefined' ) callback();
						});


					} else {
						if( typeof callback !== 'undefined' ) callback();
					}
				} else {
					if( typeof callback !== 'undefined' ) callback();
				}
			}

		});
	},

	_sortTask: function(el) {
		el = $(el);

		var task_id = el.find('a').first().attr('data-id');
		var previous_id = Tasks.getPreviousIdFromDOM(task_id);
		var parent_id = Tasks.getParentIdFromDOM(task_id);
		var list_id = Lists.getLastList().id;

		App.toggleTasksProgress(true);

		Tasks.moveTask(list_id, task_id, parent_id, previous_id, function() {
			App.toggleTasksProgress(false);
		});
	},

	moveTask: function( list_id, task_id, parent_id, previous_id, callback ) {

		parent_id = parent_id || null;
		previous_id = previous_id || null;

		//console.log('moveTask:', Tasks.getTaskObject(task_id).title);
		//console.log('parent', (parent_id !== null) ? Tasks.getTaskObject(parent_id).title : null);
		//console.log('previous', (previous_id !== null) ? Tasks.getTaskObject(previous_id).title : null);

		var data = {
			type: 'POST',
			url: 'https://www.googleapis.com/tasks/v1/lists/'+ list_id +'/tasks/' + task_id + '/move'
		};

		data.query_params = '';
		if( previous_id !== null ) {
			data.query_params += 'previous=' + previous_id + '&';
		}
		if( parent_id !== null ) {
			data.query_params += 'parent=' + parent_id;
		}

		Auth.makeRequest( data, function(res) {

			if( typeof callback !== 'undefined' ) callback();

		});
	},

	getParentIdFromDOM: function(task_id) {
		/* TODO: maybe move list DOM id to Tasks property? */
		return $('#tasks').find('li.task-item a[data-id="'+ task_id +'"]').first().parent('li.task-item').parents('li.task-item').first().find('a').first().attr('data-id') || null;
	},

	getPreviousIdFromDOM: function(task_id) {
		return $('#tasks').find('li.task-item a[data-id="'+ task_id +'"]').first().parent('li.task-item').prev('li').find('a').first().attr('data-id') || null;
	},

	/* TODO: maybe unify? */
	getCheckedItems: function() {

		Tasks.checked = [];
		$('#tasks').find('.pack-checkbox.danger input[type="checkbox"]:checked').each(function(index, item) {
			Tasks.checked.push($(item).parents('a').first().attr('data-id'));
		});

		return Tasks.checked;
	}
};