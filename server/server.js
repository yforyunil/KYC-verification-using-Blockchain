// server.js
//This line imports the Express module into your project.
const express = require('express');
//This line creates an instance of an Express application.
const app = express();
const port = 3000;

//This line defines a route handler for the root URL (/). When a GET request is made to the root URL, the server responds with "Hello, World!".
app.get('/', (req, res) => {
    res.send('Hello! Blockchain under develpoment');
});

//This line starts the server and makes it listen on port 3000. Once the server is running, it logs a message indicating that the app is listening on http://localhost:3000.
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
