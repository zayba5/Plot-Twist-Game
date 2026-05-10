import uuid
from models import *


def test_get_sample_endpoint(client):
    status = Status.create(status_type="active")
    host = App_User.create(user_id=uuid.uuid4(), username="host-user", password_hash=None)
    game_id = uuid.uuid4()
    Game.create(
        game_id=game_id,
        game_status=status,
        game_host=host,
        game_code="ABC123"
    )

    resp = client.get("/Sample")
    assert resp.status_code == 200

    data = resp.get_json()
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 1
    assert data["items"][0]["game_id"] == str(game_id)
    assert data["items"][0]["game_status"] == str(status.status_id)
    assert data["items"][0]["game_host"] == str(host.user_id)


def test_whoami_requires_auth(client):
    resp = client.get("/WhoAmI")
    assert resp.status_code == 401

    data = resp.get_json() or {}
    assert data.get("message") == "Missing or invalid user cookie"


def test_login_returns_missing_fields(client):
    resp = client.post("/login", json={})
    assert resp.status_code == 400

    data = resp.get_json()
    assert data["ok"] is False
    assert data["error"] == "missing_fields"


def test_login_returns_invalid_credentials_for_unknown_user(client):
    resp = client.post("/login", json={"username": "unknown", "password": "password"})
    assert resp.status_code == 401

    data = resp.get_json()
    assert data["error"] == "invalid_credentials"


def test_get_all_story_requires_auth(client):
    resp = client.get("/GetAllStory")
    assert resp.status_code == 401


def test_create_story_requires_auth(client):
    resp = client.post("/CreateStory", json={})
    assert resp.status_code == 401


def test_next_story_part_requires_auth(client):
    resp = client.get("/NextStoryPart")
    assert resp.status_code == 401


def test_story_submission_requires_auth(client):
    resp = client.post("/StorySubmission", json={})
    assert resp.status_code == 401


def test_poll_ready_requires_auth(client):
    resp = client.get("/PollReady")
    assert resp.status_code == 401


def test_score_requires_auth(client):
    resp = client.get("/Scores")
    assert resp.status_code == 401


def test_vote_requires_auth(client):
    resp = client.post("/Vote", json={})
    assert resp.status_code == 401


def test_voting_session_requires_auth(client):
    resp = client.get("/VotingSession")
    assert resp.status_code == 401


def test_results_requires_auth(client):
    resp = client.get("/Results")
    assert resp.status_code == 401


def test_session_endpoint_returns_200(client):
    resp = client.get("/session")
    assert resp.status_code == 200
    assert resp.get_json() is not None


def test_create_lobby_requires_auth(client):
    resp = client.post("/create-lobby", json={})
    assert resp.status_code == 401


def test_join_lobby_requires_auth(client):
    resp = client.post("/join-lobby", json={})
    assert resp.status_code == 401


def test_lobby_players_game_id_required(client):
    resp = client.get("/lobby-players")
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"] == "game_id required"


def test_create_user_missing_fields(client):
    resp = client.post("/signup", json={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["ok"] is False
    assert data["error"] == "missing_fields"


def test_logout_returns_ok(client):
    resp = client.post("/logout")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True


def test_chat_history_requires_auth(client):
    resp = client.get("/chat-history")
    assert resp.status_code == 401


def test_leave_lobby_requires_auth(client):
    resp = client.post("/leave-lobby")
    assert resp.status_code == 401
