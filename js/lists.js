var Lists = {

	LBL_CREATE: 'Create',
	LBL_UPDATE: 'Rename',

	lists: {},
	lists_to_view: [],
	lists_sorted: [],

	getList: function() {

		$('#progress_lists').show();
		$('#progress_tasks').show();

		var data = {
			type: 'GET',
			url: 'https://www.googleapis.com/tasks/v1/users/@me/lists'
		};

		Auth.makeRequest( data, function(res) {

			Lists.lists_to_view = [];
			var reload = false;
			$.each(res.items, function(key, item) {

				Lists.lists_to_view.push(item.title.toLowerCase());
				Lists.lists[item.id] = item;
			});

			Lists.lists_to_view.sort();

			Lists.lists_sorted = [];

			var ul = $('section[data-type="sidebar"]').find('nav ul');
			ul.html('');
			$.each(Lists.lists_to_view, function(key, title) {
				$.each(Lists.lists, function(id, list) {
					if( title == list.title.toLowerCase() ) {
						Lists.lists_sorted.push(list);
						ul.append('<li class="list-item"><a data-id="' + list.id + '" href="#">' + list.title + '</a></li>');
					}
				});
			});
			ul.append('<br /><br/><br /><br />');

			$('#progress_lists').hide();

			Tasks.getList(Lists.getLastList());

		}, function( jqXHR, textStatus, errorThrown ) {
			$('#progress_lists').hide();
		});
	},

	/* Get last used list object or first one if localStorage is empty */
	getLastList: function() {

		var saved = Storage.get('last_list');

		var list;
		if( saved !== 'undefined' && typeof saved !== 'undefined' ) {
			$.each(Lists.lists, function(key, item) {
				if( saved == item.id ) {
					list = item;
					return false;
				}
			});
		}

		if( typeof list !== 'undefined' ) {
			return list;
		}

		var title = Lists.lists_to_view[0];
		$.each(Lists.lists, function(id, item) {
			if( title === item.title.toLowerCase() ) {
				list = item;
				return false;
			}
		});

		return list;
	},

	get: function( id ) {

		var list;
		$.each(Lists.lists, function(key, item) {
			if( id === item.id ) {
				list = item;
				return false;
			}
		});

		return (typeof list === 'undefined') ? false : list;
	},

	createList: function(name) {
		$('#progress_lists').show();

		var data = {
			type: 'POST',
			url: 'https://www.googleapis.com/tasks/v1/users/@me/lists',
			fields: 'id',
			pack: {
				title: name
			}
		};

		Auth.makeRequest( data, function(list) {

			if( typeof list.id !== 'undefined' ) {
				Storage.save( {last_list: list.id} );
				Lists.getList();
			}

		});
	},

	deleteList: function(id) {
		$('#progress_lists').show();

		var data = {
			type: 'DELETE',
			url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/' + id
		};

		Auth.makeRequest( data, function(data, textStatus, jqXHR) {

			$('#progress_lists').hide();

			if( jqXHR.status == '204' ) {	// No Content
				Storage.remove('last_list');
				Lists.getList();
			}

		});
	},

	renameList: function(value) {

		var list = Lists.getLastList();

		if( list.title == value.trim() ) {
			return;
		}

		$('#progress_lists').show();

		var data = {
			type: 'PATCH',
			url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/' + list.id,
			fields: 'id,etag',
			pack: {
				title: value
			}
		};

		Auth.makeRequest( data, function(data, textStatus, jqXHR) {

			$('#progress_lists').hide();

			if( typeof data.id !== 'undefined' ) {
				/* TODO: why is there a delay? — Server Caching :( */
				//$('.list-item').find('a[data-id="'+ list.id +'"]').text(value);
				Lists.getList();
				/* TODO: update Lists.lists */
			}

		});
	},

	markSelected: function( id ) {
		$('section[data-type="sidebar"] .list-selected').removeClass('list-selected');
		$('section[data-type="sidebar"] a[data-id="' + id + '"]').addClass('list-selected');
	},

	prepareListForm: function(data) {
		var form = $('#list-form');
		form.find('h1').html(data.h1);
		form.find('#btn-list-form-ok').html(data.ok);
		form.find('input[name="list_name"]').val(data.name);
	}

};