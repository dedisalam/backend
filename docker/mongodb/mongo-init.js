// mongo-init.js
db = db.getSiblingDB('user_db');
db.createCollection('init');

db = db.getSiblingDB('notification_db');
db.createCollection('init');
