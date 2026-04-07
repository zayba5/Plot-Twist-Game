from peewee import *
import os
from dotenv import load_dotenv
import random
from datetime import *

##initialization
load_dotenv()

db = PostgresqlDatabase("project", user=os.getenv("user"), password=os.getenv("pass"), host=os.getenv("host"), port=os.getenv("port"), prefer_psycopg3=True)


class BaseModel(Model):
    class Meta:
        database = db

##models
class Status(BaseModel):
    status_id = AutoField(primary_key=True) ##primary key
    status_type = CharField(max_length=20)
    
    
class User(BaseModel):
    user_id = UUIDField(primary_key=True) ##primary key  
    username = CharField(max_length=50)
    password_hash = BlobField(null=True)
    
class Game(BaseModel):
    game_id = UUIDField(primary_key=True) ##primary key
    game_status = ForeignKeyField(Status, backref="game") ##refers to status type 
    game_host = ForeignKeyField(User, backref="host-game")
    game_code = CharField(max_length=6, unique=True) ##edit
    

class Game_Settings(BaseModel):
    game_id = ForeignKeyField(Game, backref="settings", primary_key=True) ##PK is just game_id for now until we actually flesh out settings and decide what is needed
    num_rounds = IntegerField()
    num_votes = IntegerField()
    timer = IntegerField() ##intended to be an integer number of seconds but can be changed to a time item
    vote_timer = IntegerField()
    max_players = IntegerField()
    
class Game_Players(BaseModel):
    game_id = ForeignKeyField(Game, backref="player")
    user_id = ForeignKeyField(User, backref="player")
    user_score = IntegerField(default=0)
    
    class Meta:
        primary_key = CompositeKey('game_id', 'user_id')

class Story(BaseModel):
    story_id = UUIDField(primary_key=True) ##primary key
    parent_story = ForeignKeyField("self", null=True) # for storing the parent id, null if fresh head
    game_id = ForeignKeyField(Game, backref="story")
    user_id = ForeignKeyField(User, backref="stories")
    outer_round_number = IntegerField() # stores round of voting (outer loop)
    is_winner_cont = BooleanField(default=False)
    is_winner_cat_1 = BooleanField(default=False)
    is_winner_cat_2 = BooleanField(default=False)
    
    
class Voting_Category(BaseModel):
    title = TextField()
    tag = TextField()
    category_id = AutoField(primary_key = True)
    
class Voting_Session(BaseModel):
    voting_session_id = UUIDField(primary_key=True) ##primary key
    game_id = ForeignKeyField(Game, backref="vote")
    voting_session_number = IntegerField()
    voting_session_status = ForeignKeyField(Status, backref="vote")
    continuing_story = ForeignKeyField(Story, backref="voting_session_winner", null=True)
    cat_1 = ForeignKeyField(Voting_Category, backref="session")
    cat_2 = ForeignKeyField(Voting_Category, backref="session")
    timer_ends_at = DateTimeField(null=True)
    
    
    
class Voting(BaseModel):
    user_id = ForeignKeyField(User, backref="vote")
    story_id = ForeignKeyField(Story, backref="vote")
    voting_session_id = ForeignKeyField(Voting_Session, backref="story")
    voting_stage = IntegerField()
    
    class Meta:
        primary_key = CompositeKey("user_id", "voting_session_id", "voting_stage")


class Story_Part(BaseModel):
    part_id = UUIDField(primary_key=True)
    created_at = DateTimeField(default=lambda: datetime.now(timezone.utc))
    part_number = IntegerField()
    part_content = TextField()
    user_id = ForeignKeyField(User, backref="part")
    story_id = ForeignKeyField(Story, backref="part")
class Story_Assignment(BaseModel):
    assignment_id = UUIDField(primary_key=True)
    game_id = ForeignKeyField(Game, backref="assignments")
    inner_round_number = IntegerField()
    user_id = ForeignKeyField(User, backref="assignments")
    story_id = ForeignKeyField(Story, backref="assignments")
    class Meta:
        indexes = (
            (("game_id", "inner_round_number", "user_id"), True),
        )

class Round_State(BaseModel):
    round_state_id = UUIDField(primary_key=True)
    game_id = ForeignKeyField(Game, backref="round_states")
    inner_round_number = IntegerField()
    assignments_generated = BooleanField(default=False)

    class Meta:
        indexes = (
            (("game_id", "inner_round_number"), True),
        )