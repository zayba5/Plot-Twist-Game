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
from flask_socketio import SocketIO, emit, join_room
from peewee import fn
import random
import string
from shuffle_story import assign_next_round_if_ready
from votingUtil import *
import bcrypt
from util import *
from datetime import datetime, timedelta, timezone


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
            join_room(f"game:{game.game_code}")
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

        # get current user
        user = get_user_from_cookie(signer)
        if not user:
            return

        # BLOCK if not host
        if user.user_id != game.game_host.user_id:
            print("Non-host tried to start game")
            return

        print("Host started the game")

        active_status = Status.get(Status.status_type == "ACTIVE")
        game.game_status = active_status
        game.save()

        # start game for everyone
        socketio.emit(
            "game_started",
            {
                "game_id": str(game.game_id)
            },
            to=f"game:{game.game_code}"
        )    
        

    signer = TimestampSigner(os.getenv("secretKey") or "")
            
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
        
        print("raw game_id:", repr(game.game_id), flush=True)
        emit("results_shown", {"game_id": str(game.game_id)})     


    API_DIR = os.path.dirname(os.path.abspath(__file__))

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
            g.user = App_User.get_or_none(App_User.user_id == user_id)
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

    class LoginEndpoint(Resource):
        def post(self):
            data = request.get_json()

            username = data.get("username")
            password = data.get("password")

            # Basic validation
            if not username or not password:
                return jsonify({"error": "missing_fields"})

            try:
                user = App_User.get_or_none(App_User.username == username)
                stored_hash = bytes(user.password_hash)

                # Invalid username
                if not user:
                    return {"error": "invalid_credentials"}, 401

                # Check password
                if not bcrypt.checkpw(password.encode("utf-8"), stored_hash):
                    return {"error": "invalid_credentials"}, 401

                # Success login
                return {
                    "message": "login_success",
                    "user": {
                        "user_id": str(user.user_id),
                        "username": user.username
                    }
                }, 200

            except Exception as e:
                print("Login error:", e)
                return {"error": "server_error"}, 500
    
    api.add_resource(LoginEndpoint, "/login")

    # the new endpoint for getting all stories
    class GetAllStoryEndpoint(Resource):
        def get(self):
            require_user()

            game_id = request.args.get("game_id")
            if not game_id:
                return {"ok": False, "error": "game_id is required"}, 400

            try:
                game_uuid = uuid.UUID(str(game_id))
            except (ValueError, TypeError):
                return {"ok": False, "error": "invalid game_id"}, 400

            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {"ok": False, "error": "game not found"}, 404

            stories = []
            for story in Story.select().where(Story.game_id == game):
                stories.append({
                    "story_id": str(story.story_id),
                    "story_parts": build_flattened_parts(story),
                })

            return jsonify({
                "ok": True,
                "game_id": str(game.game_id),
                "stories": stories
            })

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
            requested_game_id = body.get("game_id")

            try:
                # 1) Resolve game
                game = None
                if requested_game_id:
                    game = Game.get_or_none(Game.game_id == requested_game_id)
                    if not game:
                        return {
                            "ok": False,
                            "error": "game not found"
                        }, 404
                else:
                    game = get_active_game_from_user(g.user)

                if not game:
                    return {
                        "ok": False,
                        "error": "no active game found"
                    }, 404
                
                # 1-2) resolve max round from game settings
                game_setting = Game_Settings.get_or_none(Game_Settings.game_id == game)

                if not game_setting:
                    return {"ok": False, "error": "game settings not found"}, 404
                else:
                    max_round = game_setting.num_rounds

                # 2) Find latest voting session for this game
                latest_session = (
                    Voting_Session
                    .select()
                    .where(Voting_Session.game_id == game)
                    .order_by(Voting_Session.voting_session_number.desc())
                    .first()
                )

                # 3) Determine current storytelling round + parent story
                # Outer Round 1: no parent story, representing current outer round
                # Later rounds: parent is previous session's continuing_story
                outer_round_number = 1
                parent_story = None

                if latest_session:
                    outer_round_number = latest_session.voting_session_number + 1
                    parent_story = latest_session.continuing_story

                # 4) Check whether this user already has a story assignment for this round
                existing_assignment = (
                    Story_Assignment
                    .select(Story_Assignment, Story)
                    .join(Story, on=(Story_Assignment.story_id == Story.story_id))
                    .where(
                        (Story_Assignment.game_id == game) &
                        (Story_Assignment.user_id == g.user) &
                        (Story_Assignment.inner_round_number == 1) & #inner round should be always 1 when story is created
                        (Story_Assignment.outer_round_number == outer_round_number) 
                    )
                    .first()
                )

                # Helper: fetch last part of parent story, if any
                def get_parent_story_last_part_content(parent):
                    if not parent:
                        return None

                    last_part = (
                        Story_Part
                        .select()
                        .where(Story_Part.story_id == parent)
                        .order_by(Story_Part.created_at.desc())
                        .first()
                    )
                    return last_part.part_content if last_part else None

                if existing_assignment:
                    existing_story = existing_assignment.story_id
                    parent_story_last_part = get_parent_story_last_part_content(existing_story.parent_story)

                    return {
                        "ok": True,
                        "created": False,
                        "story_id": str(existing_story.story_id),
                        "assignment_id": str(existing_assignment.assignment_id),
                        "game_id": str(game.game_id),
                        "user_id": str(g.user),
                        "outer_round_number": outer_round_number,
                        "inner_round_number": int(1),
                        "max_round": max_round,
                        "parent_story_id": str(existing_story.parent_story.story_id) if existing_story.parent_story else None,
                        "parent_story_last_part": parent_story_last_part
                    }, 200

                # 5) Create new story for this round, if no parent
                story = Story.create(
                    story_id=uuid.uuid4(),
                    parent_story=parent_story,
                    game_id=game,
                    user_id=g.user,
                    outer_round_number=outer_round_number
                )

                assignment = Story_Assignment.create(
                    assignment_id=uuid.uuid4(),
                    game_id=game,
                    inner_round_number=1, #first assigned is always 1
                    outer_round_number=outer_round_number,
                    user_id=g.user,
                    story_id=story #assign self to the newly created story
                )

                #this might return None
                parent_story_last_part = get_parent_story_last_part_content(parent_story)

                return {
                    "ok": True,
                    "created": True,
                    "story_id": str(story.story_id),
                    "assignment_id": str(assignment.assignment_id),
                    "game_id": str(game.game_id),
                    "user_id": str(g.user),
                    "outer_round_number": outer_round_number,
                    "inner_round_number": int(1),
                    "max_round": max_round,
                    "parent_story_id": str(parent_story.story_id) if parent_story else None,
                    "parent_story_last_part": parent_story_last_part
                }, 201

            except Exception as e:
                return {
                    "ok": False,
                    "error": f"unexpected error: {str(e)}"
                }, 500

    api.add_resource(CreateStoryEndpoint, "/CreateStory")

    class NextStoryPartEndpoint(Resource):
        def get(self):
            require_user()

            if not getattr(g, "user", None):
                return {"ok": False, "error": "unauthorized"}, 401
                         
            game_id = request.args.get("game_id")
            outer_round_number = request.args.get("outer_round_number")
            inner_round_number = request.args.get("inner_round_number")

           
            if not game_id:
                return {"ok": False, "error": "game_id is required"}, 400
            elif outer_round_number is None:
                return {"ok": False, "error": "outer_round_number is required"}, 400
            elif inner_round_number is None:
                return {"ok": False, "error": "inner_round_number is required"}, 400
            
            try: # input validation
                game_uuid = uuid.UUID(str(game_id))
                inner_round_number = int(inner_round_number)
                outer_round_number = int(outer_round_number)
            except (ValueError, TypeError):
                return {"ok": False, "error": "invalid input"}, 400

            # resolve game
            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {"ok": False, "error": "game not found"}, 404     
              
            game_setting = Game_Settings.get_or_none(Game_Settings.game_id == game)

            if not game_setting:
                return {"ok": False, "error": "game settings not found"}, 404
            else:
                max_round = game_setting.num_rounds
            
            total_assignments = Story_Assignment.select().where(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.outer_round_number == outer_round_number) &
                (Story_Assignment.inner_round_number == inner_round_number)

            ).count()

            submitted_count = Story_Part.select().where(
                (Story_Part.part_number == inner_round_number) &
                (Story_Part.story_id.in_(
                    Story_Assignment.select(Story_Assignment.story_id).where(
                        (Story_Assignment.game_id == game) &
                        (Story_Assignment.outer_round_number == outer_round_number) &
                        (Story_Assignment.inner_round_number == inner_round_number)
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

            # create an entry in voting session if none is active
            if inner_round_number >= max_round:
                #check if an active session for this game exists
                active_session = getActiveVotingSession(game)

                if not active_session:
                    # get ACTIVE & FINISHED status
                    active_status = Status.get(Status.status_type == "ACTIVE")
                    finished_status = Status.get(Status.status_type == "FINISHED")

                    # figure out next voting session number
                    last_session = (
                        Voting_Session.select()
                        .where(Voting_Session.game_id == game)
                        .order_by(Voting_Session.voting_session_number.desc())
                        .first()
                    )
                    if last_session is not None: # change the status of last voting session to FINISHED
                        last_session.voting_session_status = finished_status
                        last_session.save()

                    next_number = 1 if not last_session else last_session.voting_session_number + 1

                    # pick categories
                    categories = list(Voting_Category.select().limit(2))

                    # error if categories missing
                    if len(categories) < 2:
                        return {"ok": False, "error": "not enough voting categories configured"}, 500

                    cat_1, cat_2 = categories
                    # if not cat_1 or not cat_2:
                    #     cat_1 = Voting_Category.select().first()
                    #     cat_2 = Voting_Category.select().offset(1).first()

                    now = datetime.now(timezone.utc)
                    end_time = now + timedelta(seconds=game_setting.vote_timer)
                    
                    # create voting session
                    active_session = Voting_Session.create(
                        voting_session_id=uuid.uuid4(),
                        game_id=game,
                        voting_session_number=next_number,
                        voting_session_status=active_status,
                        continuing_story=None,
                        cat_1=cat_1,
                        cat_2=cat_2,
                        timer_ends_at=end_time
                    )

                    print(f"Created voting session {active_session.voting_session_id}", flush=True)
                return {
                    "ok": True,
                    "status": "voting",
                    "inner_round_number": inner_round_number,
                    "game_id": str(game.game_id),
                    "voting_session_id": str(active_session.voting_session_id),
                    "voting_session_number": active_session.voting_session_number,
                }, 200

            next_inner_round = inner_round_number + 1
            with db.atomic():
                round_state, created = Round_State.get_or_create(
                    game_id=game,
                    outer_round_number=outer_round_number,
                    inner_round_number=next_inner_round,
                    defaults={
                        "round_state_id": uuid.uuid4(),
                        "assignments_generated": False,
                    }
                )

                if not round_state.assignments_generated:
                    generate_assignments_for_round(game, outer_round_number, next_inner_round)
                    round_state.assignments_generated = True
                    round_state.save()

            assignment = Story_Assignment.get_or_none(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.outer_round_number == outer_round_number) &
                (Story_Assignment.inner_round_number == next_inner_round) &
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
                "inner_round_number": next_inner_round,
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
            outer_round_number = data.get("outer_round_number")
            inner_round_number = data.get("inner_round_number")
            content = data.get("content")

            if not game_id or outer_round_number is None or inner_round_number is None or content is None or not str(content).strip():
                return {"ok": False, "error": "game_id, outer_round_number, inner_round_number, and content are required"}, 400

            try:
                game_uuid = uuid.UUID(str(game_id))
                inner_round_number = int(inner_round_number)
            except (ValueError, TypeError):
                return {"ok": False, "error": "invalid input"}, 400

            if inner_round_number < 1:
                return {"ok": False, "error": "inner_round_number must be >= 1"}, 400

            #core logic, check what story is assigned to the user, if any
            game = Game.get_or_none(Game.game_id == game_uuid)
            if not game:
                return {"ok": False, "error": "game not found"}, 404
            
            assignment = Story_Assignment.get_or_none(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.outer_round_number == outer_round_number) &
                (Story_Assignment.inner_round_number == inner_round_number) &
                (Story_Assignment.user_id == g.user)
            )
            
            if not assignment:
                return {"ok": False, "error": "no matching assignment to this user"}, 404
            
            story = assignment.story_id
            
            # check for duplicated submission
            existing = Story_Part.get_or_none(
                (Story_Part.story_id == story) &
                (Story_Part.part_number == inner_round_number) &
                (Story_Part.user_id == g.user)
            )
            if existing:
                return {"ok": False, "error": "story part already submitted for this round"}, 409

            story_part = Story_Part.create(
                part_id=uuid.uuid4(),
                part_number=inner_round_number,
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
            require_user()

            if not getattr(g, "user", None):
                return {
                    "ok": False,
                    "error": "unauthorized"
                }, 401

            game_id = request.args.get("game_id")
            outer_round_number = request.args.get("outer_round_number")
            inner_round_number = request.args.get("inner_round_number")

            if not game_id:
                return {
                    "ok": False,
                    "error": "game_id is required"
                }, 400

            if outer_round_number is None:
                return {
                    "ok": False,
                    "error": "outer_round_number is required"
                }, 400

            if inner_round_number is None:
                return {
                    "ok": False,
                    "error": "inner_round_number is required"
                }, 400

            try:
                game_uuid = uuid.UUID(str(game_id))
                outer_round_number = int(outer_round_number)
                inner_round_number = int(inner_round_number)
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

            assignments_query = Story_Assignment.select().where(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.outer_round_number == outer_round_number) &
                (Story_Assignment.inner_round_number == inner_round_number)
            )

            total_assignments = assignments_query.count()

            if total_assignments == 0:
                return {
                    "ok": False,
                    "error": "no assignments found for this round"
                }, 404

            assigned_story_ids = Story_Assignment.select(Story_Assignment.story_id).where(
                (Story_Assignment.game_id == game) &
                (Story_Assignment.outer_round_number == outer_round_number) &
                (Story_Assignment.inner_round_number == inner_round_number)
            )

            submitted_count = Story_Part.select().where(
                (Story_Part.part_number == inner_round_number) &
                (Story_Part.story_id.in_(assigned_story_ids))
            ).count()

            ready = submitted_count >= total_assignments

            return {
                "ok": True,
                "game_id": str(game.game_id),
                "outer_round_number": outer_round_number,
                "inner_round_number": inner_round_number,
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
    

    class VoteEndpoint(Resource):    
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
            
            votedStory1 = data.get("stage_1")
            votedStory2 = data.get("stage_2")
            votedStory3 = data.get("stage_3")
            if not votedStory1:
                print("no story selected for stage 1", flush=True)
                
            if not votedStory2:
                print("no story selected for stage 2", flush=True)
                
            if not votedStory3:
                print("no story selected for stage 3", flush=True)
            
            story1 = Story.get_or_none(Story.story_id == uuid.UUID(votedStory1)) if votedStory1 else None
            story2 = Story.get_or_none(Story.story_id == uuid.UUID(votedStory2)) if votedStory2 else None
            story3 = Story.get_or_none(Story.story_id == uuid.UUID(votedStory3)) if votedStory3 else None
            if not story1 and votedStory1:
                return httpError("story not found", 400)
            if not story2 and votedStory2:
                return httpError("story not found", 400)
            if not story3 and votedStory3:
                return httpError("story not found", 400)
            
            if story1:
                Voting.create(
                    voting_session_id=active_session,
                    story_id=story1,
                    user_id=user,
                    voting_stage=1
                )
                
            if story2:
                Voting.create(
                    voting_session_id=active_session,
                    story_id=story2,
                    user_id=user,
                    voting_stage=2
                )
                
            if story3:
                Voting.create(
                    voting_session_id=active_session,
                    story_id=story3,
                    user_id=user,
                    voting_stage=3
                )

            all_votes_in = checkStatus(active_session, game)

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
    api.add_resource(VoteEndpoint, "/Vote")
    
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
                "timer" : settings.vote_timer,
                "timer_ends_at" : session.timer_ends_at.isoformat(),
                "results_end_at" : (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
            }, 200
            
    api.add_resource(VotingSessionEndpoint, "/VotingSession")
    
    
    class ResultsEndpoint(Resource):
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
            
            winning_stories = (
                Story
                .select()
                .join(Voting)
                .where(
                    (Voting.voting_session_id == session) &
                    (
                        (Story.is_winner_cont == True) |
                        (Story.is_winner_cat_1 == True) |
                        (Story.is_winner_cat_2 == True)
                    )
                )
                .distinct()
            )
            
            winners = [
                {
                    "story_id": str(s.story_id),
                    "is_winner_cont": s.is_winner_cont,
                    "is_winner_cat_1": s.is_winner_cat_1,
                    "is_winner_cat_2": s.is_winner_cat_2,
                }
                for s in winning_stories
            ]

            return {
                "ok": True,
                "voting_session_number": session.voting_session_number,
                "num_voting_sessions" : settings.num_votes,
                "cat_1" : session.cat_1.tag,
                "cat_2" : session.cat_2.tag,
                "winners": winners
            }, 200
            
            
    api.add_resource(ResultsEndpoint, "/Results")
    
        
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

            user = App_User.create(
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
            status = Status.get(Status.status_type == "LOBBY")

            game = Game.create(
                game_id=uuid.uuid4(),
                game_status=status,
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
                to=f"game:{game.game_code}"
            )

            # emit system message for chat

            socketio.emit(
                "player_joined_message",
                {
                    "username": user.username,
                    "players": players_list  
                },
                to=f"game:{game.game_code}"
            )

            # save game settings
            Game_Settings.create(
                game_id=game,
                num_rounds=rounds,
                num_votes=voting_sessions,
                timer=timer,
                vote_timer=60, 
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
                to=f"game:{game.game_code}"
            )

            # emit system chat join message
            socketio.emit(
                "player_joined_message",
                {"username": user.username},
                to=f"game:{game.game_code}"
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
                    "score": p.user_score,
                    "isHost": p.user_id.user_id == game.game_host.user_id
                })

            return {"players": players}
        
    class CreateUserEndpoint(Resource):
        def post(self):
            data = request.get_json() or {}
            username = data.get("username")
            password = data.get("password").encode("utf-8")
            password_hash = bcrypt.hashpw(password, bcrypt.gensalt())

            if (App_User.get_or_none(App_User.username == username)):
                return {
                    "ok": False,
                    "error": "username_taken"
                }

            user = App_User.create(
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
