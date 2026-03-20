import uuid
from player_claims import claim_player_for_socket, release_player_for_socket

game_id = "8b5404ae-f8c1-4b80-b4f5-18fa08ecdd5e"

print(claim_player_for_socket(game_id, "sid-1"))
print(claim_player_for_socket(game_id, "sid-2"))
print(claim_player_for_socket(game_id, "sid-3"))

print(release_player_for_socket("sid-1"))

print(claim_player_for_socket(game_id, "sid-4"))