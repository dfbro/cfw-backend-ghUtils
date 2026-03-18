PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS testTable (CustomerId INTEGER PRIMARY KEY, CompanyName TEXT, ContactName TEXT);
INSERT INTO "testTable" VALUES(1,'Alfreds Futterkiste','Maria Anders');
INSERT INTO "testTable" VALUES(4,'Around the Horn','Thomas Hardy');
INSERT INTO "testTable" VALUES(11,'Bs Beverages','Victoria Ashworth');
INSERT INTO "testTable" VALUES(13,'Bs Beverages','Random Name');