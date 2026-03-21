start by reading claude.md, make a small change of the database, currently there are 2 relationships between users and classes, classes has one extra column which is a tutor_id(fk from users), we don't need that column and that relationship. so remove it and update the related codes properly.

* ask questions if you need to. or provide recommendations before starting the task if you think it's necessary.
* and update the claude.md accordingly.




1. of course not delete the other tables, I just meant you to update that 3 mentioned tables.
2. yes, add @unique to classCode.
3. yes, Cascade deletes.
