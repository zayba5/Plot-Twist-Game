import pytest
from peewee import SqliteDatabase
import models

# create an in-memory sqlite DB for tests
@pytest.fixture(scope="session")
def test_db():
    # create the in-memory DB instance
    db = SqliteDatabase(":memory:")
    # bind models to this test DB
    db.bind([models.Game], bind_refs=False, bind_backrefs=False)
    # create tables
    db.connect()
    db.create_tables([models.Game])
    yield db
    # teardown
    db.drop_tables([models.Game])
    db.close()


# create an app object configured for testing
@pytest.fixture()
def app(test_db):
    # test_db fixture ensures models.DefaultTable is bound to test DB
    from main import create_app  # import after test_db bound
    app = create_app({"TESTING": True})
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()