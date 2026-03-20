import os
from flask import Flask, request, redirect, abort, g, jsonify, session
from flask_restful import Resource, Api
from flask_compress import Compress
from itsdangerous import TimestampSigner, BadSignature, SignatureExpired
from dotenv import load_dotenv
from models import *
from itsdangerous import TimestampSigner
from functools import wraps
import uuid
from flask_socketio import SocketIO, join_room
from peewee import fn
from player_claims import claim_player_for_socket, release_player_for_socket

load_dotenv()
s = TimestampSigner(os.getenv("secretKey"))
socketio = SocketIO(cors_allowed_origins=[os.getenv("frontHost")])
FRONTEND_ORIGIN = os.getenv("frontHost")
def create_app(test_config: dict | None = None):
    app = Flask(__name__)
    app.config["secretKey"] = os.getenv("secretKey")

    # allow tests to override config easily
    app.config.update(
        TESTING=False,
    )
    if test_config:
        app.config.update(test_config)

    Compress(app)
    api = Api(app)
    socketio.init_app(app)
    
    ##websocket handlers
    @socketio.on("join_game")
    def handle_join_game(data):
        game_id = data.get("game_id")
        if game_id:
            join_room(f"game:{game_id}")
            print(f"socket joined room game:{game_id}")

    signer = TimestampSigner(os.getenv("secretKey") or "")

    API_DIR = os.path.dirname(os.path.abspath(__file__))

    #events for claiming player after room membership
    @socketio.on("claim_player")
    def handle_claim_player(data):
        game_id = data.get("game_id")
        if not game_id:
            return {"ok": False, "error": "game_id is required"}

        sid = request.sid
        return claim_player_for_socket(game_id, sid)


    @socketio.on("release_player")
    def handle_release_player():
        sid = request.sid
        released = release_player_for_socket(sid)
        return {"ok": True, "released": released}

    @socketio.on("disconnect")
    def handle_disconnect():
        release_player_for_socket(request.sid)

    @app.before_request
    def before_request():
        g.user = None
        g.should_set_uid_cookie = False

        if request.method == "OPTIONS":
            return

        token = request.cookies.get("uid")
        if not token:
            return

        try:
            raw_user_id = signer.unsign(token, max_age=60 * 60 * 24 * 365)

            if isinstance(raw_user_id, bytes):
                raw_user_id = raw_user_id.decode("utf8")

            user_id = uuid.UUID(str(raw_user_id))
            g.user = User.get_or_none(User.user_id == user_id)
            print("loaded user:", g.user, flush=True)

        except (BadSignature, SignatureExpired, ValueError) as e:
            print("cookie lookup failed:", repr(e))
            g.user = None

    @app.after_request
    def afterRequest(response):
        response.headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN
        response.headers["Access-Control-Allow-Credentials"] = "true"        
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE")
        response.headers.set("Access-Control-Allow-Headers", "X-api-key, Content-Type, accept")

        if not app.config.get("TESTING"):
            try:
                if not db.is_closed():
                    db.close()
            except Exception:
                pass
        if getattr(g, "should_set_uid_cookie", False) and getattr(g, "user", None):
            print("setting cookie for user:", g.user.user_id, flush=True)

            signed = signer.sign(str(g.user.user_id).encode("utf8")).decode("utf8")
            response.set_cookie(
                "uid",
                signed,
                max_age=60 * 60 * 24 * 365,
                httponly=True,
                samesite="Lax",
                secure=False,
                path="/"
            )


        return response
    
    def require_user():
        if not getattr(g, "user", None):
            abort(401, description="Missing or invalid user cookie")
        return g.user


    #endpoints
    class SampleEndpoint(Resource):
        def get(self):
            items = []
            for game in Game.select():
                items.append({
                    "game_id": str(game.game_id),
                    "game_status": str(game.game_status_id),   
                    "game_host": str(game.game_host_id),
                })
            return jsonify({"items": items})

    api.add_resource(SampleEndpoint, "/Sample")

##start with arbitrary game for now
##once story telling is implemented switch to active game
##easier for now since i can't create story in browser
##to test replace the game id with one in your DB
    class StoryEndpoint(Resource):
        ##get the stories and their parts for a given game
        def get(self):
            user = require_user()
            game_id = "01731b8d-0f53-42a2-9172-49674c247858"
            game = Game.get(Game.game_id == uuid.UUID(game_id))
            stories = []
            for story in game.story:
                parts = []
                for part in story.part:
                    parts.append({
                        "part_id" : str(part.part_id),
                        "part_content" : str(part.part_content),
                        "part_number" : int(part.part_number)
                    })
                stories.append({
                    "story_id" : str(story.story_id),
                    "story_parts" : parts
                })
            return jsonify({"stories" : stories})
    
    api.add_resource(StoryEndpoint, "/Story")

    class StorySubmissionEndpoint(Resource):
        def post(self):
            user = require_user()
            if not getattr(g, "user", None):
                return {"ok": False, "error": "unauthorized"}, 401

            data = request.get_json() or {}

            game_id = data.get("game_id")
            round_number = data.get("round_number")
            content = data.get("content")

            if not game_id or round_number is None or content is None or not str(content).strip():
                return {"ok": False, "error": "game_id, round_number, and content are required"}, 400

            try:
                game_uuid = uuid.UUID(str(game_id))
                round_number = int(round_number)
            except (ValueError, TypeError):
                return {"ok": False, "error": "invalid input"}, 400

            if round_number < 1:
                return {"ok": False, "error": "round_number must be >= 1"}, 400

            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {"ok": False, "error": "game not found"}, 404

            story = Story.get_or_none(Story.game_id == game)
            if not story:
                story = Story.create(
                    story_id=uuid.uuid4(),
                    game_id=game
                )

            existing = Story_Part.get_or_none(
                (Story_Part.story_id == story) &
                (Story_Part.part_number == round_number) &
                (Story_Part.user_id == g.user)
            )
            if existing:
                return {"ok": False, "error": "story part already submitted for this round"}, 409

            story_part = Story_Part.create(
                part_id=uuid.uuid4(),
                part_number=round_number,
                part_content=str(content).strip(),
                user_id=g.user,
                story_id=story
            )

            return {
                "ok": True,
                "part_id": str(story_part.part_id)
            }, 201

    api.add_resource(StorySubmissionEndpoint, "/StorySubmission")

    class ScoreEndpoint(Resource):
        def get(self):
            user = require_user()
            game_id = "01731b8d-0f53-42a2-9172-49674c247858"
            game = Game.get(Game.game_id == uuid.UUID(game_id))
            scores = []
            for player in game.player:
                scores.append({
                    "user" : str(player.user_id),
                    "score" : int(player.user_score)
                })
            return jsonify({"scores" : scores})
    
    api.add_resource(ScoreEndpoint, "/Scores")
    

    
###########################################################
##hardcoded voting test until stories work
    class TestVotesEndpoint(Resource):
        def post(self):
            user =require_user()
            data = request.get_json() or {}
            game_id = data.get("game_id")

            if not game_id:
                return jsonify({
                    "ok": False,
                    "error": "game_id is required"
                }), 400
                
            try:
                game_uuid = uuid.UUID(game_id)
            except ValueError:
                return {
                    "ok": False,
                    "error": "invalid game_id format"
                }, 400

            game = Game.get_or_none(Game.game_id == game_uuid)

            if not game:
                return {
                    "ok": False,
                    "error": "game does not exist"
                }, 404

            active_session = (
                Voting_Session
                .select()
                .join(Status)
                .where(
                    (Voting_Session.game_id == game) &
                    (Status.status_type == "ACTIVE")
                )
                .get_or_none()
            )

            if not active_session:
                return {
                    "ok": False,
                    "error": "no active voting session found"
                }, 404

            total_votes = Voting.select().where(
                Voting.voting_session_id == active_session
            ).count()

            total_players = Game_Players.select().where(
                Game_Players.game_id == game
            ).count()

            all_votes_in = total_players > 0 and total_votes >= total_players

            if all_votes_in:
                winner = (
                    Voting
                    .select(
                        Voting.story_id,
                        fn.COUNT(Voting.story_id).alias("vote_count")
                    )
                    .where(Voting.voting_session_id == active_session)
                    .group_by(Voting.story_id)
                    .order_by(fn.COUNT(Voting.story_id).desc())
                    .first()
                )
                
                if winner:
                    winning_story = winner.story_id
                    winning_writers = (
                        Story_Part
                        .select(Story_Part.user_id)
                        .where(Story_Part.story_id == winning_story)
                        .distinct()
                    )

                    for part in winning_writers:
                        game_player = Game_Players.get_or_none(
                            (Game_Players.game_id == game) &
                            (Game_Players.user_id == part.user_id)
                        )

                        if game_player:
                            game_player.user_score += 1  
                            game_player.save()

                
                
                complete_status = Status.get_or_none(Status.status_type == "FINISHED")
                if complete_status:
                    active_session.voting_session_status = complete_status
                    active_session.save()

                socketio.emit(
                    "all_votes_in",
                    {
                        "game_id": str(game.game_id),
                        "voting_session_id": str(active_session.voting_session_id),
                        "total_votes": total_votes,
                        "total_players": total_players,
                    },
                    to=f"game:{game.game_id}"
                )

            return{
                "ok": True,
                "all_votes_in": all_votes_in,
                "total_votes": total_votes,
                "total_players": total_players,
            }
    api.add_resource(TestVotesEndpoint, "/TestVote")
    
    class SessionEndpoint(Resource):
        def get(self):
            if getattr(g, "user", None):
                return {
                    "ok": True,
                    "user_id": str(g.user.user_id),
                    "existing": True
                }, 200

            user = User.create(user_id=uuid.uuid4())
            g.user = user
            g.should_set_uid_cookie = True

            return {
                "ok": True,
                "user_id": str(user.user_id),
                "existing": False
            }, 201
    
    api.add_resource(SessionEndpoint, "/session")

    return app
            

if __name__ == "__main__":
    app = create_app()
    print(app.url_map, flush=True)

    socketio.run(app, host="0.0.0.0", debug=True, allow_unsafe_werkzeug=True)