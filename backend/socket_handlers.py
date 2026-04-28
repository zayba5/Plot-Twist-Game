import uuid
from flask import session
from flask_socketio import join_room, leave_room, emit

from models import Game, Game_Players, App_User, Status
from util import (
    get_user_from_cookie,
    get_active_game_from_user,
    finishVotingSession,
    isFinalSession,
    getLastVotingSession
)

results_ready = {}

def register_socket_handlers(socketio, signer):
    @socketio.on("join_game")
    def handle_join_game(data):
        game_id = data.get("game_id")
        if not game_id:
            print("join_game: missing game_id")
            return

        room_name = f"game:{game_id}"
        join_room(room_name)
        print(f"join_game: joined {room_name}")


    @socketio.on("leave_game")
    def handle_leave_game(data):
        game_id = data.get("game_id")
        if not game_id:
            print("leave_game: missing game_id")
            return

        room_name = f"game:{game_id}"
        leave_room(room_name)
        print(f"leave_game: left {room_name}")


    @socketio.on("send_message")
    def handle_send_message(data):
        print("send_message received:", data)

        game_id = data.get("game_id")
        user_id = data.get("user_id")
        text = (data.get("text") or "").strip()
        time = data.get("time")

        if not user_id:
            print("send_message blocked: no user_id in payload")
            return

        if not game_id:
            print("send_message blocked: no game_id")
            return

        if not text:
            print("send_message blocked: empty text")
            return

        try:
            game_uuid = uuid.UUID(str(game_id))
            user_uuid = uuid.UUID(str(user_id))
        except ValueError:
            print("send_message blocked: invalid UUID")
            return

        game = Game.get_or_none(Game.game_id == game_uuid)
        if not game:
            print("send_message blocked: game not found")
            return

        user = App_User.get_or_none(App_User.user_id == user_uuid)
        if not user:
            print("send_message blocked: user not found")
            return

        membership = Game_Players.get_or_none(
            (Game_Players.game_id == game) &
            (Game_Players.user_id == user)
        )
        if not membership:
            print("send_message blocked: user not in lobby")
            return

        room_name = f"game:{game.game_id}"

        emit(
            "receive_message",
            {
                "game_id": str(game.game_id),
                "user_id": str(user.user_id),
                "username": user.username,
                "text": text,
                "time": time,
            },
            to=room_name
        )

        print(f"send_message emitted to {room_name}")


    @socketio.on("voting_round_expired")
    def handle_expired_voting(data):
        game_id = data.get("game_id")
        if game_id:
            print(f"voting expired for game: {game_id}")
            finishVotingSession("timer expired", game_id, socketio)


    @socketio.on("start_game")
    def handle_start_game(data):
        game_id = data.get("game_id")
        if not game_id:
            return

        try:
            game_uuid = uuid.UUID(str(game_id))
        except ValueError:
            return

        game = Game.get_or_none(Game.game_id == game_uuid)
        if not game:
            return

        user = get_user_from_cookie(signer)
        if not user:
            return

        if user.user_id != game.game_host.user_id:
            print("Non-host tried to start game")
            return

        print("Host started the game")

        active_status = Status.get(Status.status_type == "ACTIVE")
        game.game_status = active_status
        game.save()

        socketio.emit(
            "game_started",
            {"game_id": str(game.game_id)},
            to=f"game:{game.game_id}"
        )


    @socketio.on("show_scoreboard")
    def handle_show_scoreboard(data=None):
        print("show_scoreboard received:", data, flush=True)

        user = get_user_from_cookie(signer)
        print("resolved user:", user, flush=True)

        if not user:
            print("no valid user", flush=True)
            return

        game = get_active_game_from_user(user)
        print("resolved game:", game, flush=True)

        if not game:
            print("no active game found", flush=True)
            return

        emit("scoreboard_shown", {"game_id": str(game.game_id)})


    @socketio.on("begin_voting")
    def handle_begin_voting(data=None):
        print("begin_voting received:", data, flush=True)

        user = get_user_from_cookie(signer)
        print("resolved user:", user, flush=True)

        if not user:
            print("no valid user", flush=True)
            return

        game = get_active_game_from_user(user)
        print("resolved game:", game, flush=True)

        if not game:
            print("no active game found", flush=True)
            return

        emit("voting_started", {"game_id": str(game.game_id)})


    @socketio.on("show_results")
    def handle_show_results(data=None):
        print("show_results received:", data, flush=True)

        user = get_user_from_cookie(signer)
        print("resolved user:", user, flush=True)

        if not user:
            print("no valid user", flush=True)
            return

        game = get_active_game_from_user(user)
        print("resolved game:", game, flush=True)

        if not game:
            print("no active game found", flush=True)
            return

        emit("results_shown", {"game_id": str(game.game_id)})


    @socketio.on("results_continue")
    def handle_results_continue(data):
        user = get_user_from_cookie(signer)
        if not user:
            return

        game_id = data.get("game_id")
        if not game_id:
            return

        try:
            game_uuid = uuid.UUID(str(game_id))
        except ValueError:
            return

        game = Game.get_or_none(Game.game_id == game_uuid)
        if not game:
            return

        game_key = str(game.game_id)

        if game_key not in results_ready:
            results_ready[game_key] = set()

        results_ready[game_key].add(str(user.user_id))

        ready_count = len(results_ready[game_key])
        total_players = game.player.count()

        socketio.emit(
            "results_ready_update",
            {
                "game_id": game_key,
                "ready_count": ready_count,
                "total_players": total_players,
            },
            to=f"game:{game.game_id}"
        )

        if ready_count >= total_players:
            final_path = "/score" if isFinalSession(getLastVotingSession(game)) else "/story"

            socketio.emit(
                "results_continue_all",
                {
                    "game_id": game_key,
                    "path": final_path,
                },
                to=f"game:{game.game_id}"
            )

            results_ready.pop(game_key, None)


    @socketio.on("get_results_ready_status")
    def handle_get_results_ready_status(data):
        game_id = data.get("game_id")
        if not game_id:
            return

        try:
            game_uuid = uuid.UUID(str(game_id))
        except ValueError:
            return

        game = Game.get_or_none(Game.game_id == game_uuid)
        if not game:
            return

        game_key = str(game.game_id)
        ready_count = len(results_ready.get(game_key, set()))
        total_players = game.player.count()

        emit(
            "results_ready_update",
            {
                "game_id": game_key,
                "ready_count": ready_count,
                "total_players": total_players,
            }
        )