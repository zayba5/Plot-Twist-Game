import uuid
from models import *

def test_get_sample_endpoint(client):
    resp = client.get("/Sample")
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, dict)
    
def test_get_story_endpoint(client):
    gid = uuid.UUID("a3787d56-9f47-473e-aa0b-41369dc5b847")
    host = User.create(user_id=uuid.uuid4())
    status = Status.create(status_type = "active")
    Game.create(game_id=gid, game_status= status.status_id, game_host=host)
    resp = client.get("/Story")
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, dict)