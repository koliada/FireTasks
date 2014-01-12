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

Version 0.3 provides:

- Authentication with the Google Tasks API
- Retrieving task lists and tasks
- Creating, renaming and deletion of task lists
- Creation, modifying and deletion of tasks
- Marking tasks as completed/uncompleted from list
- Reordering tasks by dragging
- Package tasks processing (unstable): indenting, unindenting, moving to another list and mass deletion
- Firefox OS-native UI


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
Also, the great issue is processing tasks by packages in 'Edit Mode'.
If you see any abnormal behaviour, press the 'refresh' button in the sidebar for complete reload or 'refresh list' to reload current list.

Another issue is performance. There are two performance bottlenecks:

1. Really strange dragging lags. You can observe that lag while rearranging icons on the desktop.
So it is either Firefox OS's UI bug or simply device's low performance.
2. When processing tasks in bunch, it is important to make requests one by one
so that every item will surely know about current state of others and will move properly. That causes really long waiting time.
This kind of issue is not so easy to resolve and a problem of asynchronous synchronization will be solved at once in all project somewhere in version 2.0.

WARNING! Data loss is possible when using 'Edit Mode' for mass moving to another list.
This is caused by 'Server rate expiration' error and cannot be fixed right now.
It also may cause different collisions as there is no way to give a simple 'move to another list' command.
Instead, we need to remove task from one list and put it to another. For higher success possibility, move tasks by one.<br />
ATTENTION: tasks with children nodes are moved with those children for integrity.

Fire Tasks was tested on ZTE Open with Firefox OS v1.1 and on Firefox OS v1.2 and v1.3 simulators.
While on v1.1 everything works fine, there might be some problems on later versions, like glitching sidebar.

Report any issues here, on the [GitHub Issues](https://github.com/koliada/FireTasks/issues)
section, send them to [@alex_koliada](https://twitter.com/alex_koliada) in English
or send mail concerning Fire Tasks to alex.fiator@gmail.com with 'Fire Tasks' in a subject field.


Screenshots
-----------
<p align="center">
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-02-tree-view.png" alt="screenshot1" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-01-edit-mode.png" alt="screenshot2" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-03-task-lists.png" alt="screenshot3" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-04-list-actions.png" alt="screenshot4" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-05-list-modifying.png" alt="screenshot5" height="310">&nbsp;
<img src="https://raw.github.com/koliada/FireTasks/gh-pages/screenshots/firetasks-06-task-modifying.png" alt="screenshot6" height="310">&nbsp;
</p>