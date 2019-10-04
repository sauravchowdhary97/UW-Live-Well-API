const express = require('express');
const bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		user: 'saurav',
		password: '',
		database: 'uw-live-well'
	}
});

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
	res.send("yo");
})

app.post('/signin', (req,res) => {
	const { email, password } = req.body;
	console.log(email, password);

	db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
});

app.post('/register', (req,res) => {
	const { email, name, password } = req.body; // only 3 happening
	const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]); //todo check if network has data
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    .catch(err => res.status(400).json(err))
  })
})

app.get('/profile/:id', (req, res) => {
	const { id } = req.params;
	db.select('*').from('users').where({id})
	.then(user => {
		if(user.length) {
			res.json(user[0]);
		} else {
			res.status(400).json('Not found');
		}
	})
	.catch(err => res.status(400).json('error getting user'));
	// if(!found)
	// {
	// 	res.status(400).json("not found");
	// }
})

app.post('/update', (req, res) => {
	const { password, email } = req.body;

	console.log(password, email, "yo");
	const hash = bcrypt.hashSync(password);

	db('login')
	  .where('email', '=', email)
	  .update({
	    hash: hash
	  })
	  .then(updateVal => {
	  	if(updateVal>0)
	  		res.json(updateVal);
	  	else
	  		res.status(400).json('Could not update');
	  })
	  .catch(err => {console.log(err)});
})

app.post('/details', (req, res) => {
	const {email} = req.body;
	db.select('*').from('users').where({email})
	.then(user => {
		console.log(user);
		res.json(user);
	})
	.catch(err => { 
		console.log(err);
		res.status(400).json(err);
	});
});

app.listen(3000, () => {
	console.log("app is running");
});

/*
	signin - post = success/fail
	register - post = user
	/profile/:userId --> GET = user

*/