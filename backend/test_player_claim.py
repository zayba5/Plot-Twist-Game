import uuid
from player_claims import claim_player_for_socket, release_player_for_socket

game_id = "01731b8d-0f53-42a2-9172-49674c247858"

print(claim_player_for_socket(game_id, "sid-1"))
print(claim_player_for_socket(game_id, "sid-2"))
print(claim_player_for_socket(game_id, "sid-3"))

print(release_player_for_socket("sid-1"))

print(claim_player_for_socket(game_id, "sid-4"))