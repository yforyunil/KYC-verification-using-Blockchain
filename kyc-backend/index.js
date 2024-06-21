const express = require('express');
const bodyParser = require('body-parser');
const { create } = require('ipfs-http-client');
const Web3 = require('web3');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// IPFS and Ethereum setup
const ipfs = create({ host: 'localhost', port: '5001', protocol: 'http' });
const web3 = new Web3('http://localhost:8545');

// ABI from the compiled smart contract
const contractABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "documents",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipfsHash",
                "type": "string"
            }
        ],
        "name": "addDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "getDocument",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Replace with your contract address
const contractAddress = '0x3043032b0f2dbbc8b73d4310d35c94b8869959b4fd527f98665d3d10ee47cb60'; // Address of the deployed smart contract

// Replace with your Ethereum account address
const account = '0x11f65Ff80779B0B156b86cdb79892B1e4d624c3C'; // Your Ethereum account address

const contract = new web3.eth.Contract(contractABI, contractAddress);

// Upload document to IPFS and store hash on blockchain
app.post('/upload', async (req, res) => {
    try {
        const { filePath } = req.body;
        const file = fs.readFileSync(filePath);
        const result = await ipfs.add(file);
        const ipfsHash = result.path;
        await contract.methods.addDocument(ipfsHash).send({ from: account });
        res.json({ ipfsHash });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Retrieve document hash from blockchain
app.get('/document/:userAddress', async (req, res) => {
    try {
        const userAddress = req.params.userAddress;
        const ipfsHash = await contract.methods.getDocument(userAddress).call();
        res.json({ ipfsHash });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
});
