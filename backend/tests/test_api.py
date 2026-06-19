import pytest

def test_get_subjects(client):
    response = client.get("/api/subjects")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert 'Algebra' in response.json()

def test_create_subject(client):
    new_subject = "Physics"
    response = client.post("/api/subjects", json={"name": new_subject})
    assert response.status_code == 200
    assert response.json()["message"] == "Subject added"
    assert new_subject in response.json()["subjects"]

def test_get_questions(client):
    response = client.get("/api/questions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_smart_generate(client):
    response = client.post("/api/smart/generate", json={"topic": "Algebra"})
    assert response.status_code == 200
    assert "text" in response.json()
    assert response.json()["type"] == "MCQ"

def test_get_data(client):
    response = client.get("/api/data")
    assert response.status_code == 200
    data = response.json()
    assert "heatmap" in data
    assert "radar" in data
    assert "questions" in data
