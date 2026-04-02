import uuid
from models import *

def testData():
    db.connect(reuse_if_open=True)

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
    

    # users
    host = User.create(user_id=uuid.uuid4(), username="Player 1")
    user2 = User.create(user_id=uuid.uuid4(), username="Player 2" )
    user3 = User.create(user_id=uuid.uuid4(), username="Player 3")
    user4 = User.create(user_id=uuid.uuid4(), username="Player 4")

    # game
    game = Game.create(
        game_id="01731b8d-0f53-42a2-9172-49674c247858",
        game_status=5,
        game_host=host,
        game_code="pants"
    )

    # settings
    Game_Settings.create(
        game_id=game,
        num_rounds=4,
        num_votes=2,
        timer=60,
        max_players=6,
        vote_timer=300
    )

    # players
    Game_Players.create(game_id=game, user_id=host)
    Game_Players.create(game_id=game, user_id=user2)
    Game_Players.create(game_id=game, user_id=user3)
    Game_Players.create(game_id=game, user_id=user4)

    # voting session
    voting_session = Voting_Session.create(
        voting_session_id=uuid.uuid4(),
        game_id=game,
        voting_session_number=1,
        voting_session_status=4,
        cat_1 = spooky,
        cat_2 = character
    )

    # stories
    story1 = Story.create(
        story_id=uuid.uuid4(),
        game_id=game,
        user_id=host
    )

    story2 = Story.create(
        story_id=uuid.uuid4(),
        game_id=game,
        user_id=user2
    )
    
    story3 = Story.create(
        story_id=uuid.uuid4(),
        game_id=game,
        user_id=user3
    )
    
    story4 = Story.create(
        story_id=uuid.uuid4(),
        game_id=game,
        user_id=user4
    )

    # story parts
    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=1,
        part_content="Once upon a time...",
        user_id=host,
        story_id=story1
    )

    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=2,
        part_content="The dragon appeared.",
        user_id=user2,
        story_id=story1
    )

    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=1,
        part_content="In a distant galaxy...",
        user_id=user3,
        story_id=story2
    )
    
    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=2,
        part_content="Far far away.",
        user_id=user4,
        story_id=story2
    )
    
    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=1,
        part_content="Once upon a time...",
        user_id=host,
        story_id=story3
    )

    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=2,
        part_content="The dragon appeared.",
        user_id=user2,
        story_id=story3
    )

    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=1,
        part_content="In a distant galaxy...",
        user_id=user3,
        story_id=story4
    )
    
    Story_Part.create(
        part_id=uuid.uuid4(),
        part_number=2,
        part_content="Far far away.",
        user_id=user4,
        story_id=story4
    )

    # votes
    ##stage 1 - story 1 and 2 ties
    Voting.create(user_id=host, story_id=story2, voting_session_id=voting_session, voting_stage=1)
    Voting.create(user_id=user2, story_id=story1, voting_session_id=voting_session, voting_stage=1)
    Voting.create(user_id=user3, story_id=story1, voting_session_id=voting_session, voting_stage=1)
    Voting.create(user_id=user4, story_id=story2, voting_session_id=voting_session, voting_stage=1)

    ##stage 2 - story 3 wins
    Voting.create(user_id=host, story_id=story3, voting_session_id=voting_session, voting_stage=2)
    Voting.create(user_id=user2, story_id=story3, voting_session_id=voting_session, voting_stage=2)
    Voting.create(user_id=user3, story_id=story3, voting_session_id=voting_session, voting_stage=2)
    Voting.create(user_id=user4, story_id=story4, voting_session_id=voting_session, voting_stage=2)

    ##stage 3 - story 2 wins
    Voting.create(user_id=host, story_id=story2, voting_session_id=voting_session, voting_stage=3)
    Voting.create(user_id=user2, story_id=story2, voting_session_id=voting_session, voting_stage=3)
    Voting.create(user_id=user3, story_id=story1, voting_session_id=voting_session, voting_stage=3)
    Voting.create(user_id=user4, story_id=story2, voting_session_id=voting_session, voting_stage=3)

    db.close()


if __name__ == "__main__":
    testData()