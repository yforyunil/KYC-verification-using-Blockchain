// SPDX-License-Identifier: MIT
import { create } from 'ipfs-http-client';
import Web3 from 'web3';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import chokidar from 'chokidar';

// IPFS and blockchain configuration
const ipfs = create('http://localhost:5001');
const web3 = new Web3('http://localhost:8545');

// Directories for reading input JSON and saving output
const inputDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/hashes_IPFS_Blockchain';

// Frappe API URL
const frappeApiUrl = 'http://202.51.82.246:85/api/resource/Blockchain Hash';

// Function to get contract address dynamically
async function getContractAddress() {
    const contractJsonPath = path.join('/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/build/contracts', 'KYCDocument.json');
    try {
        const contractJson = await fs.readFile(contractJsonPath, 'utf8');
        const contractData = JSON.parse(contractJson);
        const networkId = await web3.eth.net.getId();
        return contractData.networks[networkId].address;
    } catch (error) {
        console.error('Error reading contract address:', error);
        throw error;
    }
}

// Function to get contract ABI
async function getContractABI() {
    const contractJsonPath = path.join('/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/build/contracts', 'KYCDocument.json');
    try {
        const contractJson = await fs.readFile(contractJsonPath, 'utf8');
        const contractData = JSON.parse(contractJson);
        return contractData.abi;
    } catch (error) {
        console.error('Error reading contract ABI:', error);
        throw error;
    }
}

// Function to fetch KYC data from IPFS
async function fetchFromIPFS(ipfsHash) {
    try {
        const file = await ipfs.cat(ipfsHash);
        const content = [];
        for await (const chunk of file) {
            content.push(chunk);
        }
        return JSON.parse(Buffer.concat(content).toString('utf8'));
    } catch (error) {
        console.error('Error fetching from IPFS:', error);
        throw error;
    }
}

// Function to send KYC information to Frappe API
async function sendToFrappe(kycInfo) {
    try {
        const response = await fetch(frappeApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(kycInfo)
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

// Function to process the JSON file and verify KYC information
async function verifyDocument(filePath) {
    let statusFlag = '';

    try {
        const filename = path.basename(filePath);

        // Read JSON file
        const jsonData = await fs.readFile(filePath, 'utf8');
        const { ipfsHash: originalIpfsHash, blockchainHash, owner } = JSON.parse(jsonData);

        // Get contract address and ABI dynamically
        const contractAddress = await getContractAddress();
        const contractABI = await getContractABI();
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Fetch IPFS hash from blockchain using blockchain hash
        let storedIpfsHash;
        try {
            storedIpfsHash = await contract.methods.getDocument(blockchainHash).call();
        } catch (error) {
            console.error('Error fetching IPFS hash from blockchain:', error);
            statusFlag = 'no block';
        }

        // If no block found or error, set status and exit
        if (statusFlag === 'no block') {
            console.log('No block found, skipping file processing.');
            return;
        }

        // Compare the IPFS hashes
        if (storedIpfsHash !== originalIpfsHash) {
            statusFlag = 'ipfs hash different';
            console.log('IPFS hashes do not match.');
        } else {
            // Fetch KYC information from IPFS
            let kycInfo;
            try {
                kycInfo = await fetchFromIPFS(storedIpfsHash);
                statusFlag = 'verified';
            } catch (error) {
                console.error('Error fetching KYC information from IPFS:', error);
                statusFlag = 'error';
            }

            // If KYC information was successfully fetched, add status and send to Frappe API
            if (statusFlag === 'verified') {
                kycInfo.Status = statusFlag;
                kycInfo.owner = owner;
                await sendToFrappe(kycInfo);
            }
        }
    } catch (error) {
        console.error('Error verifying document:', error);
        statusFlag = 'error';
    }
}

// Watch the input directory for new JSON files
const watcher = chokidar.watch(inputDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
});

// Event listener for added files
watcher.on('add', filePath => {
    if (filePath.endsWith('.json')) {
        console.log(`New JSON file detected: ${filePath}`);
        verifyDocument(filePath);
    }
});

// Error handling for watcher
watcher.on('error', error => console.error('Watcher error:', error));

console.log(`Watching directory: ${inputDir} for new JSON files...`);
