const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');  // Add axios for downloading the image
const app = express();

// Middleware to parse JSON bodies
app.use(bodyParser.json());


// Route to handle webhook from Frappe
app.post('/upload', async (req, res) => {
    const data = req.body;
    if (data) {
        console.log('Received data:', data);

        try {
            // Step 1: Download the photo from the 'encoded' URL
            const imageUrl = data.encoded;
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        console.log('axios response', response);
            
            // Step 2: Convert the image to base64 format
            const base64Image = Buffer.from(response.data, 'binary').toString('base64');
        console.log('encoded response', base64Image);
            
            // Step 3: Replace the 'encoded' field with the base64 data
             data.encoded = `data:image;base64,${base64Image}`;

            // Save the modified JSON data to a file
            await saveJsonToFile(data);

            res.status(200).json({ status: 'success', message: 'Document received and processed' });
        } catch (error) {
            console.error('Error processing document:', error);
            res.status(500).json({ status: 'error', message: 'Failed to process document' });
        }
    } else {
        res.status(400).json({ status: 'error', message: 'No data received' });
    }
});


// Route to handle receiving and saving JSON files to another directory
app.post('/uploadfile', (req, res) => {
    const data = req.body;
    if (data) {
        console.log('Received JSON data for file upload:', data);

        // Save the JSON data to a file with a unique name
        saveJsonToDifferentDirectory(data)
            .then(() => {
                res.status(200).json({ status: 'success', message: 'File received and saved' });
            })
            .catch((error) => {
                console.error('Error saving file:', error);
                res.status(500).json({ status: 'error', message: 'Failed to save file' });
            });
    } else {
        res.status(400).json({ status: 'error', message: 'No data received' });
    }
});

// Function to save JSON data to a file with a unique name in the original directory
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

// Function to save JSON data to a file with a unique name in a different directory
function saveJsonToDifferentDirectory(data) {
    return new Promise((resolve, reject) => {
        const fileName = `${data.name}.json`;
        const filePath = path.join(process.env.HOME, 'FinalProject', 'KYC-verification-using-Blockchain', 'To_verify_hashes_JSON', fileName);

        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`File saved with unique name to: ${filePath}`);
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
