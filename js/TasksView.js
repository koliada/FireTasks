/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

var TasksView = (function () {
    "use strict";

    var _activeList = null;
    var _bindingsApplied = false;

    var _dom = {
        drawer: _$('#drawer')[0],
        tasks: _$('#tasks ol')[0],
        activeListTitle: _$('#active-list-title')[0]
        //btnNewList: _$('#btn-new-list')[0],
        //listFormDialog: _$('#list-form')[0]
    };
    var _classes = {
        taskItem: 'task-item'
    };

    var sortModeManager = (function () {
        var sortMode = 'MY-ORDER',
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

    function _validateList(list) {
        if (!List.prototype.isPrototypeOf(list)) {
            throw new TypeError('List validation: not a List instance');
        }
    }

    function _checkAndUpdateActiveList(list) {
        try {
            _validateList(list);
        } catch (e) {
            throw e;
        }
        if (_activeList !== list) {
            _activeList = list;
        }
    }

    /**
     * Renders tasks of the given list
     * @param {List} list
     * @private
     */
    function _renderElementsOfTasks(list) {
        try {
            _checkAndUpdateActiveList(list);
        } catch (e) {
            throw e;
        }

        if (_$.noUI) {
            return;
        }

        var fragment = document.createDocumentFragment();

        if (list.tasks.getLength() === 0) {
            fragment.appendChild(_createElementForEmptyList());
        } else {
            list.tasks.data.forEach(function (task) {
                fragment.appendChild(_createElementForTask(task));
            });
        }
        _appendToElementOfTasks(fragment, true);
        _setListName(list);
    }

    function _appendToElementOfTasks(fragment, clear) {
        if (clear) {
            _dom.tasks.innerHTML = '';
        }
        _dom.tasks.appendChild(fragment);
        //_scrollToTop();
    }

    function _scrollToTop() {
        if (_dom.tasks.parentNode.parentNode.scrollTop !== 0) {
            _dom.tasks.parentNode.parentNode.scrollTop = 0;
        }
    }

    function _setListName(list) {
        _dom.activeListTitle.innerHTML = (list && list.getName()) || 'Loading...';
    }

    function _createElementForEmptyList() {
        var li = document.createElement('li');
        li.innerHTML = '<a draggable="false"><p style="text-align: center;">This list is empty</p></a>';
        return li;
    }

    function _createElementForTask(task) {
        //var li = document.createElement('li'),
        //    a = document.createElement('a'),
        //    labelCheckbox = document.createElement('label'),
        //    labelCheckboxDanger = document.createElement('label'),
        //    divClickable = document.createElement('div'),
        //    labelHandle = document.createElement('label'),
        //    olInner = document.createElement('ol');
        //
        //li.classList.add('task-item');
        //if (task.get('status') === 'completed') {
        //    li.classList.add('completed');
        //}
        ////a.href = '#';
        //a.dataset.id = task.id;
        //a.setAttribute('draggable', 'false');
        //a.setAttribute('oncontextmenu', 'return(false);');
        //labelCheckboxDanger.className = 'pack-checkbox danger';
        //labelCheckboxDanger.innerHTML = '<input type="checkbox"><span></span>';
        //labelCheckbox.className = 'pack-checkbox';
        //labelCheckbox.innerHTML = '<input type="checkbox" ' + ((task.status === 'completed') ? 'checked' : '') + '><span></span>';
        //divClickable.classList.add('clickable');
        //!sortModeManager.isMyOrder() && divClickable.classList.add('not-sortable');
        //divClickable.innerHTML = '<p class="item-title"><span>' + task.title + '</span></p>' +
        //((!task.notes || task.notes == '') ? '' : '<p class="item-notes">' + task.notes + '</p>');
        //Longpress.bindLongPressHandler(divClickable, 400, onLongPress, onEditTask, EditMode.isEnabled);
        //labelHandle.classList.add('task-handle');
        //labelHandle.innerHTML = '<div class="action-icon menu"></div>';
        //if (sortModeManager.isMyOrder() && typeof task.children !== 'undefined' && task.children.length !== 0) {
        //    task.children.forEach(function(child) {
        //        olInner.appendChild(createNode(child));
        //    });
        //}
        //a.appendChild(labelCheckboxDanger);
        //a.appendChild(labelCheckbox);
        //a.appendChild(divClickable);
        //sortModeManager.isMyOrder() && a.appendChild(labelHandle);
        //li.appendChild(a);
        //li.appendChild(olInner);

        var li = document.createElement('li'),
            ol = document.createElement('ol');
        li.classList.add(_classes.taskItem);
        if (task.get('status') === 'completed') {
            li.classList.add('completed');
        }
        li.innerHTML = '\
        <a data-id="' + task.getId() + '" draggable="false" oncontextmenu="return(false);">\
            <label class="pack-checkbox danger">\
                <input type="checkbox"><span></span>\
            </label>\
            <label class="pack-checkbox">\
                <input type="checkbox" ' + ((task.get('status') === 'completed') ? 'checked' : '') + '><span></span>\
            </label>\
            <div class="clickable ' + (!sortModeManager.isMyOrder() ? 'not-sortable' : '') + '">\
                <p class="item-title"><span>' + task.getName() + '</span></p>\
                ' + ((!task.get('notes') || task.get('notes') === '') ? '' : '<p class="item-notes">' + task.get('notes') + '</p>') + '\
            </div>\
            <label class="task-handle">\
                <div class="action-icon menu"></div>\
            </label>\
        </a>';

        if (sortModeManager.isMyOrder() && task.children && task.children.getLength() !== 0) {
            task.children.data.forEach(function(child) {
                ol.appendChild(_createElementForTask(child));
            });
        }

        li.appendChild(ol);

        return li;
    }

    //function _applyBindings(viewModel) {
    //    if (!_bindingsApplied) {
    //        ko.cleanNode(_dom.drawer);
    //        ko.applyBindings(viewModel, _dom.drawer);
    //        _bindingsApplied = true;
    //    }
    //}

    return {
        setActiveList: _checkAndUpdateActiveList,
        render: {
            tasksOfList: _renderElementsOfTasks
        }
        //applyBindings: _applyBindings,
        //scrollToTop: _scrollToTop
    }
}());
