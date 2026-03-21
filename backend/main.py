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
from shuffle_story import assign_next_round_if_ready


load_dotenv()
s = TimestampSigner(os.getenv("secretKey"))
socketio = SocketIO(cors_allowed_origins=[os.getenv("frontHost")])
FRONTEND_ORIGIN = os.getenv("frontHost")

def httpError(reason, code):
    return jsonify({
        "ok": False,
        "error": reason
        }), code
    
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
        
        
def finishVotingSession(reason, game_id):
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
            
    @socketio.on("voting_round_expired")
    def handle_expired_voting(data):
        game_id = data.get("game_id")
        if game_id:
            print(f"voting expired for game: {game_id}")
            finishVotingSession("timer expired", game_id)
                       

    signer = TimestampSigner(os.getenv("secretKey") or "")

    API_DIR = os.path.dirname(os.path.abspath(__file__))

    # #events for claiming player after room membership
    # @socketio.on("claim_player")
    # def handle_claim_player(data):
    #     game_id = data.get("game_id")
    #     if not game_id:
    #         return {"ok": False, "error": "game_id is required"}

    #     sid = request.sid
    #     return claim_player_for_socket(game_id, sid)


    # @socketio.on("release_player")
    # def handle_release_player():
    #     sid = request.sid
    #     released = release_player_for_socket(sid)
    #     return {"ok": True, "released": released}

    # @socketio.on("disconnect")
    # def handle_disconnect():
    #     release_player_for_socket(request.sid)

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
    class WhoAmIEndpoint(Resource): #expose uder Id w/o reading cookie directly
        def get(self):
            user = require_user()

            if not getattr(g, "user", None):
                return {
                    "ok": False,
                    "user_id": None,
                    "error": "unauthorized"
                }, 401

            return {
                "ok": True,
                "user_id": str(g.user)
            }, 200
    api.add_resource(WhoAmIEndpoint, "/WhoAmI")

    class GetAllStoryEndpoint(Resource):
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
    api.add_resource(GetAllStoryEndpoint, "/GetAllStory")
    # the new endpoint for getting all stories

    class NextStoryPartEndpoint(Resource):
        def get(self):
            user = require_user()
            if not getattr(g, "user", None):
                return {"ok": False, "error": "unauthorized"}, 401

            game_id = "01731b8d-0f53-42a2-9172-49674c247858"
            round_number = request.args.get("round_number")

            if not game_id or round_number is None:
                return {"ok": False, "error": "game_id and round_number are required"}, 400

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

            assignment = StoryAssignment.get_or_none(
                (StoryAssignment.game_id == game) &
                (StoryAssignment.round_number == round_number) &
                (StoryAssignment.user_id == g.user)
            )

            if not assignment:
                return {
                    "ok": True,
                    "status": "waiting",
                    "prompt": "Waiting for other players to finish this round."
                }, 200

            story = assignment.story_id

            last_part = (
                Story_Part
                .select()
                .where(Story_Part.story_id == story)
                .order_by(Story_Part.part_number.desc())
                .first()
            )

            if not last_part:
                return {
                    "ok": True,
                    "status": "ready",
                    "prompt": "There is no story yet. Please think of an initial prompt to begin the story."
                }, 200

            return {
                "ok": True,
                "status": "ready",
                "prompt": last_part.part_content
            }, 200
    
    api.add_resource(NextStoryPartEndpoint, "/NextStoryPart")

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
                "part_id": str(story_part.part_id),
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
        def checkStatus(self, active_session, game):
            total_votes = Voting.select().where(
                Voting.voting_session_id == active_session
            ).count()

            total_players = Game_Players.select().where(
                Game_Players.game_id == game
            ).count()

            return total_players > 0 and total_votes >= total_players
            
        def post(self):
            user =require_user()
            data = request.get_json() or {}
            game_id = data.get("game_id")
            
            if not game_id:
                return httpError("game_id is required", 400)
            try:
                game_uuid = uuid.UUID(game_id)
            except ValueError:
                return httpError("Invalid game_id format", 400)

            game = Game.get_or_none(Game.game_id == game_uuid)

            if not game:
                return httpError("game does not exist", 404)

            active_session = getActiveVotingSession(game)

            if not active_session:
                return httpError("no active voting session found", 404)
            
            ###submit cur vote to db#####
            ###waiting on stories and games working for this#####
            ###does not currently happen, currently only checks status of existing votes#####

            all_votes_in = self.checkStatus(active_session, game)

            if all_votes_in:    
                finishVotingSession("all votes in", game)           
                socketio.emit(
                    "all_votes_in",
                    {
                        "game_id": str(game.game_id),
                        "voting_session_id": str(active_session.voting_session_id),
                    },
                    to=f"game:{game.game_id}"
                )

            return{
                "ok": True,
                "all_votes_in": all_votes_in,
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
    socketio.run(app, host="0.0.0.0", debug=True, allow_unsafe_werkzeug=True)