// SPDX-License-Identifier: MIT
import { create } from 'ipfs-http-client';
import Web3 from 'web3';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// IPFS and blockchain configuration
const ipfs = create('http://localhost:5001');
const web3 = new Web3('http://localhost:8545');
const contractAddress = '0xE279e9bA6d113CDA00596aA7b336A217c00c3dc8';
const abi = [
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
    }
];
const contract = new web3.eth.Contract(abi, contractAddress);

// Directories for reading input JSON and saving output
const inputDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/KYC_JSON';
const outputDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/hashes_IPFS_Blockchain';

// Frappe API URL
const frappeApiUrl = 'http://202.51.82.246:85/api/resource/Blockchain Hash';

// Function to upload a JSON file to IPFS
async function uploadToIPFS(data) {
    try {
        const result = await ipfs.add(data);
        return result.path;
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        throw error;
    }
}

// Function to save the IPFS hash, transaction hash, and filename to a JSON file
async function saveHashes(filename, ipfsHash, txHash) {
    try {
        const outputData = { filename, ipfsHash, txHash };
        const outputFilePath = path.join(outputDir, `${filename}.result.json`);
        await fs.writeFile(outputFilePath, JSON.stringify(outputData, null, 2));
        console.log(`Saved hashes to ${outputFilePath}`);
        return outputData;
    } catch (error) {
        console.error('Error saving hashes:', error);
        throw error;
    }
}

// Function to send data to Frappe API
async function sendToFrappe(outputData) {
    const { ipfsHash, txHash } = outputData;
    const frappeData = {
        ipfs_hash: ipfsHash,
        blockchain_hash: txHash,
        docstatus: 1
    };

    try {
        const response = await fetch(frappeApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(frappeData)
        });

        if (!response.ok) {
            throw new Error(`Failed to send data to Frappe API: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Successfully sent data to Frappe API:', responseData);
    } catch (error) {
        console.error('Error sending data to Frappe API:', error);
    }
}

// Function to upload a JSON file to IPFS and blockchain
async function uploadDocument(filename) {
    try {
        // Read JSON file
        const filePath = path.join(inputDir, filename);
        const data = await fs.readFile(filePath);

        // Upload JSON to IPFS
        const ipfsHash = await uploadToIPFS(data);
        console.log(`Uploaded to IPFS with hash: ${ipfsHash}`);

        // Upload IPFS hash to blockchain
        const accounts = await web3.eth.getAccounts();
        const gasPrice = await web3.eth.getGasPrice();
        const receipt = await contract.methods.addDocument(ipfsHash).send({
            from: accounts[0],
            gas: 3000000,
            gasPrice
        });
        const txHash = receipt.transactionHash;
        console.log(`Transaction hash: ${txHash}`);

        // Save IPFS hash, transaction hash, and filename to a JSON file
        const outputData = await saveHashes(filename, ipfsHash, txHash);

        // Send data to Frappe API
        await sendToFrappe(outputData);
    } catch (error) {
        console.error('Error uploading document:', error);
    }
}

// Process all JSON files in the input directory
async function processFiles() {
    try {
        const files = await fs.readdir(inputDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                await uploadDocument(file);
            }
        }
    } catch (error) {
        console.error('Error processing files:', error);
    }
}

// Execute the process
processFiles();
