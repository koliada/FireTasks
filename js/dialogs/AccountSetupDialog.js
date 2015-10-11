(function () {
    "use strict";

    var dom = Object.create(null),
        _$ = require('../DomHelper'),
        visible,
        progressClass;
    dom.dialog = _$('#setup')[0];
    dom.progress = dom.dialog.find('progress')[0];
    dom.lblDescription = dom.dialog.find('span.description')[0];
    //dom.lblDescriptionOldValue = lblDescription.html();
    dom.status = dom.dialog.find('span[role="status"] span')[0];

    progressClass = dom.progress.classList[0];
    dom.progress.classList.remove(progressClass);

    function setDescription(value) {
        dom.lblDescription.innerHTML = value;
    }

    function setProgress(value) {
        dom.progress.value = parseInt(value);
        dom.status.innerHTML = value.toString();
    }

    function show() {
        if (visible) {
            return;
        }
        dom.progress.classList.add(progressClass);
        dom.dialog.fadeIn();
        visible = true;
    }

    function hide() {
        if (visible) {
            dom.dialog.fadeOut();
            dom.progress.classList.remove(progressClass);
            setDescription('');
            setProgress(0);
            visible = false;
        }
    }

    module.exports = {
        setDescription: setDescription,
        setProgress: setProgress,
        show: show,
        hide: hide
    };
}());
