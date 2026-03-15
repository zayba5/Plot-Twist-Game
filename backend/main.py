import os
from flask import Flask, request, redirect, abort, g, jsonify, session
from flask_restful import Resource, Api
from flask_compress import Compress
from itsdangerous import TimestampSigner
from dotenv import load_dotenv
from models import *
from itsdangerous import TimestampSigner
from functools import wraps
import uuid
from flask_socketio import SocketIO, join_room
from peewee import fn


load_dotenv()
s = TimestampSigner(os.getenv("secretKey"))
socketio = SocketIO(cors_allowed_origins="*")

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

    @app.before_request
    def beforeRequest():
        token = request.cookies.get("uid")

        if token:
            try:
                user_id = signer.unsign(token.encode("utf8"), max_age=60*60*24*365)
                g.user = User.get(User.user_id == user_id)
                return
            except Exception:
                pass

        # if no cookie create user
        user = User.create(user_id=uuid.uuid4())
        g.user = user

    @app.after_request
    def afterRequest(response):
        response.headers.set("Access-Control-Allow-Origin", "*")
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE")
        response.headers.set("Access-Control-Allow-Headers", "X-api-key, Content-Type, accept")
        response.headers.set("Content-Disposition", "attachment")

        if not app.config.get("TESTING"):
            try:
                if not db.is_closed():
                    db.close()
            except Exception:
                pass
            
        if not request.cookies.get("uid") and hasattr(g, "user"):
            signed = signer.sign(str(g.user.user_id).encode("utf8")).decode("utf8")

            response.set_cookie(
                "uid",
                signed,
                max_age=60*60*24*365,
                httponly=True,
                samesite="Lax"
            )

        return response


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
            game_id = "83b1b426-1ddb-443f-a985-b72f98553d2f"
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
            game_id = "83b1b426-1ddb-443f-a985-b72f98553d2f"
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
###########################################################

    return app
            

if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", debug=True, allow_unsafe_werkzeug=True)