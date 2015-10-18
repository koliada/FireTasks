(function () {
    "use strict";

    var _$ = require('../DomHelper');

    var dom = Object.create(null),
        visible = false,
        handlers = Object.create(null),
        cancelOption = {
            id: 'cancel',
            text: 'Cancel',
            handler: hide
        };

    dom.dialog = _$('#actions')[0];
    dom.title = dom.dialog.find('header')[0];
    dom.menu = dom.dialog.find('menu')[0];

    function getOptionDom(option) {
        return '<button data-id="' + option.id + '" ' + (option.disabled ? 'disabled="disabled"' : '') + '>' + option.text + '</button>';
    }

    function addActions(actions) {
        var fragment = '';
        handlers = Object.create(null);
        actions.forEach(function (option) {
            handlers[option.id] = option.handler;
            fragment += getOptionDom(option);
        });
        fragment += getOptionDom(cancelOption);
        dom.menu.innerHTML = fragment;
    }

    function onButtonClicked(ev) {
        ev.preventDefault();
        hide();
        var handler = handlers[ev.target.dataset.id];
        if (handler) {
            handler();
        }
    }

    function show(header, actions) {
        if (visible) {
            return;
        }
        dom.title.innerHTML = header;
        addActions(actions);
        dom.dialog.fadeIn();
        visible = true;
    }

    function hide() {
        if (visible) {
            dom.menu.innerHTML = ''; //cleaning-up handlers
            dom.dialog.fadeOut();
            visible = false;
        }
    }

    dom.dialog.on("click", "button", onButtonClicked);

    module.exports = {
        show: show,
        hide: hide
    };
}());
