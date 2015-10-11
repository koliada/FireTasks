(function () {
    'use strict';

    var devMode = false,
        manifestUrl = devMode ? 'http://dev.alex-koliada.com/FireTasks/manifest.webapp' : 'http://koliada.github.io/FireTasks/manifest.webapp',
        actions = {
            'MAIN_QUEUE': 'mainQueue'
        },
        entityTypes = {
            LIST: 'list',
            TASK: 'task'
        },
        syncCalled = false,
        isOnline = true,
        refreshInterval = null,
        syncErrors = [],
        syncCallbacksNames = {
            LIST_CREATED: 'list-created',
            TASK_CREATED: 'task-created'
        },
    //syncCallbacks = {
    //	'list-created': List.listCreatedCallback,
    //	'task-created': Task.taskCreatedCallback
    //},
        unrecoverableErrorOccurred,
        accounts;


    /**
     * Sets global listeners
     */
    function setListeners() {

        EV.listen('options-saved', onOptionsSaved);
        EV.listen('tasks-rendered', function () {
            checkInstructionalOverlay();
            setupStartupSynchronization();
        });

        window.addEventListener('online', function (e) {
            logger.info('Connection is ONLINE');
            updateConnectionStatus(true);
            EV.fire('connection-online');
        }, false);
        window.addEventListener('offline', function (e) {
            logger.info('Connection is OFFLINE');
            updateConnectionStatus(false);
            EV.fire('connection-offline');
        }, false);

        $(document).on('click', '.prevent-default', function (ev) {
            ev.preventDefault();
        });

        $('form').on('submit', function (ev) {
            ev.preventDefault();
        });

        /* Clear Input Button */
        $(document).on('click', 'button[type="reset"]', function (ev) {
            ev.preventDefault();
            $(this).siblings('input[type="text"]').first().val('');
        });

        /* Full-width Checkbox Switching */
        $('section[data-type="list"], form').on('click', 'a', function () {
            var input = $(this).find('input[type="checkbox"]');
            utils.switchCheckbox(input);
        });

        /* For tablet UI - disables edit mode when sidebar is touched */
        $('section[data-type="sidebar"]').click(function () {
            EditMode.deactivate();
        });
    }

    //TODO: get rid of
    function initjQuery() {
        global.$ = global.jQuery = require('./lib/jquery-2.1.0.min');
        require('./lib/jquery-ui-1.10.3.custom.min');
        require('./lib/jquery.ui.touch-punch');
    }

    function initGO2() {
        require('./lib/google-oauth2');
    }

    /**
     * Triggers showing of instructional overlay if needed
     */
    function checkInstructionalOverlay() {
        if (!(localStorage.getItem('instructionalOverlayShown') === 'true')) {
            FT.showInstructionalOverlay();
            localStorage.setItem('instructionalOverlayShown', true);
        }
    }

    /**
     * Sets up startup synchronization
     */
    function setupStartupSynchronization() {
        // Firstly check if we're online. If not, wait for 'connection-online' event.
        if (!FT.isOnline()) {
            logger.info("onStart refresh won't start immediately because internet connection is offline. Waiting for connection restore");
            var evId = EV.listen('connection-online', function () {
                setupStartupSynchronization();
                EV.stopListen(evId);
            });
            return;
        }

        // Secondly, check if there are uncompleted tasks. If it's confirmed, launch queue and wait it finishes.
        if (Sync.getStoredTasks(actions.MAIN_QUEUE).length > 0 && !Auth.hasQueuedTasks()) { // Auth.hasQueuedTasks is not actually necessary
            logger.info("onStart refresh won't start immediately because synchronization module detected uncompleted tasks. Waiting for tasks to complete");
            FT.startSyncQueue();
            return;
        }

        // Thirdly, check if 'syncOnStart' setting is set to true. If yes, continue.
        if (!Settings.get('syncOnStart')) {
            logger.info("onStart refresh won't start because of the setting");
            return;
        }

        // At last, we check if synchronization was already called. If not, finally launch the sequence
        if (!syncCalled) {
            callSync();
        }

        /**
         * Launches synchronization sequence and sets a flag which indicates that synchronization was called
         */
        function callSync() {
            syncCalled = true;
            FT.loadAll();
        }
    }

    /**
     * Updates connection status
     * @param [online] True to indicate that application is online
     */
    function updateConnectionStatus(online) {
        isOnline = online || window.navigator.onLine;
    }

    /**
     * Handles new version checking and applying
     * @param {Function} [callback]
     */
    function updateVersion(callback) {

        /**
         * @reference http://www.html5rocks.com/en/tutorials/appcache/beginner/
         */
        window.applicationCache.addEventListener('updateready', function (e) {
            if (window.applicationCache.status == window.applicationCache.UPDATEREADY ||
                window.applicationCache.status == window.applicationCache.IDLE ||
                window.applicationCache.status == window.applicationCache.UNCACHED) {

                localStorage.setItem('whatsNewShown', false);
                localStorage.setItem('instructionalOverlayShown', false);

                // Browser downloaded a new app cache.
                if (confirm('A new version of Fire Tasks was downloaded. Apply update now?')) {
                    window.location.reload();
                }
            } else {
                // Manifest didn't changed. Nothing new to server.
            }
        }, false);

        window.applicationCache.addEventListener('error', function () {
            utils.status.show('A cache error occurred');
        });
    }

    function setVersionLabels() {
        if (utils.version.isBeta) {
            constants.APP_TITLE_ELEMENT.find('em')[0].innerHTML = '&nbsp;beta'
        }
    }

    /**
     * Handles showing of the "What's New" dialog
     */
    function showWhatsNew() {
        var whatsNewShown = localStorage.getItem('whatsNewShown');
        if (!(whatsNewShown === 'true')) {
            $.get('WHATSNEW', function (whatsNew) {
                alert(whatsNew);
                localStorage.setItem('whatsNewShown', true);
            }, 'html');
        }
    }

    function patchOptions() {
        options.scope = 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email';
        //FT.options.redirect_uri = this.options.redirect_uris[0];
        if (utils.isFFOS) {
            options.redirect_uri = 'https://oauth.gaiamobile.org/authenticated/';
        } else {
            options.redirect_uri = document.location.protocol + '//' + document.location.host + document.location.pathname.replace('app.html', 'redirect.html');
        }
    }

    function initStorage() {
        localforage.setDriver('asyncStorage');
    }

    function initSync() {
        Sync.setStorageVariable('syncQueue');
        Sync.setLogLevel('ERROR');
        Sync.action.setDefaultHandler(Auth.makeRequest);
        Sync.action(actions.MAIN_QUEUE, null).onStart(function () {
            List.view.toggleProgress(true);
            Task.view.toggleProgress(true);
        }).onEvery(function (success, entity) {
            var taskObject = arguments[arguments.length - 1];
            taskObject.callbackFnName && syncCallbacks[taskObject.callbackFnName](success, entity, taskObject);
        }).onFinish(function () {
            List.view.toggleProgress(false);
            Task.view.toggleProgress(false);
            setupStartupSynchronization(); // should be done after stored tasks has been completed
        });

        initSyncErrorsListener();

        /* Collects sync errors to local variable to check it later */
        Sync.onError = function (eventDetails) {
            if (eventDetails.eventName == 'Sync.start' && eventDetails.message == "Task failed") {
                updateSyncErrors(eventDetails);
            }
        };
    }

    /* Chrome only */
    function showLogo() {
        // Not working in the newest Chrome for some reason
        //if (window.chrome) {
        //    var text = "Fire tasks beta",
        //        fontFamily = "font-family: Arial", fontSize = "font-size: 9px; padding: 26px 0; line-height: 60px",
        //        url = window.location.href.replace('app.html', '').replace('#', '').replace('?', ''),
        //        imageUrl = url + "images/icons/icon-64.png",
        //        backgroundImage = "background-image: url('" + imageUrl + "')",
        //        color = "color: transparent",
        //        css = [fontFamily, fontSize, backgroundImage, color].join("; ");
        //    console.log("%c" + text, css);
        //}
        console.info('Thank you for your interest in Fire Tasks! For any details please refer to https://github.com/koliada/FireTasks');
    }

    /**
     * Listens to sync errors and breaks app if something really bad happened
     **/
    function initSyncErrorsListener() {
        var syncErrorsListenerInterval = setInterval(function () {
            if (syncErrors.length >= 3) {
                clearInterval(syncErrorsListenerInterval);
                unrecoverableErrorOccurred = true;
                Sync.clearStorage();
                FT.pauseSync();
                var blob = new Blob([JSON.stringify(syncErrors)], {type: 'text/plain'}),
                    blobURL = window.URL.createObjectURL(blob),
                    confirmData = {
                        h1: 'Error occurred',
                        p: 'An unrecoverable synchronization error has occurred. <span class="claim">Please</span> download debug data and contact developer.<br />\
							No sensitive data included.<br />\
							<ul class="unrecoverable-error-dialog">\
								<li><a href="' + blobURL + '" download="firetasks-dump.txt">Download dump</a></li>\
								<li><a href="mailto:alex.fiator@gmail.com?subject=Fire Tasks Bug Report&body=<Please add some details>" target="_blank">Compose Email</a></li>\
							</ul>',
                        cancel: 'Cancel',
                        ok: 'Restart Fire Tasks',
                        recommend: true,
                        hideCancel: true,
                        action: function () {
                            location.reload();
                        }
                    };
                FT.confirm(confirmData);
                return false;
            }
            syncErrors = [];
        }, 2000);
    }

    function updateSyncErrors(eventDetails) {
        delete eventDetails.debugData.task.data.pack;
        delete eventDetails.debugData.storedTasks;
        syncErrors.push(eventDetails);
    }

    function showInstructionalOverlay() {
        var overlayEl = $('#instructional-overlay')[0],
            canvasEl = overlayEl.querySelector('canvas'),
            ctx = canvasEl.getContext('2d'),
            tasksActionsCls = 'show-tasks-actions',
            types = {
                list: 'LIST',
                task: 'TASK'
            };

        function findPos(type) {
            var el = (type === types.list) ? List.view.getListEl()[0] : Task.view.getListEl()[0];
            var rect = el.getBoundingClientRect();
            return {
                x: rect.left,
                y: rect.top
            };
        }

        function hideOverlay() {
            FT.toggleSidebar(true);
            overlayEl.classList.remove('fade-in');
            canvasEl.classList.remove(tasksActionsCls);
            overlayEl.classList.add('fade-out');
            overlayEl.removeEventListener('click', hideOverlay);
        }

        function showOverlay() {
            FT.toggleSidebar(true);
            overlayEl.classList.remove('fade-out');
            overlayEl.classList.add('fade-in');
        }

        function drawCanvas(type) {
            var targetXY = findPos(type),
                radius = 8,
                circleX = targetXY.x + radius + ((type === types.list) ? 120 : 160),
                circleY = targetXY.y + radius + ((type === types.list) ? 14 : 22),
                line1Length = 80,
                line1 = {
                    x: circleX + line1Length,
                    y: circleY
                },
                line2Height = 36,
                line2 = {
                    x: line1.x,
                    y: line1.y + line2Height
                },
                text1Height = 20,
                text1 = {
                    x: line2.x - 180,
                    y: line2.y + text1Height + 6
                },
                label = (type === types.list) ? "Tap & hold to get list actions" : "Tap & hold to enter Edit Mode";
            ctx.beginPath();
            ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
            ctx.lineTo(line1.x, line1.y);
            ctx.lineTo(line2.x, line2.y);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFF';
            ctx.lineJoin = 'round';
            ctx.font = text1Height + 'px FiraSans';
            ctx.fillStyle = "#FFF";
            ctx.fillText(label, text1.x, text1.y);
            ctx.stroke();
        }

        function invokePhoneLayout() {
            drawCanvas(types.task);
            FT.toggleSidebar(false);
            canvasEl.classList.add(tasksActionsCls);
            overlayEl.addEventListener('click', hideOverlay);
            overlayEl.removeEventListener('click', invokePhoneLayout);
        }

        if (FT.getBodySize().width >= 1280) {
            overlayEl.addEventListener('click', hideOverlay);
        } else {
            overlayEl.addEventListener('click', invokePhoneLayout);
        }

        drawCanvas(types.list);
        showOverlay();
    }

    function onOptionsSaved() {
        FT.setAutoFetch();
        FT.setAnimations();
    }

    /**
     * Toggles sidebar
     * @param [value] True to open
     */
    function toggleSidebar(value) {
        if (value && location.hash.indexOf('drawer') === -1) {
            location.hash = 'drawer';
        } else if (!value) {
            location.hash = '';
        }
    }


    var o = {

        getVersion: function () {
            return version;
        },

        getEntityTypes: function () {
            return entityTypes;
        },

        getSyncCallbacksNames: function () {
            return syncCallbacksNames;
        },

        install: function () {
            // Turn it to false to always install 'normal' package
            //var supportHIDPI = false;
            if (FT.isFFOS) {
                var req = navigator.mozApps.install(FT.getManifestUrl());
                req.onsuccess = function () {
                    //alert(this.result.origin);
                    //alert('Fire Tasks installed. Check your home screen!');
                };
                req.onerror = function () {
                    alert('Installation failed: ' + this.error.name);
                };
            } else {
                window.location.href = 'app.html#';
            }
        },

        /* Interval in seconds */
        setAutoFetch: function (delay) {

            delay = delay || Settings.get('syncInterval');

            if (delay === 0) {
                FT.stopAutoFetch();
                logger.info("Automatic local data refresh won't start because of the settings");
                return;
            }

            if (refreshInterval || !delay) {
                return;
            }

            if (delay < 60) {
                logger.warn('Delay value should be equal to or greater than 60 (measured in seconds)');
                return;
            }

            // make private
            logger.info('Auto fetch started, timeout ' + delay + ' seconds');
            refreshInterval = setInterval(function () {
                if (!FT.isOnline()) {
                    logger.info('Automatic reload skipped because of offline mode');
                    return;
                }
                logger.info('Automatic reload initiated');
                List.getList();
            }, delay * 1000);
        },

        stopAutoFetch: function () {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
                logger.info('Auto fetch disabled');
                return true;
            }
            return false;
        },

        preventStartupSync: function () {
            logger.info('Startup sync prevented');
            syncCalled = true;
        },

        /**
         * Adds new task to global synchronization queue
         * Uses {@link Sync}
         * @param {Object} data
         * @param {String} [callbackFnName] Callback name (not function, won't be saved to storage!)
         * @returns {Object} Task resource
         */
        addSyncTask: function (data, callbackFnName) {
            return Sync.task({
                actionName: actions.MAIN_QUEUE,
                data: data,
                callbackFnName: callbackFnName
            })[0];
        },

        /**
         * Starts global synchronization queue
         * Uses {@link Sync}
         */
        startSyncQueue: function () {
            Sync.start(actions.MAIN_QUEUE);
        },

        /**
         * Pauses global synchronization queue
         */
        pauseSync: function () {
            Sync.pause(actions.MAIN_QUEUE);
        },

        /**
         * Resumes global synchronization queue after it was paused
         */
        resumeSync: function () {
            Sync.resume(actions.MAIN_QUEUE);
        },

        // TODO: move labels outside and simplify. Damn, just refactor this shit.
        // there’s nothing so permanent as temporary
        /**
         * Handles setup sequence
         */
        runSetup: function () {
            var setupForm = $('#setup'),
                lblDescription = setupForm.find('span.description').first(),
                lblDescriptionOldValue = lblDescription.html(),
                progress = setupForm.find('progress').first(),
                status = setupForm.find('span[role="status"] span'),
                btnStart = $('#btn-start-import'),
                btnStartOldValue = btnStart.html();

            function onFinish(lists) {
                List.storage.set(lists, function () {
                    lblDescription.html('Successful!');
                    FT.toggleSidebar(true);
                    btnStart.html('Go to app').prop('disabled', false).off().on('click', function () {
                        List.loadData();
                        setupForm.removeClass('fade-in').addClass('fade-out');
                        showInstructionalOverlay();
                        lblDescription.html(lblDescriptionOldValue);
                        progress.val(0);
                        status.html('0');
                        btnStart.html(btnStartOldValue);
                    });
                });
            }

            FT.toggleSidebar();

            FT.preventStartupSync();
            FT.stopAutoFetch();

            setupForm.removeClass('fade-out').addClass('fade-in');

            // Start button
            btnStart.prop('disabled', false);
            btnStart.off().on('click', function () {
                btnStart.prop('disabled', true);
                progress.addClass('pack-activity');
                lblDescription.html('loading lists...');

                // Fetching lists
                List.getList(function (lists) {
                    progress.removeClass('pack-activity');

                    if (lists.length > 0) {
                        var delim = 100 / lists.length,
                            curStatus = 0;
                        lblDescription.html('loading tasks...');

                        // Fetching tasks for each list
                        for (var i = 0; i < lists.length; i++) {
                            (function (i) {
                                Task.getList(lists[i], function (list, tasks) {
                                    lists[i].tasks = tasks;
                                    curStatus += delim;
                                    progress.val(curStatus);
                                    status.html(curStatus.toFixed(0));
                                    if (curStatus >= 100) {
                                        onFinish(lists);
                                    }
                                }, false);
                            }(i));
                        }
                    }
                });
            });
        },

        hideSetup: function () {
            $('#setup').removeClass('fade-in').addClass('fade-out');
        },

        /**
         * Loads all data from the server
         * Refreshes views at the end
         * @param {Function} [callback] Callback to be called after all data is fetched
         */
        loadAll: function (callback) {
            var processed = 0,
                timeStart = (new Date()).getTime();
            logger.info('loadAll(): synchronization started');
            FT.stopAutoFetch();
            Auth.dataCalculation.start();
            Task.view.toggleProgress(true);
            List.getList(function (lists) {
                if (lists.length > 0) {
                    for (var i = 0; i < lists.length; i++) {
                        (function (i) {
                            Task.getList(lists[i], function (list, tasks) {
                                lists[i].tasks = tasks;
                                if (processed++ === lists.length - 1) {
                                    List.view.toggleProgress(false);
                                    Task.view.toggleProgress(false);
                                    List.storage.set(lists, function () {
                                        logger.info('loadAll(): synchronization completed, time: ' + ((new Date()).getTime() - timeStart).toString() + ' ms, data transferred: ' + Auth.dataCalculation.getValue() + ' bytes');
                                        //Task.view.getSortModeManager().isMyOrder() && Task.view.getListEl().sortable('destroy');
                                        var list = List.getLastActive();
                                        delete list.tasks; // triggers refresh from storage
                                        EV.fire('list-selected', list); // updates last active
                                        EV.fire('lists-loaded', lists); // triggers lists view re-render and tasks load
                                        callback && callback(lists);
                                    });
                                }
                            }, false);
                        }(i));
                    }
                }
            });
        },

        /**
         * Fires on ERROR CODE 404
         * Tells entities to remove corresponding item
         * @param entity
         */
        onResourceNotFound: function (entity) {
            if (!entity) {
                return;
            }
            switch (entity.type) {
                case FT.getEntityTypes().LIST:
                    EV.fire('list-not-found', entity.id);
                    break;
                case FT.getEntityTypes().TASK:
                    // First making sure that list exists
                    List.getById(entity.listId, function (list) {
                        if (list) {
                            EV.fire('task-not-found', entity.id);
                        }
                    });
                    break;
                default:
                    utils.status.show('Resource not found');
            }
        },

        /**
         * Indicates if unrecoverable error was caught so that Auth should not proceed
         * @returns {Boolean}
         */
        unrecoverableErrorOccurred: function () {
            return unrecoverableErrorOccurred || false;
        },

        /**
         * Firefox OS confirm dialog
         * @param data
         *    h1: <header text>
         *    p: <message text>
         *    cancel: <cancel button label>
         *    ok: <confirm button label>
         *    action <confirm button action>
         *    recommend: <true to set ok button with 'recommend' class, 'danger' otherwise>
         *    hideCancel: <true to show confirm button only>
         */
        confirm: function (data) {

            var confirm = $('#confirm');
            confirm.find('h1').html(data.h1);
            confirm.find('p').html(data.p);
            confirm.find('#btn-confirm-cancel').html(data.cancel);
            confirm.find('#btn-confirm-ok').html(data.ok);

            if (data.recommend) {
                confirm.find('#btn-confirm-ok').removeClass('danger').addClass('recommend');
            } else {
                confirm.find('#btn-confirm-ok').removeClass('recommend').addClass('danger');
            }

            if (data.hideCancel) {
                confirm.find('form').first().append(confirm.find('#btn-confirm-cancel').hide());
            } else {
                confirm.find('#btn-confirm-ok').parent('menu').prepend(confirm.find('#btn-confirm-cancel').show());
            }

            confirm.removeClass('fade-out').addClass('fade-in');

            /* Listeners */
            confirm.unbind('click').on('click', '#btn-confirm-cancel', function () {
                confirm.removeClass('fade-in').addClass('fade-out');
            }).on('click', '#btn-confirm-ok', function () {
                confirm.removeClass('fade-in').addClass('fade-out');
                data.action && data.action();
            });
        },

        toggleSettings: function (value) {
            if (value) {
                Settings.showLayout();
            } else {
                Settings.hideLayout();
            }
        },

        // TODO: move to a more appropriate place?
        /**
         * Sets animation
         * Uses {@link Settings.get}
         */
        setAnimations: function () {
            var noAnimation = Settings.get('noAnimations');
            if (noAnimation === true) {
                document.getElementById('drawer').classList.add('no-animation');
                $('[data-position="back"]').addClass('no-animation');
                $('[data-type="edit"]').addClass('no-animation');
                $('label.pack-switch').addClass('no-animation');
                logger.info('setAnimations(): animations suppressing enabled');
            } else {
                document.getElementById('drawer').classList.remove('no-animation');
                $('[data-position="back"]').removeClass('no-animation');
                $('[data-type="edit"]').removeClass('no-animation');
                $('label.pack-switch').removeClass('no-animation');
                logger.info('setAnimations(): animations suppressing disabled');
            }
        },

        /**
         * Parses version number to integer number
         * @param {String} [versionString]
         * @returns {Number}
         */
        getVersionInteger: function (versionString) {
            versionString = versionString || FT.getVersion();
            return parseInt(versionString.replace(/\./g, ''));
        },

        getManifestUrl: function () {
            return manifestUrl;
        },

        isOnline: function (v) {
            if (typeof v === 'boolean') {
                isOnline = v;
                EV.fire('connection-' + (v ? 'online' : 'offline'));
            }
            return isOnline;
        },

        showInstructionalOverlay: function () {
            return showInstructionalOverlay();
        },

        getBodySize: function () {
            return {
                width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0,
                height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0
            };
        },

        getAccounts: function () {
            return this.accounts.data;
        },

        addNewAccount: function () {
            return this.accounts.add();
        }
    };

    var status = require('./lib/status').status,
        localforage = require('localforage'),
        EV = require('./lib/event-processor').EV,
        AccountsCollection = require('./collections/AccountsCollection'), //should be loaded ASAP
        _$ = require('./DomHelper'),
        constants = require('./constants'),
        utils = require('./utils'),
        logger = utils.logger,
        options = require('./options'),
        ViewManager = require('./ViewManager'),
        SettingsManager = require('./SettingsManager'),
        TaskListSortModeManager = require('./TaskListSortModeManager'),
        ActiveListManager = require('./ActiveListManager'),
        EditMode = require('./EditMode');

    /**
     * Main application object
     */
    var app = Object.create(null);

    app.init = function () {
        // Firefox OS-specific status popup, for some reason it should be initialized
        status.init();

        console.time('Application initialization');

        initjQuery();
        initGO2();
        updateConnectionStatus();
        showLogo();
        updateVersion();
        setVersionLabels();
        showWhatsNew();
        logger.level('INFO');
        patchOptions();
        initStorage();
        setListeners();
        //initSync();

        //FT.setAnimations();
        toggleSidebar();
        EditMode.init();
        ViewManager.init();

        //TODO: move
        _$('#btn-open-sidebar')[0].on('click', function (ev, el) {
            ev.preventDefault();
            _$('#drawer')[0].classList.toggle('visible');
        });

        //$('#btn-close-sidebar').on('click', function(ev, el) {
        //    ev.preventDefault();
        //    _$('#drawer')[0].classList.remove('visible');
        //});

        console.time('AccountsCollection.getAccounts()');
        var accounts = AccountsCollection.getAccounts();
        console.timeEnd('AccountsCollection.getAccounts()');
        accounts.populateCache()
            .then(SettingsManager.init)
            .then(TaskListSortModeManager.init)
            .then(function () {
                if (accounts.getLength() === 0) {
                    logger.warn('No accounts! Go to Settings and add new account.');
                    SettingsManager.showLayout();
                    return Promise.reject('No accounts! Go to Settings and add new account.');
                } else {
                    try {
                        var promises = [];
                        accounts.each(function (account) {
                            promises.push(account.lists.initFromStorage());
                        });
                        return Promise.all(promises);
                    } catch (e) {
                        logger.error(e);
                    }
                }
            })
            .then(function () {
                // delayed rendering
                accounts.render();
                return ActiveListManager.init(); // lists must be rendered at this point
            }).then(function () {
                console.timeEnd('Application initialization');
            }).catch(function (error) {
                if (Error.prototype.isPrototypeOf(error)) {
                    logger.error(error);
                    throw error;
                }
            });
    };

    module.exports = app;

}());
