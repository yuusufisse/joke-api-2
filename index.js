const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: 'yuusuf14',
  database: 'jokes_db'
});

const query = (sql, args) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, args, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

app.use(bodyParser.json());

// Create tables
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS jokes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category TEXT,
        joke TEXT,
        likes INT DEFAULT 0,
        dislikes INT DEFAULT 0
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) UNIQUE
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS joke_categories (
        joke_id INT,
        category_id INT,
        PRIMARY KEY (joke_id, category_id),
        FOREIGN KEY (joke_id) REFERENCES jokes(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);
    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables: ', err);
  }
})();

// Retrieve a random joke from all categories
app.get('/jokes/random', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM jokes ORDER BY RAND() LIMIT 1');
    res.send(rows[0]);
  } catch (err) {
    console.error('Error getting random joke: ', err);
    res.status(500).send(err.message);
  }
});

// Retrieve a random joke from a category
app.get('/jokes/random/:category', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM jokes WHERE category = ? ORDER BY RAND() LIMIT 1', [req.params.category]);
    res.send(rows[0]);
  } catch (err) {
    console.error('Error getting random joke by category: ', err);
    res.status(500).send(err.message);
  }
});

// Retrieve a list of categories
app.get('/categories', async (req, res)=> {
    try {
        const rows = await query('SELECT * FROM categories');
        res.send(rows);
    } catch (err) {
        console.error('Error getting categories: ', err);
        res.status(500).send(err.message);
    }
});
    
// Retrieve all jokes
app.get('/jokes', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM jokes');
        res.send(rows);
    } catch (err) {
        console.error('Error getting jokes: ', err);
        res.status(500).send(err.message);
    }
});
    
// Add a new joke
app.post('/jokes', async (req, res) => {
    const { category, joke } = req.body;
    try {
        await query('INSERT INTO jokes (category, joke) VALUES (?, ?)', [category, joke]);
        res.send('Joke added successfully');
    } catch (err) {
        console.error('Error adding joke: ', err);
        res.status(500).send(err.message);
    }
});
    
// Update the like or dislike count for a joke
app.put('/jokes/:id', async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    let sql;
    if (action === 'like') {
        sql = 'UPDATE jokes SET likes = likes + 1 WHERE id = ?';
    } else if (action === 'dislike') {
        sql = 'UPDATE jokes SET dislikes = dislikes + 1 WHERE id = ?';
    } else {
        return res.status(400).send('Invalid action');
    }
    try {
        await query(sql, [id]);
        res.send('Joke count updated successfully');
    } catch (err) {
        console.error('Error updating joke count: ', err);
        res.status(500).send(err.message);
    }
});
    
// Delete a joke
app.delete('/jokes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM jokes WHERE id = ?', [id]);
        res.send('Joke deleted successfully');
    } catch (err) {
        console.error('Error deleting joke: ', err);
        res.status(500).send(err.message);
    }
});

// Add a new category
app.post('/categories', async (req, res) => {
    const { name } = req.body;
    try {
        await query('INSERT INTO categories (name) VALUES (?)', [name]);
        res.send('Category added successfully');
    } catch (err) {
        console.error('Error adding category: ', err);
        res.status(500).send(err.message);
    }
});

// Assign a category to a joke
app.post('/jokes/:id/category', async (req, res) => {
    const { id } = req.params;
    const { category } = req.body;
    try {
        const [categoryRow] = await query('SELECT id FROM categories WHERE name = ?', [category]);
        if (!categoryRow) {
            return res.status(404).send('Category not found');
        }
        const { id: categoryId } = categoryRow;
        await query('INSERT INTO joke_categories (joke_id, category_id) VALUES (?, ?)', [id, categoryId]);
        res.send('Category assigned to joke successfully');
    } catch (err) {
        console.error('Error assigning category to joke: ', err);
        res.status(500).send(err.message);
    }
});

// Retrieve jokes by category
app.get('/jokes/:category', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM jokes WHERE category = ?', [req.params.category]);
        res.send(rows);
    } catch (err) {
        console.error('Error getting jokes by category: ', err);
        res.status(500).send(err.message);
    }
});

// Update likes or dislikes for a joke
app.put('/jokes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { likes = 0, dislikes = 0 } = req.body;
        await query('UPDATE jokes SET likes = ?, dislikes = ? WHERE id = ?', [likes, dislikes, id]);
        res.send({ id, likes, dislikes });
    } catch (err) {
        console.error('Error updating joke: ', err);
        res.status(500).send(err.message);
    }
});

// Delete a category by id
app.delete('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM categories WHERE id = ?', [id]);
        res.send({ id });
    } catch (err) {
        console.error('Error deleting category: ', err);
        res.status(500).send(err.message);
    }
});

// Start the server
app.listen(port, () => {
    console.log('Server started on port ${port}');
});
