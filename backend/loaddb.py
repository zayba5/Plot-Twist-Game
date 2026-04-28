from models import *

def reset_tables():
    db.connect(reuse_if_open=True)
    table_list = [Story_Part, Voting, Story, Voting_Session, Voting_Category, 
                    Game_Players, Game_Settings, Game, App_User, Status, 
                    Story_Assignment, Round_State, Category_Score, Chat_Message]
    db.drop_tables(table_list, safe=True, cascade=True)
    db.create_tables(table_list, safe=True)
    Status.create(status_type="LOBBY")
    Status.create(status_type="IN_PROGRESS")
    Status.create(status_type="FINISHED")
    Status.create(status_type="ACTIVE")
    Status.create(status_type="WAITING")
    db.close()

if __name__ == "__main__":
	reset_tables()