from models import Voting, Voting_Session, Game_Players, Status, Story_Part, Game, Story
import uuid
from peewee import fn
import random

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
    stage_results = {}

    for stage in [1, 2, 3]:
        vote_results = list(
            Voting.select(
                Voting.story_id,
                fn.COUNT(Voting.story_id).alias("vote_count")
            )
            .where(
                (Voting.voting_session_id == active_session) &
                (Voting.voting_stage == stage)
            )
            .group_by(Voting.story_id)
            .order_by(fn.COUNT(Voting.story_id).desc())
        )

        if not vote_results:
            stage_results[f"stage_{stage}"] = {
                "winning_story_ids": [],
                "is_tie": False,
                "vote_count": 0,
            }
            continue

        max_votes = vote_results[0].vote_count
        winners = [row.story_id for row in vote_results if row.vote_count == max_votes]

        for winning_story in winners:
            story_obj = Story.get_or_none(Story.story_id == winning_story)
            if story_obj:
                if stage == 1:
                    story_obj.is_winner_cat_1 = True
                elif stage == 2:
                    story_obj.is_winner_cat_2 = True
                elif stage == 3:
                    story_obj.is_winner_cont = True
                story_obj.save()

            winning_parts = (
                Story_Part
                .select()
                .where(Story_Part.story_id == winning_story)
            )

            for part in winning_parts:
                game_player = Game_Players.get_or_none(
                    (Game_Players.game_id == game) &
                    (Game_Players.user_id == part.user_id)
                )

                if game_player:
                    game_player.user_score += 1
                    game_player.save()

        stage_results[f"stage_{stage}"] = {
            "winning_story_ids": [
                str(story.story_id) if hasattr(story, "story_id") else str(story)
                for story in winners
            ],
            "is_tie": len(winners) > 1,
            "vote_count": int(max_votes),
        }

    stage_1_winners = stage_results["stage_1"]["winning_story_ids"]
    if stage_1_winners:
        active_session.continuing_story_id = random.choice(stage_1_winners)
        active_session.save()

    return stage_results
        
        
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

def checkStatus(active_session, game):
    total_votes = Voting.select().where(
        Voting.voting_session_id == active_session
    ).count()

    total_players = Game_Players.select().where(
        Game_Players.game_id == game
    ).count()

    return total_players > 0 and total_votes >= (total_players * 3) 