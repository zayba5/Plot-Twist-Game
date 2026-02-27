import os
from flask import Flask, request
from flask_restful import Resource, Api
from models import *
from itsdangerous import TimestampSigner
from functools import wraps
from flask_compress import Compress


##deleted imports noting just to make easier if I need them again:
# bcrypt, hashlib, flask abort/send_from_directory/g, dateutil parser
# itsdangerous SignatureExpired/BadSignature, werkzeug.utils secure_filename
# datetime datetime/timedelta, pdf2image convert_from_path, playhouse.migrate *

##secret key should be actually protected in real deployment
secretKey = "R]5~iyq'@,ysP1!FuP#ove,h!rY#:dp74QDYh!o1G*1O4ieKGSp7&V'fE<b[MALwp"
s = TimestampSigner(secretKey)
app = Flask(__name__)
Compress(app)
api = Api(app)
API_DIR = os.path.dirname(os.path.abspath(__file__))

# run database migrators here
@app.before_first_request
def before_first_request():
    db.connect()
        ##one time stuff that may need to be done, previously used for migration
    db.close()


# opens db connection before request
@app.before_request
def beforeRequest():
    criteria = [ request.is_secure, app.debug, request.headers.get('X-Forwarded-Proto', 'http') == 'https' ]
    if not any(criteria):
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=308)
    db.connect()


# closes db connection after request
@app.after_request
def afterRequest(response):
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE")
    response.headers.set("Access-Control-Allow-Headers", "x-api-key, Content-Type, Content-Length")
    response.headers.set("Content-Disposition", "attachment")
    db.close()
    return response


# verifies user is authorized
#def requireAuth(func):
    #@wraps(func)
    #def inner(*args, **kwargs):
        ##sub in the appropriate validation for whatever system of choice if needed

        #apiKey = request.headers.get("X-api-key").encode("utf8")
        #try:
        #    g.user = User.get(User.id == int(s.unsign(apiKey, max_age=7 * 24 * 3600).decode("utf8")))
        #except SignatureExpired:
        #    abort(401)
        #except BadSignature:
        #    abort(401)
        #except User.DoesNotExist:
        #    abort(401)
        #return func(*args, **kwargs)

    #return inner


# endpoint for gender
class SampleEndpoint(Resource):
    def get(self):
        items = DefaultTable.select()
        textList = {"text": []}

        for item in items.iterator():
            curText = {"text": item.textEntry}
            textList["text"].append(curText)

        return textList


api.add_resource(SampleEndpoint, '/Sample')


if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)
