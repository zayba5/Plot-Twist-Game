def test_sample_endpoint_returns_text_list(client):
    resp = client.get("/Sample")
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, dict)