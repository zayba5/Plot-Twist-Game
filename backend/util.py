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

def httpError(reason, code):
    return jsonify({
        "ok": False,
        "error": reason
        }), code

def generate_game_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_assignments_for_round(game, outer_round_number, inner_round_number):
    previous_round = inner_round_number - 1

    prev_assignments = list(
        Story_Assignment.select().where(
            (Story_Assignment.game_id == game) &
            (Story_Assignment.outer_round_number == outer_round_number) &
            (Story_Assignment.inner_round_number == previous_round)
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
            outer_round_number=outer_round_number,
            inner_round_number=inner_round_number,
            user_id=user,
            story_id=story
        )
        
def get_user_from_cookie(signer):
    token = request.cookies.get("uid")
    if not token:
        return None

    try:
        raw_user_id = signer.unsign(token, max_age=60 * 60 * 24 * 365)

        if isinstance(raw_user_id, bytes):
            raw_user_id = raw_user_id.decode("utf-8")

        user_id = uuid.UUID(str(raw_user_id))
        return User.get_or_none(User.user_id == user_id)

    except (BadSignature, SignatureExpired, ValueError):
        return None
    
def get_active_game_from_user(user):
    if not user:
        return
    game = (
            Game
            .select(Game, Status)
            .join(Game_Players, on=(Game_Players.game_id == Game.game_id))
            .switch(Game)
            .join(Status, on=(Game.game_status == Status.status_id))
            .where(
                (Game_Players.user_id == user.user_id) &
                (Status.status_type == "ACTIVE")
            )
            .get_or_none()
        )

    return game