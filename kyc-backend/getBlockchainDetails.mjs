import Web3 from 'web3';
import { argv } from 'process';

// Connect to the local Ethereum node
const web3 = new Web3('http://localhost:8545');

// Function to fetch all blocks
async function getAllBlocks() {
    try {
        const latestBlockNumber = await web3.eth.getBlockNumber();
        const blocks = [];
        for (let i = 0; i <= latestBlockNumber; i++) {
            const block = await web3.eth.getBlock(i, true);
            blocks.push(block);
        }
        console.log('All Blocks:', JSON.stringify(blocks, null, 2));
    } catch (error) {
        console.error('Error fetching blocks:', error);
    }
}

// Function to get block details and ledger for a transaction hash
async function getBlockDetailsFromTransaction(txHash) {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (!receipt) {
            console.error('Transaction receipt not found');
            return;
        }

        const block = await web3.eth.getBlock(receipt.blockNumber, true);
        const details = {
            blockNumber: receipt.blockNumber,
            block: block,
            transactionReceipt: receipt
        };
        console.log('Block Details:', JSON.stringify(details, null, 2));
    } catch (error) {
        console.error('Error fetching block details:', error);
    }
}

// Main function to handle command-line arguments
(async () => {
    const args = argv.slice(2);

    if (args.length === 0) {
        // No arguments passed, get all blocks
        await getAllBlocks();
    } else if (args.length === 1) {
        // One argument passed, get block details for transaction hash
        const txHash = args[0];
        await getBlockDetailsFromTransaction(txHash);
    } else {
        console.error('Invalid number of arguments. Pass a transaction hash or no arguments.');
    }
})();
