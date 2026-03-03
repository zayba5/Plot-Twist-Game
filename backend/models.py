from peewee import *
import os
from dotenv import load_dotenv

load_dotenv()

db = PostgresqlDatabase("project", user=os.getenv("user"), password=os.getenv("pass"), host=os.getenv("host"), port=os.getenv("port"), prefer_psycopg3=True)

class BaseModel(Model):
    class Meta:
        database = db


class DefaultTable(BaseModel):
    textEntry = CharField()



