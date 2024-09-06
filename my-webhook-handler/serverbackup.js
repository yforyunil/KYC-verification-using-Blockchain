const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Route to handle webhook from Frappe
app.post('/upload', (req, res) => {
    const data = req.body;
    if (data) {
        console.log('Received data:', data);

        // Save the JSON data to a file
        saveJsonToFile(data)
            .then(() => {
                res.status(200).json({ status: 'success', message: 'Document received and processed' });
            })
            .catch((error) => {
                console.error('Error saving JSON to file:', error);
                res.status(500).json({ status: 'error', message: 'Failed to save JSON to file' });
            });
    } else {
        res.status(400).json({ status: 'error', message: 'No data received' });
    }
});

// Function to save JSON data to a file
function saveJsonToFile(data) {
    return new Promise((resolve, reject) => {
        if (!data.name) {
            reject(new Error('Field "name" is missing in JSON data'));
            return;
        }

        const fileName = `${data.name}.json`;
        const filePath = path.join(process.env.HOME, 'FinalProject', 'KYC-verification-using-Blockchain', 'KYC_JSON', fileName);

        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`JSON data saved to: ${filePath}`);
                resolve();
            }
        });
    });
}

// Start the server on port 5000
const port = 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
