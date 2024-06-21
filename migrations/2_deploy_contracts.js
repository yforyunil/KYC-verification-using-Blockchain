const KYCDocument = artifacts.require("KYCDocument");

module.exports = function (deployer) {
  deployer.deploy(KYCDocument);
};
