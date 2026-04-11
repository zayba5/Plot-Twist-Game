import random
import uuid

from models import Game, Story, Story_Part, App_User
from models import Story_Assignment


def get_stories_for_game(game):
    return list(Story.select().where(Story.game_id == game))


def get_players_for_game(game):
    raise NotImplementedError("Implement player lookup for this game")


def all_players_submitted(game, inner_round_number, players):
    submitted_user_ids = set(
        part.user_id.user_id
        for part in (
            Story_Part
            .select(Story_Part, Story)
            .join(Story)
            .where(
                (Story.game_id == game) &
                (Story_Part.part_number == inner_round_number)
            )
        )
    )

    expected_user_ids = set(player.user_id for player in players)
    return expected_user_ids.issubset(submitted_user_ids)

def build_non_self_assignment(players, stories):
    """
    players: list of User objects
    stories: list of Story objects

    Returns dict {user_id: story}
    """
    if len(players) != len(stories):
        raise ValueError("Number of players must equal number of stories")

    shuffled = stories[:]

    for _ in range(100):
        random.shuffle(shuffled)

        valid = True
        for player, story in zip(players, shuffled):
            # Replace story.owner_id with your real field
            if hasattr(story, "owner_id") and story.owner_id == player:
                valid = False
                break

        if valid:
            return {
                player.user_id: story
                for player, story in zip(players, shuffled)
            }

    raise ValueError("Could not build a valid non-self assignment")

def save_assignments(game, inner_round_number, assignment_map):
    from models import StoryAssignment

    for user_id, story in assignment_map.items():
        StoryAssignment.create(
            assignment_id=uuid.uuid4(),
            game_id=game,
            inner_round_number=inner_round_number,
            user_id=user_id,
            story_id=story
        )

def assign_next_round_if_ready(game, userId, current_round_number):
    players = userId

    if not all_players_submitted(game, current_round_number, players):
        return False

    stories = get_stories_for_game(game)
    assignment_map = build_non_self_assignment(players, stories)
    save_assignments(game, current_round_number + 1, assignment_map)

    return True