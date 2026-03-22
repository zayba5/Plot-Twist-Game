from models import Voting, Voting_Session, Game_Players, Status, Story_Part, Game
import uuid
from peewee import fn

def getActiveVotingSession(game):
    return (
        Voting_Session.select().join(Status)
        .where(
            (Voting_Session.game_id == game) &
            (Status.status_type == "ACTIVE")
            )
        .get_or_none()
            )

def calcVotes(game, active_session):    
    vote_results = list(
        Voting.select(
            Voting.story_id,
            fn.COUNT(Voting.story_id).alias("vote_count")
        )
        .where(Voting.voting_session_id == active_session)
        .group_by(Voting.story_id)
        .order_by(fn.COUNT(Voting.story_id).desc())
    )

    if not vote_results:
        return {
            "winning_story_ids": [],
            "is_tie": False,
            "vote_count": 0,
        }

    max_votes = vote_results[0].vote_count
    winners = [row.story_id for row in vote_results if row.vote_count == max_votes]

    awarded_users = set()
                
    for winning_story in winners:
        winning_writers = (
            Story_Part
            .select(Story_Part.user_id)
            .where(Story_Part.story_id == winning_story)
            .distinct()
        )

        for part in winning_writers:
            user_id = str(part.user_id.user_id if hasattr(part.user_id, "user_id") else part.user_id)

            if user_id in awarded_users:
                continue

            awarded_users.add(user_id)

            game_player = Game_Players.get_or_none(
                (Game_Players.game_id == game) &
                (Game_Players.user_id == part.user_id)
            )

            if game_player:
                game_player.user_score += 1
                game_player.save()

    return {
        "winning_story_ids": [str(story.story_id if hasattr(story, "story_id") else story) for story in winners],
        "is_tie": len(winners) > 1,
        "vote_count": int(max_votes),
    }
        
        
def finishVotingSession(reason, game_id, socketio):
    try:
        game_uuid = uuid.UUID(str(game_id))
    except ValueError:
        return False

    game = Game.get_or_none(Game.game_id == game_uuid)
    if not game:
        return False

    active_status = Status.get(Status.status_type == "ACTIVE")
    finished_status = Status.get(Status.status_type == "FINISHED")

    active_session = getActiveVotingSession(game)

    if not active_session:
        print(f"round already finished for game {game_id}", flush=True)
        return False

    rows_updated = (
        Voting_Session
        .update(voting_session_status=finished_status)
        .where(
            (Voting_Session.voting_session_id == active_session.voting_session_id) &
            (Voting_Session.voting_session_status == active_status)
        )
        ##.execute() <--------------------commented out for testing, add back later
    )

    if rows_updated == 0:
        print(f"another request already finished game {game_id}", flush=True)
        return False

    calcVotes(game, active_session)

    socketio.emit(
        "round_over",
        {
            "game_id": str(game.game_id),
            "voting_session_id": str(active_session.voting_session_id),
            "reason": reason,
        },
        to=f"game:{game.game_id}"
    )

    return True