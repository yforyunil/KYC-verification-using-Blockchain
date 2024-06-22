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
const inputDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/KYC_JSON';
const outputDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/hashes_IPFS_Blockchain';

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
async function saveHashes(filename, ipfsHash, txHash, owner) {
    try {
        const outputData = { filename, ipfsHash, txHash, owner };
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
    const { ipfsHash, txHash, owner } = outputData;
    const frappeData = {
        ipfs_hash: ipfsHash,
        blockchain_hash: txHash,
        docstatus: 1,
       owner: owner // Include the owner payload from the input file
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
async function uploadDocument(filePath) {
    try {
        const filename = path.basename(filePath);

        // Read JSON file
        const jsonData = await fs.readFile(filePath, 'utf8');
        const { owner, ...data } = JSON.parse(jsonData);

        // Upload JSON to IPFS
        const ipfsHash = await uploadToIPFS(Buffer.from(JSON.stringify(data)));

        // Get contract address and ABI dynamically
        const contractAddress = await getContractAddress();
        const contractABI = await getContractABI();
        const contract = new web3.eth.Contract(contractABI, contractAddress);

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
        const outputData = await saveHashes(filename, ipfsHash, txHash, owner);

        // Send data to Frappe API
        await sendToFrappe(outputData);
    } catch (error) {
        console.error('Error uploading document:', error);
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
        uploadDocument(filePath);
    }
});

// Error handling for watcher
watcher.on('error', error => console.error('Watcher error:', error));

console.log(`Watching directory: ${inputDir} for new JSON files...`);
