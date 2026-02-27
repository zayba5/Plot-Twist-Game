from peewee import *

db = PostgresqlDatabase("project", user="postgres", password="helena", host="127.0.0.1", port=5432, prefer_psycopg3=True)

class BaseModel(Model):
    class Meta:
        database = db


class DefaultTable(BaseModel):
    textEntry = CharField()



