var Tasks = {

	LBL_CREATE: 'Create',
	LBL_UPDATE: 'Update',

	tasks: {},
	view_type: 'plain',

	getList: function( list ) {

		var list = list || Lists.getLastList();
		Lists.markSelected(list.id);
		this.view_type = ( Settings.get('tree_view') === 'true' ) ? 'tree' : 'plain';

		/* Storing active list */
		Storage.save( {last_list: list.id} );

		$('#progress_tasks').show();

		var data = {
			type: 'GET',
			url: 'https://www.googleapis.com/tasks/v1/lists/' + list.id + '/tasks'
		};

		Auth.makeRequest( data, function(res) {

			var drawer = $('section#drawer');
			drawer.find('header h2').html( list.title );

			var ul = drawer.find('article div[data-type="list"] ul');
			ul.html('');
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
				ul.html(list_html);

			} else {
				ul.html(
					'<li>The list is empty</li>'
				);
			}

			$('#progress_tasks').hide();

		}, function( jqXHR, textStatus, errorThrown ) {
			if( jqXHR.status == '404' ) {
				Storage.remove('last_list');
				Tasks.getList();
			} else {
				$('#progress_tasks').hide();
			}
		});
	},

	_getTasksHTML: function(item) {

		var completed = ( item.status === 'completed' ) ? 'completed ' : '';
		var checked = ( item.status === 'completed' ) ? 'checked' : '';
		var due = ( typeof item.due === 'undefined' ) ? '' : '<span class="item-due">Due date: ' + item.due + '</span>';
		/* TODO: due date */
		var notes = ( typeof item.notes === 'undefined' ) ? '' : '<p class="item-notes">' /*+ due*/ + item.notes + '</p>';

		var html = '';

		html +=
			'<li class="' + completed + 'task-item">' +
				'<a href="#" data-id="' + item.id + '">' +
				'<label class="pack-checkbox">' +
					'<input type="checkbox" ' + checked + '>' +
					'<span></span>' +
				'</label>' +
				'<div><p class="item-title">' + item.title + '</p>' +
				notes +
				'</div></a>' +
			'<ul>';

		if( typeof item.children !== 'undefined' && item.children.length !== 0 ) {
			$.each(item.children, function(index, child){
				html += Tasks._getTasksHTML(child);
			});
		}

		html += '</ul></li>';

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
	},

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

		var obj = obj || Tasks.getTaskObject(id);
		var children = '';

		if( typeof obj !== 'undefined' && typeof obj.children !== 'undefined' ) {
			$.each(obj.children, function(key, child) {

				children += child.id + ',';

				if( typeof child.children !== 'undefined' && child.children.length !== 0 ) {
					children += Tasks.getChildrenIDs(child.id, child);
				}
			});
		}

		return children;
	},

	treeMode: function() {
		return ( this.view_type === 'tree' );
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

	updateTask: function( list_id, id, pack, parent ) {

		$('#progress_tasks').show();

		var task = $('#tasks').find('a[data-id="' + id + '"]').parent('li.task-item');
		var checkbox = task.find('input[type="checkbox"]').first();
		var last_list_id = Lists.getLastList().id;

		/* Preventing unnecessary action if task is already completed */
		var parent = parent || false;
		if( checkbox.prop('checked') === true && pack.status === 'completed' && parent === false ) {
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

				/* TODO: independent loading progress indicators */

				$('#progress_tasks').hide();
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
			});

		/* Move to another list */
		} else {
			Tasks.deleteTask(last_list_id, id, function(){
				Tasks.createTask(list_id, pack);
			});
		}
	},

	createTask: function(list_id, pack) {
		$('#progress_tasks').show();

		var data = {
			type: 'POST',
			url: 'https://www.googleapis.com/tasks/v1/lists/' + list_id + '/tasks',
			//fields: 'id',
			pack: pack
		};

		Auth.makeRequest( data, function(res) {
			$('#progress_tasks').hide();

			$('#lists').find('li.list-item a[data-id="'+ list_id +'"]').click();
		});
	},

	deleteTask: function(list_id, id, callback) {

		var silent = (typeof callback !== 'undefined');
		if( ! silent ) $('#progress_tasks').show();

		var data = {
			type: 'DELETE',
			url: 'https://www.googleapis.com/tasks/v1/lists/'+ list_id +'/tasks/' + id
		};

		Auth.makeRequest( data, function(data, textStatus, jqXHR) {

			if( ! silent ) $('#progress_tasks').hide();

			if( jqXHR.status == '204' ) {	// No Content
				if( typeof callback !== 'undefined' ) {
					callback();
				} else {
					$('#tasks').find('li.task-item a[data-id="'+ id +'"]').parent('li').remove();
				}
			}

		});
	}
};