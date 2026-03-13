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


load_dotenv()
s = TimestampSigner(os.getenv("secretKey"))

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

    signer = TimestampSigner(os.getenv("secretKey") or "")

    API_DIR = os.path.dirname(os.path.abspath(__file__))

    @app.before_request
    def beforeRequest():
        token = request.cookies.get("uid")

        if token:
            try:
                user_id = signer.unsign(token.encode("utf8"), max_age=60*60*24*365)
                g.user = User.get(User.user_id == int(user_id))
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
    

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", debug=True)