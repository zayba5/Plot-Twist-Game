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
import random
import string
from shuffle_story import assign_next_round_if_ready
from votingUtil import *
import bcrypt


load_dotenv()
s = TimestampSigner(os.getenv("secretKey"))
socketio = SocketIO(cors_allowed_origins=[os.getenv("frontHost")])
FRONTEND_ORIGIN = os.getenv("frontHost")

DEFAULT_NAMES = [
    "ToeSnatcher", "GoblinMode", "BreadHeist", "ChairThief",
    "SpaghettiWizard", "SoggyPickle", "FerretOverlord",
    "CrustLord", "BananaDealer", "WaffleCrimes",
    "MilkBandit", "UnstableGoose", "GremlinHours",
    "SoupEnjoyer", "RatWithHat", "ForkInOutlet",
    "ChaosPotato", "DumpsterSprite", "WetSockEnergy",
    "PanicButton"
]

def httpError(reason, code):
    return jsonify({
        "ok": False,
        "error": reason
        }), code

def generate_game_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_assignments_for_round(game, round_number):
    previous_round = round_number - 1

    prev_assignments = list(
        Story_Assignment.select().where(
            (Story_Assignment.game_id == game) &
            (Story_Assignment.round_number == previous_round)
        ).order_by(Story_Assignment.user_id)
    )

    if len(prev_assignments) < 2:
        raise ValueError("Need at least 2 assignments to rotate")

    users = [a.user_id for a in prev_assignments]
    stories = [a.story_id for a in prev_assignments]

    rotated_stories = stories[1:] + stories[:1]

    for user, story in zip(users, rotated_stories):
        Story_Assignment.create(
            assignment_id=uuid.uuid4(),
            game_id=game,
            round_number=round_number,
            user_id=user,
            story_id=story
        )

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
        game_code = data.get("game_code")
        if not game_code:
            return

        game = Game.get_or_none(Game.game_code == game_code.upper())
        if game:
            join_room(f"game:{game.game_id}")
            print(f"socket joined room game:{game.game_id}")

            #  build player list
            players_list = [
                {
                    "user_id": str(p.user_id.user_id),
                    "username": p.user_id.username,
                    "isHost": p.user_id.user_id == game.game_host.user_id
                }
                for p in game.player
            ]

            #  send ONLY to this user
            socketio.emit(
                "lobby_snapshot",
                {"players": players_list},
                to=request.sid
            )
            
    @socketio.on("join_game_room")
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
            finishVotingSession("timer expired", game_id, socketio)


    @socketio.on("start_game")
    def handle_start_game(data):
        game_code = data.get("game_code")
        if not game_code:
            return

        game = Game.get_or_none(Game.game_code == game_code.upper())
        if not game:
            return

        # send event to ALL players in that lobby
        socketio.emit(
            "game_started",
            {
                "game_id": str(game.game_id)
            },
            to=f"game:{game.game_id}"  # make sure join_game adds players to this room
        )                    

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

    # the new endpoint for getting all stories
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
  
    #story creation
    class CreateStoryEndpoint(Resource):
        def post(self):
            require_user()

            if not getattr(g, "user", None):
                return {
                    "ok": False,
                    "user_id": None,
                    "error": "unauthorized"
                }, 401

            body = request.get_json(silent=True) or {}
            
            game_id = body.get("game_id")

            if not game_id:
                return {
                    "ok": False,
                    "error": "game_id is required"
                }, 400

            try:
                game = Game.get(Game.game_id == game_id)
                existing_story = (
                    Story
                    .select()
                    .where(
                        (Story.game_id == game) &
                        (Story.user_id == g.user)
                    )
                    .first()
                )

                if existing_story:
                    return {
                        "ok": False,
                        "error": "story already exists for this user in this game",
                        "story_id": str(existing_story.story_id),
                        "game_id": str(game.game_id),
                        "user_id": str(g.user)
                    }, 409

                story = Story.create(
                    story_id=uuid.uuid4(),
                    game_id=game,
                    user_id=g.user
                )

                #make entry into story assignment
                assignment = Story_Assignment.create(
                    assignment_id=uuid.uuid4(),
                    game_id=game,
                    round_number=1,
                    user_id=g.user,
                    story_id=story.story_id,                    
                )

                return {
                    "ok": True,
                    "story_id": str(story.story_id),
                    "game_id": str(game.game_id),
                    "user_id": str(g.user)
                }, 201

            except Game.DoesNotExist:
                return {
                    "ok": False,
                    "error": "game not found"
                }, 404
    api.add_resource(CreateStoryEndpoint, "/CreateStory")

    class NextStoryPartEndpoint(Resource):
        def get(self):
            require_user()

            if not getattr(g, "user", None):
                return {"ok": False, "error": "unauthorized"}, 401
            #hard coded
            MAX_ROUNDS = 3 
            game_id = request.args.get("game_id")
            round_number = request.args.get("round_number")

            if not game_id or round_number is None:
                return {"ok": False, "error": "game_id and round_number are required"}, 400

            try:
                game_uuid = uuid.UUID(str(game_id))
                round_number = int(round_number)
            except (ValueError, TypeError):
                return {"ok": False, "error": "invalid input"}, 400

            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {"ok": False, "error": "game not found"}, 404

            total_assignments = Story_Assignment.select().where(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.round_number == round_number)
            ).count()

            submitted_count = Story_Part.select().where(
                (Story_Part.part_number == round_number) &
                (Story_Part.story_id.in_(
                    Story_Assignment.select(Story_Assignment.story_id).where(
                        (Story_Assignment.game_id == game) &
                        (Story_Assignment.round_number == round_number)
                    )
                ))
            ).count()

            if total_assignments == 0:
                return {"ok": False, "error": "no assignments found for this round"}, 404

            if submitted_count < total_assignments:
                return {
                    "ok": True,
                    "status": "waiting",
                    "submitted": submitted_count,
                    "total": total_assignments,
                }, 200

            if round_number >= MAX_ROUNDS:
                return {
                    "ok": True,
                    "status": "voting",
                    "round_number": round_number,
                }, 200

            next_round = round_number + 1

            with db.atomic():
                round_state, created = Round_State.get_or_create(
                    game_id=game,
                    round_number=next_round,
                    defaults={
                        "round_state_id": uuid.uuid4(),
                        "assignments_generated": False,
                    }
                )

                if not round_state.assignments_generated:
                    generate_assignments_for_round(game, next_round)
                    round_state.assignments_generated = True
                    round_state.save()

            assignment = Story_Assignment.get_or_none(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.round_number == next_round) &
                (Story_Assignment.user_id == g.user)
            )

            if not assignment:
                return {"ok": False, "error": "no assignment found for next round"}, 404

            last_part = (
                Story_Part
                .select()
                .where(Story_Part.story_id == assignment.story_id)
                .order_by(Story_Part.part_number.desc())
                .first()
            )

            return {
                "ok": True,
                "status": "ready",
                "round_number": next_round,
                "story_id": str(assignment.story_id.story_id),
                "prompt": last_part.part_content if last_part else "No prompt available.",
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

            #core logic, check what story is assigned to the user, if any
            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {"ok": False, "error": "game not found"}, 404
            
            assignment = Story_Assignment.get_or_none(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.round_number == round_number) &
                (Story_Assignment.user_id == g.user)
            )
            
            if not assignment:
                return {"ok": False, "error": "no matching assignment to this user"}, 404
            
            story = assignment.story_id
            
            # check for duplicated submission
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

    class PollReadyEndpoint(Resource):
        def get(self):
            game_id = request.args.get("game_id")
            round_number = request.args.get("round_number")

            if not game_id or round_number is None:
                return {
                    "ok": False,
                    "error": "game_id and round_number are required"
                }, 400

            try:
                game_uuid = uuid.UUID(str(game_id))
                round_number = int(round_number)
            except (ValueError, TypeError):
                return {
                    "ok": False,
                    "error": "invalid input"
                }, 400

            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {
                    "ok": False,
                    "error": "game not found"
                }, 404

            assignments = Story_Assignment.select().where(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.round_number == round_number)
            )

            total_assignments = assignments.count()

            if total_assignments == 0:
                return {
                    "ok": False,
                    "error": "no assignments found for this round"
                }, 404

            submitted_count = Story_Part.select().where(
                Story_Part.part_number == round_number,
                Story_Part.story_id.in_(
                    Story_Assignment.select(Story_Assignment.story_id).where(
                        (Story_Assignment.game_id == game) &
                        (Story_Assignment.round_number == round_number)
                    )
                )
            ).count()

            ready = submitted_count >= total_assignments

            return {
                "ok": True,
                "game_id": str(game.game_id),
                "round_number": round_number,
                "submitted": submitted_count,
                "total": total_assignments,
                "status": "ready" if ready else "waiting"
            }, 200
    api.add_resource(PollReadyEndpoint, "/PollReady")

    class ScoreEndpoint(Resource):
        def get(self):
            user = require_user()
            game_id = "01731b8d-0f53-42a2-9172-49674c247858"
            game = Game.get(Game.game_id == uuid.UUID(game_id))
            scores = []
            for player in game.player:
                scores.append({
                    "user" : str(player.user_id.username),
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
                finishVotingSession("all votes in", game_id, socketio)           
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
    
    class VotingSessionEndpoint(Resource):
        def get(self):
            require_user()

            game_id = request.args.get("game_id")
            if not game_id:
                return httpError("game_id required", 400)

            try:
                game_uuid = uuid.UUID(str(game_id))
            except ValueError:
                return httpError("invalid game_id", 400)

            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return httpError("game not found", 404)
            
            settings = game.settings.first()
            
            if not settings:
                return httpError("settings not found", 404)

            session = getActiveVotingSession(game)

            if not session:
                return {"ok": True, "active": False}, 200

            return {
                "ok": True,
                "status": session.voting_session_status_id,
                "voting_session_id": str(session.voting_session_id),
                "voting_session_number": session.voting_session_number,
                "num_voting_sessions" : settings.num_votes,
                "cat_1" : session.cat_1.title,
                "cat_2" : session.cat_2.title,
                "timer" : settings.vote_timer
            }, 200
            
    api.add_resource(VotingSessionEndpoint, "/VotingSession")
    
        
    class SessionEndpoint(Resource):
        def get(self):
            username = request.args.get("username") or random.choice(DEFAULT_NAMES)  # default name


            if getattr(g, "user", None):
                return {
                    "ok": True,
                    "user_id": str(g.user.user_id),
                    "existing": True,
                    "username": g.user.username 
                }, 200

            user = User.create(
                user_id=uuid.uuid4(),
                username=username
            )
            g.user = user
            g.should_set_uid_cookie = True

            return {
                "ok": True,
                "user_id": str(user.user_id),
                "existing": False,
                "username": username
            }, 201


    ###########################################################
    # SIMPLE LOBBY SYSTEM (FOR FRONTEND CONNECTION)

        
    class CreateLobby(Resource):
        def post(self):
            user = require_user()

            data = request.get_json() or {}
            username = data.get("username", "Player")
            user.username = username
            user.save()
            rounds = data.get("rounds", 5)
            voting_sessions = data.get("votingSessions", 3)
            timer = data.get("timer", 60)  # default 60s per round
            max_players = data.get("maxPlayers", 4)  # default max 4

            # create new game
            game = Game.create(
                game_id=uuid.uuid4(),
                game_status=Status.get_or_none(Status.status_type=="ACTIVE"), 
                game_host=user,
                game_code=generate_game_code()
            )

            # add host as first player
            Game_Players.create(
                game_id=game,
                user_id=user,
                user_score=0
            )
            
            # emit full lobby to everyone in room

            host_id = getattr(game.game_host, "user_id", game.game_host)  # will be UUID either way
            players_list = [
                {
                    "user_id": str(p.user_id.user_id),
                    "username": p.user_id.username,
                    "isHost": p.user_id.user_id == game.game_host.user_id  # compare UUIDs to mark host
                }
                for p in game.player
            ]

            socketio.emit(
                "lobby_update",
                {"game_id": str(game.game_id), "players": players_list},
                to=f"game:{game.game_id}"
            )

            # emit system message for chat

            socketio.emit(
                "player_joined_message",
                {
                    "username": user.username,
                    "players": players_list  
                },
                to=f"game:{game.game_id}"
            )

            # save game settings
            Game_Settings.create(
                game_id=game,
                num_rounds=rounds,
                num_votes=voting_sessions,
                timer=timer,
                max_players=max_players
            )

            return {
                "ok": True,
                "game_id": str(game.game_id),
                "game_code": game.game_code
            }, 201


    class JoinLobby(Resource):
        def post(self):
            user = require_user()
            data = request.get_json() or {}
            username = data.get("username", "Player")
            user.username = username
            user.save()

            game_code = data.get("game_code")
            if not game_code:
                return {"ok": False, "error": "game_code required"}, 400

            # find game
            game = Game.get_or_none(Game.game_code == game_code.upper())
            if not game:
                return {"ok": False, "error": "Game not found"}, 404

            # add user to game if not already
            existing = Game_Players.get_or_none(
                (Game_Players.game_id == game) & (Game_Players.user_id == user)
            )
            if not existing:
                Game_Players.create(game_id=game, user_id=user, user_score=0)

            # broadcast full updated lobby to everyone in that game room
            players_list = [
                {
                    "user_id": str(p.user_id.user_id),
                    "username": p.user_id.username,
                    "isHost": p.user_id.user_id == game.game_host.user_id
                }
                for p in game.player
            ]

            # emit updated lobby to all players in room
            socketio.emit(
                "lobby_update",
                {"game_id": str(game.game_id), "players": players_list},
                to=f"game:{game.game_id}"
            )

            # emit system chat join message
            socketio.emit(
                "player_joined_message",
                {"username": user.username},
                to=f"game:{game.game_id}"
            )

            return {"ok": True, "game_id": str(game.game_id), "game_code": game.game_code}


    class LobbyPlayers(Resource):
        def get(self):
            game_id = request.args.get("game_id")

            if not game_id:
                return {"ok": False, "error": "game_id required"}, 400

            try:
                game_uuid = uuid.UUID(game_id)
            except ValueError:
                return {"ok": False, "error": "invalid game_id"}, 400

            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {"ok": False, "error": "Game not found"}, 404

            players = []
            for p in game.player:
                players.append({
                    "user_id": str(p.user_id.user_id),
                    "username": p.user_id.username,
                    "score": p.user_score
                })

            return {"players": players}
        
    class CreateUserEndpoint(Resource):
        def post(self):
            data = request.get_json() or {}
            username = data.get("username")
            password = data.get("password").encode("utf-8")
            password_hash = bcrypt.hashpw(password, bcrypt.gensalt())

            if (User.get_or_none(User.username == username)):
                return {
                    "ok": False,
                    "error": "username_taken"
                }

            user = User.create(
                user_id=uuid.uuid4(),
                username=username,
                password_hash=password_hash
            )

            return {
                "ok": True,
                "user_id": str(user.user_id),
                "username": str(user.username),
                "password_hash": str(user.password_hash),
            }, 201
    
    api.add_resource(CreateUserEndpoint, "/CreateUser")


    # REGISTER ROUTES
    api.add_resource(CreateLobby, "/create-lobby")
    api.add_resource(JoinLobby, "/join-lobby")
    api.add_resource(LobbyPlayers, "/lobby-players")
    
    api.add_resource(SessionEndpoint, "/session")

    return app
            

if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", debug=True, allow_unsafe_werkzeug=True)
