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

Fire Tasks is in an early beta and does not have many useful features,
but it is functional and probably could bring you relief if you love to use Google Tasks on other platforms,
but you couldn't use it on your Firefox OS phone.

Version 0.2.2 provides:

 - Authentication with the Google Tasks API
 - Retrieving task lists and tasks
 - Creating, renaming and deletion of task lists
 - Creation, modifying and deletion of tasks
 - Marking tasks as completed/uncompleted from list
 - Reordering tasks in plain view mode — only those which doesn't have parent tasks ([screenshot](https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-01-plain-view.png)).
 - Viewing and processing tasks as trees (unstable)
 - Firefox OS-native UI

Although you can now reorder your tasks, it is not available in tree view and works rather slowly on real device.
So you should expect further improvements.


Installing and using
--------------------

Fire Tasks is available on [Firefox Marketplace](https://marketplace.firefox.com/app/fire-tasks/).
You can use Fire Tasks online with your desktop, Android browser or whatever has got internet browser by visiting
[koliada.github.io/FireTasks](http://koliada.github.io/FireTasks).
While using Fire Tasks on Firefox OS you will be proposed to install the app to you phone. Working in the Firefox OS browser is not guaranteed.
<br />
If you want to open Fire Tasks locally, rename the manifest.webapp to original_manifest.webapp or somewhat and rename local_manifest.webapp to manifest.webapp.
That is necessary to use root path for launch.


Known issues
------------

I still have issues with Google OAuth, so sometimes cases of any type are expected.
For example, you surely will not be able to open OAuth popup from the Firefox OS native browser.
Also, it is important to remember that the tree view of the task list is currently unstable and is not recommended for usage
(that's why it is set to 'OFF' by default). But you of course can use it by you own risk.
The biggest issue here is updating the tasks. If you see any abnormal behaviour, press the 'refresh' button in the sidebar.

Fire Tasks was tested on ZTE Open with Firefox OS v1.1 and on Firefox OS v1.2 and v1.3 simulators.
While on v1.1 everything works fine, there might be some problems on later versions, like glitching drawer (sidebar).

Report any issues here, on the [GitHub Issues](https://github.com/koliada/FireTasks/issues)
section, send them to [@alex_koliada](https://twitter.com/alex_koliada) in English
or send mail concerning Fire Tasks to alex.fiator@gmail.com with 'Fire Tasks' in a subject field.


Screenshots
-----------
<p align="center">
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-02-tree-view.png" alt="screenshot2" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-03-task-lists.png" alt="screenshot3" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-04-list-actions.png" alt="screenshot4" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-05-list-modifying.png" alt="screenshot5" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-06-task-modifying.png" alt="screenshot6" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-07-settings.png" alt="screenshot7" height="310">&nbsp;
</p>