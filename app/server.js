let express = require('express');
let path = require('path');
let fs = require('fs');
let { Pool } = require('pg');
let bodyParser = require('body-parser');
let app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
  });

app.get('/profile-picture', function (req, res) {
  let img = fs.readFileSync(path.join(__dirname, "images/profile-1.jpg"));
  res.writeHead(200, {'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
});

// use when starting application locally
let pgConfigLocal = {
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'admin',
  password: 'secret'
};

// use when starting application as docker container
let pgConfigDocker = {
  host: 'postgres-db',
  port: 5432,
  database: 'mydb',
  user: 'admin',
  password: 'secret'
};

// Create connection pool
let pool = new Pool(pgConfigLocal);
//let pool=new Pool(pgConfigDocker);
// Initialize database table
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    userid INTEGER PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    interests VARCHAR(255)
  )
`, function(err) {
  if (err) console.error('Error creating table:', err);
  else console.log('Users table ready');
});

app.post('/update-profile', function (req, res) {
  let userObj = req.body;
  userObj['userid'] = 1;

  // PostgreSQL upsert using INSERT ... ON CONFLICT
  let query = `
    INSERT INTO users (userid, name, email, interests)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (userid) 
    DO UPDATE SET 
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      interests = EXCLUDED.interests
  `;
  
  let values = [
    userObj.userid,
    userObj.name || null,
    userObj.email || null,
    userObj.interests || null
  ];

  pool.query(query, values, function(err, result) {
    if (err) {
      console.error('Error updating profile:', err);
      res.status(500).send({ error: 'Database error' });
      return;
    }
    // Send response
    res.send(userObj);
  });
});

app.get('/get-profile', function (req, res) {
  let query = 'SELECT * FROM users WHERE userid = $1';
  let values = [1];

  pool.query(query, values, function (err, result) {
    if (err) {
      console.error('Error fetching profile:', err);
      res.status(500).send({ error: 'Database error' });
      return;
    }
    
    // Send response (first row or empty object)
    res.send(result.rows.length > 0 ? result.rows[0] : {});
  });
});

app.listen(3000, function () {
  console.log("app listening on port 3000!");
});
