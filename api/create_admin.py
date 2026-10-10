"""Create the first real administrator, without shipping a preset password."""
import argparse
from getpass import getpass
from .app import app, db, initialize_schema, hash_password


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass("Admin password (at least 8 characters): ")
    if len(password) < 8:
        parser.error("Password must have at least 8 characters")
    if password != getpass("Confirm password: "):
        parser.error("Passwords do not match")
    first, _, last = args.name.strip().partition(" ")
    with app.app_context():
        initialize_schema()
        with db().cursor() as c:
            c.execute("INSERT INTO app_user(username,email,first_name,last_name,password_user,role) VALUES(%s,%s,%s,%s,%s,'admin')",
                      (args.username, args.email, first, last, hash_password(password)))
        db().commit()
    print("Administrator created")


if __name__ == "__main__":
    main()
