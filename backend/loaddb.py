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
    
    funny = Voting_Category.create(
        title = "Which story is the funniest?",
        tag = "Funniest"
    )
    
    serious = Voting_Category.create(
        title = "Which story is the most serious?",
        tag = "Serious"    
    )
    
    unexpected = Voting_Category.create(
        title = "Which story is the most unexpected?",
        tag = "Unexpected"
    )
    
    plotTwist = Voting_Category.create(
        title = "Which story had the biggest plot twist?",
        tag = "Plot twist"
    )
    
    character = Voting_Category.create(
        title = "Which story has the most interesting characters?",
        tag = "Strong Characters"
    )
    
    spooky = Voting_Category.create(
        title = "Which story is the spookiest?",
        tag = "Spooky"
    )
    db.close()

if __name__ == "__main__":
	reset_tables()