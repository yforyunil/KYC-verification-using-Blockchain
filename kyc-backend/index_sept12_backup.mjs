// SPDX-License-Identifier: MIT
import { create } from 'ipfs-http-client';
import Web3 from 'web3';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import chokidar from 'chokidar';
import { encodeFunctionSignature, decodeParameters } from 'web3-eth-abi';


// IPFS and blockchain configuration
const ipfs = create('http://localhost:5001');
const web3 = new Web3('http://localhost:8545');

// Directories for input JSON and saving output
const uploadDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/KYC_JSON';
const verifyDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/To_verify_hashes_JSON';

// Frappe API URLs for uploads and verifications
const frappeUploadApiUrl = 'https://project.dndts.net/api/resource/Blockchain Hash';
const frappeVerifyApiUrl = 'https://project.dndts.net/api/resource/Verified KYC Forms';

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
    // Hardcoded ABI for KYCDocument contract
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
    }
];

    return abi;
}


function decodeIPFSHash(abi, encodedInput) {
    try {
        // Extract the function signature (first 4 bytes)
        const functionSignature = encodedInput.slice(0, 10); // '0x' + first 8 hex characters
        const functionData = encodedInput.slice(10); // Remaining data
	console.log('Function Signature:', functionSignature);
        console.log('Function Data:', functionData);
	
        // Find the function ABI that matches the signature
        const functionABI = abi.find(fn => {
            const signature = encodeFunctionSignature(fn);
            console.log('ABI Function Signature:', signature);
            return signature === functionSignature;
        });

        if (!functionABI) {
            throw new Error('Function signature not found in ABI');
        }

        // Decode the parameters from the function ABI
        const decodedParams = decodeParameters(functionABI.inputs, functionData);

        // Assuming the IPFS hash is the first parameter
        return decodedParams[0];
    } catch (error) {
        console.error('Error decoding IPFS hash:', error);
        return null;
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
    const outputDir = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/hashes_IPFS_Blockchain';
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

// Function to send uploaded hashes to the upload API
async function sendToUploadApi(data) {
    const {citizenship_no, ipfsHash, txHash, owner } = data;
    const frappeData = {
	citizenship_number: citizenship_no,
        ipfs_hash: ipfsHash,
        blockchain_hash: txHash,
        docstatus: 1,
       owner: owner // Include the owner payload from the input file
    };
    try {
        const response = await fetch(frappeUploadApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(frappeData)
        });

        if (!response.ok) {
            throw new Error(`Failed to send data to Upload API: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Successfully sent data to Upload API:', responseData);
    } catch (error) {
        console.error('Error sending data to Upload API:', error);
    }
}

// Function to send verified documents to the verification API
async function sendToVerifyApi(data) {
    try {
        const response = await fetch(frappeVerifyApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to send data to Verify API: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Successfully sent data to Verify API:', responseData);
    } catch (error) {
        console.error('Error sending data to Verify API:', error);
    }
}

// Function to upload a document (KYC creation)
async function uploadDocument(filePath) {
    try {
        const filename = path.basename(filePath);
        const jsonData = await fs.readFile(filePath, 'utf8');
        const { owner,citizenship_no, ...data } = JSON.parse(jsonData);

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

        // Save IPFS hash, transaction hash, and owner
        const outputData = await saveHashes(filename, ipfsHash, txHash, owner);
	let ApiData = { citizenship_no, ipfsHash, txHash, owner };
        // Send data to Upload API
        await sendToUploadApi(ApiData);
    } catch (error) {
        console.error('Error uploading document:', error);
    }
}

// Function to verify document (KYC verification)
async function verifyDocument(filePath) {
    // Initialize statusFlag
    let statusFlag = '';
    let kycData = {};  // To store KYC data fetched from IPFS
    let transaction;
    let requestedBy; // To store requested_by from the JSON file
	let userJson;
    
    try {
        // Read the JSON file
        const jsonData = await fs.readFile(filePath, 'utf8');
        const { ipfs_hash, blockchain_hash, user, requested_by } = JSON.parse(jsonData);
        requestedBy = requested_by; // Save requested_by for error handling
	    userJson = user;

        // Fetch the transaction using the blockchain hash (transaction hash)
        try {
            transaction = await web3.eth.getTransaction(blockchain_hash);
            if (!transaction) {
                console.error(`Transaction with hash ${blockchain_hash} not found.`);
                statusFlag = 'no block'; 
                throw new Error('Transaction not found');
            }
        } catch (error) {
            console.error(`Error fetching transaction for hash ${blockchain_hash}:`, error);
            statusFlag = 'error'; 
            throw error; // Rethrow to handle in the final catch
        }
        console.log(`Transaction found for hash: ${blockchain_hash}`);

        // Check if the transaction exists and proceed with IPFS hash verification
        const contractABI = await getContractABI();
        let encodedInput = transaction.input.trim();
        const decodedIPFSHash = decodeIPFSHash(contractABI, encodedInput);
        if (ipfs_hash !== decodedIPFSHash) {  // Compare the IPFS hash from the JSON file with the transaction input
            console.log(`ipfs hash different`, decodedIPFSHash);
            statusFlag = 'ipfs hash different'; // If the IPFS hashes do not match
	    throw new Error('ipfs hash different');	
        } else {
            // Fetch KYC data from IPFS
            const ipfsData = [];
            for await (const chunk of ipfs.cat(decodedIPFSHash)) {
                ipfsData.push(chunk);
            }
            const ipfsDataBuffer = Buffer.concat(ipfsData); // Concatenate chunks into a single buffer
            const ipfsDataStr = ipfsDataBuffer.toString('utf8'); // Convert buffer to string
            
            // Try to parse KYC information from IPFS
            try {
                kycData = JSON.parse(ipfsDataStr); // Parse IPFS data to JSON
                console.log('Fetched KYC information:', kycData);
                statusFlag = 'Verified'; // If the IPFS data is valid and parsed
            } catch (parseError) {
                console.error('Error parsing KYC information:', parseError);
                statusFlag = 'error'; // If parsing the KYC information fails
                throw parseError; // Rethrow to ensure final catch is triggered
            }
		 // Prepare the payload, adding the KYC data, status, docstatus, and requested_by
	        const payloadToSend = {
	            verify_status: statusFlag, // Status of the verification
	            requested_by: requestedBy, // Include requested_by from the original file
		    user: userJson,
	            ...kycData // Include the KYC data fetched from IPFS
	        };
		 // Send the payload to the verification API
        	await sendToVerifyApi(payloadToSend);
      	}
    } catch (error) {
        console.error('Error verifying document:', error);

        // In case of error, send payload with only status and requested_by
        const errorPayload = {
            verify_status: 'Not Verified', // Set status flag to 'error' on exception
	    docstatus: 1,
            requested_by: requestedBy, // Ensure requested_by is sent
	    user: userJson
		
		
        };

        // Send the error payload to the verification API
        await sendToVerifyApi(errorPayload);
    }
}



// Watch both directories for new JSON files
const watcher = chokidar.watch([uploadDir, verifyDir], {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
});

// Handle new files in respective directories
watcher.on('add', filePath => {
    console.log(`New file detected: ${filePath}`);

    if (filePath.startsWith(uploadDir)) {
        uploadDocument(filePath); // Process KYC upload
    } else if (filePath.startsWith(verifyDir)) {
        verifyDocument(filePath); // Process KYC verification
    }
});

// Handle watcher errors
watcher.on('error', error => console.error('Watcher error:', error));

console.log(`Watching directories: ${uploadDir} and ${verifyDir} for new JSON files...`);
