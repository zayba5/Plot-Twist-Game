from models import *
import bcrypt
import os

try:
	os.remove("project.db")
except OSError:
	pass

db.create_tables([DefaultTable], safe=True)

DefaultTable.create(textEntry = "This is a default db entry to test connection")
