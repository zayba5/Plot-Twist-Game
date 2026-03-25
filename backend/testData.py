import uuid
from models import *

def testData():
    db.connect(reuse_if_open=True)

    # statuses
    waiting = Status.create(
        status_type="WAITING"
    )

    active = Status.create(
        status_type="ACTIVE"
    )

    finished = Status.create(
        status_type="FINISHED"
    )
    
    funny = Voting_Category.create(
        title = "Which story is the funniest?"
    )
    
    serious = Voting_Category.create(
        title = "Which story is the most serious?"    
    )
    
    unexpected = Voting_Category.create(
        title = "Which story is the most unexpected?"
    )
    
    plotTwist = Voting_Category.create(
        title = "Which story had the biggest plot twist?"
    )
    
    character = Voting_Category.create(
        title = "Which story has the most interesting characters?"
    )
    
    spooky = Voting_Category.create(
        title = "Which story is the spookiest?"
    )
    

    # users
    host = User.create(user_id=uuid.uuid4())
    user2 = User.create(user_id=uuid.uuid4())
    user3 = User.create(user_id=uuid.uuid4())
    user4 = User.create(user_id=uuid.uuid4())

    # game
    game = Game.create(
        game_id="01731b8d-0f53-42a2-9172-49674c247858",
        game_status=waiting,
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
        voting_session_status=active,
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
    Voting.create(user_id=host, story_id=story2, voting_session_id=voting_session)
    Voting.create(user_id=user2, story_id=story1, voting_session_id=voting_session)
    Voting.create(user_id=user3, story_id=story1, voting_session_id=voting_session)
    Voting.create(user_id=user4, story_id=story2, voting_session_id=voting_session)

    db.close()


if __name__ == "__main__":
    testData()