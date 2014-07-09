<p align="center">
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/images/logo.png" alt="logo">
</p>

Fire Tasks
============

A Google Tasks client for Firefox OS
--------------------------------------------

As there is no native Firefox OS Google Tasks client except their ugly online app, I made this one.
Fire Tasks provides basic capabilities to work with your tasks and is aimed to bring Google Tasks into Firefox OS's ecosystem.


Features
--------

Although Fire Tasks is in an early beta and does not have many useful features,
it is functional and surely can bring you relief if you tend to use Google Tasks on other platforms.

Version 0.7.1 provides:

- Authentication with the Google Tasks API
- Retrieving task lists and tasks
- Task lists creating, renaming and removal
- Tasks creation, modifying and removal
- Marking tasks as completed/uncompleted from list
- Reordering tasks by dragging
- Package tasks processing: indenting, unindenting, moving to another list and mass deletion
- Offline work (with limitations on creation, unstable)
- Alphabetical sorting of tasks
- Exporting task list to text file
- Firefox OS-native UI
- Tablet UI (1280px and up of display width)


Installing and using
--------------------

Fire Tasks is available on [Firefox Marketplace](https://marketplace.firefox.com/app/fire-tasks/).
You can use Fire Tasks online by visiting
[koliada.github.io/FireTasks](http://koliada.github.io/FireTasks).
While using Fire Tasks on Firefox OS you will be proposed to install the app to you phone.


Known issues
------------

I still have issues with Google OAuth, so sometimes issues of any kind may occur.
If you observe any abnormal behaviour, press the 'refresh' button in the sidebar to force re-sync local data (reloads lists and active list tasks).
If it doesn't help, restart the app.

If you suspect that app was not completely updated to the newest version, go to Settings and hit 'Force update'
(seems like this operation won't work on Firefox OS due to security policy).

Another issue is performance. There are two performance bottlenecks:

1. Really strange dragging lags. You can observe that lag while rearranging icons on the desktop.
So it is either Firefox OS's UI bug or simply device's low performance.
2. Operations that require task to be created are slower than others.
It is caused by a necessity to retrieve the id of newly created task before updating local data

ATTENTION: tasks with children nodes are moved with those children for integrity.

Also, one day you can see a 'Daily Limit Exceeded' message.
This is an unrecoverable situation and server will continue to process requests next day only.
I'm working on it.

Fire Tasks was tested on US ZTE Open with Firefox OS v1.1 and v1.3, and on the Firefox OS v1.1 - v1.5 simulators.

Report any issues here, on the [GitHub Issues](https://github.com/koliada/FireTasks/issues)
section, send them to [@alex_koliada](https://twitter.com/alex_koliada) in English
or send mail concerning Fire Tasks to alex.fiator@gmail.com with 'Fire Tasks' in the subject field.


TODO
----
<pre>
<b>Features</b>
- Full offline work support (offline list and task creation)
- Due date field & notifications
- Tasks sorting
-- <s>alphabetical</s>
-- by date
- <s>Task list sharing</s>
- Displaying recently deleted/completed tasks
- Multiple accounts
- Theme switching (light/dark)
- <s>Force update (currently not working on Firefox OS)</s> Not necessary when app will be released as packaged

<b>Bugs</b>
- Long press event sometimes calls click event too
- Chrome cancel button displaying issues (dialogs)
- <s>Dropdowns displaying issues (hide arrows)</s>
- <s>Offline work: restoring task queue from storage</s>

<b>Improvements</b>
- <s>Push notifications / background synchronizing</s> - Seems that this won't work
- <s>Stretching task to display full contents</s>
- Option to suppress some animations to improve performance - implemented but not enabled due to issues in Firefox
- <s>Handle case when user closes Google's authentication dialog</s>
- Better drag&drop
- Localization
- <s>Long press on task list</s>
- Better authentication and requests processing
- Make first input active on forms activation
- Automatic lists and forms scrolling to relevant position
- Actualize screenshots when tasks actions are implemented
</pre>


Contribute
----------
Contributors are welcomed!
Either you can write code or help translate Fire Tasks to your language, feel free to contact me in any convenient way.


Changelog
----------
<pre>
Version 0.7.1
- Special background dialog that opens when authentication is needed implemented
- Critical bug concerning task indention/unindention in offline mode fixed
- Internal changes & small bug fixes

Version 0.7.0
- Task list alphabetical sort
- Task list exporting (plus setting to ignore completed tasks)
- Internal changes & bug fixes

Version 0.6.0
- More intelligent synchronization & offline mode fixes
- Only one synchronization method left - complete update
- Force update function removed (it cannot work on Firefox OS anyway)
- Internal changes & bug fixes

Version 0.5.6
- Tap & hold on task to enter Edit Mode

Version 0.5.5
- Task content is now completely visible
- Sync on launch and list opening now enabled by default

Version 0.5.4
- Same features that 0.5.1 provides
- Critical bugs fixed (infinite loop on sync error; sync error on quick indent/unindent buttons clicking)

Version 0.5.3
- Same features that 0.5.1 provides
- Source files minified
- Analytics code added

Version 0.5.2
- Same features that 0.5.1 provides
- Better version updating
- Setting for force update

Version 0.5.1
- List actions on tap&hold; vibrate on long press (can be disabled in settings)
- Minor sorting update
- Refactoring continues
- Many fixes and improvements

Version 0.5
- Huge refactoring continued
- Offline storage implemented, immediate UI responsiveness
- Great amount of fixes and improvements

Version 0.4 (internal)
- Huge refactoring started
- Storing tasks locally for more fluid UI

Version 0.3.1
- Tablet UI

Version 0.3
- Constant tree view mode
- Rearranging tasks in tree view
- Mass processing tasks in 'Edit Mode'
- 'Refresh List' button

Version 0.2.3
- Reordering tasks in plain view mode

Version 0.2.2
- Automatic updates

Version 0.2
- Tree view (unstable)

Version 0.1
- First public version
- Actually I don't exactly remember what features were here
</pre>


Screenshots
-----------
<p align="center">
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-01-setup.png" alt="screenshot1" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-02-setup.png" alt="screenshot2" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-03-task-lists.png" alt="screenshot3" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-04-list-actions.png" alt="screenshot4" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-05-task-list.png" alt="screenshot5" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-06-edit-mode.png" alt="screenshot6" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-07-task-form.png" alt="screenshot7" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-08-settings.png" alt="screenshot8" height="250">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-09-tablet-ui.png" alt="screenshot9" height="250">&nbsp;
</p>
