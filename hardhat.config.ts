import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";

import "./src/tasks/deployment";
import "./src/tasks/deployment-token";

const ALCHEMY_API = process.env.ALCHEMY_API || "";
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const HOST_ADDR = process.env.HOST_ADDR || "";
const NETWORK = process.env.NETWORK || "";

let urlGoerli = NETWORK;
if (NETWORK) {
  urlGoerli = NETWORK;
} else if (ALCHEMY_API) {
  urlGoerli = `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API}`;
} else {
  urlGoerli = `https://goerli.infura.io/v3/${INFURA_API_KEY}`;
}

const accounts = process.env.PRIVATE_KEY ? [`${process.env.PRIVATE_KEY}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    matic: {
      chainId: 80001,
      url: "https://matic-testnet-archive-rpc.bwarelabs.com",
      accounts: accounts,
      timeout: 60000
    },
    goerli: {
      chainId: 5,
      url: urlGoerli,
      accounts: accounts,
      timeout: 60000
    }
  }
};

export default config;
