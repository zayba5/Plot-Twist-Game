from peewee import *
from config import *

db = PostgresqlDatabase("project", user=config['user'], password=config["pass"], host=config["host"], port=config["port"], prefer_psycopg3=True)

class BaseModel(Model):
    class Meta:
        database = db


class DefaultTable(BaseModel):
    textEntry = CharField()



