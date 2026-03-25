from models import *

def reset_tables():
    db.connect(reuse_if_open=True)
    db.drop_tables([Story_Part, Voting, Story, Voting_Session, Voting_Category, 
                    Game_Players, Game_Settings, Game, User, Status, 
                    Story_Assignment, Round_State], safe=True, cascade=True)
    db.create_tables([Status, User, Game, Game_Settings, Game_Players, Voting_Category,
                      Voting_Session, Story, Voting, Story_Part, Story_Assignment, Round_State], safe=True)
    db.close()

if __name__ == "__main__":
	reset_tables()