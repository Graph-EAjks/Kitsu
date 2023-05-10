# Permissions

Kitsu proposes a simple permission scheme to manage your productions. To set
permissions for a user, go to the employee page and grant him with one of the
following role:


## Artist

Artists can only display the production of which they are part of.
They can only comment tasks, upload media, and change their status when they are assigned to it. They only have access to a limited number of status as the Studio manager defines it.

They can:

* create personal filters on the global page and Task Type page.
* assign and clear assignation for themselves on their department tasks.
* create playlist-on-the-fly for every shots or assets, but won't be able to save this playlist.
* can't see client comments.

The Artist has access to all the features of the production, but only for display.



## Department Supervisor

Department supervisors inherit Artist permissions.

Department supervisors have read and write access to their department(s) they work on:
assets, shots, tasks, assignations, statistics, breakdown, and playlists.

They can:

* assign task to their team artist (same department)
* post comment on all tasks or their department(s)
* add/edit a playlist for the studio or the client.
* see the client comments and validations.
* see comment on other departments.

They are not allowed to access the studio team, the main timesheets, and the
production list. They can't define task types, task statuses, and asset types
neither.
they can't comment on other departments than theirs, they can't assign artist from other department.


## Production Manager

Production managers inherit Department supervisor permissions.

Production managers have read and write access to their production they work on:
assets, shots, tasks, assignations, statistics, breakdown, and playlists.

They can:

* create assets and shots, per hand, or CSV batch import.
* post comment on all tasks
* add a task column
* delete or add a task.
* add/edit a playlist for the studio or the client.
* see the client comments and validations.

They are not allowed to access the studio team, the main timesheets, and the
production list. They can't define task types, task statuses, and asset types
neither.


## Studio Manager

Admin has read and write access to everything.


### Create and edit a production

The Studio Manager can create a new production, define its type,
FPS, Ratio, and Resolution, and add a cover picture. H
e can also edit and delete any production.


### Manage the studio

The Studio Manager sees everything in the studio:

* all the productions
* the global timesheets page
* the people in the studio
* the main schedule

In the People page, The Studio Manager **defines the permission of each user**.

They can also:

* customize Kitsu: add and modify the task types, the task status, and the asset types.
* set permission roles (artist, client and status).
* customize the studio information as name Kitsu as the studio, add the company logo, and define the number of hours per day of work.
* choose to use the original filename to download the media or not.

### Manage productions

They have full access to all productions:

* They have same permission as the supervisor.
* And they can add a task column but can also delete one.
* They are allowed to create custom metadata columns.


## Client

The client can only display the production of which they are part of.

They see:

* the global page of the assets/shots.
* the stats pages.
* Client playlists with limited access to task status when they post a comment
* Only the Supervisors and the Studio Manager can see the Client retake or validation.

They don't see:

* assignations
* comments that they didn't write


## Vendor

Vendors have similar permissions than artists. The only difference is that they see only the tasks they are assigned to.
