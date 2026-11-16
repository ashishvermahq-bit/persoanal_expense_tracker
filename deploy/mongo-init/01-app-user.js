// Runs once, when the MongoDB data volume is first created (docker-entrypoint-initdb.d).
// Creates the app's user with readWrite on the `paisa` database only.
db.getSiblingDB("paisa").createUser({
  user: "paisa",
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: "readWrite", db: "paisa" }],
});
