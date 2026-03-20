# this file is for browser instance to claim a player Id 
# from DB to work on a story
# once a player ID is claimed it cannot be reassigned 
# to other browser instance until the connection is terminated

import uuid
from models import Game, Game_Players

claimed_players_by_game = {}   # {game_id: {player_id: socket_sid}}
socket_to_claim = {}           # {socket_sid: {"game_id": ..., "player_id": ...}}

def claim_player_for_socket(game_id, sid):
    print("claim attempt sid:", sid, "game_id:", game_id)
    existing = socket_to_claim.get(sid)
    if existing:
        return {
            "ok": True,
            "game_id": existing["game_id"],
            "player_id": existing["player_id"],
        }

    try:
        game_uuid = uuid.UUID(str(game_id))
    except ValueError:
        return {"ok": False, "error": "invalid game_id"}

    game = Game.get_or_none(Game.game_id == game_uuid)
    if not game:
        return {"ok": False, "error": "game not found"}

    players = list(
        Game_Players
        .select()
        .where(Game_Players.game_id == game)
        .order_by(Game_Players.user_id)
    )

    if not players:
        return {"ok": False, "error": "no players found for game"}

    game_key = str(game.game_id)
    claimed_players_by_game.setdefault(game_key, {})
    claimed_ids = set(claimed_players_by_game[game_key].keys())

    for gp in players:
        player_id = str(gp.user_id.user_id)
        if player_id not in claimed_ids:
            claimed_players_by_game[game_key][player_id] = sid
            socket_to_claim[sid] = {
                "game_id": game_key,
                "player_id": player_id,
            }
            return {
                "ok": True,
                "game_id": game_key,
                "player_id": player_id,
            }

    return {"ok": False, "error": "no available player slots"}

def release_player_for_socket(sid):
    claim = socket_to_claim.pop(sid, None)
    if not claim:
        return None

    game_id = claim["game_id"]
    player_id = claim["player_id"]

    game_claims = claimed_players_by_game.get(game_id, {})
    if game_claims.get(player_id) == sid:
        del game_claims[player_id]

    if not game_claims:
        claimed_players_by_game.pop(game_id, None)

    return claim