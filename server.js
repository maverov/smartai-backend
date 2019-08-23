const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
var knex = require('knex')({
    client: 'pg',
    connection: {
        connectionString : process.env.DATABASE_URL,
        ssl: true,
    }
  });

knex.select("*").from("users").then(data => {
    console.log(data);
});

const app = express();
app.use(bodyParser.json());
app.use(cors());


app.get("/", (req, res) => {
    res.send("is is working");
})

app.post("/signin", (req, res) => {
    knex.select("email", "hash").from("login")
    .where("email", "=", req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid) {
            return knex.select("*").from("users")
            .where("email", "=", req.body.email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json("Unable to get user."))
        }
    })
    .catch(err => res.status(400).json("Wrong credentials."))
})

app.post("/register", (req,res) => {
    const { email, name, password } = req.body;
    const hash = bcrypt.hashSync(password);
    knex.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
                .returning("*")
                .insert({
                    email: loginEmail[0],
                    name: name,
                    joined: new Date()
                }).then(user => {
                    res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
        .catch(err => res.status(400).json(error))
})

app.get("/profile/:id", (req, res) => {
    const { id } = req.params;
    knex.select("*").from("users").where({
        id: id
    }).then(user => {
        if (user.length) {
            res.json(user[0])
        } else {
            res.status(400).json("Not found.")
        }
    })
    .catch(err => res.status(400).json("Error getting user!"))
})

app.put("/image", (req, res) => {
    const { id } = req.body;
    knex("users").where('id', '=', id)
    .increment('entries', 1)
    .returning("entries")
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json("Unable to get entries."))
})

app.listen(process.env.PORT || 3000, ()=> {
    console.log(`app is running on port ${process.env.port}`)
});