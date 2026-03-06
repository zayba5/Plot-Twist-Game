import os
from flask import Flask, request, redirect
from flask_restful import Resource, Api
from flask_compress import Compress
from itsdangerous import TimestampSigner
from dotenv import load_dotenv
import models  
from models import db

load_dotenv()

def create_app(test_config: dict | None = None):
    app = Flask(__name__)

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
        if app.config.get("TESTING"):
            return

        criteria = [request.is_secure, app.debug, request.headers.get("X-Forwarded-Proto", "http") == "https"]
        if not any(criteria):
            url = request.url.replace("http://", "https://", 1)
            return redirect(url, code=308)

        db.connect(reuse_if_open=True)

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

        return response

    #endpoints
    class SampleEndpoint(Resource):
        def get(self):
            items = models.DefaultTable.select()   # <<-- reference via models.DefaultTable
            textlist = {"text": []}
            for item in items.iterator():
                curText = {"text": item.textEntry}
                textlist["text"].append(curText)
            return textlist

    api.add_resource(SampleEndpoint, "/Sample")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", debug=True)