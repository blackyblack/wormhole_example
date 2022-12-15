import {
    getEmitterAddressEth,
    parseSequenceFromLogEth,
    attestFromEth,
    tryNativeToHexString,
} from "@certusone/wormhole-sdk";

import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import fetch from "node-fetch";

const WORMHOLE_REST_API = "https://wormhole-v2-testnet-api.certus.one";
const bridgeGoerliAddress = "0x706abc4E45D419950511e474C7B9Ed348A4a716c";
const tokenGoerliBridgeAddress = "0xF890982f9310df57d00f659cf4fd87e65adEd8d7";

const bridgePolygonAddress = "0x0CBE91CF822c73C2315FB05100C2F714765d5c20";
const tokenBridgePolygonAddress = "0x377D55a7928c046E18eEbb61977e714d2a76472a";

// execute deploy task and put treasury address here
const treasuryGoerliAddress = "0x565fbE605A161e1bb52f454caFe5E0E2EfC600dA";
// execute deploy task on Mumbai and put treasury address here
const treasuryPolygonAddress = "0xB05ceA963fFfa5110E412Bac6188DcaACe09E186";
// execute deploy-token task and put token address here
const tokenAddress = "0x94CB6E2F783b9F5274ccd19c7e316bd5badADa98";
// execute attest and attest-confirm tasks and put wrapped token address here
const wrappedTokenAddress = "0xb541C0f67476087323B226C8dF94f03CeA4D4a6c";

const treasuryMessengerGoerliAddress = "0x332dc886e197837f73F2DE46BF12742A167a1A83";
const treasuryMessengerPolygonAddress = "0x8e4F426B908C439a77f5419dECD22c794E0479d8";


const GOERLI_WORMHOLE_CHAIN_ID = 2
const POLYGON_WORMHOLE_CHAIN_ID = 5

async function getSigner(hre: HardhatRuntimeEnvironment) {
  return (await hre.ethers.getSigners())[0];
}

// call from both networks
task("deploy", "Deploy Treasury").setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const TreasuryFactory = (await hre.ethers.getContractFactory("Treasury", signer));
    const treasury = await TreasuryFactory.deploy();
    await treasury.deployed();

    console.log("Treasury",
      `has been deployed at ${treasury.address}`,
      `on the chain ${hre.network.name} (chainId: ${hre.ethers.provider.network.chainId})`
    );
  }
);

// call from sender network
task("deploy-token", "Deploy Token").setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const TokenFactory = (await hre.ethers.getContractFactory("Token", signer));
    const token = await TokenFactory.deploy("1000000000000000000000000000");
    await token.deployed();

    console.log("Token",
      `has been deployed at ${token.address}`,
      `on the chain ${hre.network.name} (chainId: ${hre.ethers.provider.network.chainId})`
    );
  }
);

// call from sender network
task("attest", "Attest Token").setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const networkTokenAttestation = await attestFromEth(
      tokenGoerliBridgeAddress,
      signer,
      tokenAddress
    );

    const emitterAddr = getEmitterAddressEth(tokenGoerliBridgeAddress);
    const seq = parseSequenceFromLogEth(networkTokenAttestation, bridgeGoerliAddress);
    const vaaURL =  `${WORMHOLE_REST_API}/v1/signed_vaa/${GOERLI_WORMHOLE_CHAIN_ID}/${emitterAddr}/${seq}`;
    console.log("Searching for: ", vaaURL);
    let vaaBytes = await (await fetch(vaaURL)).json();
    while(!vaaBytes.vaaBytes){
      console.log("VAA not found, retrying in 5s!");
      await new Promise((r) => setTimeout(r, 5000)); //Timeout to let Guardiand pick up log and have VAA ready
      vaaBytes = await (await fetch(vaaURL)).json();
    }

    console.log(
      `Network(${hre.network.name}) Emitted VAA: `,
      vaaBytes.vaaBytes
    );
  }
);

// call from recipient network
task("attest-confirm", "Attest Token on Recipient side")
  .addParam("vaabytes", "VAA bytes base64 encoded")
  .setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const targetTokenBridge = (await hre.ethers.getContractAt("ITokenBridge", tokenBridgePolygonAddress, signer));
    const tx = await targetTokenBridge.createWrapped(Buffer.from(args.vaabytes, "base64"), {
      gasLimit: 2000000
    })
    await tx.wait();

    const wrappedTokenAddress = await targetTokenBridge.wrappedAsset(GOERLI_WORMHOLE_CHAIN_ID, Buffer.from(tryNativeToHexString(tokenAddress, "ethereum"), "hex"));
    console.log("Wrapped token created at: ", wrappedTokenAddress);
  }
);

// call from sender network
task("bridge-send", "Send Tokens to Recipient side")
  .setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const amount = hre.ethers.utils.parseUnits("1", "18");

    const token = (await hre.ethers.getContractAt("Token", tokenAddress, signer));
    console.log(`Sending 1 Token to the Treasury`);
    const tx_send = await token.transfer(treasuryGoerliAddress, amount, {
      gasLimit: 2000000,
    });
    await tx_send.wait();

    const treasury = (await hre.ethers.getContractAt("Treasury", treasuryGoerliAddress, signer));
    console.log(`Approving 1 Tokens to be bridged by Token Bridge`);
    const tx_approve = await treasury.approveTokenBridge(amount, {
      gasLimit: 2000000,
    });
    await tx_approve.wait();

    console.log(`Bridging 1 Tokens`);
    const targetRecepient = Buffer.from(tryNativeToHexString(treasuryPolygonAddress, "polygon"), 'hex');
    const tx = await (await treasury.bridgeToken(amount, POLYGON_WORMHOLE_CHAIN_ID, targetRecepient)).wait();
    const emitterAddr = getEmitterAddressEth(tokenGoerliBridgeAddress);
    const seq = parseSequenceFromLogEth(tx, bridgeGoerliAddress);
    const vaaURL =  `${WORMHOLE_REST_API}/v1/signed_vaa/${GOERLI_WORMHOLE_CHAIN_ID}/${emitterAddr}/${seq}`;
    let vaaBytes = await (await fetch(vaaURL)).json();
    while(!vaaBytes.vaaBytes){
      console.log("VAA not found, retrying in 5s!");
      await new Promise((r) => setTimeout(r, 5000)); //Timeout to let Guardiand pick up log and have VAA ready
      vaaBytes = await (await fetch(vaaURL)).json();
    }

    console.log(
      `Network(${hre.network.name}) Emitted VAA: `,
      vaaBytes.vaaBytes
    );
  }
);

// call from recipient network
task("bridge-confirm", "Receive Tokens")
  .addParam("vaabytes", "VAA bytes base64 encoded")
  .setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const targetTokenBridge = (await hre.ethers.getContractAt("ITokenBridge", tokenBridgePolygonAddress, signer));
    const completeTransferTx = await targetTokenBridge.completeTransfer(Buffer.from(args.vaabytes, "base64"), {
      gasLimit: 2000000,
    });
    console.log("Complete Transfer TX: ", await completeTransferTx.wait());
  }
);

// call from sender network
task("bridge-send-back", "Send Tokens to back to Sender side")
  .setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const amount = hre.ethers.utils.parseUnits("1", "18");

    const treasury = (await hre.ethers.getContractAt("Treasury", treasuryPolygonAddress, signer));
    console.log(`Approving 1 Tokens to be bridged by Token Bridge`);
    const tx_approve = await treasury.approveWrappedTokenBridge(amount, {
      gasLimit: 2000000,
    });
    await tx_approve.wait();

    console.log(`Bridging 1 Tokens`);
    const targetRecepient = Buffer.from(tryNativeToHexString(treasuryGoerliAddress, "ethereum"), 'hex');
    const tx_send = await treasury.bridgeWrappedToken(amount, GOERLI_WORMHOLE_CHAIN_ID, targetRecepient, {
      gasLimit: 2000000,
    });
    const tx_receipt = await tx_send.wait();

    const emitterAddr = getEmitterAddressEth(tokenBridgePolygonAddress);
    const seq = parseSequenceFromLogEth(tx_receipt, bridgePolygonAddress);
    const vaaURL =  `${WORMHOLE_REST_API}/v1/signed_vaa/${POLYGON_WORMHOLE_CHAIN_ID}/${emitterAddr}/${seq}`;
    let vaaBytes = await (await fetch(vaaURL)).json();
    while(!vaaBytes.vaaBytes){
      console.log("VAA not found, retrying in 5s!");
      await new Promise((r) => setTimeout(r, 5000)); //Timeout to let Guardiand pick up log and have VAA ready
      vaaBytes = await (await fetch(vaaURL)).json();
    }

    console.log(
      `Network(${hre.network.name}) Emitted VAA: `,
      vaaBytes.vaaBytes
    );
  }
);

// call from Sender network
task("bridge-confirm-back", "Receive Tokens on Sender side")
  .addParam("vaabytes", "VAA bytes base64 encoded")
  .setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const targetTokenBridge = (await hre.ethers.getContractAt("ITokenBridge", tokenGoerliBridgeAddress, signer));
    const completeTransferTx = await targetTokenBridge.completeTransfer(Buffer.from(args.vaabytes, "base64"));
    console.log("Complete Transfer TX: ", await completeTransferTx.wait());
  }
);

// call from both networks
task("deploy-message", "Deploy TreasuryMessenger").setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const TreasuryFactory = (await hre.ethers.getContractFactory("TreasuryMessenger", signer));
    const treasury = await TreasuryFactory.deploy();
    await treasury.deployed();

    console.log("TreasuryMessenger",
      `has been deployed at ${treasury.address}`,
      `on the chain ${hre.network.name} (chainId: ${hre.ethers.provider.network.chainId})`
    );
  }
);

// call from sender network
task("bridge-send-message", "Send Tokens and Message to Recipient side")
  .setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const amount = hre.ethers.utils.parseUnits("1", "18");

    const token = (await hre.ethers.getContractAt("Token", tokenAddress, signer));
    console.log(`Sending 1 Token to the Treasury`);
    const tx_send = await token.transfer(treasuryMessengerGoerliAddress, amount, {
      gasLimit: 2000000,
    });
    await tx_send.wait();

    const treasury = (await hre.ethers.getContractAt("TreasuryMessenger", treasuryMessengerGoerliAddress, signer));
    console.log(`Approving 1 Tokens to be bridged by Token Bridge`);
    const tx_approve = await treasury.approveTokenBridge(amount, {
      gasLimit: 2000000,
    });
    await tx_approve.wait();

    console.log(`Bridging 1 Tokens`);
    const payload = "Hello world!";
    const targetRecepient = Buffer.from(tryNativeToHexString(treasuryMessengerPolygonAddress, "polygon"), 'hex');
    const tx = await (await treasury.bridgeTokenMsg(amount, POLYGON_WORMHOLE_CHAIN_ID, targetRecepient, payload)).wait();
    const emitterAddr = getEmitterAddressEth(tokenGoerliBridgeAddress);
    const seq = parseSequenceFromLogEth(tx, bridgeGoerliAddress);
    const vaaURL =  `${WORMHOLE_REST_API}/v1/signed_vaa/${GOERLI_WORMHOLE_CHAIN_ID}/${emitterAddr}/${seq}`;
    let vaaBytes = await (await fetch(vaaURL)).json();
    while(!vaaBytes.vaaBytes){
      console.log("VAA not found, retrying in 5s!");
      await new Promise((r) => setTimeout(r, 5000)); //Timeout to let Guardiand pick up log and have VAA ready
      vaaBytes = await (await fetch(vaaURL)).json();
    }

    console.log(
      `Network(${hre.network.name}) Emitted VAA: `,
      vaaBytes.vaaBytes
    );
  }
);

// call from recipient network
task("bridge-confirm-message", "Receive Tokens and Message")
  .addParam("vaabytes", "VAA bytes base64 encoded")
  .setAction(
  async (args, hre) => {
    const signer = await getSigner(hre);
    const treasury = (await hre.ethers.getContractAt("TreasuryMessenger", treasuryMessengerPolygonAddress, signer));
    const completeTransferTx = await treasury.completeTransferPolygon(Buffer.from(args.vaabytes, "base64"));
    console.log("Complete Transfer TX: ", await completeTransferTx.wait());

    const text = await treasury.getCurrentMsg();
    console.log("Received " + text);
  }
);
