// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract KYCDocument {
    mapping(address => string) public documents;

    function addDocument(string memory ipfsHash) public {
        documents[msg.sender] = ipfsHash;
    }

    function getDocument(address user) public view returns (string memory) {
        return documents[user];
    }
}
