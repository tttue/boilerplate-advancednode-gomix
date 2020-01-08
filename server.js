/*
	npm ln express
	npm ln cors
	npm ln body-parser
	npm ln mongodb
	npm ln helmet
	npm ln pug
	npm ln passport
  npm ln dotenv
  npm ln path
*/
"use strict";

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), 'private.env') });

const express = require("express");
const bodyParser = require("body-parser");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const pug = require("pug");
const session = require("express-session");
const passport = require("passport");
const ObjectID = require("mongodb").ObjectID;
const mongo = require("mongodb").MongoClient;
const LocalStrategy = require("passport-local");

const app = express();

fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "pug");

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: true,
		saveUninitialized: true
	})
);
app.use(passport.initialize());
app.use(passport.session());

mongo.connect(process.env.MONGO_URI, (err, dbc) => {
	if (err) {
		console.log("Database error: " + err);
	} else {
		console.log("Successful database connection");
		let db = dbc.db("test");
		//serialization and app.listen

		passport.serializeUser((user, done) => {
			done(null, user._id);
		});

		passport.deserializeUser((id, done) => {
			db.collection("users").findOne({ _id: new ObjectID(id) }, (err, doc) => {
				done(null, doc);
			});
		});

		passport.use(
			new LocalStrategy(function (username, password, done) {
				db.collection("users").findOne({ username: username }, function (
					err,
					user
				) {
					console.log("User " + username + " attempted to log in.");
					if (err) {
						return done(err);
					}
					if (!user) {
						return done(null, false);
					}
					if (password !== user.password) {
						return done(null, false);
					}
					return done(null, user);
				});
			})
		);

		function ensureAuthenticated(req, res, next) {
			if (req.isAuthenticated()) {
				return next();
			}
			res.redirect("/");
		}
		app.route("/profile").get(ensureAuthenticated, (req, res) => {
			res.render(process.cwd() + "/views/pug/profile");
		});

		app.route("/").get((req, res) => {
			res.render(process.cwd() + "/views/pug/index", {
				title: "Hello",
				message: "Please login",
				showLogin: true
			});
		});

		app
			.route("/login")
			.post(
				passport.authenticate("local", { failureRedirect: "/" }),
				(req, res) => {
					res.redirect("/profile");
				}
			);

		const listener = app.listen(process.env.PORT || 3000, () => {
			console.log("Listening on port " + listener.address().port);
		});
	}
});
