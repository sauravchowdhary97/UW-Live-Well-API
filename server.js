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

// app.get('/', (req, res) => {
// 	res.send("");
// })

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

app.post('/addListing', (req, res) => {
	const { state } = req.body;

	db('listings')
	.returning('*')
	.insert(
		{	email: state.email,
			rent: state.rent,
			rooms: state.rooms,
			availibility: state.availibility,
			pets: state.pets,
			sharing: state.sharing,
			propertyname: state.propertyName,
			image: state.image,
			joined: new Date()
	})
	.then(listing => {
		console.log(listing);
		if(listing[0].id)
			res.json("successfully added");
		else
			res.status(400).json("failed to add");
	})
	.catch(err => {console.log(err)});
})

app.post('/searchListings', (req, res) => {
	const { state } = req.body;
	if(state===undefined)
	{
		db.select('*')
		.from('listings')
		.then(data => {
			console.log(data);
			res.json(data);
		})
		.catch(err => { console.log(err) } );
	}
	else
	{
		//console.log(state.minrent, state.maxrent, state.rooms);
		db.select('*')
		.from('listings')
		.where('rent', '>=', state.minrent)
		.andWhere('rent', '<=', state.maxrent)
		.andWhere('rooms', '=', state.rooms)
		.andWhere('sharing', '=', state.sharing)
		.andWhere('pets', '=', state.pets)
		.then(data => {
			console.log(data);
			if(data[0].id)
				res.json(data);
			else
				res.json("zero results");
		})
		.catch(err => { console.log(err)})
	}
})

app.post('/newFav', (req, res) => {
	const { id, email } = req.body;
	db('favlistings')
	.returning('*')
	.insert(
		{	email: email,
			listingid: id
	})
	.then(listing => {
		if(listing[0].id)
			res.json("successfully added");
		else
			res.status(400).json("failed to add");
	})
	.catch(err => {console.log(err)});
})

app.post('/getFavListings', (req, res) => {
	const { email } = req.body;
	let results = '';
	db.select('*')
	.from('favlistings')
	.where('email', '=', email)
	.then(data => {
		console.log(data);
		if(data[0].id)
		{
			results = data;
			res.json(data);
		}
		else
			res.json("zero");
	})
	.catch(err => {console.log(err)});
})

app.post('/getListing', (req, res) => {
	const { id } = req.body;
	db.select('*')
	.from('listings')
	.where('id', '=', id)
	.then(data => {
		console.log(data);
		if(data[0].id)
		{
			res.json(data);
		}
		else
			res.json("zero");
	})
	.catch(err => {console.log(err)});	
})

app.listen(process.env.PORT || 3000, () => {
	console.log("app is running");
});