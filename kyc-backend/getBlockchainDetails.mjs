import Web3 from 'web3';
import { argv } from 'process';

const web3 = new Web3('http://localhost:8545');

// Function to serialize BigInt values properly
function replacer(key, value) {
    return typeof value === 'bigint' ? value.toString() : value;
}

// Function to get all blocks
async function getAllBlocks() {
    try {
        const latestBlock = await web3.eth.getBlockNumber();
        console.log(`Latest Block Number: ${latestBlock}`);
        
        for (let i = 0; i <= latestBlock; i++) {
            const block = await web3.eth.getBlock(i);
            console.log(JSON.stringify(block, replacer, 2)); // Use custom replacer here
        }
    } catch (error) {
        console.error('Error fetching blocks:', error);
    }
}

// Function to get transaction details and receipt by transaction hash
async function getTransactionDetailsByHash(txHash) {
    try {
        // Fetch transaction details
        const transaction = await web3.eth.getTransaction(txHash);
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        
        if (transaction) {
            console.log(`Transaction Hash: ${txHash}`);
            console.log('Transaction Details:', JSON.stringify(transaction, replacer, 2)); // Use custom replacer here
        } else {
            console.log(`Transaction not found: ${txHash}`);
        }
        
        if (receipt) {
            console.log('Transaction Receipt:', JSON.stringify(receipt, replacer, 2)); // Use custom replacer here
        } else {
            console.log(`Receipt not found for transaction: ${txHash}`);
        }
    } catch (error) {
        console.error('Error fetching transaction details:', error);
    }
}

// Main function to handle command-line arguments
(async () => {
    const args = argv.slice(2);

    if (args.length === 0) {
        // No arguments passed, list all blocks
        await getAllBlocks();
    } else if (args.length === 1) {
        // One argument passed, get transaction details by transaction hash
        const txHash = args[0];
        await getTransactionDetailsByHash(txHash);
    } else {
        console.error('Invalid number of arguments. Pass a transaction hash or no arguments.');
    }
})();
