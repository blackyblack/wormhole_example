"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@typechain/hardhat");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");
require("@typechain/hardhat");
require("dotenv/config");
require("./src/tasks/deployment");
require("./src/tasks/deployment-token");
const accounts = process.env.PRIVATE_KEY ? [`${process.env.PRIVATE_KEY}`] : [];
const config = {
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
            url: "https://rpc-mumbai.maticvigil.com/",
            accounts: accounts,
            timeout: 60000,
        },
        arbitrum: {
            url: "https://rinkeby.arbitrum.io/rpc",
            accounts: accounts,
            timeout: 60000,
        },
        binance: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            accounts: accounts,
            timeout: 60000,
        },
        polygon: {
            url: "https://polygon-rpc.com",
            accounts: accounts,
            timeout: 60000,
        },
        opera: {
            url: "https://rpc.ftm.tools/",
            accounts: accounts,
            timeout: 60000,
        }
    },
};
exports.default = config;
