"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
(0, config_1.task)("deploy-eth", "Deploy Treasury").setAction(async (args, hre) => {
    const TreasuryFactory = (await hre.ethers.getContractFactory("Treasury"));
    const treasury = await TreasuryFactory.deploy();
    await treasury.deployed();
    console.log("Treasury", `has been deployed at ${treasury.address}`, `on the chain ${hre.network.name} (chainId: ${hre.ethers.provider.network.chainId})`);
});
/*task("deploy-incrementor", "Deploys CrossChainIncrementor").setAction(
  async (args, hre) => {
    const Incrementor = (await hre.ethers.getContractFactory(
      "CrossChainIncrementor"
    )) as CrossChainIncrementor__factory;
    const incrementor = (await Incrementor.deploy()) as CrossChainIncrementor;
    await incrementor.deployed();

    console.log(
      chalk.blue("CrossChainIncrementor"),
      `has been deployed at ${chalk.red(incrementor.address)}`,
      `on the chain ${hre.network.name} (chainId: ${chalk.red(
        hre.ethers.provider.network.chainId
      )})`
    );
    console.log(
      `You can now configure the newly deployed CrossChainIncrementor by calling the ${chalk.underline(
        "configure-incrementor"
      )}.`
    );
    console.log(
      `Then you probably need to grant it a permission to make cross-chain calls to the ${chalk.green(
        "CrossChainCounter"
      )} contract by `,
      `running ${chalk.underline("configure-counter")}`
    );
  }
);

task(
  "configure-incrementor",
  "Configures CrossChainIncrementor by setting the deBridgeGate contract address as well as the target Counter contract and chainId"
)
  .addParam(
    "incrementorAddress",
    "Address of the CrossChainIncrementor contract on the current chain"
  )
  .addParam(
    "counterAddress",
    "Address of the CrossChainCounter contract on the given chain"
  )
  .addParam(
    "counterChainId",
    "The chain ID where CrossChainCounter has been deployed"
  )
  .addOptionalParam(
    "deBridgeGateAddress",
    "Address of the deBridgeGate contract on the current chain (default value represents the mainnet address)",
    DEFAULT_DEBRIDGE_ADDRESS
  )
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const incrementor = CrossChainIncrementor__factory.connect(
      args.incrementorAddress,
      signer
    );

    const tx1 = await incrementor.setDeBridgeGate(args.deBridgeGateAddress);
    await tx1.wait();

    const tx2 = await incrementor.addCounter(
      args.counterChainId,
      args.counterAddress
    );
    await tx2.wait();

    console.log(
      chalk.blue("CrossChainIncrementor"),
      `has been configured to call Counter (${args.counterAddress}, chainId: ${args.counterChainId})`,
      `via the deBridgeGate contract (${args.deBridgeGateAddress})`
    );
    console.log(
      `Now probably need to grant it a permission to make cross-chain calls to the ${chalk.green(
        "CrossChainCounter"
      )} contract by `,
      `running ${chalk.underline("configure-counter")}`
    );
  });

task(
  "configure-counter",
  "Adds the given CrossChainIncrementor address as a trusted cross-chain caller for the given CrossChainCounter"
)
  .addParam(
    "counterAddress",
    "Address of the CrossChainCounter on the current chain"
  )
  .addParam(
    "incrementorAddress",
    "Address of the CrossChainIncrementor on the given chain"
  )
  .addParam(
    "incrementorChainId",
    "Chain ID where CrossChainIncrementor has been deployed"
  )
  .addOptionalParam(
    "deBridgeGateAddress",
    "Address of the deBridgeGate contract on the current chain (default value represents the mainnet address)",
    DEFAULT_DEBRIDGE_ADDRESS
  )
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const counter = CrossChainCounter__factory.connect(
      args.counterAddress,
      signer
    );

    const tx1 = await counter.setDeBridgeGate(args.deBridgeGateAddress);
    await tx1.wait();

    const tx2 = await counter.addChainSupport(
      args.incrementorChainId,
      args.incrementorAddress
    );
    await tx2.wait();

    const tx3 = await counter.addIncrementor(
      args.incrementorChainId,
      args.incrementorAddress
    );
    await tx3.wait();

    // const tx4 = await signer.sendTransaction({
    //   to: args.counterAddress,
    //   value: utils.parseEther("2"),
    // });
    // await tx4.wait();

    console.log(
      `${chalk.green(
        "CrossChainCounter"
      )} can now accept cross-chain calls originating`,
      `from the CrossChainIncrementor address ${args.incrementorAddress} from the chain id ${args.incrementorChainId}`
    );
    console.log(
      `Run ${chalk.underline(
        "send-increment"
      )} to initiate your first cross-chain transaction!`
    );
  });

  task(
    "topup-counter",
    "Adds asset to CrossChainCounter"
  )
    .addParam(
      "counterAddress",
      "Address of the CrossChainCounter on the current chain"
    )
    .addParam(
      "amount",
      "Address of the CrossChainIncrementor on the given chain"
    )
    .setAction(async (args, hre) => {
      const [signer] = await hre.ethers.getSigners();
  
      const tx4 = await signer.sendTransaction({
        to: args.counterAddress,
        value: args.amount,
      });
      await tx4.wait();
  
      console.log("Success!");

    });

task(
  "send-increment",
  "Calls the CrossChainIncrementor contract on the given chain to construct and broadcast a call to increment CrossChainCounter's value by the given amount"
)
  .addParam(
    "incrementorAddress",
    "Address of the CrossChainIncrementor contract on the current chain"
  )
  .addOptionalParam(
    "incrementBy",
    "Amount to increment CrossChainCounter's value by",
    "10"
  )
  .addOptionalParam(
    "executionFeeAmount",
    "Amount of ethers to bridge along with the message to incetivize a third party to execute a transaction on the destination chain",
    "0"
  )
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();

    const incrementor = CrossChainIncrementor__factory.connect(
      args.incrementorAddress,
      signer
    );

    const gate = DeBridgeGate__factory.connect(
      await incrementor.deBridgeGate(),
      signer
    );
      console.log('gate', await incrementor.deBridgeGate());
    const protocolFee = await gate.globalFixedNativeFee();
    const value = protocolFee.add(BigNumber.from(args.executionFeeAmount));
    console.log({value, protocolFee, fee: args.executionFeeAmount})
    const tx = await incrementor.incrementWithIncludedGas(
      args.incrementBy,
      args.executionFeeAmount,
      {
        value,
      }
    );
    const receipt = await tx.wait();

    console.log(
      `Tx has been included in the blockchain: ${chalk.red(
        receipt.transactionHash
      )}`
    );
    console.log("Looking for deBridgeGate submission id...");

    const events = (await gate.queryFilter(gate.filters.Sent())) as SentEvent[];
    const sentEvent = events
      .reverse()
      .find((ev) => ev.transactionHash === receipt.transactionHash);
    console.log("SubmissionID:", chalk.red(sentEvent?.args.submissionId));
  });

task(
  "read-increment",
  "Prints the current state value of the given CrossChainCounter"
)
  .addParam(
    "counterAddress",
    "The address of the CrossChainCounter on the current chain"
  )
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();

    const counter = CrossChainCounter__factory.connect(
      args.counterAddress,
      signer
    );
    const currentValue = (await counter.counter()) as BigNumber;

    console.log(
      "Current CrossChainCounter value:",
      chalk.green(currentValue.toString())
    );
  });

  task(
    "read-remote",
    "Prints the current state value of the given CrossChainCounter"
  )
    .addParam(
      "incrementorAddress",
      "The address of the CrossChainCounter on the current chain"
    )
    .addOptionalParam(
      "executionFeeAmount",
      "Amount of ethers to bridge along with the message to incetivize a third party to execute a transaction on the destination chain",
      "0"
    )
    .setAction(async (args, hre) => {
      const [signer] = await hre.ethers.getSigners();

    const incrementor = CrossChainIncrementor__factory.connect(
      args.incrementorAddress,
      signer
    );

    const gate = DeBridgeGate__factory.connect(
      await incrementor.deBridgeGate(),
      signer
    );

    const protocolFee = await gate.globalFixedNativeFee();
    const value = protocolFee.add(BigNumber.from(args.executionFeeAmount));
    console.log({value, protocolFee, fee: args.executionFeeAmount})
    const tx = await incrementor.queryRemoteValue(
      BigNumber.from(args.executionFeeAmount),
      {
        value,
      }
    );
    const receipt = await tx.wait();

    console.log(
      `Tx has been included in the blockchain: ${chalk.red(
        receipt.transactionHash
      )}`
    );
    console.log("Looking for deBridgeGate submission id...");
    });


    task(
      "test-counter",
      "Test CrossChainCounter"
    )
      .addParam(
        "counterAddress",
        "Address of the CrossChainCounter on the current chain"
      )

      .setAction(async (args, hre) => {
        const [signer] = await hre.ethers.getSigners();
        const counter = CrossChainCounter__factory.connect(
          args.counterAddress,
          signer
        );
  
        const gate = DeBridgeGate__factory.connect(
          await counter.deBridgeGate(),
          signer
        );
        const protocolFee = await gate.globalFixedNativeFee();
        console.log('protocolFee', protocolFee.toString());
    
        const tx2 = await counter.receiveReadCommand({value: protocolFee});
        await tx2.wait();
    
    
        console.log('Success');

      });*/ 
