(function () {
    "use strict";

    var app = require('./app');
    //require('./google-analytics');

    // It's testem port, do not launch app
    if (location.port === '7357') {
        return;
    }

    // If not on app.html (main entry point), try to install/redirect
    if (location.pathname.indexOf('app.html') === -1) {
        app.install();
        return;
    }

    // Let's rock!
    app.init();
    //ga.init();
}());
